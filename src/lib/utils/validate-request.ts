import { ApiError } from "./api-error";
import { z } from "zod";

export async function validateRequest<T extends z.ZodTypeAny>(
    request: Request,
    schema: T
): Promise<z.infer<T>> {
    let body;

    try {
        body = await request.json();
    } catch {
        throw new ApiError(400, "Invalid JSON");
    }

    const result = schema.safeParse(body);

    if (!result.success) {
        throw new ApiError(400, result.error.issues[0].message);
    }

    return result.data;
}