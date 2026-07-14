import { z } from "zod";

const chatParseResultSchema = z.object({
    amount: z.number().positive().optional(),
    note: z.string().max(100).optional(),
    categoryCode: z.string().max(50).optional(),
    subCategoryCode: z.string().max(50).optional().nullable(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
    payment: z.object({
        type: z.string().max(20),
        methodId: z.string().max(100).optional().nullable(),
    }).optional(),
    newPaymentMethod: z.object({
        type: z.string().max(20),
        label: z.string().max(100),
    }).optional().nullable(),
    newSubCategoryName: z.string().max(100).optional().nullable(),
    comment: z.string().max(500).optional().nullable(),
    split: z.object({
        mode: z.enum(["equal", "exact"]),
        participants: z.array(
            z.object({
                contactId: z.string().max(100).optional().nullable(),
                name: z.string().max(100).optional().nullable(),
                share: z.number().nonnegative(),
            })
        ).max(50),
    }).optional().nullable(),
    correctedInput: z.string().max(500).optional().nullable(),
    clarification: z.string().max(500).optional().nullable(),
});

export const chatInputSchema = z.object({
    message: z.string().trim().min(1, "Message is required").max(1000),
    previousResult: chatParseResultSchema.optional().nullable(),
});
