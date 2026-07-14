// ─── Chat Service ──────────────────────────────────────────────────────────────
// Orchestrates expense parsing from natural language messages.
// Loads user context from DB, builds prompts, runs AI providers, sanitizes output.

import { getDb } from "@/db/client";
import { userPreferences, cycle } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { buildSystemPrompt, buildResponseSchema, type PromptContext } from "./prompt-builder";
import { runGemini } from "./ai-providers";
import { sanitizeResult, type SanitizerContext } from "./sanitizer";
import type { ChatResponse, ChatParseResult } from "@/types/chat";

type DbType = ReturnType<typeof getDb>;

interface ParseChatOpts {
    db: DbType;
    userId: string;
    message: string;
    previousResult?: ChatParseResult | null;
}

/**
 * Main orchestrator for parsing a natural language expense message.
 *
 * 1. Loads user settings (categories, subcategories, payment methods, contacts, active cycle) from DB
 * 2. Builds the system prompt with full user context
 * 3. Runs AI provider cascade: CF AI Gateway → Direct Gemini → error fallback
 * 4. Sanitizes the AI output to fix hallucinations and validate against user data
 */
export async function parseChatMessage(opts: ParseChatOpts): Promise<ChatResponse> {
    const { db, userId, message, previousResult } = opts;

    // ── Load user context from DB ──────────────────────────────────────────
    const [
        prefResult,
        contactsList,
        methodsList,
        categoriesList,
        subCategoriesList,
    ] = await Promise.all([
        db
            .select()
            .from(userPreferences)
            .where(eq(userPreferences.userId, userId))
            .limit(1),
        db.query.contact.findMany({
            where: { userId, deletedAt: { isNull: true } },
        }),
        db.query.paymentMethod.findMany({
            where: { userId, deletedAt: { isNull: true } },
        }),
        db.query.category.findMany({
            where: {
                deletedAt: { isNull: true },
                OR: [{ userId: { isNull: true } }, { userId }],
            },
            orderBy: { sortOrder: "asc", name: "asc" },
        }),
        db.query.subCategory.findMany({
            where: {
                deletedAt: { isNull: true },
                OR: [{ userId: { isNull: true } }, { userId }],
            },
            orderBy: { sortOrder: "asc", name: "asc" },
        }),
    ]);

    // ── Resolve active cycle for date bounds ────────────────────────────────
    const activeCycleId = prefResult[0]?.activeCycleId;
    let cycleStart = new Date().toISOString().slice(0, 10);
    let cycleEnd = cycleStart;

    if (activeCycleId) {
        const activeCycle = await db
            .select()
            .from(cycle)
            .where(
                and(
                    eq(cycle.id, activeCycleId),
                    eq(cycle.userId, userId),
                    isNull(cycle.deletedAt),
                )
            )
            .limit(1);

        if (activeCycle.length > 0) {
            cycleStart = activeCycle[0].start;
            cycleEnd = activeCycle[0].end;
        }
    }

    const currentDate = new Date().toISOString().slice(0, 10);

    // ── Build category code map for subcategory resolution ──────────────────
    const categoryCodeMap = new Map<string, string>(
        categoriesList.map((c) => [c.id, c.code]),
    );

    // ── Shape context for prompt & sanitizer ────────────────────────────────
    const categories = categoriesList.map((c) => ({
        code: c.code,
        name: c.name,
    }));

    const subCategories = subCategoriesList.map((sc) => ({
        code: sc.code,
        name: sc.name,
        categoryCode: categoryCodeMap.get(sc.categoryId) || "",
    }));

    const paymentMethods = methodsList.map((m) => ({
        id: m.id,
        type: m.typeCode,
        label: m.label,
    }));

    const contacts = [
        { id: "you", name: "You" },
        ...contactsList.map((c) => ({ id: c.id, name: c.name })),
    ];

    const promptContext: PromptContext = {
        currentDate,
        cycleStart,
        cycleEnd,
        categories,
        subCategories,
        paymentMethods,
        contacts,
    };

    // ── Build prompt & schema ───────────────────────────────────────────────
    const prompt = buildSystemPrompt(promptContext, previousResult);
    const responseSchema = buildResponseSchema(categories);

    // ── Resolve Gemini API Key ──────────────────────────────────────────────
    let geminiKey = "";

    try {
        const { env } = getCloudflareContext();
        geminiKey = (env as any)?.GEMINI_API_KEY || "";
    } catch {
        geminiKey = process.env.GEMINI_API_KEY || "";
    }

    if (!geminiKey) {
        return {
            result: {
                clarification: "AI service is not configured. Please add your API key.",
            },
            provider: "unavailable",
        };
    }

    // ── Run Gemini Provider ─────────────────────────────────────────────────
    const sanitizerCtx: SanitizerContext = {
        categories,
        subCategories,
        paymentMethods,
        originalMessage: message,
        currentDate,
        cycleStart,
        cycleEnd,
    };

    const geminiResult = await runGemini({
        geminiKey,
        prompt,
        message,
        responseSchema,
    });

    if (geminiResult) {
        const sanitized = sanitizeResult(geminiResult.result, sanitizerCtx);
        return {
            result: normalizeParseResult(sanitized),
            provider: geminiResult.provider,
        };
    }

    return {
        result: {
            clarification: "I'm having trouble connecting to Gemini right now. Please try again or log manually.",
        },
        provider: "unavailable",
    };
}

/**
 * Normalizes all nullable fields in ChatParseResult to undefined so they are excluded
 * from serialized API payloads, matching the types expected by PendingDraft.
 */
function normalizeParseResult(res: ChatParseResult): ChatParseResult {
    if (!res) return res;
    return {
        ...res,
        subCategoryCode: res.subCategoryCode ?? undefined,
        payment: res.payment
            ? {
                  type: res.payment.type,
                  methodId: res.payment.methodId ?? undefined,
              }
            : undefined,
        comment: res.comment ?? undefined,
        newPaymentMethod: res.newPaymentMethod ?? undefined,
        newSubCategoryName: res.newSubCategoryName ?? undefined,
        correctedInput: res.correctedInput ?? undefined,
        clarification: res.clarification ?? undefined,
        split: res.split
            ? {
                  mode: res.split.mode,
                  participants: res.split.participants.map((p) => ({
                      contactId: p.contactId ?? undefined,
                      name: p.name ?? undefined,
                      share: p.share,
                  })),
              }
            : undefined,
    };
}
