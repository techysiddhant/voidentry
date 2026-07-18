import Header from "@/components/header";
import Footer from "@/components/footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Privacy Notice | Voidentry",
    description: "Privacy Notice and Data Consent declaration for Voidentry users in India.",
};

export default function PrivacyPage() {
    return (
        <div className="flex flex-col min-h-screen bg-paper text-ink selection:bg-pink selection:text-ink">
            <Header />

            <main className="flex-1 mx-auto max-w-4xl w-full px-6 py-12">
                <div className="brutal-border bg-white dark:bg-zinc-950 p-8 md:p-12 brutal-shadow mb-12">
                    <div className="font-mono text-xs uppercase tracking-widest text-mute mb-4">
                        Compliance Notice — Artifact Version: v1.0.0
                    </div>

                    <h1 className="font-serif text-4xl md:text-5xl font-bold tracking-tight mb-8 border-b-2 border-ink pb-4">
                        Privacy Notice & Consent Declaration
                    </h1>

                    <div className="prose prose-zinc dark:prose-invert font-sans space-y-6 text-sm md:text-base leading-relaxed font-mono">
                        <p>
                            Welcome to <strong>Voidentry</strong>. We value your privacy and are committed to processing your personal data responsibly. This Privacy Notice describes how we collect, use, store, and process your personal data in accordance with the <strong>Digital Personal Data Protection (DPDP) Act, 2023</strong> of India and other applicable information security regulations.
                        </p>

                        <div className="brutal-border bg-yellow/10 p-5 font-mono text-xs md:text-sm space-y-2">
                            <div className="font-bold text-ink uppercase tracking-wider">Purpose and Scope of Consent</div>
                            <p>
                                By creating an account and registering on Voidentry, you grant explicit, specific, and revocable consent to the processing of your data for the following activities:
                            </p>
                            <ul className="list-disc pl-5 space-y-1 mt-2">
                                <li><strong>manual_data_entry</strong>: Recording, classifying, updating, and storing your financial transactions and expense entries manually on the platform.</li>
                                <li><strong>ai_financial_insights</strong>: Parsing and transforming natural language text entries into structured financial transaction schemas utilizing third-party Generative AI services (specifically Google Gemini models).</li>
                            </ul>
                        </div>

                        <h2 className="font-mono text-lg font-bold uppercase tracking-wider text-ink border-b border-ink pt-6 pb-2">
                            1. Information We Collect
                        </h2>
                        <p>
                            To provide our expense tracking services, we collect:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li><strong>Account Information:</strong> Your name, email address, and a securely hashed password.</li>
                            <li><strong>Financial Logs:</strong> Expense amounts, category assignments, payment methods, transaction notes, split parameters, and comments.</li>
                            <li><strong>Technical Logs:</strong> Your IP address (retrieved from Cloudflare headers), browser type, and immutable consent metadata (including timestamps and accepted versions) recorded in our compliance ledger.</li>
                        </ul>

                        <h2 className="font-mono text-lg font-bold uppercase tracking-wider text-ink border-b border-ink pt-6 pb-2">
                            2. How Data is Processed & AI Integration
                        </h2>
                        <p>
                            Voidentry uses advanced automation to simplify financial logging:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>
                                <strong>Generative AI Expense Parsing:</strong> When you input natural language descriptions of expenses in our chat interface, the text is securely forwarded to the <strong>Google Gemini API</strong> (and routed via Cloudflare AI Gateway for metrics and optimization) to extract structured expense components.
                            </li>
                            <li>
                                <strong>Minimal Exposure:</strong> We do not share your name, email, or account metadata with Google Gemini. Only the raw chat message is sent. We advise against typing highly sensitive personal identification numbers (like PAN, Aadhaar, or bank credentials) into the chat.
                            </li>
                        </ul>

                        <h2 className="font-mono text-lg font-bold uppercase tracking-wider text-ink border-b border-ink pt-6 pb-2">
                            3. Infrastructure & Data Hosting
                        </h2>
                        <p>
                            Voidentry is built on serverless architectures hosted by <strong>Cloudflare</strong>:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>
                                <strong>Storage:</strong> Your data is stored in the <strong>Cloudflare D1 Database</strong>, a serverless relational database located in regional secure cloud infrastructure.
                            </li>
                            <li>
                                <strong>Performance & Security:</strong> We utilize Cloudflare CDN, Edge Workers, and Cloudflare security shielding to prevent DDoS attacks, distribute traffic efficiently, and encrypt all data in transit via standard TLS protocols.
                            </li>
                        </ul>

                        <h2 className="font-mono text-lg font-bold uppercase tracking-wider text-ink border-b border-ink pt-6 pb-2">
                            4. Your Rights Under DPDP Act, 2023
                        </h2>
                        <p>
                            As a Data Principal in India, you hold the following rights:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li><strong>Right to Access:</strong> You can view all your logged transactions and profile details directly through the dashboard.</li>
                            <li><strong>Right to Correction & Completeness:</strong> You can edit or modify your transaction cycles, active categories, payment options, and logs at any time.</li>
                            <li><strong>Right to Erasure & Deletion:</strong> You can request deletion of your entries, contacts, payment methods, or your user account. Please note that when you request deletion, records are marked as inactive and removed from active displays and your user interface, while they may remain securely stored in our compliance logs and archives for backup, audit, recovery, and legal purposes.</li>
                            <li><strong>Right to Withdraw Consent:</strong> You have the right to withdraw your consent to data processing. If you choose to withdraw consent, we may no longer be able to maintain your account or offer tracking utilities.</li>
                        </ul>

                        <h2 className="font-mono text-lg font-bold uppercase tracking-wider text-ink border-b border-ink pt-6 pb-2">
                            5. Security & Retention
                        </h2>
                        <p>
                            We retain your personal data for as long as necessary to support your bookkeeping ledger, analytics, or as required by law. Inactive or removed items are securely archived and excluded from active processing in the application features.
                        </p>



                        <div className="text-xs text-mute font-mono pt-8">
                            Last Updated: July 19, 2026
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
