export function getMysqlAffectedRows(result: unknown): number {
  const candidate = Array.isArray(result) ? result[0] : result;
  const affectedRows = (candidate as { affectedRows?: unknown } | undefined)?.affectedRows;
  const numeric = Number(affectedRows ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}
