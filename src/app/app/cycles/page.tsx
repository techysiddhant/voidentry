"use client";

import { useState, FormEvent } from "react";
import { Plus, Check, X, Pencil, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDateRange, formatMoney, getCalendarMonth } from "@/lib/utils";
import { settingsApi } from "@/lib/api/settings";
import { cyclesApi } from "@/lib/api/cycles";
import { QUERY_KEYS } from "@/lib/query-keys";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Cycle } from "@/types/cycle";
import toast from "react-hot-toast";

function isoToday(offset = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

export default function CyclesPage() {
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [editingCycle, setEditingCycle] = useState<Cycle | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // 1. Fetch settings (contains activeCycleId and defaultCalendar preference)
    const { data: settings, isLoading: isSettingsLoading, error: settingsError } = useQuery({
        queryKey: QUERY_KEYS.SETTINGS,
        queryFn: settingsApi.getSettings,
    });

    // 2. Fetch cycles
    const { data: cycles, isLoading: isCyclesLoading, error: cyclesError } = useQuery({
        queryKey: QUERY_KEYS.CYCLES,
        queryFn: cyclesApi.getCycles,
    });

    const activeCycleId = settings?.preferences?.activeCycleId;

    // 3. Set Active Mutation
    const setActiveMutation = useMutation({
        mutationFn: (id: string) => settingsApi.updatePreferences({ activeCycleId: id }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SETTINGS });
            toast.success("Active cycle updated.");
        },
        onError: (err: any) => {
            const msg = err.response?.data?.error || "Failed to set active cycle.";
            toast.error(msg);
        },
    });

    // 4. Create Cycle Mutation
    const createMutation = useMutation({
        mutationFn: cyclesApi.addCycle,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CYCLES });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SETTINGS });
            toast.success("Cycle created and set as active.");
            setOpen(false);
        },
        onError: (err: any) => {
            const msg = err.response?.data?.error || "Failed to create cycle.";
            toast.error(msg);
        },
    });

    // 5. Update Cycle Mutation
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Omit<Cycle, "id"> }) =>
            cyclesApi.updateCycle(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CYCLES });
            toast.success("Cycle updated.");
            setOpen(false);
            setEditingCycle(null);
        },
        onError: (err: any) => {
            const msg = err.response?.data?.error || "Failed to update cycle.";
            toast.error(msg);
        },
    });

    // 6. Delete Cycle Mutation
    const deleteMutation = useMutation({
        mutationFn: cyclesApi.removeCycle,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CYCLES });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SETTINGS });
            toast.success("Cycle deleted.");
            setDeleteId(null);
        },
        onError: (err: any) => {
            const msg = err.response?.data?.error || "Failed to delete cycle.";
            toast.error(msg);
            setDeleteId(null);
        },
    });

    const handleSetActive = (id: string) => {
        setActiveMutation.mutate(id);
    };

    const startEdit = (c: Cycle) => {
        setEditingCycle(c);
        setOpen(true);
    };

    const startAdd = () => {
        setEditingCycle(null);
        setOpen(true);
    };

    const getCycleTotal = (c: Cycle) => {
        return c.total ?? 0;
    };

    const isLoading = isSettingsLoading || isCyclesLoading;
    const hasError = settingsError || cyclesError;

    if (hasError) {
        return (
            <div className="px-6 py-8 font-mono text-sm text-red-500 uppercase tracking-widest">
                Failed to load cycles. Please try refreshing.
            </div>
        );
    }

    return (
        <div className="px-6 md:px-10 py-8">
            <header className="flex flex-wrap items-end justify-between gap-6 border-b-2 border-ink pb-6">
                <div>
                    <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-mute">№ 003 — cycles</div>
                    <h1 className="mt-1 font-serif text-4xl md:text-5xl leading-[0.95] tracking-tight">
                        Pick your <span className="italic">month.</span>
                    </h1>
                    <p className="mt-3 max-w-xl text-ink/75 text-sm leading-relaxed">
                        A cycle is whatever stretch of days makes sense for you. Calendar month, payday to payday,
                        a vacation week — you decide.
                    </p>
                </div>

                <button
                    onClick={startAdd}
                    disabled={isLoading}
                    className="brutal-border brutal-shadow brutal-press bg-pink px-5 py-3 font-mono text-xs font-bold uppercase tracking-widest inline-flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    <Plus className="h-4 w-4" /> New cycle
                </button>

                <Dialog open={open} onOpenChange={(val) => {
                    setOpen(val);
                    if (!val) setEditingCycle(null);
                }}>
                    <DialogContent
                        showCloseButton={false}
                        className="p-0 border-2 border-ink bg-paper brutal-shadow max-w-md rounded-none gap-0"
                    >
                        <DialogHeader className="flex flex-row items-center justify-between border-b-2 border-ink px-5 py-3 gap-0">
                            <DialogTitle className="font-mono text-xs uppercase tracking-widest leading-none font-bold">
                                {editingCycle ? "edit cycle" : "new cycle"}
                            </DialogTitle>
                            <DialogDescription className="sr-only">
                                {editingCycle ? "Edit name or duration of this cycle." : "Create a new cycle."}
                            </DialogDescription>
                            <button
                                onClick={() => setOpen(false)}
                                className="brutal-border bg-paper h-7 w-7 flex items-center justify-center cursor-pointer"
                                aria-label="Close"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </DialogHeader>

                        <CycleForm
                            cycle={editingCycle}
                            defaultCalendar={settings?.preferences?.defaultCalendar ?? false}
                            onSubmit={async (c) => {
                                if (editingCycle) {
                                    await updateMutation.mutateAsync({ id: editingCycle.id, data: c });
                                } else {
                                    await createMutation.mutateAsync(c);
                                }
                            }}
                        />
                    </DialogContent>
                </Dialog>

                {/* Shadcn Alert Dialog Confirmation Box */}
                <AlertDialog open={deleteId !== null} onOpenChange={(val) => {
                    if (!val) setDeleteId(null);
                }}>
                    <AlertDialogContent className="brutal-border bg-paper brutal-shadow rounded-none max-w-md p-6 border-2 border-ink">
                        <AlertDialogHeader className="text-left gap-2 sm:place-items-start">
                            <AlertDialogTitle className="font-serif text-xl font-bold tracking-tight text-ink">
                                Are you absolutely sure?
                            </AlertDialogTitle>
                            <AlertDialogDescription className="font-mono text-xs text-mute uppercase tracking-wider">
                                This action cannot be undone. Any expenses referencing this cycle will need to be re-assigned.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="mt-4 flex flex-row justify-end gap-3">
                            <AlertDialogCancel className="brutal-border px-4 py-2 bg-paper text-ink font-mono text-[11px] font-bold uppercase tracking-widest cursor-pointer rounded-none hover:bg-secondary border-2 border-ink hover:text-ink">
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => deleteId && deleteMutation.mutate(deleteId)}
                                className="brutal-border px-4 py-2 bg-pink text-ink font-mono text-[11px] font-bold uppercase tracking-widest cursor-pointer rounded-none hover:opacity-90 border-2 border-ink"
                            >
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </header>

            {isLoading ? (
                <div className="mt-8 grid gap-5 md:grid-cols-2">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="brutal-border brutal-shadow-sm bg-paper p-5 space-y-4">
                            <div className="flex justify-between items-baseline">
                                <div className="space-y-2">
                                    <Skeleton className="h-6 w-32 bg-ink/10 rounded-none" />
                                    <Skeleton className="h-4 w-24 bg-ink/10 rounded-none" />
                                </div>
                                <div className="space-y-2 text-right flex flex-col items-end">
                                    <Skeleton className="h-3 w-10 bg-ink/10 rounded-none" />
                                    <Skeleton className="h-5 w-16 bg-ink/10 rounded-none" />
                                </div>
                            </div>
                            <div className="flex justify-between items-center pt-2">
                                <Skeleton className="h-8 w-20 bg-ink/10 rounded-none" />
                                <div className="flex gap-2">
                                    <Skeleton className="h-7 w-7 bg-ink/10 rounded-none" />
                                    <Skeleton className="h-7 w-7 bg-ink/10 rounded-none" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : cycles && cycles.length > 0 ? (
                <ul className="mt-8 grid gap-5 md:grid-cols-2">
                    {cycles.map((c) => {
                        const active = c.id === activeCycleId;
                        return (
                            <li key={c.id} className={`brutal-border ${active ? "brutal-shadow bg-yellow" : "brutal-shadow-sm bg-paper"} p-5`}>
                                <div className="flex items-baseline justify-between gap-4">
                                    <div>
                                        <div className="font-serif text-2xl leading-tight">{c.label}</div>
                                        <div className="mt-1 font-mono text-xs text-mute">{formatDateRange(c.start, c.end)}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-mono text-[10px] uppercase tracking-widest text-mute">total</div>
                                        <div className="font-mono text-xl font-bold tabular-nums">{formatMoney(getCycleTotal(c))}</div>
                                    </div>
                                </div>
                                <div className="mt-4 flex items-center justify-between">
                                    {active ? (
                                        <span className="font-mono text-[11px] uppercase tracking-widest inline-flex items-center gap-1.5 font-bold">
                                            <Check className="h-3.5 w-3.5" /> active
                                        </span>
                                    ) : (
                                        <button
                                            onClick={() => handleSetActive(c.id)}
                                            disabled={setActiveMutation.isPending}
                                            className="brutal-border brutal-press bg-paper px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest cursor-pointer disabled:opacity-60"
                                        >
                                            Set active
                                        </button>
                                    )}

                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => startEdit(c)}
                                            aria-label={`Edit ${c.label}`}
                                            className="brutal-border h-7 w-7 flex items-center justify-center bg-paper hover:bg-yellow transition-colors cursor-pointer"
                                        >
                                            <Pencil className="h-3 w-3" />
                                        </button>
                                        <button
                                            onClick={() => setDeleteId(c.id)}
                                            aria-label={`Remove ${c.label}`}
                                            className="brutal-border h-7 w-7 flex items-center justify-center bg-paper hover:bg-pink transition-colors cursor-pointer"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <div className="mt-8 text-center py-12 brutal-border bg-paper font-mono text-sm uppercase tracking-widest text-mute">
                    No cycles configured. Click &quot;New Cycle&quot; to begin.
                </div>
            )}
        </div>
    );
}

interface CycleFormProps {
    cycle: Cycle | null;
    defaultCalendar: boolean;
    onSubmit: (c: { label: string; start: string; end: string }) => Promise<void>;
}

function CycleForm({ cycle, defaultCalendar, onSubmit }: CycleFormProps) {
    const cal = getCalendarMonth();
    const [useCalendar, setUseCalendar] = useState(cycle ? false : defaultCalendar);
    const [label, setLabel] = useState(cycle ? cycle.label : (defaultCalendar ? cal.label : ""));
    const [start, setStart] = useState(cycle ? cycle.start : (defaultCalendar ? cal.start : isoToday()));
    const [end, setEnd] = useState(cycle ? cycle.end : (defaultCalendar ? cal.end : isoToday(30)));
    const [isSubmitting, setIsSubmitting] = useState(false);

    const toggleCalendar = (v: boolean) => {
        setUseCalendar(v);
        if (v) {
            const c = getCalendarMonth();
            setLabel(c.label);
            setStart(c.start);
            setEnd(c.end);
        } else {
            setLabel("");
            setStart(isoToday());
            setEnd(isoToday(30));
        }
    };

    const handleFormSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!label.trim() || !start || !end) return;
        if (start > end) {
            toast.error("End date must be on or after the start date.");
            return;
        }
        setIsSubmitting(true);
        try {
            await onSubmit({ label: label.trim(), start, end });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleFormSubmit} className="p-5 space-y-4">
            <label className="block">
                <span className="font-mono text-[11px] uppercase tracking-widest text-ink/70">Label</span>
                <input
                    required
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g. November, Vacation, Pay cycle"
                    className="mt-1.5 w-full brutal-border bg-paper px-3 py-2.5 font-mono text-sm focus:outline-none"
                />
            </label>

            {!cycle && (
                <label className="flex items-center gap-3 brutal-border bg-secondary px-3 py-2.5 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={useCalendar}
                        onChange={(e) => toggleCalendar(e.target.checked)}
                        className="h-4 w-4 accent-ink"
                    />
                    <span className="font-mono text-[11px] uppercase tracking-widest selection-none">Use calendar month</span>
                </label>
            )}

            <div className="grid grid-cols-2 gap-3">
                <label className="block">
                    <span className="font-mono text-[11px] uppercase tracking-widest text-ink/70">Start</span>
                    <input
                        type="date"
                        required
                        disabled={useCalendar && !cycle}
                        value={start}
                        onChange={(e) => setStart(e.target.value)}
                        className="mt-1.5 w-full brutal-border bg-paper px-3 py-2.5 font-mono text-sm focus:outline-none disabled:opacity-60"
                    />
                </label>
                <label className="block">
                    <span className="font-mono text-[11px] uppercase tracking-widest text-ink/70">End</span>
                    <input
                        type="date"
                        required
                        disabled={useCalendar && !cycle}
                        value={end}
                        onChange={(e) => setEnd(e.target.value)}
                        className="mt-1.5 w-full brutal-border bg-paper px-3 py-2.5 font-mono text-sm focus:outline-none disabled:opacity-60"
                    />
                </label>
            </div>

            <button
                type="submit"
                disabled={isSubmitting}
                className="brutal-border brutal-shadow-sm brutal-press w-full bg-pink px-5 py-3 font-mono text-xs font-bold uppercase tracking-widest cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
                {isSubmitting ? "Saving..." : cycle ? "Save Changes" : "Create & set active"}
            </button>
        </form>
    );
}