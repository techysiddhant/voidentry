export interface Contact {
    id: string;
    name: string;
}

export interface SplitParticipant {
    contactId: string; // "you" or contact UUID
    share: number;
}

export type SplitMode = "equal" | "exact";

export interface Split {
    mode: SplitMode;
    participants: SplitParticipant[];
}