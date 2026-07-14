import { getDb } from "@/db/client";
import { chatInputSchema } from "@/lib/validations/chat";
import { apiHandler } from "@/lib/utils/api-handler";
import { ok } from "@/lib/utils/api-response";
import { requireSession } from "@/lib/services/auth/require-session";
import { validateRequest } from "@/lib/utils/validate-request";
import { parseChatMessage } from "@/lib/services/chat/chat-service";

export const runtime = "edge";

/**
 * @api {POST} /api/chat  Parse Expense from Natural Language
 *
 * @apiDescription Parses a natural language expense message using AI (Cloudflare
 * AI Gateway → Direct Gemini fallback). Returns structured expense data for
 * client-side confirmation/editing. Does NOT write to the database.
 *
 * @apiBody {String} message           Natural language expense message (1-1000 chars)
 * @apiBody {Object} [previousResult]  Previous AI parse result for edit/correction flow
 *
 * @apiSuccess {Object} result   Parsed expense data (ChatParseResult) or { clarification }
 * @apiSuccess {String} provider Which AI provider was used: "gateway" | "gemini" | "unavailable"
 *
 * @apiError (400) BadRequest  Empty or invalid message
 * @apiError (401) Unauthorized Session is invalid or missing
 * @apiError (500) InternalServerError AI provider or database failure
 */
export async function POST(request: Request) {
    return apiHandler(async () => {
        const session = await requireSession();

        const input = await validateRequest(request, chatInputSchema);

        const response = await parseChatMessage({
            db: getDb(),
            userId: session.user.id,
            message: input.message,
            previousResult: input.previousResult,
        });

        return ok(response);
    });
}