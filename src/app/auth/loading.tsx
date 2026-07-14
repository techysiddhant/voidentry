import { Skeleton } from "@/components/ui/skeleton";

// ─── Auth Page Skeleton ───────────────────────────────────────────────────────
// Mirrors the visual structure of AuthPage while the page JS chunk is loading.

export default function AuthLoading() {
    return (
        <div className="min-h-screen flex flex-col bg-paper text-ink">
            {/* Header */}
            <header className="border-b-2 border-ink">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
                    {/* Logo wordmark */}
                    <Skeleton className="h-8 w-24 bg-ink/10 rounded-none" />
                </div>
            </header>

            {/* Main */}
            <main className="flex-1 flex items-center justify-center px-6 py-16">
                <div className="w-full max-w-md">
                    {/* Eyebrow — "№ 004 — sign in" */}
                    <Skeleton className="h-3 w-36 mb-3 bg-ink/10 rounded-none" />

                    {/* Heading — two lines */}
                    <Skeleton className="h-12 w-4/5 mb-2 bg-ink/10 rounded-none" />
                    <Skeleton className="h-12 w-1/2 mb-4 bg-ink/10 rounded-none" />

                    {/* Sub-paragraph */}
                    <Skeleton className="h-4 w-full mb-1.5 bg-ink/10 rounded-none" />
                    <Skeleton className="h-4 w-3/4 mb-8 bg-ink/10 rounded-none" />

                    {/* Card */}
                    <div className="brutal-border brutal-shadow bg-paper">
                        {/* Tab switcher */}
                        <div className="flex border-b-2 border-ink">
                            <div className="flex-1 px-5 py-3 bg-ink/10">
                                <Skeleton className="h-3 w-12 mx-auto bg-ink/20 rounded-none" />
                            </div>
                            <div className="flex-1 px-5 py-3 border-l-2 border-ink">
                                <Skeleton className="h-3 w-24 mx-auto bg-ink/10 rounded-none" />
                            </div>
                        </div>

                        <div className="p-7 space-y-5">
                            {/* Email field */}
                            <div className="space-y-1.5">
                                <Skeleton className="h-2.5 w-10 bg-ink/10 rounded-none" />
                                <Skeleton className="h-10 w-full brutal-border bg-ink/5 rounded-none" />
                            </div>

                            {/* Password field */}
                            <div className="space-y-1.5">
                                <Skeleton className="h-2.5 w-16 bg-ink/10 rounded-none" />
                                <Skeleton className="h-10 w-full brutal-border bg-ink/5 rounded-none" />
                            </div>

                            {/* Submit button */}
                            <Skeleton className="h-11 w-full brutal-border bg-pink/30 rounded-none" />
                        </div>
                    </div>

                    {/* Footer note */}
                    <Skeleton className="h-2.5 w-40 mx-auto mt-6 bg-ink/10 rounded-none" />
                </div>
            </main>
        </div>
    );
}