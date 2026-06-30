"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { signupSchema } from "@/lib/validations/auth";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type AuthMode = "signin" | "signup";

// ─── Validation helpers ───────────────────────────────────────────────────────

function validateName(value: string): string | undefined {
    const res = signupSchema.shape.name.safeParse(value);
    if (!res.success) return res.error.issues[0].message;
}

function validateEmail(value: string): string | undefined {
    const res = signupSchema.shape.email.safeParse(value);
    if (!res.success) return res.error.issues[0].message;
}

function validatePassword(value: string): string | undefined {
    const res = signupSchema.shape.password.safeParse(value);
    if (!res.success) return res.error.issues[0].message;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AuthPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();
    const mode: AuthMode =
        searchParams.get("mode") === "signup" ? "signup" : "signin";

    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Clear error message when switching modes
    useEffect(() => {
        setErrorMsg(null);
    }, [mode]);

    const form = useForm({
        defaultValues: { name: "", email: "", password: "" },
        onSubmit: async ({ value }) => {
            setErrorMsg(null);

            if (mode === "signup") {
                const { error } = await authClient.signUp.email({
                    email: value.email,
                    password: value.password,
                    name: value.name,
                });
                if (error) {
                    const message = error.message || "Failed to create account.";
                    setErrorMsg(message);
                    toast.error(message);
                    return;
                }
                toast.success("Account created successfully!");
            } else {
                const { error } = await authClient.signIn.email({
                    email: value.email,
                    password: value.password,
                });
                if (error) {
                    const message = error.message || "Failed to sign in.";
                    setErrorMsg(message);
                    toast.error(message);
                    return;
                }
                toast.success("Signed in successfully!");
            }

            queryClient.clear();
            router.replace("/app");
        },
    });

    return (
        <div className="min-h-screen flex flex-col bg-paper text-ink">
            {/* Header */}
            <header className="border-b-2 border-ink">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
                    <Link href="/" className="font-serif text-3xl leading-none tracking-tight">
                        Ledger<span className="text-pink">.</span>
                    </Link>
                </div>
            </header>

            {/* Main */}
            <main className="flex-1 flex items-center justify-center px-6 py-16">
                <div className="w-full max-w-md">
                    {/* Eyebrow */}
                    <div className="font-mono text-xs uppercase tracking-[0.2em] text-mute mb-3">
                        № {mode === "signup" ? "005" : "004"} —{" "}
                        {mode === "signup" ? "open an account" : "sign in"}
                    </div>

                    {/* Heading */}
                    <h1 className="font-serif text-5xl leading-[0.95] tracking-tight mb-2">
                        {mode === "signup" ? (
                            <>Start your <span className="italic">ledger.</span></>
                        ) : (
                            <>Welcome <span className="italic">back.</span></>
                        )}
                    </h1>

                    <p className="text-ink/70 mb-8">
                        {mode === "signup"
                            ? "Email and password. No social logins, no marketing, no nonsense."
                            : "Pick up exactly where you left off."}
                    </p>

                    {/* Card */}
                    <div className="brutal-border brutal-shadow bg-paper p-7">
                        {/* Tab switcher */}
                        <div className="flex border-b-2 border-ink -mx-7 -mt-7 mb-6 font-mono text-xs uppercase tracking-widest">
                            <Link
                                href="/auth?mode=signin"
                                className={`flex-1 px-5 py-3 text-center ${mode === "signin" ? "bg-ink text-paper" : "hover:bg-secondary"}`}
                            >
                                Sign in
                            </Link>
                            <Link
                                href="/auth?mode=signup"
                                className={`flex-1 px-5 py-3 text-center border-l-2 border-ink ${mode === "signup" ? "bg-ink text-paper" : "hover:bg-secondary"}`}
                            >
                                Create account
                            </Link>
                        </div>

                        {/* Error Alert */}
                        {errorMsg && (
                            <div
                                role="alert"
                                aria-live="assertive"
                                className="mb-6 p-4 bg-red-500/10 brutal-border border-red-500 text-red-500 font-mono text-xs uppercase tracking-wider text-center"
                            >
                                {errorMsg}
                            </div>
                        )}

                        {/* TanStack Form */}
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                form.handleSubmit();
                            }}
                            className="space-y-4"
                        >
                            {/* Name field (only on signup) */}
                            {mode === "signup" && (
                                <form.Field
                                    name="name"
                                    validators={{
                                        onChange: ({ value }) => validateName(value),
                                        onBlur: ({ value }) => validateName(value),
                                    }}
                                >
                                    {(field) => (
                                        <FieldWrapper
                                            label="Name"
                                            htmlFor={field.name}
                                            error={field.state.meta.errors[0]}
                                        >
                                            <Input
                                                id={field.name}
                                                name="name"
                                                type="text"
                                                autoComplete="name"
                                                value={field.state.value}
                                                onChange={(e) => field.handleChange(e.target.value)}
                                                onBlur={field.handleBlur}
                                                placeholder="John Doe"
                                                aria-invalid={field.state.meta.errors.length > 0}
                                                aria-describedby={field.state.meta.errors.length > 0 ? `${field.name}-error` : undefined}
                                                className="mt-1.5 w-full brutal-border bg-paper px-3 py-2.5 font-mono text-sm focus:outline-none focus:brutal-shadow-sm rounded-none border-0 border-inherit shadow-none h-auto"
                                            />
                                        </FieldWrapper>
                                    )}
                                </form.Field>
                            )}

                            {/* Email field */}
                            <form.Field
                                name="email"
                                validators={{
                                    onChange: ({ value }) => validateEmail(value),
                                    onBlur: ({ value }) => validateEmail(value),
                                }}
                            >
                                {(field) => (
                                    <FieldWrapper
                                        label="Email"
                                        htmlFor={field.name}
                                        error={field.state.meta.errors[0]}
                                    >
                                        <Input
                                            id={field.name}
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            value={field.state.value}
                                            onChange={(e) => field.handleChange(e.target.value)}
                                            onBlur={field.handleBlur}
                                            placeholder="you@domain.com"
                                            aria-invalid={field.state.meta.errors.length > 0}
                                            aria-describedby={field.state.meta.errors.length > 0 ? `${field.name}-error` : undefined}
                                            className="mt-1.5 w-full brutal-border bg-paper px-3 py-2.5 font-mono text-sm focus:outline-none focus:brutal-shadow-sm rounded-none border-0 border-inherit shadow-none h-auto"
                                        />
                                    </FieldWrapper>
                                )}
                            </form.Field>

                            {/* Password field */}
                            <form.Field
                                name="password"
                                validators={{
                                    onChange: ({ value }) => validatePassword(value),
                                    onBlur: ({ value }) => validatePassword(value),
                                }}
                            >
                                {(field) => (
                                    <FieldWrapper
                                        label="Password"
                                        htmlFor={field.name}
                                        error={field.state.meta.errors[0]}
                                    >
                                        <Input
                                            id={field.name}
                                            name="password"
                                            type="password"
                                            autoComplete={mode === "signup" ? "new-password" : "current-password"}
                                            value={field.state.value}
                                            onChange={(e) => field.handleChange(e.target.value)}
                                            onBlur={field.handleBlur}
                                            placeholder="••••••••"
                                            aria-invalid={field.state.meta.errors.length > 0}
                                            aria-describedby={field.state.meta.errors.length > 0 ? `${field.name}-error` : undefined}
                                            className="mt-1.5 w-full brutal-border bg-paper px-3 py-2.5 font-mono text-sm focus:outline-none focus:brutal-shadow-sm rounded-none border-0 border-inherit shadow-none h-auto"
                                        />
                                    </FieldWrapper>
                                )}
                            </form.Field>

                            {/* Submit */}
                            <form.Subscribe selector={(s) => s.isSubmitting}>
                                {(isSubmitting) => (
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="brutal-border brutal-shadow-sm brutal-press w-full bg-pink px-6 py-3 font-mono text-xs font-bold uppercase tracking-widest inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting
                                            ? "Please wait…"
                                            : mode === "signup"
                                                ? "Create account"
                                                : "Sign in"}{" "}
                                        {!isSubmitting && <ArrowRight className="h-3.5 w-3.5" />}
                                    </button>
                                )}
                            </form.Subscribe>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
}

// ─── FieldWrapper ─────────────────────────────────────────────────────────────

function FieldWrapper({
    label,
    htmlFor,
    error,
    children,
}: {
    label: string;
    htmlFor: string;
    error?: string | undefined;
    children: React.ReactNode;
}) {
    return (
        <div className="block">
            <Label
                htmlFor={htmlFor}
                className="font-mono text-[11px] uppercase tracking-widest text-ink/70 leading-none"
            >
                {label}
            </Label>
            {children}
            {error && (
                <p
                    id={`${htmlFor}-error`}
                    role="alert"
                    className="mt-1 font-mono text-[10px] uppercase tracking-widest text-red-500"
                >
                    {error}
                </p>
            )}
        </div>
    );
}
