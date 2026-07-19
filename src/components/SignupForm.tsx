"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "react-hot-toast";
import posthog from "posthog-js";

export default function SignupForm() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [privacyAccepted, setPrivacyAccepted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const isButtonLocked = !termsAccepted || !privacyAccepted;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isButtonLocked) return;

        setIsSubmitting(true);
        setErrorMsg(null);

        try {
            const res = await fetch("/api/auth/signup", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name,
                    email,
                    password,
                    termsAccepted,
                    privacyAccepted,
                }),
            });

            const data = (await res.json()) as any;

            if (!res.ok) {
                throw new Error(data.error || "An error occurred during registration.");
            }

            posthog.identify(data.user.id, {
                email: data.user.email,
                name: data.user.name,
            });
            toast.success("Account created successfully!");
            router.refresh();
            router.replace("/app");
        } catch (err: any) {
            const message = err.message || "Failed to create account.";
            setErrorMsg(message);
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error Alert */}
            {errorMsg && (
                <div
                    role="alert"
                    aria-live="assertive"
                    className="p-4 bg-red-500/10 brutal-border border-red-500 text-red-500 font-mono text-xs uppercase tracking-wider text-center"
                >
                    {errorMsg}
                </div>
            )}

            {/* Name field */}
            <div className="block">
                <Label
                    htmlFor="signup-name"
                    className="font-mono text-[11px] uppercase tracking-widest text-ink/70 leading-none"
                >
                    Name
                </Label>
                <Input
                    id="signup-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="mt-1.5 w-full brutal-border bg-paper px-3 py-2.5 font-mono text-sm focus:outline-none focus:brutal-shadow-sm rounded-none border-0 border-inherit shadow-none h-auto text-ink"
                />
            </div>

            {/* Email field */}
            <div className="block">
                <Label
                    htmlFor="signup-email"
                    className="font-mono text-[11px] uppercase tracking-widest text-ink/70 leading-none"
                >
                    Email
                </Label>
                <Input
                    id="signup-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="mt-1.5 w-full brutal-border bg-paper px-3 py-2.5 font-mono text-sm focus:outline-none focus:brutal-shadow-sm rounded-none border-0 border-inherit shadow-none h-auto text-ink"
                />
            </div>

            {/* Password field */}
            <div className="block">
                <Label
                    htmlFor="signup-password"
                    className="font-mono text-[11px] uppercase tracking-widest text-ink/70 leading-none"
                >
                    Password
                </Label>
                <Input
                    id="signup-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="mt-1.5 w-full brutal-border bg-paper px-3 py-2.5 font-mono text-sm focus:outline-none focus:brutal-shadow-sm rounded-none border-0 border-inherit shadow-none h-auto text-ink"
                />
            </div>

            {/* DPDP Consent Section */}
            <div className="space-y-1 pt-2 border-t border-ink/10">
                {/* <div className="font-mono text-[10px] uppercase tracking-widest text-mute mb-1">
                    Compliance & Consent (DPDP ACT)
                </div> */}

                {/* Checkbox 1 */}
                <div className="flex items-start gap-3 select-none">
                    <Checkbox
                        id="terms-accepted"
                        checked={termsAccepted}
                        onCheckedChange={(checked) => setTermsAccepted(!!checked)}
                        className="mt-0.5 brutal-border bg-paper rounded-none cursor-pointer size-3 data-[state=checked]:bg-ink data-[state=checked]:border-ink data-[state=checked]:text-paper focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <label htmlFor="terms-accepted" className="font-mono text-[11px] leading-relaxed text-ink/80 uppercase tracking-wide cursor-pointer">
                        I accept the{" "}
                        <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline font-bold hover:text-pink">
                            Terms of Service
                        </a>
                    </label>
                </div>

                {/* Checkbox 2 */}
                <div className="flex items-start gap-3 select-none">
                    <Checkbox
                        id="privacy-accepted"
                        checked={privacyAccepted}
                        onCheckedChange={(checked) => setPrivacyAccepted(!!checked)}
                        className="mt-0.5 brutal-border bg-paper rounded-none cursor-pointer size-3 data-[state=checked]:bg-ink data-[state=checked]:border-ink data-[state=checked]:text-paper focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <label htmlFor="privacy-accepted" className="font-mono text-[11px] leading-relaxed text-ink/80 uppercase tracking-wide cursor-pointer">
                        I have read the{" "}
                        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline font-bold hover:text-pink">
                            Privacy Policy
                        </a>{" "}
                    </label>
                </div>
            </div>

            {/* Submit Button */}
            <button
                type="submit"
                disabled={isButtonLocked || isSubmitting}
                className={`w-full brutal-border px-6 py-3 font-mono text-xs font-bold uppercase tracking-widest inline-flex items-center justify-center gap-2 transition-all rounded-none ${isButtonLocked
                    ? "bg-secondary text-ink/50 cursor-not-allowed opacity-70"
                    : "bg-pink text-ink brutal-shadow-sm brutal-press cursor-pointer"
                    }`}
            >
                {isSubmitting ? (
                    "Creating Account..."
                ) : (
                    <>
                        Create Account
                        {isButtonLocked ? <Lock className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
                    </>
                )}
            </button>
        </form>
    );
}
