export function parseStockQuantity(value: string): number | null {
  const quantity = Number(value.trim());
  if (!value.trim() || !Number.isInteger(quantity) || quantity < 0) return null;
  return quantity;
}
