const marqueeItems = [
    "no subscriptions",
    "everything in ₹",
    "your data, your control",
    "AI captures the boring stuff",
    "splits with friends",
    "custom cycles",
    "keyboard-first",
];
function Marquee() {
    const row = [...marqueeItems, ...marqueeItems];
    return (
        <div className="border-b-2 border-ink bg-ink py-4 overflow-hidden">
            <div className="marquee flex whitespace-nowrap font-mono text-sm uppercase tracking-widest text-paper">
                {row.map((item, i) => (
                    <span key={i} className="mx-8 flex items-center gap-8">
                        <span className="text-pink">✦</span> {item}
                    </span>
                ))}
            </div>
        </div>
    );
}

export default Marquee;