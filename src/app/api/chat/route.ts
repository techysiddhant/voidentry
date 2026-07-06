import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { inferSubCategoryCode } from "@/lib/catalog";

export const runtime = "edge";

// ─── Provider preference flag ──────────────────────────────────────────────
// Set to true  → Gemini first, CF AI fallback  (current — Gemini is more capable)
// Set to false → CF AI first, Gemini fallback  (switch back when CF quota is enough)
const PREFER_GEMINI = true;

export async function POST(req: Request) {
    try {
        const { env } = getCloudflareContext();
        const { message, currentDate, cycleStart, cycleEnd, categories, subCategories, paymentMethods, contacts } =
            (await req.json()) as any;

        if (!message?.trim()) {
            return NextResponse.json({ error: "Message is required." }, { status: 400 });
        }

        const prompt = buildSystemPrompt({ currentDate, cycleStart, cycleEnd, categories, subCategories, paymentMethods, contacts });
        const responseSchema = buildResponseSchema(categories);

        const geminiKey = (env && (env as any).GEMINI_API_KEY) || process.env.GEMINI_API_KEY;

        // Run providers in preference order
        const providers = PREFER_GEMINI
            ? [runGemini, runCloudflareAI]
            : [runCloudflareAI, runGemini];

        for (const run of providers) {
            const result = await run({ env, prompt, message, geminiKey, paymentMethods, categories, subCategories, responseSchema });
            if (result) {
                return NextResponse.json(result);
            }
        }

        // Both unavailable
        return NextResponse.json({
            result: {
                clarification: "I'm having trouble connecting right now. Please try again or log manually.",
            },
            provider: "unavailable",
        });

    } catch (err: any) {
        console.error("Chat API error:", err);
        return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
    }
}

// ─── System Prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt({ currentDate, cycleStart, cycleEnd, categories, subCategories, paymentMethods, contacts }: any): string {
    const categoriesText = categories
        .map((category: any) => `- ${category.code}: ${category.name}`)
        .join("\n");
    const subCategoriesByCategory = categories
        .map((category: any) => {
            const labels = subCategories
                .filter((subCategory: any) => subCategory.categoryCode === category.code)
                .map((subCategory: any) => `"${subCategory.code}" (${subCategory.name})`)
                .join(", ");
            return `  ${category.name}: ${labels}`;
        })
        .join("\n");
    return `You are a smart, typo-tolerant personal expense parser for an Indian user. Your job is to understand natural language expense messages, correct any typos, and return a structured JSON object.

CONTEXT:
- Today's date: ${currentDate}
- Billing cycle: ${cycleStart} to ${cycleEnd}
- Allowed categories:
${categoriesText}
- Allowed subcategories by category code:
${subCategoriesByCategory}
- User's saved payment methods (JSON): ${JSON.stringify(paymentMethods)}
- User's contacts for splitting: ${JSON.stringify(contacts || [])}

STEP 1 — FIX TYPOS & SHORTHAND:
Silently correct obvious typos, misspellings, and shorthand FIRST. Set "correctedInput" to the corrected sentence if you changed anything; null otherwise.
Examples: "coffe"→"coffee", "ubr"→"Uber", "induslund"→"IndusInd", "appolloy"→"Apollo", "yespop"→"Yes Pop", "swgy"→"Swiggy".

STEP 2 — EXTRACT EXPENSE FIELDS:
- "amount" (number, REQUIRED): Extract the monetary amount. No amount = set "clarification".
- "note" (string): Short clean description only — no amount, date, or payment info. E.g. "Apollo blood test", "Swiggy biriyani", "Blue Tokai flat white".
- "categoryCode" (string): EXACTLY one of the category codes above. Use context — medical/hospital → personal, rides/fuel → transport, food/restaurant → food, etc.
- "subCategoryCode" (string | null): Use one allowed subcategory code for the chosen category whenever there is a clear match.
- "date" (YYYY-MM-DD): Resolve relative dates from today (${currentDate}). Must be within [${cycleStart}, ${cycleEnd}].
- "payment.type": One of [cash, card, upi, netbanking, wallet].
- "payment.methodId": Check the user's saved payment methods. If the mentioned bank/card/app MATCHES one by name or label → set its ID. If it does NOT match any saved method → set null AND set "newPaymentMethod".
- "newPaymentMethod" ({ type, label } | null): If user mentions a payment method NOT in their saved list (e.g. "Yes Pop card", "IndusInd", "Axis Visa", "HDFC credit", "CRED UPI"), set this with the corrected label and inferred type. Know Indian banking: "Yes Pop" = Yes Bank credit card (type: card), "OneCard" = card, "Slice" = card, "CRED" = card/upi, "Simpl" = wallet, etc.
- "newSubCategoryName" (string | null): Only for very unusual/niche subcategories not in the allowed list above (e.g. "rock climbing gear", "manga books").
- "comment" (string | null): Additional context or remarks (e.g. "for mom's checkup", "work expense").
- "split": If user says "split with X" or "split N ways", parse { mode: "equal"|"exact", participants: [{contactId, name, share}] }.
- "correctedInput": Typo-corrected sentence or null.
- "clarification": ONLY if no amount found or completely unrelated to spending.

CRITICAL RULES:
1. ALWAYS prefer a valid "subCategoryCode" when there is a strong match; otherwise leave it null and optionally use "newSubCategoryName".
2. For "payment.methodId": ONLY set it if the mentioned payment method name/label EXACTLY or closely matches one in the saved list. If in doubt, set null + newPaymentMethod.
3. NEVER set both a valid "methodId" AND "newPaymentMethod" for the same card.
4. Return ONLY valid JSON. No markdown, no extra text.`;
}

