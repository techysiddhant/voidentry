"use client";

import { Toaster as HotToaster } from "react-hot-toast";

export function Toaster() {
    return (
        <HotToaster
            position="top-center"
            toastOptions={{
                style: {
                    border: "2px solid var(--ink)",
                    boxShadow: "4px 4px 0px 0px var(--ink)",
                    borderRadius: "0px",
                    background: "var(--paper)",
                    color: "var(--ink)",
                    fontFamily: "var(--font-mono)",
                    textTransform: "uppercase",
                    fontSize: "11px",
                    letterSpacing: "0.05em",
                    padding: "12px 16px",
                },
            }}
        />
    );
}
