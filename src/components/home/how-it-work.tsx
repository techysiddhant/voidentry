"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

function HowItWorks() {
    const { data: session } = authClient.useSession();
    const trackingUrl = session ? "/app" : "/auth";

    const steps = [
        { n: "01", title: "Type it", body: "“280 flat white”, “uber 240 yesterday”, “rent 28000”. Anything goes.", accent: "bg-pink" },
        { n: "02", title: "Confirm or tweak", body: "AI fills the draft. Add a split, change the payment method, set sub-category.", accent: "bg-yellow" },
        { n: "03", title: "Watch your cycle", body: "Pace, top categories, splits owed — all in one screen, in ₹.", accent: "bg-teal" },
    ];
    return (
        <section id="how" className="border-b-2 border-ink">
            <div className="mx-auto max-w-7xl px-6 py-20">
                <div className="mb-12">
                    <div className="font-mono text-xs uppercase tracking-[0.2em] text-mute mb-3">№ 004 — how it works</div>
                    <h2 className="font-serif text-5xl md:text-6xl leading-[0.95] tracking-tight">
                        Three taps. <span className="italic">That's the loop.</span>
                    </h2>
                </div>
                <div className="grid gap-6 md:grid-cols-3">
                    {steps.map((s) => (
                        <div key={s.n} className="brutal-border brutal-shadow-sm bg-paper p-6 relative">
                            <div className={`absolute -top-px -right-px brutal-border ${s.accent} px-3 py-1 font-mono text-xs font-bold`}>{s.n}</div>
                            <h3 className="font-serif text-3xl leading-tight mt-2 mb-3">{s.title}</h3>
                            <p className="text-sm leading-relaxed text-ink/75">{s.body}</p>
                        </div>
                    ))}
                </div>
                <div className="mt-12 text-center">
                    <Link
                        href={trackingUrl}
                        // search={{ mode: "signup" }}
                        className="brutal-border brutal-shadow brutal-press inline-flex items-center gap-3 bg-pink px-7 py-4 font-mono text-sm font-bold uppercase tracking-widest"
                    >
                        Start tracking <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </div>
        </section>
    );
}

export default HowItWorks