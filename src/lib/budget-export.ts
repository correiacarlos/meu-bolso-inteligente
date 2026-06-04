import * as XLSX from "xlsx";
import type { ColumnDef, MonthData, PaymentMethod } from "./budget-types";
import { dayKey, dayIncomeTotal, dayExpenseTotal, incomesByMethod } from "@/hooks/use-budget";

const MONTH_NAMES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

export function exportMonthToExcel(date: Date, month: MonthData, columns: ColumnDef[]) {
  const year = date.getFullYear();
  const monthIdx = date.getMonth();
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

  const header = ["Data", "Receita", "10%", ...columns.map((c) => c.name), "Total Diário"];
  const rows: (string | number)[][] = [header];

  const methodTotals: Record<PaymentMethod, number> = { PIX: 0, Débito: 0, Crédito: 0, Dinheiro: 0 };
  let totalReceita = 0;
  let totalGastos = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, monthIdx, d);
    const k = dayKey(date);
    const data = month.days[k];
    const income = dayIncomeTotal(data);
    const expense = dayExpenseTotal(data, columns);
    const row: (string | number)[] = [
      `${String(d).padStart(2, "0")}/${String(monthIdx + 1).padStart(2, "0")}/${year}`,
      income,
      income * 0.1,
      ...columns.map((c) => data?.expenses[c.id] ?? 0),
      income - expense,
    ];
    rows.push(row);
    totalReceita += income;
    totalGastos += expense;
    if (data) {
      const by = incomesByMethod(data);
      (Object.keys(by) as PaymentMethod[]).forEach((m) => (methodTotals[m] += by[m]));
    }
  }

  rows.push([]);
  rows.push(["TOTAIS"]);
  rows.push(["Receita total", totalReceita]);
  rows.push(["Gastos totais", totalGastos]);
  rows.push(["Reserva (10%)", totalReceita * 0.1]);
  rows.push(["Saldo", totalReceita - totalGastos - totalReceita * 0.1]);
  rows.push([]);
  rows.push(["RECEITAS POR FORMA DE PAGAMENTO"]);
  rows.push(["PIX", methodTotals.PIX]);
  rows.push(["Cartão de Débito", methodTotals.Débito]);
  rows.push(["Cartão de Crédito", methodTotals.Crédito]);
  rows.push(["Dinheiro", methodTotals.Dinheiro]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${MONTH_NAMES[monthIdx]} ${year}`);
  XLSX.writeFile(wb, `orcamento-${year}-${String(monthIdx + 1).padStart(2, "0")}.xlsx`);
}