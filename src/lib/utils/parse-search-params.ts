import { z } from "zod";
import { ApiError } from "./api-error";

/**
 * Parses URL search params from a Request and validates them against
 * a Zod schema. Throws ApiError(400) on validation failure.
 *
 * Works like `validateRequest` but for GET query strings instead of
 * JSON bodies.
 */
export function parseSearchParams<T extends z.ZodTypeAny>(
    request: Request,
    schema: T
): z.infer<T> {
    const { searchParams } = new URL(request.url);

    // Convert URLSearchParams to a plain object for Zod parsing.
    // Only includes keys that are actually present in the URL.
    const raw: Record<string, string> = {};
    searchParams.forEach((value, key) => {
        raw[key] = value;
    });

    const result = schema.safeParse(raw);

    if (!result.success) {
        throw new ApiError(400, result.error.issues[0].message);
    }

    return result.data;
}