function buildResponseSchema(categories: Array<{ code: string }>) {
    return {
        type: "OBJECT",
        properties: {
            amount: { type: "NUMBER" },
            note: { type: "STRING" },
            categoryCode: {
                type: "STRING",
                enum: categories.map((category) => category.code),
            },
            subCategoryCode: { type: "STRING" },
            date: { type: "STRING" },
            payment: {
                type: "OBJECT",
                properties: {
                    type: { type: "STRING", enum: ["cash", "card", "upi", "netbanking", "wallet"] },
                    methodId: { type: "STRING" },
                },
                required: ["type"],
            },
            newPaymentMethod: {
                type: "OBJECT",
                properties: {
                    type: { type: "STRING", enum: ["cash", "card", "upi", "netbanking", "wallet"] },
                    label: { type: "STRING" },
                },
            },
            newSubCategoryName: { type: "STRING" },
            comment: { type: "STRING" },
            split: {
                type: "OBJECT",
                properties: {
                    mode: { type: "STRING", enum: ["equal", "exact"] },
                    participants: {
                        type: "ARRAY",
                        items: {
                            type: "OBJECT",
                            properties: {
                                contactId: { type: "STRING" },
                                name: { type: "STRING" },
                                share: { type: "NUMBER" },
                            },
                        },
                    },
                },
            },
            correctedInput: { type: "STRING" },
            clarification: { type: "STRING" },
        },
    };
}

// ─── Provider runners ──────────────────────────────────────────────────────────
// Each returns { result, provider } on success, or null on failure/unavailability.
async function runGemini({
    env,
    prompt,
    message,
    geminiKey,
    paymentMethods,
    categories,
    subCategories,
    responseSchema,
}: {
    env: any;
    prompt: string;
    message: string;
    geminiKey: string | undefined;
    paymentMethods: any[];
    categories: any[];
    subCategories: any[];
    responseSchema: any;
}): Promise<{ result: any; provider: string } | null> {
    void env;
    if (!geminiKey) return null;
    try {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `${prompt}\n\nUser Input: "${message}"` }] }],
                    generationConfig: { responseMimeType: "application/json", responseSchema },
                }),
            },
        );
        if (res.ok) {
            const data = (await res.json()) as any;
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
                const parsed = JSON.parse(text.trim());
                return { result: sanitizeResult(parsed, paymentMethods, categories, subCategories, message), provider: "gemini" };
            }
        } else {
            console.error(`Gemini error ${res.status}: ${await res.text()}`);
        }
    } catch (err: any) {
        console.error("Gemini failed:", err?.message ?? err);
    }
    return null;
}

async function runCloudflareAI({
    env,
    prompt,
    message,
    paymentMethods,
    categories,
    subCategories,
}: {
    env: any;
    prompt: string;
    message: string;
    geminiKey: string | undefined;
    paymentMethods: any[];
    categories: any[];
    subCategories: any[];
    responseSchema: any;
}): Promise<{ result: any; provider: string } | null> {
    if (!env || !(env as any).AI) return null;
    try {
        const cfAi = (env as any).AI;
        const response = await cfAi.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
            messages: [
                { role: "system", content: prompt },
                { role: "user", content: message },
            ],
            response_format: { type: "json_object" },
        });
        if (response?.response) {
            const raw = response.response;
            const parsed = typeof raw === "string" ? JSON.parse(raw.trim()) : raw;
            return { result: sanitizeResult(parsed, paymentMethods, categories, subCategories, message), provider: "cloudflare" };
        }
    } catch (err: any) {
        console.error("CF AI failed:", err?.message ?? err);
    }
    return null;
}

