export type ReportCustomerSuggestion = {
  id: number;
  name: string;
};

export function getCustomerSearchSuggestions(
  customers: ReportCustomerSuggestion[],
  searchTerm: string,
  limit = 8,
) {
  const normalized = searchTerm.trim().toLocaleLowerCase("pt-BR");
  if (!normalized) return customers.slice(0, limit);

  return customers
    .filter((customer) => customer.name.toLocaleLowerCase("pt-BR").includes(normalized))
    .sort((left, right) => {
      const leftName = left.name.toLocaleLowerCase("pt-BR");
      const rightName = right.name.toLocaleLowerCase("pt-BR");
      const leftStarts = leftName.startsWith(normalized) ? 0 : 1;
      const rightStarts = rightName.startsWith(normalized) ? 0 : 1;
      return leftStarts - rightStarts || leftName.localeCompare(rightName, "pt-BR");
    })
    .slice(0, limit);
}
