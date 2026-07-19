import { getDb } from "@/db/client";
import { expenseInputSchema } from "@/lib/validations/settings";
import { getEntriesSchema } from "@/lib/validations/entries";
import { apiHandler } from "@/lib/utils/api-handler";
import { ok } from "@/lib/utils/api-response";
import { requireSession } from "@/lib/services/auth/require-session";
import { validateRequest } from "@/lib/utils/validate-request";
import { parseSearchParams } from "@/lib/utils/parse-search-params";
import { getEntries } from "@/lib/services/expense/get-entries";
import { createExpense } from "@/lib/services/expense/create-expense";
import { captureServerEvent } from "@/lib/posthog-server";

/**
 * @api {GET} /api/entries  Paginated Cycle Entries
 *
 * @apiDescription Returns a cursor-paginated list of expenses for a given
 * cycle. Each page is enriched in-memory with categories, subcategories,
 * and split participant data.
 *
 * @apiQuery {String}  cycleId  UUID of the cycle to fetch entries for (required)
 * @apiQuery {String}  [cursor] Opaque "date|id" cursor from a previous response
 * @apiQuery {Number}  [limit=20] Page size (1–50)
 *
 * @apiSuccess {Object[]} items      Formatted expense entries
 * @apiSuccess {String|null} nextCursor  Cursor to fetch the next page, or null
 * @apiSuccess {Boolean} hasMore     Whether more pages exist
 *
 * @apiError (400) BadRequest  Missing cycleId or invalid cursor/limit
 * @apiError (401) Unauthorized Session is invalid or missing
 * @apiError (500) InternalServerError Database query failure
 */
export async function GET(request: Request) {
    return apiHandler(async () => {
        const session = await requireSession();

        const params = parseSearchParams(request, getEntriesSchema);

        const result = await getEntries({
            db: getDb(),
            userId: session.user.id,
            ...params,
        });

        return ok(result);
    });
}

/**
 * @api {POST} /api/entries  Create Expense Entry
 *
 * @apiDescription Creates a new expense entry. If a new category, subcategory,
 * payment method, or split contact is supplied by code/name instead of ID,
 * it is automatically created and linked.
 *
 * @apiBody {Number} amount           Positive transaction amount (decimal)
 * @apiBody {String} note             Note/description of the expense
 * @apiBody {String} categoryCode     Existing category code or new category name
 * @apiBody {String} [subCategoryCode] Existing subcategory code or new name
 * @apiBody {String} date             Transaction date (YYYY-MM-DD)
 * @apiBody {Object} payment          Payment method details (type, optional cardName/methodId)
 * @apiBody {String} [comment]        Optional comments/notes
 * @apiBody {Object} [split]          Optional split configurations
 *
 * @apiSuccess (201) {Object} entry Resolved and enriched expense entry
 *
 * @apiError (400) BadRequest  Validation error or missing active cycle
 * @apiError (401) Unauthorized Session is invalid or missing
 * @apiError (500) InternalServerError Database insert failure
 */
export async function POST(request: Request) {
    return apiHandler(async () => {
        const session = await requireSession();

        const input = await validateRequest(
            request,
            expenseInputSchema
        );

        const result = await createExpense({
            db: getDb(),
            userId: session.user.id,
            input: input as any,
        });

        await captureServerEvent(session.user.id, "expense_created", {
            category_code: input.categoryCode,
            payment_type: input.payment.type,
            has_split: Boolean(input.split),
            has_subcategory: Boolean(input.subCategoryCode),
        });

        return ok(result, 201);
    });
}