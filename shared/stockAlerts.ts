export const LOW_STOCK_THRESHOLD = 3;

export type StockAlertProduct = {
  name: string;
  quantity: number | null;
  isUnlimited: boolean;
};

export function isLowGlobalStock(product: StockAlertProduct, quantity = product.quantity): boolean {
  return quantity !== null && Number(quantity) < LOW_STOCK_THRESHOLD;
}

export function getLowStockMessage(productName: string): string {
  return `ALERTA: ${productName} tem quantidade no estoque menor que ${LOW_STOCK_THRESHOLD}`;
}
