// ─── Gemini AI Provider Runner ──────────────────────────────────────────────────
// Executes generative expense parsing directly via Google AI Studio API.

import type { ChatParseResult } from "@/types/chat";

interface ProviderOpts {
    geminiKey: string;
    prompt: string;
    message: string;
    responseSchema: any;
}

interface ProviderResult {
    result: ChatParseResult;
    provider: "gemini";
}

/**
 * Calls Gemini 2.5 Flash directly via the Google AI Studio API.
 * Uses the generous free tier.
 */
export async function runGemini(opts: ProviderOpts): Promise<ProviderResult | null> {
    const { geminiKey, prompt, message, responseSchema } = opts;

    if (!geminiKey) return null;

    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": geminiKey,
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `${prompt}\n\nUser Input: "${message}"` }] }],
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema,
                },
            }),
            signal: controller.signal,
        });

        if (!res.ok) {
            console.error(`[chat] Gemini API error ${res.status}: ${await res.text()}`);
            return null;
        }

        const data = (await res.json()) as any;
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            console.error("[chat] Gemini returned empty content");
            return null;
        }

        const parsed: ChatParseResult = JSON.parse(text.trim());
        return { result: parsed, provider: "gemini" };
    } catch (err: any) {
        if (err?.name === "AbortError") {
            console.error("[chat] Gemini API request timed out after 20s");
        } else {
            console.error("[chat] Gemini API failed:", err?.message ?? err);
        }
        return null;
    } finally {
        clearTimeout(timeout);
    }
}
