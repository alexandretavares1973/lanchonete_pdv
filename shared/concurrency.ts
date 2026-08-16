export type SimulationOutcome = {
  actor: string;
  status: "accepted" | "rejected" | "error";
  orderId?: number;
  message?: string;
};

export type SimulationSummary = {
  accepted: number;
  rejected: number;
  errors: number;
  total: number;
};

export function summarizeSimulationResults(outcomes: SimulationOutcome[]): SimulationSummary {
  return outcomes.reduce<SimulationSummary>(
    (summary, outcome) => {
      summary.total += 1;
      if (outcome.status === "accepted") summary.accepted += 1;
      if (outcome.status === "rejected") summary.rejected += 1;
      if (outcome.status === "error") summary.errors += 1;
      return summary;
    },
    { accepted: 0, rejected: 0, errors: 0, total: 0 },
  );
}

export function planDryRun(concurrentUsers: number, quantityPerSale: number, availableQuantity: number): SimulationOutcome[] {
  const accepted = Math.min(concurrentUsers, Math.max(0, Math.floor(availableQuantity / quantityPerSale)));
  return Array.from({ length: concurrentUsers }, (_, index) => ({
    actor: `Usuário ${index + 1}`,
    status: index < accepted ? "accepted" : "rejected",
    message: index < accepted ? "Venda aceita pelo saldo disponível." : "Venda rejeitada por estoque insuficiente.",
  }));
}
