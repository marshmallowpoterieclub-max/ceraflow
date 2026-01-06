import { useState } from "react";
import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { TransactionDetailsDialog } from "@/components/TransactionDetailsDialog";
import type { Transaction } from "@/hooks/useTransactions";

interface TransactionListProps {
  transactions: Transaction[];
  isLoading?: boolean;
}

function getSourceBadgeVariant(source: string): "stripe" | "sumup" | "cash" | "default" {
  switch (source) {
    case "stripe":
      return "stripe";
    case "sumup":
      return "sumup";
    case "cash":
      return "cash";
    default:
      return "default";
  }
}

function getSourceLabel(source: string): string {
  switch (source) {
    case "stripe":
      return "Stripe";
    case "sumup":
      return "SumUp";
    case "cash":
      return "Especes";
    default:
      return "Autre";
  }
}

function formatDescription(description: string | null): string {
  if (!description) return "Transaction";
  // Clean up "Paiement SumUp - POS/CASH" to just "Paiement"
  if (description.startsWith("Paiement SumUp - ")) {
    return "Paiement";
  }
  return description;
}

export function TransactionList({ transactions, isLoading }: TransactionListProps) {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl bg-muted/50 p-4 h-20"
          />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Aucune transaction trouvee</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {transactions.map((transaction, index) => {
          const hasMultipleItems = transaction.items_count && transaction.items_count > 1;
          const isStripe = transaction.source === "stripe";

          // Titre principal : nom client pour Stripe, article(s) pour SumUp
          const title = isStripe
            ? transaction.customer_name || "Client anonyme"
            : hasMultipleItems
              ? `${transaction.items_count} articles`
              : formatDescription(transaction.description);

          // Sous-titre : description pour Stripe, nom client pour SumUp
          const subtitle = isStripe
            ? formatDescription(transaction.description)
            : transaction.customer_name || "Client anonyme";

          // Initiale pour l'avatar
          const avatarInitial = isStripe
            ? transaction.customer_name?.charAt(0) || "?"
            : hasMultipleItems
              ? String(transaction.items_count)
              : transaction.description?.charAt(0) || "?";

          return (
            <button
              key={transaction.id}
              onClick={() => setSelectedTransaction(transaction)}
              className={cn(
                "group flex items-center justify-between rounded-xl bg-card p-4 shadow-card transition-all duration-300 hover:shadow-soft hover:-translate-y-0.5 animate-slide-up w-full text-left cursor-pointer"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  {hasMultipleItems && !isStripe ? (
                    <Package className="h-5 w-5 text-primary" />
                  ) : (
                    <span className="text-lg font-display font-semibold text-primary">
                      {avatarInitial}
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{title}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{subtitle}</span>
                    <span className="text-muted-foreground/50">•</span>
                    <span>
                      {format(new Date(transaction.transaction_date), "d MMM yyyy", {
                        locale: fr,
                      })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={getSourceBadgeVariant(transaction.source)}>
                  {getSourceLabel(transaction.source)}
                </Badge>
                <p className="text-lg font-semibold text-foreground tabular-nums min-w-[80px] text-right">
                  {new Intl.NumberFormat("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                  }).format(transaction.amount)}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Transaction Details Dialog */}
      <TransactionDetailsDialog
        open={!!selectedTransaction}
        onOpenChange={(open) => !open && setSelectedTransaction(null)}
        transaction={selectedTransaction}
      />
    </>
  );
}
