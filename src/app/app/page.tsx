"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowUp } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsApi } from "@/lib/api/settings";
import { cyclesApi } from "@/lib/api/cycles";
import { entriesApi } from "@/lib/api/entries";
import { QUERY_KEYS } from "@/lib/query-keys";
import { ExpenseDialog } from "@/components/entries/expense-dialog";
import { UserBubble } from "@/components/chat/user-bubble";
import { AssistantBubble } from "@/components/chat/assistant-bubble";
import type { Msg, PendingDraft } from "@/types/chat";
import type { ExpenseCreateInput } from "@/types/expense";
import toast from "react-hot-toast";

export default function ChatPage() {
    const queryClient = useQueryClient();

    // ── Data: settings, cycles ──────────────────────────────────────────────
    const { data: settings, isLoading: isSettingsLoading } = useQuery({
        queryKey: QUERY_KEYS.SETTINGS,
        queryFn: settingsApi.getSettings,
    });

    const { data: cycles, isLoading: isCyclesLoading } = useQuery({
        queryKey: QUERY_KEYS.CYCLES,
        queryFn: cyclesApi.getCycles,
    });

    const activeCycleId = settings?.preferences?.activeCycleId;
    const activeCycle = useMemo(
        () => cycles?.find((c) => c.id === activeCycleId),
        [cycles, activeCycleId],
    );

    const paymentMethods = useMemo(() => settings?.paymentMethods ?? [], [settings]);
    const categories = useMemo(() => settings?.categories ?? [], [settings]);

    // ── Add expense mutation ────────────────────────────────────────────────
    const addMutation = useMutation({
        mutationFn: entriesApi.addEntry,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ENTRIES] });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SETTINGS });
        },
        onError: (err: any) => {
            const msg = err.response?.data?.error || "Failed to save entry.";
            toast.error(msg);
        },
    });

    // ── Chat state ──────────────────────────────────────────────────────────
    const [messages, setMessages] = useState<Msg[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [editorOpen, setEditorOpen] = useState(false);
    const [editorMsgId, setEditorMsgId] = useState<string | null>(null);
    const [editorInitial, setEditorInitial] = useState<PendingDraft | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const messagesRef = useRef(messages);

    // Race-condition guard for confirm
    const confirmedIds = useRef<Set<string>>(new Set());
    const confirmingIds = useRef<Set<string>>(new Set());

    // Set welcome message once cycle is loaded
    const welcomeSet = useRef(false);
    useEffect(() => {
        if (!welcomeSet.current && activeCycle) {
            welcomeSet.current = true;
            setMessages([
                {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    status: "confirmed",
                    text: `You're logging to ${activeCycle.label}. Just type what you spent — amount, what for. I'll handle the rest.`,
                },
            ]);
        }
    }, [activeCycle]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // ── Confirm a draft → save to DB ────────────────────────────────────────
    const confirm = useCallback(
        async (msgId: string) => {
            if (confirmedIds.current.has(msgId) || confirmingIds.current.has(msgId)) return;
            const msg = messagesRef.current.find(
                (m): m is Extract<Msg, { role: "assistant" }> & { draft: PendingDraft } =>
                    m.id === msgId && m.role === "assistant" && !!m.draft,
            );
            if (!msg?.draft) return;

            confirmingIds.current.add(msgId);
            try {
                await addMutation.mutateAsync(msg.draft as ExpenseCreateInput);
                confirmedIds.current.add(msgId);
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === msgId && m.role === "assistant" && m.draft
                            ? { ...m, status: "confirmed" as const }
                            : m,
                    ),
                );
            } catch {
                confirmedIds.current.delete(msgId);
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === msgId && m.role === "assistant" && m.draft
                            ? { ...m, status: "pending" as const }
                            : m,
                    ),
                );
            } finally {
                confirmingIds.current.delete(msgId);
            }
        },
        [addMutation],
    );

    const discard = (msgId: string) => {
        const idx = messages.findIndex((m) => m.id === msgId);
        const isLatest = idx === messages.length - 1;
        const isInputEmpty = !input.trim();

        if (idx > 0 && isLatest && isInputEmpty) {
            const precedingMsg = messages[idx - 1];
            if (precedingMsg && precedingMsg.role === "user") {
                setInput(precedingMsg.text);
            }
        }

        setMessages((prev) =>
            prev.map((m) => (m.id === msgId && m.role === "assistant" ? { ...m, status: "discarded" as const } : m)),
        );
        setTimeout(() => inputRef.current?.focus(), 50);
    };

    const openEditor = (msgId: string, draft: PendingDraft) => {
        setEditorMsgId(msgId);
        setEditorInitial(draft);
        setEditorOpen(true);
    };

    const onEditorClose = () => {
        setEditorOpen(false);
        if (editorMsgId) {
            const id = editorMsgId;
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === id && m.role === "assistant" && m.status === "pending"
                        ? { ...m, status: "confirmed" as const }
                        : m,
                ),
            );
            confirmedIds.current.add(id);
        }
        setEditorMsgId(null);
        setEditorInitial(null);
    };

    // ── Send message to API ─────────────────────────────────────────────────
    const send = async (raw: string) => {
        const text = raw.trim();
        if (!text || loading) return;
        const userMsg: Msg = { id: crypto.randomUUID(), role: "user", text };
        setMessages((m) => [...m, userMsg]);
        setInput("");
        setLoading(true);

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: text }),
            });

            if (!response.ok) {
                throw new Error("Failed to contact parsing server.");
            }

            const data = (await response.json()) as any;
            const result = data.result;

            if (result.clarification) {
                setMessages((m) => [
                    ...m,
                    { id: crypto.randomUUID(), role: "assistant", status: "confirmed", text: result.clarification },
                ]);
            } else {
                const todayStr = new Date().toISOString().slice(0, 10);
                const extractedType: string = result.payment?.type || "upi";
                let matchedMethodId = result.payment?.methodId || undefined;
                // If it's a new payment method, DO NOT fallback to an existing method of this type.
                if (!matchedMethodId && !result.newPaymentMethod) {
                    matchedMethodId = paymentMethods.find((m) => m.type === extractedType)?.id;
                }

                const draft: PendingDraft = {
                    amount: result.amount || 0,
                    note: result.note || text,
                    categoryCode: result.categoryCode || categories[0]?.code || "misc",
                    subCategoryCode: result.subCategoryCode || undefined,
                    date: result.date || todayStr,
                    payment: {
                        type: extractedType,
                        methodId: matchedMethodId,
                        cardName: result.payment?.cardName || undefined,
                    },
                    comment: result.comment || undefined,
                    split: result.split || undefined,
                    _newPaymentMethod: result.newPaymentMethod || null,
                    _newSubCategoryName: result.newSubCategoryName || null,
                    _correctedInput: result.correctedInput || null,
                };

                setMessages((m) => [
                    ...m,
                    { id: crypto.randomUUID(), role: "assistant", status: "pending", text: "Got it — is this right?", draft },
                ]);
            }
        } catch (err) {
            console.error(err);
            setMessages((m) => [
                ...m,
                {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    status: "confirmed",
                    text: "Sorry, I ran into an error trying to process that entry. Please try again or log manually.",
                },
            ]);
        } finally {
            setLoading(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    const onSubmit = (e: FormEvent) => {
        e.preventDefault();
        send(input);
    };

    // ── Loading state ───────────────────────────────────────────────────────
    if (isSettingsLoading || isCyclesLoading) {
        return (
            <div className="flex flex-col h-[calc(100vh-0px)] md:h-screen items-center justify-center">
                <div className="font-mono text-xs uppercase tracking-widest text-mute">Loading...</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-0px)] md:h-screen">
            <header className="border-b-2 border-ink px-6 md:px-10 py-6">
                <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-mute">№ 001 — capture</div>
                <h1 className="mt-1 font-serif text-4xl md:text-5xl leading-[0.95] tracking-tight">
                    What did you <span className="italic">spend?</span>
                </h1>
            </header>

            <div className="flex-1 overflow-y-auto px-6 md:px-10 py-8">
                <div className="mx-auto max-w-2xl space-y-6">
                    {messages.map((m) =>
                        m.role === "user" ? (
                            <UserBubble key={m.id} text={m.text} />
                        ) : (
                            <AssistantBubble
                                key={m.id}
                                msg={m}
                                isEditing={editorOpen && editorMsgId === m.id}
                                onConfirm={() => confirm(m.id)}
                                onDiscard={() => discard(m.id)}
                                onEdit={() => m.draft && openEditor(m.id, m.draft)}
                            />
                        ),
                    )}
                    {loading && (
                        <div className="max-w-[90%] animate-pulse">
                            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-mute mb-1.5">
                                Voidentry
                            </div>
                            <div className="text-ink/60 text-sm font-mono italic">Thinking...</div>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>
            </div>

            <div className="border-t-2 border-ink bg-paper px-4 md:px-10 py-4">
                <div className="mx-auto max-w-2xl">
                    <form onSubmit={onSubmit} className="relative brutal-border brutal-shadow-sm bg-paper">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={loading}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    send(input);
                                }
                            }}
                            rows={1}
                            placeholder="type what you spent…"
                            className="block w-full resize-none bg-transparent px-4 py-3 pr-14 font-mono text-sm focus:outline-none min-h-[48px] max-h-40 disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            aria-label="Send"
                            disabled={!input.trim() || loading}
                            className="absolute right-2 bottom-2 brutal-border bg-pink h-9 w-9 flex items-center justify-center disabled:opacity-40"
                        >
                            <ArrowUp className="h-4 w-4" />
                        </button>
                    </form>
                </div>
            </div>

            <ExpenseDialog open={editorOpen} onClose={onEditorClose} initial={editorInitial} />
        </div>
    );
}