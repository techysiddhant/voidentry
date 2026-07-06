"use client";

interface UserBubbleProps {
    text: string;
}

export function UserBubble({ text }: UserBubbleProps) {
    return (
        <div className="flex justify-end">
            <div className="max-w-[80%] brutal-border bg-ink text-paper px-4 py-2.5 font-mono text-sm">
                {text}
            </div>
        </div>
    );
}
