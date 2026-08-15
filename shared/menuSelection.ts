export interface OpenMenuCandidate {
  id: number;
  status: "open" | "closed";
}

/**
 * Seleciona o cardápio usado pelo PDV sem confiar em dados locais antigos.
 * O padrão só é aplicado quando ainda está aberto; caso contrário, um único
 * cardápio aberto pode ser escolhido automaticamente e múltiplos exigem ação.
 */
export function selectPreferredOpenMenu<T extends OpenMenuCandidate>(
  menus: T[],
  storedDefaultId?: string | number | null,
): T | null {
  const openMenus = menus.filter((menu) => menu.status === "open");
  if (openMenus.length === 0) return null;

  if (storedDefaultId !== undefined && storedDefaultId !== null && String(storedDefaultId) !== "") {
    const preferred = openMenus.find((menu) => String(menu.id) === String(storedDefaultId));
    if (preferred) return preferred;
  }

  return openMenus.length === 1 ? openMenus[0] : null;
}

export function canCreateSharedSale(menuId: number | null | undefined, openMenuCount: number): boolean {
  return Number.isInteger(menuId) && Number(menuId) > 0 && openMenuCount > 0;
}
