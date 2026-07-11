import type { Metadata } from "next";
import { Suspense } from "react";
import AuthLoading from "./loading";

export const metadata: Metadata = {
    title: "Auth — Voidentry",
    description: "Sign in or create your Voidentry account.",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense fallback={<AuthLoading />}>
            {children}
        </Suspense>
    );
}