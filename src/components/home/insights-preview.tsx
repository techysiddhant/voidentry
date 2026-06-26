import { Cycle, Expense } from "@/lib/expense-store";
import CategoryDonut from "../insights/category-donut";
import { DailyBars } from "../insights/daily-bars";
const mockCycle: Cycle = { id: "demo", label: "This cycle", start: "2026-06-01", end: "2026-06-30" };
const mockExpenses: Expense[] = [
    { id: "1", amount: 28000, note: "rent", category: "housing", date: "2026-06-01", cycleId: "demo", payment: { type: "netbanking" } },
    { id: "2", amount: 2460, note: "big bazaar", category: "groceries", date: "2026-06-03", cycleId: "demo", payment: { type: "card" } },
    { id: "3", amount: 1840, note: "ramen", category: "food", date: "2026-06-05", cycleId: "demo", payment: { type: "upi" } },
    { id: "4", amount: 280, note: "coffee", category: "food", date: "2026-06-07", cycleId: "demo", payment: { type: "upi" } },
    { id: "5", amount: 240, note: "uber", category: "transport", date: "2026-06-08", cycleId: "demo", payment: { type: "upi" } },
    { id: "6", amount: 400, note: "metro", category: "transport", date: "2026-06-09", cycleId: "demo", payment: { type: "wallet" } },
    { id: "7", amount: 119, note: "spotify", category: "subs", date: "2026-06-10", cycleId: "demo", payment: { type: "card" } },
    { id: "8", amount: 1200, note: "groceries", category: "groceries", date: "2026-06-12", cycleId: "demo", payment: { type: "upi" } },
    { id: "9", amount: 680, note: "dinner", category: "food", date: "2026-06-13", cycleId: "demo", payment: { type: "card" } },
    { id: "10", amount: 520, note: "fuel", category: "transport", date: "2026-06-14", cycleId: "demo", payment: { type: "card" } },
];
function InsightsPreview() {
    return (
        <section className="border-b-2 border-ink bg-secondary/30">
            <div className="mx-auto max-w-7xl px-6 py-20">
                <div className="mb-12">
                    <div className="font-mono text-xs uppercase tracking-[0.2em] text-mute mb-3">№ 003 — insights</div>
                    <h2 className="font-serif text-5xl md:text-6xl leading-[0.95] tracking-tight max-w-3xl">
                        See where the money <span className="italic">actually went.</span>
                    </h2>
                </div>
                <div className="grid gap-6 lg:grid-cols-2">
                    <CategoryDonut expenses={mockExpenses} />
                    <DailyBars cycle={mockCycle} expenses={mockExpenses} />
                </div>
            </div>
        </section>
    );
}

export default InsightsPreview;