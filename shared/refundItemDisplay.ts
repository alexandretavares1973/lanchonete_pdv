type RefundItemLike = {
  productId?: number | string | null;
  productName?: string | null;
};

export function resolveRefundProductName(
  item: RefundItemLike,
  fallbackItems: RefundItemLike[] = [],
) {
  const directName = item.productName?.trim();
  if (directName) return directName;

  const productId = Number(item.productId);
  const fallback = fallbackItems.find((candidate) => Number(candidate.productId) === productId);
  return fallback?.productName?.trim() || `Produto #${Number.isInteger(productId) ? productId : "desconhecido"}`;
}
