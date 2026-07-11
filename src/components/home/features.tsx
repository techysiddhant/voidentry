import { BarChart3, CalendarRange, Check, CreditCard, MessageSquare, Users } from "lucide-react";

function Features() {
    return (
        <section id="features" className="border-b-2 border-ink">
            <div className="mx-auto max-w-7xl px-6 py-20">
                <div className="mb-14 flex items-end justify-between gap-8 flex-wrap">
                    <div>
                        <div className="font-mono text-xs uppercase tracking-[0.2em] text-mute mb-3">№ 002 — what's inside</div>
                        <h2 className="font-serif text-5xl md:text-6xl leading-[0.95] tracking-tight max-w-2xl">
                            Everything you need.<br /><span className="italic">Nothing you don't.</span>
                        </h2>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <FeatureCard icon={MessageSquare} accent="bg-pink" title="AI chat capture" body="Type a line. We extract amount, category, date, and payment. Confirm or tweak in one click." />
                    <FeatureCard icon={Users} accent="bg-yellow" title="Splits with friends" body="Equal or exact-amount splits. Saved contacts, per-person shares, owed totals." />
                    <FeatureCard icon={CalendarRange} accent="bg-teal" title="Custom cycles" body="Salary cycle (25 → 24)? Quarterly review? Label your own cycles instead of the calendar's." />
                    <FeatureCard icon={CreditCard} accent="bg-pink" title="Saved payment methods" body="UPI, cards, wallets, net banking — saved once, picked in one tap on every entry." />
                    <FeatureCard icon={BarChart3} accent="bg-yellow" title="Insights that fit" body="Cycle pulse, category donut, daily bars, payment split, subs watch. Just the truth." />
                    <FeatureCard icon={Check} accent="bg-teal" title="No paid tier" body="Free, in ₹, no upsells, no streaks. Just a tracker that respects your attention." />
                </div>
            </div>
        </section>
    );
}
export default Features;
function FeatureCard({ icon: Icon, accent, title, body }: { icon: typeof MessageSquare; accent: string; title: string; body: string }) {
    return (
        <div className="brutal-border brutal-shadow-sm bg-paper p-6">
            <div className={`brutal-border ${accent} inline-flex h-10 w-10 items-center justify-center mb-4`}>
                <Icon className="h-5 w-5" />
            </div>
            <h3 className="font-serif text-2xl leading-tight mb-2">{title}</h3>
            <p className="text-sm leading-relaxed text-ink/75">{body}</p>
        </div>
    );
}