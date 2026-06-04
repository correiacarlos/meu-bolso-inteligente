export type PaymentMethod = "PIX" | "Débito" | "Crédito" | "Dinheiro";

export const PAYMENT_METHODS: PaymentMethod[] = ["PIX", "Débito", "Crédito", "Dinheiro"];

export interface IncomeEntry {
  amount: number;
  method: PaymentMethod;
  ts: number;
}

export interface DayData {
  incomes: IncomeEntry[];
  expenses: Record<string, number>; // key = column id
}

export interface MonthData {
  // key = "YYYY-MM-DD"
  days: Record<string, DayData>;
}

export interface ColumnDef {
  id: string;
  name: string;
  removable: boolean;
}

export const DEFAULT_EXPENSE_COLUMNS: ColumnDef[] = [
  { id: "agua", name: "Água", removable: false },
  { id: "luz", name: "Luz", removable: false },
  { id: "internet", name: "Internet", removable: false },
  { id: "mercado", name: "Mercado", removable: false },
  { id: "combustivel", name: "Combustível", removable: false },
  { id: "pedagio", name: "Pedágio", removable: false },
  { id: "manutencao", name: "Manutenção carro", removable: false },
  { id: "outros", name: "Outros", removable: false },
];

export interface BudgetConfig {
  columns: ColumnDef[];
  reservaPlanejada: number;
}