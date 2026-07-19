import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import getAuth from "@/lib/auth";
import { getDb } from "@/db/client";
import { consentAuditLogs } from "@/db/schema";
import { captureServerEvent } from "@/lib/posthog-server";

const signupConsentSchema = z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters."),
    email: z.string().trim().email("Enter a valid email address."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    termsAccepted: z.boolean().refine(val => val === true, {
        message: "You must accept the Terms of Service.",
    }),
    privacyAccepted: z.boolean().refine(val => val === true, {
        message: "You must consent to the Privacy Notice and processing.",
    }),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        // Validate compliance payload
        const result = signupConsentSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: result.error.issues[0].message },
                { status: 400 }
            );
        }
        
        const { name, email, password, termsAccepted, privacyAccepted } = result.data;
        
        const auth = getAuth();
        const db = getDb();

        // Forward headers to Better Auth for cookies/session setting
        const headersObj = new Headers();
        request.headers.forEach((value, key) => {
            headersObj.set(key, value);
        });

        // 1. Sign up the user via Better Auth API with asResponse: true
        const signUpResponse = await auth.api.signUpEmail({
            body: {
                name,
                email,
                password,
            },
            headers: headersObj,
            asResponse: true,
        });

        if (!signUpResponse.ok) {
            const errData = (await signUpResponse.json()) as any;
            return NextResponse.json(
                { error: errData.message || "Failed to register user account." },
                { status: signUpResponse.status }
            );
        }

        const data = (await signUpResponse.json()) as any;
        const newUser = data.user;

        // 2. Extract Client IP
        const ipAddress = 
            request.headers.get("cf-connecting-ip") ||
            request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
            "127.0.0.1";

        // 3. Append immutable log to consent ledger
        await db.insert(consentAuditLogs).values({
            userId: newUser.id,
            termsAccepted,
            privacyAccepted,
            artifactVersion: "v1.0.0",
            purposeScope: ["manual_data_entry", "ai_financial_insights"],
            ipAddress,
            timestampUtc: new Date(),
        });

        await captureServerEvent(newUser.id, "account_created", {
            authentication_method: "email_password",
            terms_accepted: termsAccepted,
            privacy_accepted: privacyAccepted,
        });

        // 4. Return success and forward headers (cookies) set by Better Auth
        const responseHeaders = new Headers();
        const setCookie = signUpResponse.headers.get("set-cookie");
        if (setCookie) {
            responseHeaders.set("set-cookie", setCookie);
        }

        return NextResponse.json({
            success: true,
            user: newUser,
            session: data.session,
        }, {
            headers: responseHeaders
        });

    } catch (err: any) {
        console.error("Signup Route Error:", err);
        return NextResponse.json(
            { error: err.message || "Failed to process user registration." },
            { status: 500 }
        );
    }
}
