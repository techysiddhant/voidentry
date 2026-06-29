"use client";

// AccountSection — shows the signed-in user's email and a sign-out button.
// Backend hook: replace the authClient.useSession() data with a server prop
// once SSR session passing is wired. Sign-out already hits the real API.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { Section, Row } from "./section";

export function AccountSection() {
    const { data: session } = authClient.useSession();
    const router = useRouter();
    const [signingOut, setSigningOut] = useState(false);

    const handleSignOut = async () => {
        setSigningOut(true);
        await authClient.signOut({
            fetchOptions: {
                onSuccess: () => {
                    toast.success("Signed out.");
                    router.push("/auth?mode=signin");
                },
                onError: (ctx) => {
                    toast.error(ctx.error.message ?? "Sign-out failed.");
                    setSigningOut(false);
                },
            },
        });
    };

    return (
        <Section title="Account">
            <Row label="Email">
                <span className="font-mono text-sm text-ink">
                    {session?.user.email ?? "—"}
                </span>
            </Row>
            <Row label="Name">
                <span className="font-mono text-sm text-ink">
                    {session?.user.name ?? "—"}
                </span>
            </Row>
            <Row label="Sign out">
                <button
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="brutal-border brutal-press bg-paper px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <LogOut className="h-3 w-3" />
                    {signingOut ? "Signing out…" : "Sign out"}
                </button>
            </Row>
        </Section>
    );
}
