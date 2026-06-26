import { ArrowRight, Check, Users } from "lucide-react";
import Link from "next/link";

const Hero = () => {
    return (<section className="border-b-2 border-ink">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 py-20 md:py-24 lg:grid-cols-12">
            <div className="lg:col-span-6">
                <div className="mb-6 font-mono text-xs uppercase tracking-[0.2em] text-mute">
                    № 001 — AI-powered expense tracker
                </div>
                <h1 className="font-serif text-5xl leading-[0.95] tracking-tight md:text-7xl">
                    Type what you spent.
                    <br />
                    <span className="italic">We'll handle the rest.</span>
                </h1>
                <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink/80">
                    Ledger turns a one-line chat message into a tracked expense — category, date,
                    payment method, splits. All in ₹. Custom cycles when calendar months don't fit your life.
                </p>
                <div className="mt-10 flex flex-wrap items-center gap-4">
                    <Link
                        href="/auth"
                        className="brutal-border brutal-shadow brutal-press inline-flex items-center gap-3 bg-pink px-6 py-4 font-mono text-sm font-bold uppercase tracking-widest"
                    >
                        Start tracking <ArrowRight className="h-4 w-4" />
                    </Link>
                    <a
                        href="#how"
                        className="brutal-border brutal-press inline-flex items-center gap-3 bg-paper px-6 py-4 font-mono text-sm font-bold uppercase tracking-widest"
                    >
                        See how it works
                    </a>
                </div>
                <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-xs text-mute">
                    <span className="flex items-center gap-2"><Check className="h-3.5 w-3.5" /> free, no paid tier</span>
                    <span className="flex items-center gap-2"><Check className="h-3.5 w-3.5" /> works on any browser</span>
                </div>
            </div>

            <div className="lg:col-span-6">
                <ChatMockup />
            </div>
        </div>
    </section>)
}

export default Hero;


function ChatMockup() {
    return (
        <div className="relative mx-auto max-w-md">
            <div className="absolute inset-0 translate-x-4 translate-y-4 bg-teal brutal-border" />
            <div className="relative brutal-border bg-paper">
                <div className="border-b-2 border-ink px-4 py-2 flex items-center justify-between">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-mute">№ capture</div>
                    <div className="flex gap-1.5">
                        <span className="h-2.5 w-2.5 brutal-border bg-pink" />
                        <span className="h-2.5 w-2.5 brutal-border bg-yellow" />
                        <span className="h-2.5 w-2.5 brutal-border bg-teal" />
                    </div>
                </div>
                <div className="p-4 space-y-4">
                    <UserBubble text="280 flat white" />
                    <DraftCard note="flat white" cat="food" sub="coffee" pay="UPI" amt="₹280" date="Today" />
                    <UserBubble text="uber 240 yesterday" />
                    <DraftCard note="uber" cat="transport" sub="uber/ola" pay="UPI" amt="₹240" date="Yesterday" accent="yellow" />
                    <UserBubble text="ramen w/ sam 1840 split" />
                    <DraftCard note="ramen w/ sam" cat="food" sub="dining out" pay="UPI" amt="₹1,840" date="Today" accent="teal" split="2" />
                </div>
                <div className="border-t-2 border-ink px-4 py-3">
                    <div className="brutal-border bg-paper flex items-center px-3 py-2">
                        <span className="font-mono text-xs text-mute flex-1">type what you spent…</span>
                        <span className="brutal-border bg-pink h-7 w-7 flex items-center justify-center">
                            <ArrowRight className="h-3.5 w-3.5 -rotate-90" />
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function UserBubble({ text }: { text: string }) {
    return (
        <div className="flex justify-end">
            <div className="brutal-border bg-ink text-paper px-3 py-1.5 font-mono text-xs">{text}</div>
        </div>
    );
}
function DraftCard({
    note, cat, sub, pay, amt, date, accent = "pink", split,
}: { note: string; cat: string; sub: string; pay: string; amt: string; date: string; accent?: "pink" | "yellow" | "teal"; split?: string }) {
    const accentCls = accent === "pink" ? "bg-pink" : accent === "yellow" ? "bg-yellow" : "bg-teal";
    return (
        <div className="brutal-border bg-paper relative">
            <div className={`absolute -left-0.5 top-0 bottom-0 w-1.5 ${accentCls}`} />
            <div className="pl-4 pr-3 py-2.5">
                <div className="flex items-baseline justify-between gap-3">
                    <div className="font-serif text-base truncate">{note}</div>
                    <div className="font-mono text-lg font-bold tabular-nums">{amt}</div>
                </div>
                <div className="mt-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-mute">
                    <span>#{cat}</span><span>·</span><span>{sub}</span><span>·</span><span>{pay}</span><span>·</span><span>{date}</span>
                    {split && (<><span>·</span><span className="inline-flex items-center gap-1"><Users className="h-2.5 w-2.5" /> split · {split}</span></>)}
                </div>
            </div>
        </div>
    );
}