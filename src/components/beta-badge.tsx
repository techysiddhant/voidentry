
type Props = {
    size?: "sm" | "md";
    variant?: "solid" | "outline";
    className?: string;
};

// Small mono pill that reads BRAND.isBeta. Renders nothing when beta is off.
export function BetaBadge({ size = "sm", variant = "solid", className = "" }: Props) {
    const sizeCls =
        size === "md" ? "px-2 py-0.5 text-[10px]" : "px-1.5 py-[1px] text-[9px]";
    const variantCls =
        variant === "outline"
            ? "border-2 border-ink bg-paper text-ink"
            : "bg-ink text-paper";
    return (
        <span
            className={[
                "inline-flex items-center font-mono font-bold uppercase tracking-widest align-middle leading-none",
                sizeCls,
                variantCls,
                className,
            ].join(" ")}
        >
            Beta
        </span>
    );
}
