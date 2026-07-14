import { z } from "zod";

/**
 * Validation schema for GET /api/entries query parameters.
 */
export const getEntriesSchema = z.object({
    cycleId: z.string().optional(),
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    scope: z.enum(["cycle", "all"]).default("cycle"),
    q: z.string().optional(),
    cats: z.preprocess(
        (val) => (typeof val === "string" ? val.split(",") : val),
        z.array(z.string()).optional()
    ),
    subs: z.preprocess(
        (val) => (typeof val === "string" ? val.split(",") : val),
        z.array(z.string()).optional()
    ),
    pms: z.preprocess(
        (val) => (typeof val === "string" ? val.split(",") : val),
        z.array(z.string()).optional()
    ),
    pts: z.preprocess(
        (val) => (typeof val === "string" ? val.split(",") : val),
        z.array(z.string()).optional()
    ),
    min: z.coerce.number().optional(),
    max: z.coerce.number().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    date: z.string().optional(),
    splitOnly: z.preprocess(
        (val) => val === "true" || val === "1" || val === true,
        z.boolean().optional()
    ),
});

export type GetEntriesParams = z.infer<typeof getEntriesSchema>;
