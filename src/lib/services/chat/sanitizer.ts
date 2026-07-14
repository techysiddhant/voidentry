// ─── Chat Result Sanitizer ─────────────────────────────────────────────────────
// Validates and fixes common AI mistakes regardless of model quality.

import type { ChatParseResult } from "@/types/chat";

export interface SanitizerContext {
    categories: Array<{ code: string; name: string }>;
    subCategories: Array<{ code: string; name: string; categoryCode: string }>;
    paymentMethods: Array<{ id: string; type: string; label: string }>;
    originalMessage: string;
    currentDate: string;
    cycleStart: string;
    cycleEnd: string;
}

/**
 * Post-processes and validates AI-generated expense parse results.
 * Fixes hallucinated IDs, invalid categories, out-of-range dates, etc.
 */
export function sanitizeResult(result: ChatParseResult, ctx: SanitizerContext): ChatParseResult {
    if (!result || result.clarification) return result;

    // Validate amount is present, finite, and strictly positive
    const amt = result.amount;
    if (amt === undefined || amt === null || typeof amt !== "number" || !Number.isFinite(amt) || amt <= 0) {
        return {
            clarification: "Please specify a valid positive amount.",
        };
    }

    // 1. Validate methodId — if AI hallucinated an ID not in the user's list, clear it
    if (result.payment?.methodId) {
        const exists = ctx.paymentMethods.find((pm) => pm.id === result.payment!.methodId);
        if (!exists) {
            console.warn(`[chat] AI returned invalid methodId "${result.payment.methodId}", clearing it.`);
            result.payment.methodId = null;
        }
    }

    // 2. If no valid methodId AND no newPaymentMethod, try to detect unknown bank/card names
    if (!result.payment?.methodId && !result.newPaymentMethod) {
        const detected = detectUnknownPaymentMethod(ctx.originalMessage, ctx.paymentMethods);
        if (detected) {
            result.newPaymentMethod = detected;
            result.payment = { ...(result.payment || { type: detected.type }), type: detected.type, methodId: null };
        }
    }

    // 3. Ensure category code is valid
    const validCategory = ctx.categories.find((c) => c.code === result.categoryCode);
    if (!validCategory) {
        result.categoryCode = ctx.categories[0]?.code ?? "misc";
    }

    // 4. Ensure subcategory code belongs to the selected category
    const allowedSubs = ctx.subCategories.filter((sc) => sc.categoryCode === result.categoryCode);
    if (result.subCategoryCode && !allowedSubs.some((sc) => sc.code === result.subCategoryCode)) {
        result.subCategoryCode = null;
    }

    // 5. Clear newSubCategoryName when a valid subCategoryCode exists
    if (result.subCategoryCode) {
        result.newSubCategoryName = null;
    }

    // 6. Validate date matches strict YYYY-MM-DD format before comparing range
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (result.date && dateRegex.test(result.date)) {
        if (result.date < ctx.cycleStart || result.date > ctx.cycleEnd) {
            result.date = ctx.currentDate;
        }
    } else {
        result.date = ctx.currentDate;
    }

    return result;
}

// ─── Known Indian Payment Methods ─────────────────────────────────────────────
// Curated list: catches typo-variants and common Indian bank names that a small LLM might miss.
const KNOWN_PAYMENT_METHODS = [
    // Co-branded Cards (check these first to prevent generic bank matches)
    { pattern: /\baxis\s*flipkart\b|\bflipkart\s*axis\b/i, label: "Axis Flipkart", type: "card" },
    { pattern: /\bamazon\s*pay\s*icici\b|\bicici\s*amazon\s*pay\b/i, label: "ICICI Amazon Pay", type: "card" },
    { pattern: /\bswiggy\s*hdfc\b|\bhdfc\s*swiggy\b/i, label: "HDFC Swiggy", type: "card" },
    { pattern: /\btata\s*neu\s*hdfc\b|\bhdfc\s*tata\s*neu\b/i, label: "HDFC Tata Neu", type: "card" },
    { pattern: /\bairtel\s*axis\b|\baxis\s*airtel\b/i, label: "Axis Airtel", type: "card" },

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

/**
 * Detects payment methods mentioned in the message that are not in the user's saved list.
 * Uses regex patterns optimised for Indian banking terminology and common typos.
 */
function detectUnknownPaymentMethod(
    message: string,
    paymentMethods: Array<{ id: string; type: string; label: string }>,
): { type: string; label: string } | null {
    for (const known of KNOWN_PAYMENT_METHODS) {
        if (!known.pattern.test(message)) continue;
        // Check it's NOT already in the user's saved methods
        const alreadySaved = paymentMethods.some((pm) =>
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
            const alreadySaved = paymentMethods.some((pm) =>
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
