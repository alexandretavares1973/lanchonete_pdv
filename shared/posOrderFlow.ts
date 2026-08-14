export type PosCustomer = {
  id: number;
  name: string;
};

export const DEFAULT_PAYMENT_METHOD = "pix" as const;

export function getExplicitCustomer(customer: PosCustomer | null | undefined): PosCustomer | null {
  return customer && Number.isInteger(customer.id) && customer.id > 0 ? customer : null;
}

export function getFreshOrderDefaults() {
  return {
    customer: null,
    paymentMethod: DEFAULT_PAYMENT_METHOD,
    amountReceived: 0,
    showConfirm: false,
    cart: [] as never[],
  };
}
