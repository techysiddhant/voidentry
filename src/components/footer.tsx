import Link from "next/link";

function Footer() {
    return (
        <footer className="bg-paper">
            <div className="mx-auto max-w-7xl px-6 py-8 flex flex-wrap items-center justify-between gap-4 font-mono text-xs uppercase tracking-widest text-mute">
                <div>© {new Date().getFullYear()} Voidentry — built for India, in ₹.</div>
                <div className="flex gap-6">
                    <Link href="/privacy" className="hover:text-ink">privacy</Link>
                    <Link href="/terms" className="hover:text-ink">terms</Link>
                    <Link href="/auth?mode=signin" className="hover:text-ink">sign in</Link>
                    <Link href="/auth?mode=signup" className="hover:text-ink">sign up</Link>
                </div>
            </div>
        </footer>
    );
}

export default Footer;