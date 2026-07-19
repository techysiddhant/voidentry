"use client";

import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { BetaBadge } from "./beta-badge";
import posthog from "posthog-js";

const Header = () => {
    const router = useRouter();
    const { data: session, isPending } = authClient.useSession();

    const handleSignOut = async () => {
        await authClient.signOut({
            fetchOptions: {
                onSuccess: () => {
                    posthog.reset();
                    router.push("/");
                    router.refresh();
                },
            },
        });
    };

    return (
        <header className="border-b-2 border-ink">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
                <Link href="/" className="font-serif text-3xl leading-none tracking-tight">
                    Voidentry<span className="text-pink">.</span> {" "}
                    <BetaBadge />
                </Link>
                <div className="flex items-center gap-3 min-h-[38px]">
                    {!isPending && (
                        session ? (
                            <>
                                <button
                                    onClick={handleSignOut}
                                    className="font-mono text-xs uppercase tracking-widest hover:underline underline-offset-4 cursor-pointer"
                                >
                                    Sign out
                                </button>
                                <Link
                                    href="/app"
                                    className="brutal-border brutal-shadow-sm brutal-press inline-flex items-center gap-2 bg-yellow px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest font-bold"
                                >
                                    Dashboard
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/auth?mode=signin"
                                    className="hidden md:inline-flex font-mono text-xs uppercase tracking-widest hover:underline underline-offset-4"
                                >
                                    Sign in
                                </Link>
                                <Link
                                    href="/auth"
                                    className="brutal-border brutal-shadow-sm brutal-press inline-flex items-center gap-2 bg-yellow px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest"
                                >
                                    Start tracking
                                </Link>
                            </>
                        )
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;