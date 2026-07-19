"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    SidebarProvider,
    SidebarInset,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { authClient } from "@/lib/auth-client";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import posthog from "posthog-js";

export default function UserRoutesLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { data: session, isPending } = authClient.useSession();

    useEffect(() => {
        if (!isPending && !session) {
            router.replace("/auth?mode=signin");
        }
    }, [session, isPending, router]);

    useEffect(() => {
        if (session?.user) {
            posthog.identify(session.user.id, {
                email: session.user.email,
                name: session.user.name,
            });
        }
    }, [session]);

    if (isPending || !session) {
        return (
            <div className="min-h-screen bg-paper flex items-center justify-center font-mono text-sm uppercase tracking-widest text-mute">
                Loading Voidentry...
            </div>
        );
    }

    return (
        <SidebarProvider defaultOpen={true}>
            <AppSidebar />
            <SidebarInset>
                {/* Top header bar with sidebar trigger + mobile logo */}
                <header className="flex h-14 shrink-0 items-center gap-2 border-b-2 border-ink bg-paper px-4">
                    <SidebarTrigger className="-ml-1 text-ink hover:bg-secondary rounded-md" />
                    <Separator orientation="vertical" className="mr-2 h-5 bg-ink/20 md:block hidden" />
                    {/* Mobile logo — sidebar header is hidden on mobile */}
                    <Link
                        href="/app"
                        className="font-serif text-xl leading-none text-ink hover:no-underline md:hidden"
                    >
                        Voidentry<span className="text-pink">.</span>
                    </Link>
                </header>

                {/* Page content */}
                <main className="flex-1 bg-paper text-ink">
                    {children}
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}