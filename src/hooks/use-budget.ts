import { useCallback, useEffect, useState } from "react";
import {
  type BudgetConfig,
  type ColumnDef,
  type DayData,
  type IncomeEntry,
  type MonthData,
  type PaymentMethod,
  DEFAULT_EXPENSE_COLUMNS,
} from "@/lib/budget-types";

const CONFIG_KEY = "budget-config-v1";

function monthKey(date: Date) {
  return `budget-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function loadConfig(): BudgetConfig {
  if (typeof window === "undefined") return { columns: DEFAULT_EXPENSE_COLUMNS, reservaPlanejada: 0 };
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { columns: DEFAULT_EXPENSE_COLUMNS, reservaPlanejada: 0 };
}

function loadMonth(date: Date): MonthData {
  if (typeof window === "undefined") return { days: {} };
  try {
    const raw = localStorage.getItem(monthKey(date));
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { days: {} };
}

function emptyDay(): DayData {
  return { incomes: [], expenses: {} };
}

export function useBudget() {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());
  const [config, setConfig] = useState<BudgetConfig>(() => loadConfig());
  const [month, setMonth] = useState<MonthData>(() => loadMonth(new Date()));

  // persist
  useEffect(() => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem(monthKey(currentMonth), JSON.stringify(month));
  }, [month, currentMonth]);

  // month rollover check
  useEffect(() => {
    const t = setInterval(() => {
      const now = new Date();
      if (
        now.getMonth() !== currentMonth.getMonth() ||
        now.getFullYear() !== currentMonth.getFullYear()
      ) {
        setCurrentMonth(now);
        setMonth(loadMonth(now));
      }
    }, 60_000);
    return () => clearInterval(t);
  }, [currentMonth]);

  const updateDay = useCallback((dkey: string, updater: (d: DayData) => DayData) => {
    setMonth((m) => {
      const prev = m.days[dkey] ?? emptyDay();
      return { ...m, days: { ...m.days, [dkey]: updater(prev) } };
    });
  }, []);

  const addIncome = useCallback(
    (dkey: string, amount: number, method: PaymentMethod) => {
      const entry: IncomeEntry = { amount, method, ts: Date.now() };
      updateDay(dkey, (d) => ({ ...d, incomes: [...d.incomes, entry] }));
    },
    [updateDay],
  );

  const setIncomeTotal = useCallback(
    (dkey: string, newTotal: number, method: PaymentMethod) => {
      updateDay(dkey, () => ({
        incomes: newTotal > 0 ? [{ amount: newTotal, method, ts: Date.now() }] : [],
        expenses: month.days[dkey]?.expenses ?? {},
      }));
    },
    [updateDay, month],
  );

  const addExpense = useCallback(
    (dkey: string, columnId: string, amount: number) => {
      updateDay(dkey, (d) => ({
        ...d,
        expenses: { ...d.expenses, [columnId]: (d.expenses[columnId] ?? 0) + amount },
      }));
    },
    [updateDay],
  );

  const setExpense = useCallback(
    (dkey: string, columnId: string, amount: number) => {
      updateDay(dkey, (d) => ({
        ...d,
        expenses: { ...d.expenses, [columnId]: amount },
      }));
    },
    [updateDay],
  );

  const addColumn = useCallback((name: string) => {
    const id = `col_${Date.now()}`;
    setConfig((c) => ({ ...c, columns: [...c.columns, { id, name, removable: true }] }));
  }, []);

  const renameColumn = useCallback((id: string, name: string) => {
    setConfig((c) => ({
      ...c,
      columns: c.columns.map((col) => (col.id === id ? { ...col, name } : col)),
    }));
  }, []);

  const removeColumn = useCallback((id: string) => {
    setConfig((c) => ({ ...c, columns: c.columns.filter((col) => col.id !== id) }));
  }, []);

  const setReservaPlanejada = useCallback((v: number) => {
    setConfig((c) => ({ ...c, reservaPlanejada: v }));
  }, []);

  return {
    currentMonth,
    month,
    config,
    addIncome,
    setIncomeTotal,
    addExpense,
    setExpense,
    addColumn,
    renameColumn,
    removeColumn,
    setReservaPlanejada,
  };
}

export function dayIncomeTotal(d: DayData | undefined): number {
  if (!d) return 0;
  return d.incomes.reduce((s, i) => s + i.amount, 0);
}

export function dayExpenseTotal(d: DayData | undefined, columns: ColumnDef[]): number {
  if (!d) return 0;
  return columns.reduce((s, c) => s + (d.expenses[c.id] ?? 0), 0);
}

export function incomesByMethod(d: DayData | undefined): Record<PaymentMethod, number> {
  const init = { PIX: 0, Débito: 0, Crédito: 0, Dinheiro: 0 } as Record<PaymentMethod, number>;
  if (!d) return init;
  for (const i of d.incomes) init[i.method] += i.amount;
  return init;
}