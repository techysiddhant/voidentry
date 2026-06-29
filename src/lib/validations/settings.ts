import { z } from "zod";

export const updatePreferencesSchema = z.object({
    defaultCalendar: z.boolean(),
    currency: z.string().trim().min(1, "Currency code is required").max(10),
});

export const contactSchema = z.object({
    name: z.string().trim().min(1, "Name is required").max(100),
});

export const paymentMethodSchema = z.object({
    type: z.string().min(1, "Payment type is required"),
    label: z.string().trim().min(1, "Label is required").max(100),
    hint: z.string().trim().max(100).optional().nullable(),
});
