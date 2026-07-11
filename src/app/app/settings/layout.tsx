import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Settings",
    description: "Manage your preferences, payment methods, contacts, and account settings.",
};

export default function SettingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
