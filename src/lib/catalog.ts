export function chartColorFromClass(color: string) {
    switch (color) {
        case "bg-pink":
            return "var(--pink)";
        case "bg-yellow":
            return "var(--yellow)";
        case "bg-ink":
            return "var(--ink)";
        case "bg-teal":
        default:
            return "var(--teal)";
    }
}