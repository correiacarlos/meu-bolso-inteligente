
# Plano: App de Controle de Orçamento Diário

## Visão Geral
App web (instalável no celular via PWA) com uma tabela mensal de receitas e gastos diários, cards de resumo, lançamento rápido, colunas customizáveis, exportação Excel e resumos por forma de pagamento.

## Telas e Componentes

### 1. Cabeçalho
- Título "Controle de Orçamento"
- Mês/Ano atual em destaque (muda automaticamente, zera campos ao virar o mês)
- Botão "Exportar Excel"

### 2. Cards de Resumo (topo)
- **Entradas do mês** (verde)
- **Gastos do mês** (vermelho)
- **Reserva Planejada** (10% acumulado do mês)
- **Saldo Final** = Entradas − Gastos − Reserva Planejada (verde se ≥ 0, vermelho se < 0)

### 3. Card "Lançamento Rápido"
- Input de valor para Receita
- Seletor de forma de pagamento: PIX / Débito / Crédito / Dinheiro
- Pequeno botão de calendário para escolher outra data (default = hoje)
- Botão **"Lançar Entrada"** (verde) — soma ao valor já existente do dia
- Botão **"Corrigir"** (laranja, menor) — abre modal para ajustar/substituir o valor do dia

### 4. Tabela Mensal
Colunas fixas iniciais:
- Data | Receita | 10% (auto) | Água | Luz | Internet | Mercado | Combustível | Pedágio | Manutenção carro | Outros | **(colunas customizadas)** | **Total Diário** | **Ações**

Comportamentos:
- Coluna "10%" calculada automaticamente da Receita
- Clicar numa célula de gasto → abre modal "Adicionar valor" (soma ao existente)
- Clicar na Receita → abre o mesmo fluxo do Lançamento Rápido com forma de pagamento
- **Total Diário** = Receita − soma de todos os gastos (verde positivo, vermelho negativo)
- Cabeçalhos das colunas são **editáveis** (clique para renomear)
- Botão à direita de cada linha (📊) → pop-up com resumo do dia: total recebido + breakdown por forma de pagamento + botão "OK"

### 5. Botão "Adicionar Coluna" (abaixo da tabela)
- Abre modal com input do nome + botões Salvar/Cancelar
- Nova coluna entra como categoria de gasto, editável e clicável como as outras

### 6. Notificação de Fim de Mês
- No último dia do mês às 22h (America/Sao_Paulo), exibe modal com resumo: Receita total, Gastos total, Saldo
- Ao virar para o próximo mês: arquiva os dados do mês anterior e zera os campos da tabela

### 7. Exportação Excel (.xlsx)
- Tabela completa do mês
- Linhas de totais
- **Resumo final** com total recebido por forma de pagamento (PIX, Débito, Crédito, Dinheiro)
- Biblioteca: `xlsx` (SheetJS)

## Persistência
- `localStorage` (funciona offline no celular)
- Estrutura por mês: `budget-YYYY-MM`
- Cada dia armazena: receita total, gastos por categoria, lista de lançamentos de receita com {valor, formaPagamento, timestamp}
- Colunas customizadas e renomeações salvas em chave separada

## Instalação no Celular
- PWA manifest-only (ícone, nome, standalone) para "Adicionar à tela de início"

## Detalhes Técnicos
- Stack: TanStack Start + React + Tailwind + shadcn/ui (já no projeto)
- Rota única: `src/routes/index.tsx` (substitui o placeholder)
- Componentes em `src/components/budget/`: SummaryCards, QuickEntry, BudgetTable, AddColumnDialog, ExpenseDialog, DaySummaryDialog, MonthEndDialog
- Hook `useBudget` para gerenciar estado + persistência
- Verificação de fim de mês via `setInterval` checando data/hora em America/Sao_Paulo
- Excel: `bun add xlsx`
- Datepicker: shadcn Calendar + Popover
- Tudo em português (PT-BR), moeda em BRL

## Fora do escopo (confirmar se quer depois)
- Login/sincronização entre dispositivos (tudo local por enquanto)
- Edição/exclusão de lançamentos individuais (apenas botão Corrigir do dia)
- Gráficos
