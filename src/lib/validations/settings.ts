import { z } from "zod";

export const updatePreferencesSchema = z.object({
    defaultCalendar: z.boolean().optional(),
    currency: z.string().trim().min(1, "Currency code is required").max(10).optional(),
    activeCycleId: z.preprocess(
        (val) => (val === "" ? null : val),
        z.string().trim().optional().nullable()
    ),
});

export const contactSchema = z.object({
    name: z.string().trim().min(1, "Name is required").max(100),
});

export const paymentMethodSchema = z.object({
    type: z.string().min(1, "Payment type is required"),
    label: z.string().trim().min(1, "Label is required").max(100),
    hint: z.string().trim().max(100).optional().nullable(),
});

export const cycleSchema = z.object({
    label: z.string().trim().min(1, "Label is required").max(50),
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be YYYY-MM-DD"),
    end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be YYYY-MM-DD"),
}).refine((data) => {
    const s = new Date(data.start + "T00:00:00Z");
    const e = new Date(data.end + "T00:00:00Z");
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return false;
    return s <= e;
}, {
    message: "Start date must be before or equal to end date, and both must be valid dates",
    path: ["end"],
});

const splitParticipantSchema = z.object({
    contactId: z.preprocess(
        (val) => typeof val === "string" ? val.trim() || null : val,
        z.string().optional().nullable()
    ),
    name: z.preprocess(
        (val) => typeof val === "string" ? val.trim() || null : val,
        z.string().max(100).optional().nullable()
    ),
    share: z.number().nonnegative(),
}).refine((participant) => Boolean(participant.contactId || participant.name), {
    message: "Each split participant must include a contactId or name",
    path: ["contactId"],
});

const splitSchema = z.object({
    mode: z.enum(["equal", "exact"]),
    participants: z.array(splitParticipantSchema).min(1, "At least one split participant is required"),
});

export const expenseInputSchema = z.object({
    amount: z.number().positive("Amount must be greater than zero"),
    note: z.string().trim().min(1, "Note is required").max(100),
    categoryCode: z.string().trim().min(1, "Category is required"),
    subCategoryCode: z.string().trim().max(100).optional().nullable(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
    payment: z.object({
        type: z.string().min(1, "Payment type is required"),
        cardName: z.string().trim().max(100).optional().nullable(),
        methodId: z.string().optional().nullable(),
    }),
    comment: z.string().trim().max(500).optional().nullable(),
    split: splitSchema.optional().nullable(),
    _newPaymentMethod: z.object({
        type: z.string().min(1),
        label: z.string().trim().min(1).max(100),
    }).optional().nullable(),
    _newSubCategoryName: z.string().trim().max(100).optional().nullable(),
}).superRefine((data, ctx) => {
    if (data.split?.mode !== "exact") return;

    const shareTotalCents = data.split.participants.reduce(
        (sum, participant) => sum + Math.round(participant.share * 100),
        0,
    );
    const amountCents = Math.round(data.amount * 100);

    if (shareTotalCents !== amountCents) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Exact split shares must total the transaction amount",
            path: ["split", "participants"],
        });
    }
});