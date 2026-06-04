import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Download, Pencil, Plus, Receipt, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  dayIncomeTotal,
  dayExpenseTotal,
  dayKey,
  incomesByMethod,
  useBudget,
} from "@/hooks/use-budget";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/budget-types";
import { exportMonthToExcel } from "@/lib/budget-export";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Controle de Orçamento Diário" },
      { name: "description", content: "Acompanhe receitas, gastos e saldo do mês com exportação para Excel." },
      { property: "og:title", content: "Controle de Orçamento Diário" },
      { property: "og:description", content: "Acompanhe receitas, gastos e saldo do mês com exportação para Excel." },
    ],
  }),
  component: Index,
});

const BRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Index() {
  const b = useBudget();
  const { currentMonth, month, config } = b;

  const year = currentMonth.getFullYear();
  const monthIdx = currentMonth.getMonth();
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const days = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => new Date(year, monthIdx, i + 1)),
    [year, monthIdx, daysInMonth],
  );

  const totals = useMemo(() => {
    let receita = 0;
    let gastos = 0;
    for (const d of days) {
      const data = month.days[dayKey(d)];
      receita += dayIncomeTotal(data);
      gastos += dayExpenseTotal(data, config.columns);
    }
    const reserva10 = receita * 0.1;
    return { receita, gastos, reserva10 };
  }, [days, month, config.columns]);

  const saldoFinal = totals.receita - totals.gastos - config.reservaPlanejada;

  // Quick entry state
  const [qeAmount, setQeAmount] = useState("");
  const [qeMethod, setQeMethod] = useState<PaymentMethod>("PIX");
  const [qeDate, setQeDate] = useState<Date>(new Date());

  // Correct income dialog
  const [correctOpen, setCorrectOpen] = useState(false);
  const [correctAmount, setCorrectAmount] = useState("");
  const [correctMethod, setCorrectMethod] = useState<PaymentMethod>("PIX");
  const [correctDate, setCorrectDate] = useState<Date>(new Date());

  // Expense dialog
  const [expenseDialog, setExpenseDialog] = useState<{
    open: boolean;
    dkey: string;
    columnId: string;
    columnName: string;
  }>({ open: false, dkey: "", columnId: "", columnName: "" });
  const [expenseAmount, setExpenseAmount] = useState("");

  // Add column dialog
  const [addColOpen, setAddColOpen] = useState(false);
  const [newColName, setNewColName] = useState("");

  // Rename column dialog
  const [renameCol, setRenameCol] = useState<{ open: boolean; id: string; name: string }>({
    open: false,
    id: "",
    name: "",
  });

  // Day summary dialog
  const [daySummary, setDaySummary] = useState<{ open: boolean; date: Date | null }>({
    open: false,
    date: null,
  });

  // Month end notification
  const [monthEndOpen, setMonthEndOpen] = useState(false);
  const [monthEndShownKey, setMonthEndShownKey] = useState<string | null>(null);

  useEffect(() => {
    const check = () => {
      const now = new Date();
      // Approx Brasília: UTC-3 (no DST). Use UTC math.
      const brasilia = new Date(now.getTime() - 3 * 3600 * 1000 + now.getTimezoneOffset() * 60000);
      const y = brasilia.getUTCFullYear();
      const m = brasilia.getUTCMonth();
      const d = brasilia.getUTCDate();
      const h = brasilia.getUTCHours();
      const last = new Date(y, m + 1, 0).getDate();
      const key = `${y}-${m}-end`;
      if (d === last && h >= 22 && monthEndShownKey !== key) {
        setMonthEndShownKey(key);
        setMonthEndOpen(true);
      }
    };
    check();
    const t = setInterval(check, 60_000);
    return () => clearInterval(t);
  }, [monthEndShownKey]);

  const handleQuickEntry = () => {
    const v = parseFloat(qeAmount.replace(",", "."));
    if (!v || v <= 0) return;
    b.addIncome(dayKey(qeDate), v, qeMethod);
    setQeAmount("");
  };

  const openCorrect = () => {
    setCorrectDate(qeDate);
    setCorrectMethod(qeMethod);
    const cur = dayIncomeTotal(month.days[dayKey(qeDate)]);
    setCorrectAmount(cur ? String(cur) : "");
    setCorrectOpen(true);
  };

  const submitCorrect = () => {
    const v = parseFloat(correctAmount.replace(",", "."));
    if (isNaN(v) || v < 0) return;
    b.setIncomeTotal(dayKey(correctDate), v, correctMethod);
    setCorrectOpen(false);
  };

  const openExpense = (date: Date, columnId: string, columnName: string) => {
    setExpenseDialog({ open: true, dkey: dayKey(date), columnId, columnName });
    setExpenseAmount("");
  };

  const submitExpense = () => {
    const v = parseFloat(expenseAmount.replace(",", "."));
    if (!v || v <= 0) return;
    b.addExpense(expenseDialog.dkey, expenseDialog.columnId, v);
    setExpenseDialog({ open: false, dkey: "", columnId: "", columnName: "" });
  };

  const submitAddColumn = () => {
    const n = newColName.trim();
    if (!n) return;
    b.addColumn(n);
    setNewColName("");
    setAddColOpen(false);
  };

  const submitRename = () => {
    const n = renameCol.name.trim();
    if (!n) return;
    b.renameColumn(renameCol.id, n);
    setRenameCol({ open: false, id: "", name: "" });
  };

  const monthLabel = format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[1400px] p-4 md:p-6 space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Controle de Orçamento</h1>
            <p className="text-sm text-muted-foreground capitalize">{monthLabel}</p>
          </div>
          <Button
            onClick={() => exportMonthToExcel(currentMonth, month, config.columns)}
            variant="outline"
          >
            <Download /> Exportar Excel
          </Button>
        </header>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCard label="Entradas do mês" value={totals.receita} color="green" />
          <SummaryCard label="Gastos do mês" value={totals.gastos} color="red" />
          <ReservaCard
            value={config.reservaPlanejada}
            onChange={b.setReservaPlanejada}
            sugestao={totals.reserva10}
          />
          <SummaryCard
            label="Saldo Final"
            value={saldoFinal}
            color={saldoFinal >= 0 ? "green" : "red"}
          />
        </div>

        {/* Quick entry */}
        <Card>
          <CardHeader>
            <CardTitle>Lançamento Rápido</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[140px]">
              <Label className="text-xs">Valor</Label>
              <Input
                inputMode="decimal"
                placeholder="0,00"
                value={qeAmount}
                onChange={(e) => setQeAmount(e.target.value)}
              />
            </div>
            <div className="min-w-[140px]">
              <Label className="text-xs">Forma de pagamento</Label>
              <Select value={qeMethod} onValueChange={(v) => setQeMethod(v as PaymentMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m === "Débito"
                        ? "Cartão de Débito"
                        : m === "Crédito"
                          ? "Cartão de Crédito"
                          : m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
                    <CalendarIcon />
                    {format(qeDate, "dd/MM/yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={qeDate}
                    onSelect={(d) => d && setQeDate(d)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleQuickEntry}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Lançar Entrada
              </Button>
              <Button
                onClick={openCorrect}
                size="sm"
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                Corrigir
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-2 sticky left-0 bg-muted/50 z-10">Data</th>
                  <th className="text-right p-2">Receita</th>
                  <th className="text-right p-2">10%</th>
                  {config.columns.map((col) => (
                    <th key={col.id} className="text-right p-2 min-w-[110px]">
                      <div className="flex items-center justify-end gap-1">
                        <span>{col.name}</span>
                        <button
                          onClick={() => setRenameCol({ open: true, id: col.id, name: col.name })}
                          className="text-muted-foreground hover:text-foreground"
                          title="Renomear"
                        >
                          <Pencil className="size-3" />
                        </button>
                        {col.removable && (
                          <button
                            onClick={() => b.removeColumn(col.id)}
                            className="text-muted-foreground hover:text-destructive"
                            title="Remover coluna"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="text-right p-2">Total Diário</th>
                  <th className="p-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {days.map((d) => {
                  const k = dayKey(d);
                  const data = month.days[k];
                  const income = dayIncomeTotal(data);
                  const expense = dayExpenseTotal(data, config.columns);
                  const total = income - expense;
                  const isToday = dayKey(new Date()) === k;
                  return (
                    <tr
                      key={k}
                      className={cn(
                        "border-b hover:bg-muted/30",
                        isToday && "bg-primary/5",
                      )}
                    >
                      <td className="p-2 sticky left-0 bg-background z-10 font-medium">
                        {format(d, "dd/MM (EEE)", { locale: ptBR })}
                      </td>
                      <td className="text-right p-2 text-green-600 font-medium">
                        {income > 0 ? BRL(income) : "—"}
                      </td>
                      <td className="text-right p-2 text-muted-foreground">
                        {income > 0 ? BRL(income * 0.1) : "—"}
                      </td>
                      {config.columns.map((col) => {
                        const v = data?.expenses[col.id] ?? 0;
                        return (
                          <td key={col.id} className="text-right p-1">
                            <button
                              onClick={() => openExpense(d, col.id, col.name)}
                              className={cn(
                                "w-full text-right px-2 py-1 rounded hover:bg-accent",
                                v > 0 ? "text-red-600 font-medium" : "text-muted-foreground",
                              )}
                            >
                              {v > 0 ? BRL(v) : "+"}
                            </button>
                          </td>
                        );
                      })}
                      <td
                        className={cn(
                          "text-right p-2 font-semibold",
                          total > 0 && "text-green-600",
                          total < 0 && "text-red-600",
                        )}
                      >
                        {income > 0 || expense > 0 ? BRL(total) : "—"}
                      </td>
                      <td className="p-1 text-center">
                        <button
                          onClick={() => setDaySummary({ open: true, date: d })}
                          className="text-muted-foreground hover:text-foreground"
                          title="Resumo do dia"
                        >
                          <Receipt className="size-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Button onClick={() => setAddColOpen(true)} variant="outline">
          <Plus /> Adicionar coluna
        </Button>
      </div>

      {/* Correct dialog */}
      <Dialog open={correctOpen} onOpenChange={setCorrectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Corrigir receita do dia</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon /> {format(correctDate, "dd/MM/yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={correctDate}
                    onSelect={(d) => d && setCorrectDate(d)}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Novo valor total da receita do dia</Label>
              <Input
                inputMode="decimal"
                value={correctAmount}
                onChange={(e) => setCorrectAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Isso substitui o valor acumulado do dia.
              </p>
            </div>
            <div>
              <Label>Forma de pagamento</Label>
              <Select
                value={correctMethod}
                onValueChange={(v) => setCorrectMethod(v as PaymentMethod)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCorrectOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submitCorrect}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expense dialog */}
      <Dialog
        open={expenseDialog.open}
        onOpenChange={(o) => setExpenseDialog((s) => ({ ...s, open: o }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar gasto — {expenseDialog.columnName}</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Valor</Label>
            <Input
              autoFocus
              inputMode="decimal"
              placeholder="0,00"
              value={expenseAmount}
              onChange={(e) => setExpenseAmount(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitExpense()}
            />
            <p className="text-xs text-muted-foreground mt-1">
              O valor será somado ao gasto existente do dia.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExpenseDialog({ open: false, dkey: "", columnId: "", columnName: "" })}
            >
              Cancelar
            </Button>
            <Button onClick={submitExpense}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add column dialog */}
      <Dialog open={addColOpen} onOpenChange={setAddColOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova coluna de gasto</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Nome</Label>
            <Input
              autoFocus
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitAddColumn()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddColOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submitAddColumn}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename column */}
      <Dialog
        open={renameCol.open}
        onOpenChange={(o) => setRenameCol((s) => ({ ...s, open: o }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear coluna</DialogTitle>
          </DialogHeader>
          <Input
            value={renameCol.name}
            onChange={(e) => setRenameCol((s) => ({ ...s, name: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && submitRename()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameCol({ open: false, id: "", name: "" })}>
              Cancelar
            </Button>
            <Button onClick={submitRename}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Day summary */}
      <Dialog
        open={daySummary.open}
        onOpenChange={(o) => setDaySummary((s) => ({ ...s, open: o }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Resumo do dia{" "}
              {daySummary.date ? format(daySummary.date, "dd/MM/yyyy") : ""}
            </DialogTitle>
          </DialogHeader>
          {daySummary.date && (() => {
            const data = month.days[dayKey(daySummary.date)];
            const by = incomesByMethod(data);
            const income = dayIncomeTotal(data);
            const expense = dayExpenseTotal(data, config.columns);
            const dailyTotal = income - expense;
            return (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between font-semibold border-b pb-2">
                  <span>Receitas</span>
                  <span className="text-green-600">{BRL(income)}</span>
                </div>
                {PAYMENT_METHODS.map((m) => (
                  <div key={m} className="flex justify-between">
                    <span>
                      {m === "Débito"
                        ? "Cartão de Débito"
                        : m === "Crédito"
                          ? "Cartão de Crédito"
                          : m}
                    </span>
                    <span>{BRL(by[m])}</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Gastos</span>
                  <span className="text-red-600">{BRL(expense)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Total Diário</span>
                  <span className={dailyTotal >= 0 ? "text-green-600" : "text-red-600"}>
                    {BRL(dailyTotal)}
                  </span>
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button onClick={() => setDaySummary({ open: false, date: null })}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Month end */}
      <Dialog open={monthEndOpen} onOpenChange={setMonthEndOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resumo do mês</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Receita total</span>
              <span className="text-green-600 font-semibold">{BRL(totals.receita)}</span>
            </div>
            <div className="flex justify-between">
              <span>Gastos totais</span>
              <span className="text-red-600 font-semibold">{BRL(totals.gastos)}</span>
            </div>
            <div className="flex justify-between">
              <span>Reserva planejada</span>
              <span>{BRL(config.reservaPlanejada)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span>Saldo Final</span>
              <span
                className={cn(
                  "font-bold",
                  saldoFinal >= 0 ? "text-green-600" : "text-red-600",
                )}
              >
                {BRL(saldoFinal)}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setMonthEndOpen(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "green" | "red" | "neutral";
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div
          className={cn(
            "text-xl md:text-2xl font-bold mt-1",
            color === "green" && "text-green-600",
            color === "red" && "text-red-600",
          )}
        >
          {BRL(value)}
        </div>
      </CardContent>
    </Card>
  );
}

function ReservaCard({
  value,
  onChange,
  sugestao,
}: {
  value: number;
  onChange: (v: number) => void;
  sugestao: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground flex items-center justify-between">
          <span>Reserva Planejada</span>
          <button
            onClick={() => setEditing((e) => !e)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Pencil className="size-3" />
          </button>
        </div>
        {editing ? (
          <div className="mt-1 flex gap-1">
            <Input
              className="h-8"
              inputMode="decimal"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onChange(parseFloat(draft.replace(",", ".")) || 0);
                  setEditing(false);
                }
              }}
            />
            <Button
              size="sm"
              onClick={() => {
                onChange(parseFloat(draft.replace(",", ".")) || 0);
                setEditing(false);
              }}
            >
              OK
            </Button>
          </div>
        ) : (
          <div className="text-xl md:text-2xl font-bold mt-1">{BRL(value)}</div>
        )}
        <div className="text-[10px] text-muted-foreground mt-1">
          Sugestão (10% receitas): {BRL(sugestao)}
        </div>
      </CardContent>
    </Card>
  );
}
