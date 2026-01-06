import { useState } from "react";
import { Pencil, Trash2, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { TransactionFormDialog } from "@/components/TransactionFormDialog";
import { DeleteTransactionDialog } from "@/components/DeleteTransactionDialog";
import { TransactionItemsDialog } from "@/components/TransactionItemsDialog";
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
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);
  const [deleteTransaction, setDeleteTransaction] = useState<Transaction | null>(null);
  const [viewItemsTransaction, setViewItemsTransaction] = useState<Transaction | null>(null);

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
          const hasItems = transaction.items_count && transaction.items_count > 1;

          return (
            <div
              key={transaction.id}
              className={cn(
                "group flex items-center justify-between rounded-xl bg-card p-4 shadow-card transition-all duration-300 hover:shadow-soft hover:-translate-y-0.5 animate-slide-up"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <span className="text-lg font-display font-semibold text-primary">
                    {transaction.customer_name?.charAt(0) || "?"}
                  </span>
                </div>
                <div className="space-y-1">
                  {hasItems ? (
                    <button
                      onClick={() => setViewItemsTransaction(transaction)}
                      className="font-medium text-foreground hover:text-primary hover:underline underline-offset-2 transition-colors flex items-center gap-1.5"
                    >
                      <Package className="h-4 w-4" />
                      {transaction.items_count} articles
                    </button>
                  ) : (
                    <p className="font-medium text-foreground">
                      {formatDescription(transaction.description)}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">
                      {transaction.customer_name || "Client anonyme"}
                    </p>
                    <span className="text-muted-foreground/50">•</span>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(transaction.transaction_date), "d MMM yyyy", {
                        locale: fr,
                      })}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Action buttons - visible on hover */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setEditTransaction(transaction)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteTransaction(transaction)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
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
            </div>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <TransactionFormDialog
        open={!!editTransaction}
        onOpenChange={(open) => !open && setEditTransaction(null)}
        transaction={editTransaction}
      />

      {/* Delete Dialog */}
      <DeleteTransactionDialog
        open={!!deleteTransaction}
        onOpenChange={(open) => !open && setDeleteTransaction(null)}
        transaction={deleteTransaction}
      />

      {/* Items Dialog */}
      <TransactionItemsDialog
        open={!!viewItemsTransaction}
        onOpenChange={(open) => !open && setViewItemsTransaction(null)}
        transaction={viewItemsTransaction}
      />
    </>
  );
}
