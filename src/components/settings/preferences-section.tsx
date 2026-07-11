"use client";
import { Section, Row } from "./section";

interface Props {
    defaultCalendar: boolean;
    onToggleCalendar: () => void;
    currency: string;
}

export function PreferencesSection({ defaultCalendar, onToggleCalendar, currency }: Props) {
    return (
        <>
            <Section title="Money">
                <Row label="Currency">
                    {/* TODO: make this a select when the backend supports it */}
                    <span className="font-mono text-sm text-ink">{currency}</span>
                </Row>
            </Section>

            <Section title="Cycles">
                <Row label="Default to calendar month">
                    <button
                        type="button"
                        role="switch"
                        aria-checked={defaultCalendar}
                        onClick={onToggleCalendar}
                        className={[
                            "brutal-border relative h-7 w-12 overflow-hidden transition-colors",
                            defaultCalendar ? "bg-teal" : "bg-paper",
                        ].join(" ")}
                    >
                        <span
                            className={[
                                "absolute top-[2px] h-5 w-5 bg-paper border-2 border-ink transition-transform duration-150",
                                defaultCalendar ? "translate-x-0" : "-translate-x-5",
                            ].join(" ")}
                        />
                        <span className="sr-only">
                            {defaultCalendar ? "On" : "Off"}
                        </span>
                    </button>
                </Row>
            </Section>
        </>
    );
}