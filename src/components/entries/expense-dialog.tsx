import { useEffect, useMemo, useState } from "react";
import { X, Plus, Users, Trash2 } from "lucide-react";
import {
    type Expense,
    type ExpenseInput,
    type PaymentType,
    type Split,
    type SplitMode,
    PAYMENT_META,
    formatMoney,
    useExpenses,
} from "@/lib/expense-store";
import { CATEGORY_META, SUBCATEGORIES, type Category } from "@/lib/mock-parse";

type Props = {
    open: boolean;
    onClose: () => void;
    editing?: Expense | null;
    initial?: Partial<ExpenseInput> | null;
};

const CATS: Category[] = ["food", "transport", "housing", "utilities", "personal", "travel", "misc"];
const PAY: PaymentType[] = ["cash", "card", "upi", "netbanking", "wallet"];

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

export function ExpenseDialog({ open, onClose, editing, initial }: Props) {
    const { addExpense, updateExpense, removeExpense, contacts, customSubs, addCustomSub, paymentMethods, addPaymentMethod } = useExpenses();

    const seed: ExpenseInput = useMemo(() => {
        if (editing) {
            const { id: _id, cycleId: _c, ...rest } = editing;
            void _id; void _c;
            return rest;
        }
        return {
            amount: initial?.amount ?? 0,
            note: initial?.note ?? "",
            category: initial?.category ?? "misc",
            subCategory: initial?.subCategory,
            date: initial?.date ?? todayISO(),
            payment: initial?.payment ?? { type: "upi" },
            comment: initial?.comment,
            split: initial?.split,
        };
    }, [editing, initial]);

    const [amount, setAmount] = useState<string>(seed.amount ? String(seed.amount) : "");
    const [note, setNote] = useState(seed.note);
    const [category, setCategory] = useState<Category>(seed.category);
    const [subCategory, setSubCategory] = useState<string>(seed.subCategory ?? "");
    const [date, setDate] = useState(seed.date);
    const [payType, setPayType] = useState<PaymentType>(seed.payment.type);
    const [cardName, setCardName] = useState(seed.payment.cardName ?? "");
    const [methodId, setMethodId] = useState<string | undefined>(seed.payment.methodId);
    const [comment, setComment] = useState(seed.comment ?? "");
    const [showNewMethod, setShowNewMethod] = useState(false);
    const [newMethodLabel, setNewMethodLabel] = useState("");
    const [newMethodHint, setNewMethodHint] = useState("");
    const [splitOn, setSplitOn] = useState<boolean>(!!seed.split);
    const [splitMode, setSplitMode] = useState<SplitMode>(seed.split?.mode ?? "equal");
    const [splitIds, setSplitIds] = useState<string[]>(seed.split?.participants.map((p) => p.contactId) ?? ["you"]);
    const [exactShares, setExactShares] = useState<Record<string, string>>(() => {
        const r: Record<string, string> = {};
        seed.split?.participants.forEach((p) => (r[p.contactId] = String(p.share)));
        return r;
    });
    const [showSubInput, setShowSubInput] = useState(false);
    const [newSub, setNewSub] = useState("");

    // Reset state whenever dialog is reopened with different seed
    useEffect(() => {
        if (!open) return;
        setAmount(seed.amount ? String(seed.amount) : "");
        setNote(seed.note);
        setCategory(seed.category);
        setSubCategory(seed.subCategory ?? "");
        setDate(seed.date);
        setPayType(seed.payment.type);
        setCardName(seed.payment.cardName ?? "");
        setMethodId(seed.payment.methodId);
        setShowNewMethod(false);
        setNewMethodLabel("");
        setNewMethodHint("");
        setComment(seed.comment ?? "");
        setSplitOn(!!seed.split);
        setSplitMode(seed.split?.mode ?? "equal");
        setSplitIds(seed.split?.participants.map((p) => p.contactId) ?? ["you"]);
        const r: Record<string, string> = {};
        seed.split?.participants.forEach((p) => (r[p.contactId] = String(p.share)));
        setExactShares(r);
        setShowSubInput(false);
        setNewSub("");
    }, [open, seed]);

    const amt = parseFloat(amount) || 0;
    const subs = useMemo(() => {
        const merged = [...SUBCATEGORIES[category], ...customSubs[category]];
        return Array.from(new Set(merged));
    }, [category, customSubs]);

    // Build split + validation
    const equalShare = splitIds.length > 0 ? amt / splitIds.length : 0;
    const exactSum = splitIds.reduce((s, id) => s + (parseFloat(exactShares[id] || "0") || 0), 0);
    const splitValid = !splitOn ? true : splitMode === "equal"
        ? splitIds.length >= 2 && amt > 0
        : splitIds.length >= 2 && amt > 0 && Math.abs(exactSum - amt) < 0.01;

    const canSave = amt > 0 && !!category && !!date && splitValid;

    const toggleId = (id: string) => {
        setSplitIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const onSave = () => {
        if (!canSave) return;
        let split: Split | undefined;
        if (splitOn && splitIds.length >= 2) {
            const participants = splitMode === "equal"
                ? splitIds.map((id) => ({ contactId: id, share: +(amt / splitIds.length).toFixed(2) }))
                : splitIds.map((id) => ({ contactId: id, share: parseFloat(exactShares[id] || "0") || 0 }));
            split = { mode: splitMode, participants };
        }

        const input: ExpenseInput = {
            amount: amt,
            note: note.trim() || CATEGORY_META[category].label,
            category,
            subCategory: subCategory.trim() || undefined,
            date,
            payment: {
                type: payType,
                cardName: payType === "card" ? cardName.trim() || undefined : undefined,
                methodId: methodId && paymentMethods.find((m) => m.id === methodId)?.type === payType ? methodId : undefined,
            },
            comment: comment.trim() || undefined,
            split,
        };

        if (editing) updateExpense(editing.id, input);
        else addExpense(input);
        onClose();
    };

    const onDelete = () => {
        if (!editing) return;
        removeExpense(editing.id);
        onClose();
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 overflow-y-auto" onClick={onClose}>
            <div
                className="brutal-border brutal-shadow bg-paper w-full max-w-lg my-8"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b-2 border-ink px-5 py-3">
                    <div className="font-mono text-xs uppercase tracking-widest">{editing ? "edit entry" : "new entry"}</div>
                    <button onClick={onClose} className="brutal-border bg-paper h-7 w-7 flex items-center justify-center" aria-label="Close">
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>

                <div className="p-5 space-y-5 max-h-[calc(100vh-10rem)] overflow-y-auto">
                    {/* Amount */}
                    <div>
                        <Label>Amount</Label>
                        <div className="mt-1.5 flex items-center brutal-border bg-paper">
                            <span className="px-3 py-2.5 font-serif text-2xl border-r-2 border-ink">₹</span>
                            <input
                                autoFocus
                                inputMode="decimal"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                                placeholder="0"
                                className="w-full bg-transparent px-3 py-2.5 font-mono text-2xl font-bold tabular-nums focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Note */}
                    <div>
                        <Label>Note</Label>
                        <input
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="what was it for?"
                            className="mt-1.5 w-full brutal-border bg-paper px-3 py-2.5 font-mono text-sm focus:outline-none"
                        />
                    </div>

                    {/* Category */}
                    <div>
                        <Label>Category</Label>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {CATS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => { setCategory(c); setSubCategory(""); }}
                                    className={[
                                        "brutal-border brutal-press px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest",
                                        category === c ? "bg-ink text-paper" : "bg-paper",
                                    ].join(" ")}
                                >
                                    #{c}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sub-category */}
                    <div>
                        <Label>Sub-category</Label>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {subs.map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => setSubCategory(s === subCategory ? "" : s)}
                                    className={[
                                        "brutal-border brutal-press px-2.5 py-1 font-mono text-[11px]",
                                        subCategory === s ? "bg-yellow" : "bg-paper",
                                    ].join(" ")}
                                >
                                    {s}
                                </button>
                            ))}
                            {!showSubInput ? (
                                <button
                                    type="button"
                                    onClick={() => setShowSubInput(true)}
                                    className="brutal-border brutal-press bg-secondary px-2.5 py-1 font-mono text-[11px] inline-flex items-center gap-1"
                                >
                                    <Plus className="h-3 w-3" /> custom
                                </button>
                            ) : (
                                <div className="flex items-center gap-1">
                                    <input
                                        autoFocus
                                        value={newSub}
                                        onChange={(e) => setNewSub(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                const n = newSub.trim();
                                                if (n) { addCustomSub(category, n); setSubCategory(n); }
                                                setNewSub(""); setShowSubInput(false);
                                            } else if (e.key === "Escape") {
                                                setNewSub(""); setShowSubInput(false);
                                            }
                                        }}
                                        placeholder="add…"
                                        className="brutal-border bg-paper px-2 py-1 font-mono text-[11px] w-24 focus:outline-none"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Date */}
                    <div>
                        <Label>Date</Label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="mt-1.5 w-full brutal-border bg-paper px-3 py-2.5 font-mono text-sm focus:outline-none"
                        />
                    </div>

                    {/* Payment */}
                    <div>
                        <Label>Payment</Label>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {PAY.map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => {
                                        setPayType(p);
                                        if (methodId && paymentMethods.find((m) => m.id === methodId)?.type !== p) {
                                            setMethodId(undefined);
                                        }
                                    }}
                                    className={[
                                        "brutal-border brutal-press px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest",
                                        payType === p ? "bg-teal text-paper" : "bg-paper",
                                    ].join(" ")}
                                >
                                    {PAYMENT_META[p].label}
                                </button>
                            ))}
                        </div>

                        {/* Saved methods of selected type */}
                        {(() => {
                            const methodsForType = paymentMethods.filter((m) => m.type === payType);
                            return (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {methodsForType.map((m) => {
                                        const on = methodId === m.id;
                                        return (
                                            <button
                                                key={m.id}
                                                type="button"
                                                onClick={() => {
                                                    if (on) {
                                                        setMethodId(undefined);
                                                    } else {
                                                        setMethodId(m.id);
                                                        if (payType === "card") setCardName(m.label);
                                                    }
                                                }}
                                                className={[
                                                    "brutal-border brutal-press px-2.5 py-1 font-mono text-[11px] inline-flex items-center gap-1.5",
                                                    on ? "bg-yellow" : "bg-paper",
                                                ].join(" ")}
                                            >
                                                <span>{m.label}</span>
                                                {m.hint && <span className="text-mute">{m.hint}</span>}
                                            </button>
                                        );
                                    })}
                                    {!showNewMethod ? (
                                        <button
                                            type="button"
                                            onClick={() => setShowNewMethod(true)}
                                            className="brutal-border brutal-press bg-secondary px-2.5 py-1 font-mono text-[11px] inline-flex items-center gap-1"
                                        >
                                            <Plus className="h-3 w-3" /> new
                                        </button>
                                    ) : (
                                        <div className="w-full mt-1 brutal-border bg-paper p-2 space-y-2">
                                            <input
                                                autoFocus
                                                value={newMethodLabel}
                                                onChange={(e) => setNewMethodLabel(e.target.value)}
                                                placeholder={`name (e.g. ${payType === "card" ? "HDFC Millennia" : "Personal " + PAYMENT_META[payType].label})`}
                                                className="w-full brutal-border bg-paper px-2 py-1 font-mono text-[11px] focus:outline-none"
                                            />
                                            <input
                                                value={newMethodHint}
                                                onChange={(e) => setNewMethodHint(e.target.value)}
                                                placeholder="optional hint (e.g. ··1234 or upi handle)"
                                                className="w-full brutal-border bg-paper px-2 py-1 font-mono text-[11px] focus:outline-none"
                                            />
                                            <div className="flex gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const label = newMethodLabel.trim();
                                                        if (!label) return;
                                                        const created = addPaymentMethod({ type: payType, label, hint: newMethodHint.trim() || undefined });
                                                        setMethodId(created.id);
                                                        if (payType === "card") setCardName(created.label);
                                                        setNewMethodLabel("");
                                                        setNewMethodHint("");
                                                        setShowNewMethod(false);
                                                    }}
                                                    className="brutal-border brutal-press bg-pink px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest"
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => { setShowNewMethod(false); setNewMethodLabel(""); setNewMethodHint(""); }}
                                                    className="brutal-border brutal-press bg-paper px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {payType === "card" && !methodId && (
                            <input
                                value={cardName}
                                onChange={(e) => setCardName(e.target.value)}
                                placeholder="card name (one-off)"
                                className="mt-2 w-full brutal-border bg-paper px-3 py-2 font-mono text-sm focus:outline-none"
                            />
                        )}
                    </div>

                    {/* Comment */}
                    <div>
                        <Label>Comment</Label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="optional"
                            rows={2}
                            className="mt-1.5 w-full brutal-border bg-paper px-3 py-2 font-mono text-sm focus:outline-none resize-none"
                        />
                    </div>

                    {/* Split */}
                    <div className="brutal-border bg-secondary">
                        <button
                            type="button"
                            onClick={() => setSplitOn((v) => !v)}
                            aria-pressed={splitOn}
                            className="w-full flex items-center justify-between px-3 py-2.5 border-b-2 border-ink cursor-pointer hover:bg-secondary/60"
                        >
                            <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest">
                                <Users className="h-3.5 w-3.5" /> Split this expense
                            </span>
                            <span
                                className={`brutal-border h-6 w-12 relative inline-block cursor-pointer ${splitOn ? "bg-teal" : "bg-paper"}`}
                            >
                                <span
                                    className={`absolute top-[1px] brutal-border h-[14px] w-[14px] transition-[transform,background-color] duration-150 ${splitOn ? "translate-x-[27px] bg-ink" : "translate-x-[3px] bg-paper"}`}
                                />
                            </span>
                        </button>
                        {splitOn && (
                            <div className="p-3 space-y-3">
                                <div className="flex gap-1.5">
                                    {(["equal", "exact"] as SplitMode[]).map((m) => (
                                        <button
                                            key={m}
                                            type="button"
                                            onClick={() => setSplitMode(m)}
                                            className={[
                                                "brutal-border brutal-press px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-widest",
                                                splitMode === m ? "bg-ink text-paper" : "bg-paper",
                                            ].join(" ")}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>

                                <div>
                                    <div className="font-mono text-[10px] uppercase tracking-widest text-mute mb-1.5">Participants</div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {contacts.map((c) => {
                                            const on = splitIds.includes(c.id);
                                            return (
                                                <button
                                                    key={c.id}
                                                    type="button"
                                                    onClick={() => toggleId(c.id)}
                                                    className={[
                                                        "brutal-border brutal-press px-2.5 py-1 font-mono text-[11px]",
                                                        on ? "bg-pink" : "bg-paper",
                                                    ].join(" ")}
                                                >
                                                    {c.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {contacts.length <= 1 && (
                                        <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-mute">
                                            Add people in Settings → People you split with
                                        </div>
                                    )}
                                </div>

                                {splitMode === "equal" && splitIds.length >= 2 && (
                                    <div className="font-mono text-xs">
                                        Each pays <span className="font-bold tabular-nums">{formatMoney(equalShare)}</span>
                                    </div>
                                )}

                                {splitMode === "exact" && splitIds.length >= 2 && (
                                    <div className="space-y-1.5">
                                        {splitIds.map((id) => {
                                            const c = contacts.find((x) => x.id === id);
                                            if (!c) return null;
                                            return (
                                                <div key={id} className="flex items-center gap-2">
                                                    <span className="font-mono text-xs w-24 truncate">{c.name}</span>
                                                    <div className="flex items-center brutal-border bg-paper flex-1">
                                                        <span className="px-2 py-1 font-mono text-xs border-r-2 border-ink">₹</span>
                                                        <input
                                                            inputMode="decimal"
                                                            value={exactShares[id] ?? ""}
                                                            onChange={(e) =>
                                                                setExactShares((prev) => ({ ...prev, [id]: e.target.value.replace(/[^\d.]/g, "") }))
                                                            }
                                                            placeholder="0"
                                                            className="w-full bg-transparent px-2 py-1 font-mono text-sm focus:outline-none"
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div className={`font-mono text-[11px] ${Math.abs(exactSum - amt) < 0.01 ? "text-teal" : "text-pink"}`}>
                                            sum {formatMoney(exactSum)} / {formatMoney(amt)}
                                        </div>
                                    </div>
                                )}

                                {splitOn && splitIds.length < 2 && (
                                    <div className="font-mono text-[10px] uppercase tracking-widest text-pink">
                                        pick at least 2 people
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t-2 border-ink px-5 py-3">
                    {editing ? (
                        <button
                            onClick={onDelete}
                            className="brutal-border brutal-press bg-paper px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-widest inline-flex items-center gap-1.5 hover:bg-pink"
                        >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                    ) : (
                        <span />
                    )}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="brutal-border brutal-press bg-paper px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-widest"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onSave}
                            disabled={!canSave}
                            className="brutal-border brutal-shadow-sm brutal-press bg-pink px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest disabled:opacity-40"
                        >
                            {editing ? "Save changes" : "Save entry"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Label({ children }: { children: React.ReactNode }) {
    return <span className="font-mono text-[11px] uppercase tracking-widest text-ink/70">{children}</span>;
}
