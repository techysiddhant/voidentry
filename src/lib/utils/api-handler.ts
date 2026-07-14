import { NextResponse } from "next/server";
import { ApiError } from "./api-error";

export async function apiHandler(
    handler: () => Promise<Response>
) {
    try {
        return await handler();
    } catch (error) {
        console.error(error);

        if (error instanceof ApiError) {
            return NextResponse.json(
                {
                    error: error.message,
                },
                {
                    status: error.status,
                }
            );
        }

        if (
            error instanceof Error &&
            error.message === "UNAUTHORIZED"
        ) {
            return NextResponse.json(
                {
                    error: "Unauthorized",
                },
                {
                    status: 401,
                }
            );
        }

        if (
            error instanceof Error &&
            error.message === "INVALID_JSON"
        ) {
            return NextResponse.json(
                {
                    error: "Invalid JSON",
                },
                {
                    status: 400,
                }
            );
        }

        return NextResponse.json(
            {
                error: "Internal Server Error",
            },
            {
                status: 500,
            }
        );
    }
}