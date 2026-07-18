import Header from "@/components/header";
import Footer from "@/components/footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Terms of Service | Voidentry",
    description: "Terms and Conditions of usage for the Voidentry expense manager application.",
};

export default function TermsPage() {
    return (
        <div className="flex flex-col min-h-screen bg-paper text-ink selection:bg-pink selection:text-ink">
            <Header />

            <main className="flex-1 mx-auto max-w-4xl w-full px-6 py-12">
                <div className="brutal-border bg-white dark:bg-zinc-950 p-8 md:p-12 brutal-shadow mb-12">
                    <div className="font-mono text-xs uppercase tracking-widest text-mute mb-4">
                        Terms of Service — Version: v1.0.0
                    </div>

                    <h1 className="font-serif text-4xl md:text-5xl font-bold tracking-tight mb-8 border-b-2 border-ink pb-4">
                        Terms and Conditions
                    </h1>

                    <div className="prose prose-zinc dark:prose-invert font-sans space-y-6 text-sm md:text-base leading-relaxed font-mono">
                        <p>
                            These Terms and Conditions govern your access to and use of <strong>Voidentry</strong>. By creating an account, registering on the platform, or using our services, you agree to be bound by these terms. If you do not agree, please do not use Voidentry.
                        </p>

                        <h2 className="font-mono text-lg font-bold uppercase tracking-wider text-ink border-b border-ink pt-6 pb-2">
                            1. Purpose & Core Service
                        </h2>
                        <p>
                            Voidentry is a personal bookkeeping ledger designed to help users track their daily financial transactions, establish cycle budgets, and categorize expenses.
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li><strong>Pure Bookkeeping:</strong> The transactions you record in this application are mock/ledger entries for manual bookkeeping purposes. <strong>Voidentry does not connect to real bank accounts, credit bureaus, or payment gateways</strong>, and does not conduct actual financial transactions.</li>
                            <li><strong>No Invites/Shared Accounts:</strong> Relational split features are for personal bookkeeping only (e.g., logging who owes you what share of a bill). There are no shared accounts, invites, or multi-user settling functions.</li>
                        </ul>

                        <h2 className="font-mono text-lg font-bold uppercase tracking-wider text-ink border-b border-ink pt-6 pb-2">
                            2. Generative AI
                        </h2>
                        <p>
                            Our natural language chat feature uses Google Gemini API to parse typed text into structured expense logs.
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li><strong>Accuracy & Review:</strong> AI expense parsing is a helpful automation, but generative models may sometimes hallucinate details or fail to parse text accurately. You are solely responsible for reviewing and validating the parsed expense parameters (amount, category, note, etc.) before saving them to your ledger.</li>
                            <li><strong>Responsibility:</strong> Voidentry is not liable for errors in parsed values, category misclassifications, or date-resolution offsets caused by generative AI models.</li>
                        </ul>

                        <h2 className="font-mono text-lg font-bold uppercase tracking-wider text-ink border-b border-ink pt-6 pb-2">
                            3. User Accounts and Verification
                        </h2>
                        <p>
                            You must register with a valid email address and a strong password. You are responsible for safeguarding your credentials and for all activities that occur under your account. We reserve the right to suspend accounts that provide false information or violate standard usage guidelines.
                        </p>

                        <h2 className="font-mono text-lg font-bold uppercase tracking-wider text-ink border-b border-ink pt-6 pb-2">
                            4. Hosting Environment & Performance
                        </h2>
                        <p>
                            Voidentry is hosted on <strong>Cloudflare serverless infrastructure</strong> utilizing regional Cloudflare D1 database storage. While we target 99.9% uptime, we do not guarantee uninterrupted availability of the platform. Data backups are conducted regularly; however, you should keep record of important financial data independently.
                        </p>

                        <h2 className="font-mono text-lg font-bold uppercase tracking-wider text-ink border-b border-ink pt-6 pb-2">
                            5. Data Deletion & Termination
                        </h2>
                        <p>
                            You have full control over your data. You may request to delete your account or specific data logs (such as entries, contacts, or payment methods) at any time. Any request to delete records or accounts will result in them being deactivated and hidden from your active profile and application interface, while they may persist in our secure backups, audit logs, and data archives for verification, recovery, and compliance purposes.
                        </p>

                        <h2 className="font-mono text-lg font-bold uppercase tracking-wider text-ink border-b border-ink pt-6 pb-2">
                            6. Disclaimers & Limitation of Liability
                        </h2>
                        <p>
                            VOIDENTRY IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTY OF ANY KIND. WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE. IN NO EVENT SHALL VOIDENTRY BE LIABLE FOR ANY INDIRECT, SPECIAL, INCIDENTAL, OR CONSEQUENTIAL DAMAGES ARISING OUT OF YOUR USE OF THE SERVICE.
                        </p>

                        <h2 className="font-mono text-lg font-bold uppercase tracking-wider text-ink border-b border-ink pt-6 pb-2">
                            7. Governing Law and Jurisdiction
                        </h2>
                        <p>
                            These terms shall be governed by and construed in accordance with the laws of the <strong>India</strong>. Any dispute arising under these terms shall be subject to the exclusive jurisdiction of the courts of India.
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
