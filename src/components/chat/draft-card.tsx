"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Clock, Pencil, Users, X } from "lucide-react";
import { PAYMENT_META, formatMoney, useExpenses } from "@/lib/expense-store";
import type { PendingDraft } from "@/types/expense";

interface DraftCardProps {
    draft: PendingDraft;
    status: "pending" | "confirmed" | "discarded";
    isEditing?: boolean;
    onConfirm: () => void;
    onDiscard: () => void;
    onEdit: () => void;
}

const AUTO_CONFIRM_SECS = 10;

export function DraftCard({
    draft,
    status,
    isEditing,
    onConfirm,
    onDiscard,
    onEdit,
}: DraftCardProps) {
    const { categoryByCode, subCategoryByCode } = useExpenses();
    const [countdown, setCountdown] = useState(AUTO_CONFIRM_SECS);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    /**
     * Auto-confirm countdown.
     * - Starts fresh when status becomes "pending".
     * - Stops (and clears interval) when status changes to anything else or is editing.
     */
    useEffect(() => {
        if (status !== "pending" || isEditing) {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            return;
        }

        let remaining = AUTO_CONFIRM_SECS;
        setCountdown(remaining);

        timerRef.current = setInterval(() => {
            remaining -= 1;
            setCountdown(remaining);
            if (remaining <= 0) {
                clearInterval(timerRef.current!);
                timerRef.current = null;
                onConfirm();
            }
        }, 1000);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, isEditing]);

    const category = categoryByCode[draft.categoryCode];
    const subCategory = draft.subCategoryCode ? subCategoryByCode[draft.subCategoryCode] : undefined;
    const pay = PAYMENT_META[draft.payment.type];
    const dimmed = status === "discarded";
    const progressPct = ((AUTO_CONFIRM_SECS - countdown) / AUTO_CONFIRM_SECS) * 100;

    return (
        <div className={`brutal-border brutal-shadow-sm bg-paper relative max-w-md ${dimmed ? "opacity-40" : ""}`}>
            {/* Category colour bar */}
            <div className={`absolute -left-0.5 top-0 bottom-0 w-2 ${category?.color ?? "bg-teal"}`} />

            <div className="pl-5 pr-4 py-4">
                {/* Typo correction note */}
                {draft._correctedInput && (
                    <div className="mb-2 font-mono text-[10px] text-mute italic">
                        Interpreted: &ldquo;{draft._correctedInput}&rdquo;
                    </div>
                )}

                {/* Amount + Note */}
                <div className="flex items-baseline justify-between gap-4">
                    <div className="font-serif text-xl leading-tight truncate">{draft.note}</div>
                    <div className="font-mono text-2xl font-bold tabular-nums">{formatMoney(draft.amount)}</div>
                </div>

                {/* Meta row */}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-widest text-mute">
                    <span>#{subCategory?.name ?? draft._newSubCategoryName ?? category?.name ?? draft.categoryCode}</span>
                    <span>·</span>
                    <span>
                        {new Date(draft.date + "T00:00:00Z").toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            timeZone: "UTC",
                        })}
                    </span>
                    <span>·</span>
                    <span>{pay.short}</span>
                    {draft.split && (
                        <>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1">
                                <Users className="h-3 w-3" /> split · {draft.split.participants.length}
                            </span>
                        </>
                    )}
                    {status === "confirmed" && (
                        <span className="ml-auto text-teal flex items-center gap-1">
                            <Check className="h-3 w-3" /> saved
                        </span>
                    )}
                    {status === "discarded" && <span className="ml-auto">discarded</span>}
                </div>

                {/* Comment */}
                {draft.comment && (
                    <div className="mt-1.5 font-mono text-[11px] text-mute italic truncate">
                        &#8220;{draft.comment}&#8221;
                    </div>
                )}

                {/* New payment method / sub-category badges */}
                {(draft._newPaymentMethod || draft._newSubCategoryName) && status !== "discarded" && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {draft._newPaymentMethod && (
                            <span className="brutal-border bg-yellow px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide">
                                🆕 New method: {draft._newPaymentMethod.label}
                            </span>
                        )}
                        {draft._newSubCategoryName && (
                            <span className="brutal-border bg-secondary px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide">
                                🆕 New tag: {draft._newSubCategoryName}
                            </span>
                        )}
                    </div>
                )}

                {/* Pending actions: countdown + buttons */}
                {status === "pending" && (
                    <>
                        {/* Progress bar */}
                        <div className="mt-3 h-0.5 bg-ink/10 overflow-hidden">
                            <div
                                className="h-full bg-ink/25 transition-all duration-1000 ease-linear"
                                style={{ width: `${progressPct}%` }}
                            />
                        </div>

                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                            {/* Countdown label */}
                            <div className="inline-flex items-center gap-1 font-mono text-[10px] text-mute">
                                <Clock className="h-3 w-3" />
                                Auto-saving in {countdown}s
                            </div>

                            {/* Action buttons */}
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={onConfirm}
                                    className="brutal-border brutal-press bg-teal text-paper px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest inline-flex items-center gap-1.5"
                                >
                                    <Check className="h-3.5 w-3.5" /> Confirm
                                </button>
                                <button
                                    onClick={onEdit}
                                    className="brutal-border brutal-press bg-paper px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest inline-flex items-center gap-1.5"
                                >
                                    <Pencil className="h-3.5 w-3.5" /> Edit
                                </button>
                                <button
                                    onClick={onDiscard}
                                    className="brutal-border brutal-press bg-paper px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest inline-flex items-center gap-1.5"
                                >
                                    <X className="h-3.5 w-3.5" /> Discard
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