// ─── Server-Side Sanitizer ─────────────────────────────────────────────────────
// Validates and fixes common AI mistakes regardless of model quality.
function sanitizeResult(
    result: any,
    paymentMethods: any[],
    categories: any[],
    subCategories: any[],
    originalMessage: string,
): any {
    if (!result || result.clarification) return result;

    // 1. Validate methodId — if AI hallucinated an ID not in the user's list, clear it
    if (result.payment?.methodId) {
        const exists = paymentMethods.find((pm: any) => pm.id === result.payment.methodId);
        if (!exists) {
            console.warn(`AI returned invalid methodId "${result.payment.methodId}", clearing it.`);
            result.payment.methodId = null;
        }
    }

    // 2. If no valid methodId AND no newPaymentMethod, try to detect unknown bank/card names
    if (!result.payment?.methodId && !result.newPaymentMethod) {
        const detected = detectUnknownPaymentMethod(originalMessage, paymentMethods);
        if (detected) {
            result.newPaymentMethod = detected;
            result.payment = { ...(result.payment || {}), type: detected.type, methodId: null };
        }
    }

    // 3. Ensure category/subcategory codes remain valid
    const validCategory = categories.find((category: any) => category.code === result.categoryCode);
    if (!validCategory) {
        result.categoryCode = categories[0]?.code ?? "misc";
    }

    const allowedSubs = subCategories.filter((subCategory: any) => subCategory.categoryCode === result.categoryCode);
    if (result.subCategoryCode && !allowedSubs.some((subCategory: any) => subCategory.code === result.subCategoryCode)) {
        result.subCategoryCode = null;
    }

    if (!result.subCategoryCode && allowedSubs.length > 0) {
        result.subCategoryCode = inferSubCategoryCode(result.note || originalMessage, allowedSubs);
    }

    if (result.subCategoryCode) {
        result.newSubCategoryName = null;
    }

    return result;
}

// ─── Known Indian Payment Methods ─────────────────────────────────────────────
// Curated list: catches typo-variants and common Indian bank names that a small LLM might miss.
const KNOWN_PAYMENT_METHODS = [
    // Yes Bank
    { pattern: /\byes\s*pop\b|\byes\s*bank\b|\byesp(op)?\b/i, label: "Yes Pop Card", type: "card" },
    // IndusInd
    { pattern: /\bindusl[au]nd\b|\bindusind\b/i, label: "IndusInd Card", type: "card" },
    // Axis
    { pattern: /\baxis\b/i, label: "Axis Card", type: "card" },
    // HDFC
    { pattern: /\bhdfc\b/i, label: "HDFC Card", type: "card" },
    // ICICI
    { pattern: /\bicici\b/i, label: "ICICI Card", type: "card" },
    // SBI
    { pattern: /\bsbi\b/i, label: "SBI Card", type: "card" },
    // Kotak
    { pattern: /\bkotak\b/i, label: "Kotak Card", type: "card" },
    // RBL
    { pattern: /\brbl\b/i, label: "RBL Card", type: "card" },
    // AU Bank
    { pattern: /\bau\s*(small\s*)?bank\b|\baubank\b/i, label: "AU Bank Card", type: "card" },
    // OneCard
    { pattern: /\bone\s*card\b|\bonecard\b/i, label: "OneCard", type: "card" },
    // Slice
    { pattern: /\bslice\b/i, label: "Slice Card", type: "card" },
    // CRED
    { pattern: /\bcred\b/i, label: "CRED Card", type: "card" },
    // Amex
    { pattern: /\bamex\b|\bamerican\s*express\b/i, label: "Amex Card", type: "card" },
    // IDFC
    { pattern: /\bidfc\b/i, label: "IDFC Card", type: "card" },
    // Federal
    { pattern: /\bfederal\s*bank\b|\bfedbank\b/i, label: "Federal Bank Card", type: "card" },
    // Google Pay
    { pattern: /\bgpay\b|\bgoogle\s*pay\b/i, label: "Google Pay", type: "upi" },
    // PhonePe
    { pattern: /\bphonepe\b|\bphone\s*pe\b/i, label: "PhonePe", type: "upi" },
    // Paytm
    { pattern: /\bpaytm\b/i, label: "Paytm", type: "wallet" },
    // Simpl
    { pattern: /\bsimpl\b/i, label: "Simpl", type: "wallet" },
    // Amazon Pay
    { pattern: /\bamazon\s*pay\b/i, label: "Amazon Pay", type: "wallet" },
];

function detectUnknownPaymentMethod(
    message: string,
    paymentMethods: any[],
): { type: string; label: string } | null {
    for (const known of KNOWN_PAYMENT_METHODS) {
        if (!known.pattern.test(message)) continue;
        // Check it's NOT already in the user's saved methods
        const alreadySaved = paymentMethods.some((pm: any) =>
            new RegExp(known.pattern.source, "i").test(pm.label),
        );
        if (!alreadySaved) return { type: known.type, label: known.label };
    }

    // Generic fallback: "[word(s)] card/credit/upi/wallet" pattern
    const genericMatch = message.match(
        /\b([A-Za-z][A-Za-z0-9\s]{1,20}?)\s+(card|credit\s*card|debit\s*card|upi|wallet)\b/i,
    );
    if (genericMatch) {
        const rawName = genericMatch[1].trim();
        const skip = /^(my|the|a|an|this|that|your|new|old|some|any|via|using|with|by)$/i;
        if (!skip.test(rawName) && rawName.length > 2) {
            const alreadySaved = paymentMethods.some((pm: any) =>
                pm.label.toLowerCase().includes(rawName.toLowerCase()),
            );
            if (!alreadySaved) {
                const label = rawName
                    .split(" ")
                    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                    .join(" ");
                const typeMatch = genericMatch[2].toLowerCase();
                const type = typeMatch === "upi" ? "upi" : typeMatch === "wallet" ? "wallet" : "card";
                return { type, label: `${label} ${type === "card" ? "Card" : ""}`.trim() };
            }
        }
    }

    return null;
}
