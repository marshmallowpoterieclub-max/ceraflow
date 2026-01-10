import { useState, useMemo } from "react";
import { Euro, TrendingUp, Plus, TrendingDown, Receipt } from "lucide-react";
import { subDays, subMonths } from "date-fns";
import { StatCard } from "@/components/StatCard";
import { TransactionList } from "@/components/TransactionList";
import { SourceFilter } from "@/components/SourceFilter";
import { SyncButton } from "@/components/SyncButton";
import { ExportButton } from "@/components/ExportButton";
import { TransactionFormDialog } from "@/components/TransactionFormDialog";
import { ExpenseFormDialog } from "@/components/ExpenseFormDialog";
import { ExpenseList } from "@/components/ExpenseList";
import { SalesChart } from "@/components/SalesChart";
import { TimeRangeFilter, type TimeRange } from "@/components/TimeRangeFilter";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTransactions } from "@/hooks/useTransactions";
import { useExpenses } from "@/hooks/useExpenses";

function getStartDateForRange(timeRange: TimeRange): Date {
  const now = new Date();
  switch (timeRange) {
    case "7days":
      return subDays(now, 6);
    case "30days":
      return subDays(now, 29);
    case "6months":
      return subMonths(now, 5);
    case "12months":
      return subMonths(now, 11);
  }
}

function getTimeRangeLabel(timeRange: TimeRange): string {
  switch (timeRange) {
    case "7days":
      return "7 derniers jours";
    case "30days":
      return "30 derniers jours";
    case "6months":
      return "6 derniers mois";
    case "12months":
      return "12 derniers mois";
  }
}

const Index = () => {
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [isNewTransactionOpen, setIsNewTransactionOpen] = useState(false);
  const [isNewExpenseOpen, setIsNewExpenseOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("revenus");
  const [timeRange, setTimeRange] = useState<TimeRange>("30days");

  const { data: transactions, isLoading: transactionsLoading } = useTransactions({
    source: selectedSource,
  });

  // All transactions for export (no source filter)
  const { data: allTransactions, isLoading: allTransactionsLoading } = useTransactions({});

  const { data: expenses, isLoading: expensesLoading } = useExpenses({});

  // Calculate stats based on selected time range
  const stats = useMemo(() => {
    if (!allTransactions) return null;
    const startDate = getStartDateForRange(timeRange);
    const now = new Date();

    const filtered = allTransactions.filter((t) => {
      const txDate = new Date(t.transaction_date);
      return txDate >= startDate && txDate <= now;
    });

    const total = filtered.reduce((sum, t) => sum + Number(t.amount), 0);
    const stripeTotal = filtered
      .filter((t) => t.source === "stripe")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const sumupTotal = filtered
      .filter((t) => t.source === "sumup")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      total,
      stripeTotal,
      sumupTotal,
      transactionCount: filtered.length,
    };
  }, [allTransactions, timeRange]);

  const expenseStats = useMemo(() => {
    if (!expenses) return null;
    const startDate = getStartDateForRange(timeRange);
    const now = new Date();

    const filtered = expenses.filter((e) => {
      const expDate = new Date(e.expense_date);
      return expDate >= startDate && expDate <= now;
    });

    const total = filtered.reduce((sum, e) => sum + Number(e.amount), 0);

    return {
      total,
      expenseCount: filtered.length,
    };
  }, [expenses, timeRange]);

  const statsLoading = allTransactionsLoading;
  const expenseStatsLoading = expensesLoading;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  const netResult = (stats?.total || 0) - (expenseStats?.total || 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
                <span className="text-lg font-display font-bold text-primary-foreground">C</span>
              </div>
              <div>
                <h1 className="text-2xl font-display font-semibold text-foreground">Ceraflow</h1>
                <p className="text-sm text-muted-foreground">
                  Gestion des finances
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                onClick={() => setIsNewExpenseOpen(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Nouvelle depense
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Time Range Filter + Sync Buttons */}
        <section className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <TimeRangeFilter value={timeRange} onChange={setTimeRange} />
            <div className="flex gap-2">
              <SyncButton />
              <ExportButton transactions={allTransactions || []} />
            </div>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="mb-10">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Recettes totales"
              value={statsLoading ? "..." : formatCurrency(stats?.total || 0)}
              subtitle={getTimeRangeLabel(timeRange)}
              icon={Euro}
              delay={0}
            />
            <StatCard
              title="Depenses totales"
              value={expenseStatsLoading ? "..." : formatCurrency(expenseStats?.total || 0)}
              subtitle={getTimeRangeLabel(timeRange)}
              icon={TrendingDown}
              delay={100}
            />
            <StatCard
              title="Resultat net"
              value={statsLoading || expenseStatsLoading ? "..." : formatCurrency(netResult)}
              subtitle={netResult >= 0 ? "Benefice" : "Perte"}
              icon={TrendingUp}
              delay={200}
            />
            <StatCard
              title="Transactions"
              value={statsLoading || expenseStatsLoading ? "..." : String((stats?.transactionCount || 0) + (expenseStats?.expenseCount || 0))}
              subtitle={getTimeRangeLabel(timeRange)}
              icon={Receipt}
              delay={300}
            />
          </div>
        </section>

        {/* Sales Chart */}
        <section className="mb-10">
          <SalesChart transactions={allTransactions || []} timeRange={timeRange} />
        </section>

        {/* Tabs for Revenus / Depenses */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="revenus" className="gap-2">
              <Euro className="h-4 w-4" />
              Revenus
            </TabsTrigger>
            <TabsTrigger value="depenses" className="gap-2">
              <TrendingDown className="h-4 w-4" />
              Depenses
            </TabsTrigger>
          </TabsList>

          {/* Revenus Tab */}
          <TabsContent value="revenus">
            <section>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h2 className="text-lg font-medium text-muted-foreground">
                  Dernieres transactions
                </h2>
                <div className="flex items-center gap-4">
                  <SourceFilter
                    selectedSource={selectedSource}
                    onSourceChange={setSelectedSource}
                  />
                  <Button
                    size="sm"
                    onClick={() => setIsNewTransactionOpen(true)}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Nouvelle
                  </Button>
                </div>
              </div>
              <TransactionList
                transactions={transactions || []}
                isLoading={transactionsLoading}
              />
            </section>
          </TabsContent>

          {/* Depenses Tab */}
          <TabsContent value="depenses">
            <section>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h2 className="text-lg font-medium text-muted-foreground">
                  Dernieres depenses
                </h2>
                <div className="flex items-center gap-4">
                  <Button
                    size="sm"
                    onClick={() => setIsNewExpenseOpen(true)}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Nouvelle depense
                  </Button>
                </div>
              </div>
              <ExpenseList
                expenses={expenses || []}
                isLoading={expensesLoading}
              />
            </section>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-12">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-sm text-muted-foreground">
            Ceramique Studio — Gestion simplifiee de votre atelier
          </p>
        </div>
      </footer>

      {/* New Transaction Dialog */}
      <TransactionFormDialog
        open={isNewTransactionOpen}
        onOpenChange={setIsNewTransactionOpen}
        transaction={null}
      />

      {/* New Expense Dialog */}
      <ExpenseFormDialog
        open={isNewExpenseOpen}
        onOpenChange={setIsNewExpenseOpen}
        expense={null}
      />
    </div>
  );
};

export default Index;
