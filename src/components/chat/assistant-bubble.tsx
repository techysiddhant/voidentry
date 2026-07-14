"use client";

import type { Msg, PendingDraft } from "@/types/chat";
import { DraftCard } from "./draft-card";

interface AssistantBubbleProps {
    msg: Extract<Msg, { role: "assistant" }>;
    isEditing?: boolean;
    onConfirm: () => void;
    onDiscard: () => void;
    onEdit: () => void;
}

export function AssistantBubble({
    msg,
    isEditing,
    onConfirm,
    onDiscard,
    onEdit,
}: AssistantBubbleProps) {
    return (
        <div className="max-w-[90%]">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-mute mb-1.5">
                Voidentry
            </div>
            <div className="text-ink/85 text-sm leading-relaxed mb-3">
                {msg.text}
            </div>
            {msg.draft && (
                <DraftCard
                    draft={msg.draft}
                    status={msg.status}
                    isEditing={isEditing}
                    onConfirm={onConfirm}
                    onDiscard={onDiscard}
                    onEdit={onEdit}
                />
            )}
        </div>
    );
}