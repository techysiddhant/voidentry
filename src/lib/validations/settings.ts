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
