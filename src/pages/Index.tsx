import { useState } from "react";
import { Euro, CreditCard, Smartphone, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { TransactionList } from "@/components/TransactionList";
import { SourceFilter } from "@/components/SourceFilter";
import { SyncButton } from "@/components/SyncButton";
import { useTransactions, useTransactionStats } from "@/hooks/useTransactions";

const Index = () => {
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  
  const { data: transactions, isLoading: transactionsLoading } = useTransactions({
    source: selectedSource,
  });
  
  const { data: stats, isLoading: statsLoading } = useTransactionStats();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <span className="text-lg font-display font-bold text-primary-foreground">C</span>
            </div>
            <div>
              <h1 className="text-2xl font-display font-semibold text-foreground">
                Céramique Studio
              </h1>
              <p className="text-sm text-muted-foreground">
                Gestion des recettes
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Grid */}
        <section className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h2 className="text-lg font-medium text-muted-foreground">
              Vue d'ensemble
            </h2>
            <div className="flex gap-2">
              <SyncButton source="sumup" label="Sync SumUp" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Recettes totales"
              value={statsLoading ? "..." : formatCurrency(stats?.total || 0)}
              subtitle="Ce mois"
              icon={Euro}
              delay={0}
            />
            <StatCard
              title="Via Stripe"
              value={statsLoading ? "..." : formatCurrency(stats?.stripeTotal || 0)}
              icon={CreditCard}
              delay={100}
            />
            <StatCard
              title="Via SumUp"
              value={statsLoading ? "..." : formatCurrency(stats?.sumupTotal || 0)}
              icon={Smartphone}
              delay={200}
            />
            <StatCard
              title="Transactions"
              value={statsLoading ? "..." : String(stats?.transactionCount || 0)}
              subtitle="Total"
              icon={TrendingUp}
              delay={300}
            />
          </div>
        </section>

        {/* Transactions Section */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-lg font-medium text-muted-foreground">
              Dernières transactions
            </h2>
            <SourceFilter
              selectedSource={selectedSource}
              onSourceChange={setSelectedSource}
            />
          </div>
          <TransactionList
            transactions={transactions || []}
            isLoading={transactionsLoading}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-12">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-sm text-muted-foreground">
            Céramique Studio — Gestion simplifiée de votre atelier
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
