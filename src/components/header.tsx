import Link from "next/link"

const Header = () => {
    return (
        <header className="border-b-2 border-ink">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
                <Link href="/" className="font-serif text-3xl leading-none tracking-tight">
                    Ledger<span className="text-pink">.</span>
                </Link>
                <div className="flex items-center gap-3">
                    {/* <ThemeToggle /> */}
                    <Link
                        href="/auth"
                        className="hidden md:inline-flex font-mono text-xs uppercase tracking-widest hover:underline underline-offset-4"
                    >
                        Sign in
                    </Link>
                    <Link
                        href="/auth"
                        className="brutal-border brutal-shadow-sm brutal-press inline-flex items-center gap-2 bg-yellow px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest"
                    >
                        Start tracking
                    </Link>
                </div>
            </div>
        </header>
    )
}

export default Header;