import { useEffect, useMemo, useState } from "react";
import { X, Plus, Users, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Expense, ExpenseCreateInput, ExpenseInput } from "@/types/expense";
import { PaymentType } from "@/types/payment";
import { Category } from "@/types/category";
import { Split, SplitMode } from "@/types/split";
import { formatMoney } from "@/lib/utils";
import { settingsApi } from "@/lib/api/settings";
import { entriesApi } from "@/lib/api/entries";
import { QUERY_KEYS } from "@/lib/query-keys";
import toast from "react-hot-toast";

type Props = {
    open: boolean;
    onClose: () => void;
    editing?: Expense | null;
    initial?: (Partial<ExpenseInput> & {
        _newPaymentMethod?: { type: PaymentType; label: string } | null;
        _newSubCategoryName?: string | null;
    }) | null;
};

function todayISO() {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
}

export function ExpenseDialog({ open, onClose, editing, initial }: Props) {
    const queryClient = useQueryClient();

    // 1. Fetch settings
    const { data: settings, isLoading: isSettingsLoading } = useQuery({
        queryKey: QUERY_KEYS.SETTINGS,
        queryFn: settingsApi.getSettings,
    });

    const activeCycleId = settings?.preferences?.activeCycleId;

    const categories = useMemo(() => settings?.categories ?? [], [settings]);
    const paymentMethods = useMemo(() => settings?.paymentMethods ?? [], [settings]);
    const paymentMethodTypes = useMemo(() => settings?.paymentMethodTypes ?? [], [settings]);
    const contacts = useMemo(() => settings?.contacts ?? [], [settings]);

    const categoryByCode = useMemo(() => {
        const record: Record<string, any> = {};
        settings?.categories?.forEach((c) => {
            record[c.code] = c;
        });
        return record;
    }, [settings?.categories]);

    const subCategoriesByCategoryCode = useMemo(() => {
        const record: Record<string, any[]> = {};
        settings?.subCategories?.forEach((s) => {
            const arr = record[s.categoryCode] ?? [];
            arr.push(s);
            record[s.categoryCode] = arr;
        });
        return record;
    }, [settings?.subCategories]);

    // 2. Mutations
    const addMutation = useMutation({
        mutationFn: entriesApi.addEntry,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ENTRIES] });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SETTINGS });
            toast.success("Entry added.");
            onClose();
        },
        onError: (err: any) => {
            const msg = err.response?.data?.error || "Failed to add entry.";
            toast.error(msg);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: ExpenseCreateInput }) =>
            entriesApi.updateEntry(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ENTRIES] });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SETTINGS });
            toast.success("Entry updated.");
            onClose();
        },
        onError: (err: any) => {
            const msg = err.response?.data?.error || "Failed to update entry.";
            toast.error(msg);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: entriesApi.removeEntry,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ENTRIES] });
            toast.success("Entry deleted.");
            onClose();
        },
        onError: (err: any) => {
            const msg = err.response?.data?.error || "Failed to delete entry.";
            toast.error(msg);
        },
    });

    const seed: ExpenseInput = useMemo(() => {
        if (editing) {
            const { id: _id, cycleId: _c, ...rest } = editing;
            void _id; void _c;
            return {
                amount: rest.amount,
                note: rest.note,
                categoryCode: rest.category.code,
                subCategoryCode: rest.subCategory?.code,
                date: rest.date,
                payment: rest.payment,
                comment: rest.comment,
                split: rest.split,
            };
        }
        return {
            amount: initial?.amount ?? 0,
            note: initial?.note ?? "",
            categoryCode: initial?.categoryCode ?? categories[0]?.code ?? "misc",
            subCategoryCode: initial?.subCategoryCode,
            date: initial?.date ?? todayISO(),
            payment: initial?.payment ?? { type: "upi" },
            comment: initial?.comment,
            split: initial?.split,
        };
    }, [editing, initial, categories]);

    const [amount, setAmount] = useState<string>(seed.amount ? String(seed.amount) : "");
    const [note, setNote] = useState(seed.note);
    const [categoryCode, setCategoryCode] = useState<Category>(seed.categoryCode);
    const [subCategoryCode, setSubCategoryCode] = useState<string | undefined>(seed.subCategoryCode);
    const [date, setDate] = useState(seed.date);
    const [payType, setPayType] = useState<PaymentType>(seed.payment.type);
    const [cardName, setCardName] = useState(seed.payment.cardName ?? "");
    const [methodId, setMethodId] = useState<string | undefined>(seed.payment.methodId);
    const [comment, setComment] = useState(seed.comment ?? "");
    const [showNewMethod, setShowNewMethod] = useState(false);
    const [newMethodLabel, setNewMethodLabel] = useState("");
    const [newMethodHint, setNewMethodHint] = useState("");
    const [newMethodData, setNewMethodData] = useState<{ type: PaymentType; label: string; hint?: string } | null>(null);
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
    const [newSubCategoryName, setNewSubCategoryName] = useState(initial?._newSubCategoryName ?? "");

    const editingId = editing?.id;
    // Reset state whenever dialog is reopened with different seed
    useEffect(() => {
        if (!open) return;
        setAmount(seed.amount ? String(seed.amount) : "");
        setNote(seed.note);
        setCategoryCode(seed.categoryCode);
        setSubCategoryCode(seed.subCategoryCode);
        setDate(seed.date);

        let initialMethodId = seed.payment.methodId;
        let initialPayType = seed.payment.type;
        let initialNewMethod: { type: PaymentType; label: string; hint?: string } | null = null;

        if (initial?._newPaymentMethod) {
            const exists = paymentMethods.find(
                (pm) =>
                    pm.type === initial._newPaymentMethod!.type &&
                    pm.label.toLowerCase() === initial._newPaymentMethod!.label.toLowerCase(),
            );
            if (exists) {
                initialMethodId = exists.id;
                initialPayType = exists.type as PaymentType;
            } else {
                initialMethodId = undefined;
                initialPayType = initial._newPaymentMethod.type;
                initialNewMethod = {
                    type: initial._newPaymentMethod.type,
                    label: initial._newPaymentMethod.label,
                };
            }
        }

        setPayType(initialPayType);
        setCardName(seed.payment.cardName ?? "");
        setMethodId(initialMethodId);
        setNewMethodData(initialNewMethod);
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
        setNewSubCategoryName(initial?._newSubCategoryName ?? "");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, editingId]);

    const amt = parseFloat(amount) || 0;
    const subs = useMemo(() => {
        const base = subCategoriesByCategoryCode[categoryCode] || [];
        if (!newSubCategoryName) return base;
        return [
            ...base,
            {
                id: `new-${newSubCategoryName}`,
                categoryId: "",
                categoryCode,
                code: "",
                name: newSubCategoryName,
                sortOrder: 999,
            },
        ];
    }, [categoryCode, newSubCategoryName, subCategoriesByCategoryCode]);

    // Build split + validation
    const equalShare = splitIds.length > 0 ? amt / splitIds.length : 0;
    const exactSum = splitIds.reduce((s, id) => s + (parseFloat(exactShares[id] || "0") || 0), 0);
    const splitValid = !splitOn ? true : splitMode === "equal"
        ? splitIds.length >= 2 && amt > 0
        : splitIds.length >= 2 && amt > 0 && Math.abs(exactSum - amt) < 0.01;

    const toggleId = (id: string) => {
        setSplitIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const canSave = amt > 0 && !!categoryCode && !!date && splitValid;

    const onSave = () => {
        if (!canSave) return;
        let split: Split | undefined;
        if (splitOn && splitIds.length >= 2) {
            let participants: { contactId: string; share: number }[] = [];
            if (splitMode === "equal") {
                const totalCents = Math.round(amt * 100);
                const numPeople = splitIds.length;
                const baseCents = Math.floor(totalCents / numPeople);
                const remainderCents = totalCents % numPeople;
                participants = splitIds.map((id, index) => {
                    const addedCent = index < remainderCents ? 1 : 0;
                    const shareCents = baseCents + addedCent;
                    return {
                        contactId: id,
                        share: +(shareCents / 100).toFixed(2),
                    };
                });
            } else {
                participants = splitIds.map((id) => ({
                    contactId: id,
                    share: parseFloat(exactShares[id] || "0") || 0,
                }));
            }
            split = { mode: splitMode, participants };
        }

        const input: ExpenseCreateInput = {
            amount: amt,
            note: note.trim() || categoryByCode[categoryCode]?.name || "Expense",
            categoryCode,
            subCategoryCode,
            date,
            payment: {
                type: payType,
                cardName: payType === "card" ? cardName.trim() || undefined : undefined,
                methodId: methodId && paymentMethods.find((m) => m.id === methodId)?.type === payType ? methodId : undefined,
            },
            comment: comment.trim() || undefined,
            split,
            _newPaymentMethod: !methodId && newMethodData && newMethodData.type === payType ? newMethodData : undefined,
            _newSubCategoryName: !subCategoryCode && newSubCategoryName ? newSubCategoryName : undefined,
        };

        if (editing) {
            updateMutation.mutate({ id: editing.id, data: input });
        } else {
            addMutation.mutate(input);
        }
    };

    const onDelete = () => {
        if (!editing) return;
        deleteMutation.mutate(editing.id);
    };

    if (!open) return null;

    if (isSettingsLoading || !settings) {
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
                    <div className="flex h-[200px] items-center justify-center font-mono text-xs uppercase tracking-widest text-mute">
                        Loading...
                    </div>
                </div>
            </div>
        );
    }

    const selectedPmType = paymentMethodTypes.find((t) => t.code === payType);
    const placeholderLabel = selectedPmType?.name ?? payType;

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
                            {categories.map((category) => (
                                <button
                                    key={category.code}
                                    type="button"
                                    onClick={() => {
                                        setCategoryCode(category.code);
                                        setSubCategoryCode(undefined);
                                        setNewSubCategoryName("");
                                    }}
                                    className={[
                                        "brutal-border brutal-press px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest",
                                        categoryCode === category.code ? "bg-ink text-paper" : "bg-paper",
                                    ].join(" ")}
                                >
                                    #{category.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sub-category */}
                    <div>
                        <Label>Sub-category</Label>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {subs.map((subCategory) => (
                                <button
                                    key={subCategory.id || `${subCategory.categoryCode}-${subCategory.name}`}
                                    type="button"
                                    onClick={() => {
                                        const isSelected = subCategory.code
                                            ? subCategoryCode === subCategory.code
                                            : newSubCategoryName === subCategory.name;
                                        if (isSelected) {
                                            setSubCategoryCode(undefined);
                                            setNewSubCategoryName("");
                                        } else if (subCategory.code) {
                                            setSubCategoryCode(subCategory.code);
                                            setNewSubCategoryName("");
                                        } else {
                                            setSubCategoryCode(undefined);
                                            setNewSubCategoryName(subCategory.name);
                                        }
                                    }}
                                    className={[
                                        "brutal-border brutal-press px-2.5 py-1 font-mono text-[11px]",
                                        (subCategory.code ? subCategoryCode === subCategory.code : newSubCategoryName === subCategory.name)
                                            ? "bg-yellow"
                                            : "bg-paper",
                                    ].join(" ")}
                                >
                                    {subCategory.name}
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
                                                if (n) {
                                                    setSubCategoryCode(undefined);
                                                    setNewSubCategoryName(n);
                                                }
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
                            {paymentMethodTypes.map((pmType) => (
                                <button
                                    key={pmType.code}
                                    type="button"
                                    onClick={() => {
                                        setPayType(pmType.code);
                                        if (methodId && paymentMethods.find((m) => m.id === methodId)?.type !== pmType.code) {
                                            setMethodId(undefined);
                                        }
                                    }}
                                    className={[
                                        "brutal-border brutal-press px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest",
                                        payType === pmType.code ? "bg-teal text-paper" : "bg-paper",
                                    ].join(" ")}
                                >
                                    {pmType.name}
                                </button>
                            ))}
                        </div>

                        {/* Saved methods of selected type */}
                        {(() => {
                            const methodsForType = paymentMethods.filter((m) => m.type === payType);
                            const hasNewLocal = newMethodData && newMethodData.type === payType;
                            const isNewLocalSelected = hasNewLocal && !methodId;

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

                                    {hasNewLocal && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (isNewLocalSelected) {
                                                    setMethodId(undefined);
                                                    setNewMethodData(null);
                                                } else {
                                                    setMethodId(undefined);
                                                }
                                            }}
                                            className={[
                                                "brutal-border brutal-press px-2.5 py-1 font-mono text-[11px] inline-flex items-center gap-1.5",
                                                isNewLocalSelected ? "bg-yellow" : "bg-paper",
                                            ].join(" ")}
                                        >
                                            <span>{newMethodData.label}</span>
                                            <span className="text-mute">new</span>
                                        </button>
                                    )}

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
                                                placeholder={`name (e.g. ${payType === "card" ? "HDFC Millennia" : "Personal " + placeholderLabel})`}
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
                                                        setNewMethodData({ type: payType, label, hint: newMethodHint.trim() || undefined });
                                                        setMethodId(undefined);
                                                        if (payType === "card") setCardName(label);
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
                                    className={`absolute top-[3px] brutal-border h-[14px] w-[14px] transition-[transform,background-color] duration-150 ${splitOn ? "translate-x-1 bg-ink" : "-translate-x-5 bg-paper"}`}
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
                            disabled={deleteMutation.isPending}
                            className="brutal-border brutal-press bg-paper px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-widest inline-flex items-center gap-1.5 hover:bg-pink disabled:opacity-50"
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
                            disabled={!canSave || addMutation.isPending || updateMutation.isPending}
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