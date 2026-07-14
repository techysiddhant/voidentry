export interface PaymentMethod {
    id: string;
    type: PaymentType;
    label: string;
    hint?: string;
}
export type PaymentType = string;