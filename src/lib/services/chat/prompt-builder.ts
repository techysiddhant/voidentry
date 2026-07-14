// ─── System Prompt Builder ─────────────────────────────────────────────────────
// Generates the system prompt and Gemini response schema for the chat expense parser.

export interface PromptContext {
    currentDate: string;
    cycleStart: string;
    cycleEnd: string;
    categories: Array<{ code: string; name: string }>;
    subCategories: Array<{ code: string; name: string; categoryCode: string }>;
    paymentMethods: Array<{ id: string; type: string; label: string }>;
    contacts: Array<{ id: string; name: string }>;
}

/**
 * Builds the full system prompt for expense parsing.
 * Includes context about the user's catalog, payment methods, contacts, and the active cycle.
 * Handles edit/correction flow when previousResult is provided.
 */
export function buildSystemPrompt(ctx: PromptContext, previousResult?: any): string {
    const categoriesText = ctx.categories
        .map((c) => `- ${c.code}: ${c.name}`)
        .join("\n");

    const subCategoriesByCategory = ctx.categories
        .map((cat) => {
            const labels = ctx.subCategories
                .filter((sc) => sc.categoryCode === cat.code)
                .map((sc) => `"${sc.code}" (${sc.name})`)
                .join(", ");
            return `  ${cat.name}: ${labels || "(none)"}`;
        })
        .join("\n");

    let prompt = `You are a smart, typo-tolerant personal expense parser for an Indian user. Your job is to understand natural language expense messages, correct any typos, and return a structured JSON object.

CONTEXT:
- Today's date: ${ctx.currentDate}
- Billing cycle: ${ctx.cycleStart} to ${ctx.cycleEnd}
- Allowed categories:
${categoriesText}
- Allowed subcategories by category code:
${subCategoriesByCategory}
- User's saved payment methods (JSON): ${JSON.stringify(ctx.paymentMethods)}
- User's contacts for splitting: ${JSON.stringify(ctx.contacts)}

STEP 1 — FIX TYPOS & SHORTHAND:
Silently correct obvious typos, misspellings, and shorthand FIRST. Set "correctedInput" to the corrected sentence if you changed anything; null otherwise.
Examples: "coffe"→"coffee", "ubr"→"Uber", "induslund"→"IndusInd", "appolloy"→"Apollo", "yespop"→"Yes Pop", "swgy"→"Swiggy".

STEP 2 — EXTRACT EXPENSE FIELDS:
- "amount" (number, REQUIRED): Extract the monetary amount. No amount = set "clarification".
- "note" (string): Short clean description only — no amount, date, or payment info. E.g. "Apollo blood test", "Swiggy biriyani", "Blue Tokai flat white".
- "categoryCode" (string): EXACTLY one of the category codes above. Use context — medical/hospital → personal, rides/fuel → transport, food/restaurant → food, etc.
- "subCategoryCode" (string | null): Use one allowed subcategory code for the chosen category whenever there is a clear match.
- "date" (YYYY-MM-DD): Resolve relative dates from today (${ctx.currentDate}). Must be within [${ctx.cycleStart}, ${ctx.cycleEnd}].
- "payment.type": One of [cash, card, upi, netbanking, wallet].
- "payment.methodId": Check the user's saved payment methods. If the mentioned bank/card/app MATCHES one by name or label → set its ID. If it does NOT match any saved method → set null AND set "newPaymentMethod".
- "newPaymentMethod" ({ type, label } | null): If user mentions a payment method NOT in their saved list (e.g. "Yes Pop card", "IndusInd", "Axis Visa", "HDFC credit", "CRED UPI"), set this with the corrected label and inferred type. Preserve full brand and co-brand names (e.g. "Axis Flipkart", "ICICI Amazon Pay", "HDFC Swiggy") instead of truncating them to generic names like "Axis Card". Know Indian banking: "Yes Pop" = Yes Bank credit card (type: card), "OneCard" = card, "Slice" = card, "CRED" = card/upi, "Simpl" = wallet, etc.
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

    // Add edit/correction context if the user is refining a previous result
    if (previousResult) {
        prompt += `

EDIT/CORRECTION MODE:
The user previously parsed an expense and got this result:
${JSON.stringify(previousResult, null, 2)}

The user is now sending a correction or edit message. Apply their requested changes to the previous result and return the updated complete JSON. For example:
- "change date to yesterday" → update the date field
- "no, it was 300 not 200" → update the amount field
- "use hdfc card instead" → update the payment fields
- "add a comment: work lunch" → set the comment field
Keep all other fields from the previous result intact unless the user explicitly changes them.`;
    }

    return prompt;
}

/**
 * Builds the Gemini response schema for structured JSON output.
 */
export function buildResponseSchema(categories: Array<{ code: string }>) {
    return {
        type: "OBJECT",
        properties: {
            amount: { type: "NUMBER", minimum: 0.01 },
            note: { type: "STRING" },
            categoryCode: {
                type: "STRING",
                enum: categories.map((c) => c.code),
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
