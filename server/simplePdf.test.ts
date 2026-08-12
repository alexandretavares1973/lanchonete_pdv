import { describe, expect, it } from "vitest";
import { createTextPdf } from "../client/src/lib/simplePdf";

describe("Exportação PDF do Relatório de Vendas", () => {
  it("deve gerar um documento PDF válido com título, período e produtos", () => {
    const pdf = createTextPdf("Relatório de Vendas", [
      "Período: 2026-08-01 a 2026-08-13",
      "Hambúrguer (5x)",
    ]);

    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf).toContain("/Type /Catalog");
    expect(pdf).toContain("/Subtype /Type1");
    expect(pdf).toContain("Relatorio de Vendas");
    expect(pdf).toContain("Hamburguer \\(5x\\)");
    expect(pdf).toContain("%%EOF");
  });
});
