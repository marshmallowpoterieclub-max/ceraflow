import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Transaction {
  id: string;
  amount: number;
  description: string | null;
  source: "stripe" | "sumup" | "cash" | "other";
  customer_name: string | null;
  customer_email: string | null;
  transaction_date: string;
}

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
      return "Espèces";
    default:
      return "Autre";
  }
}

export function TransactionList({ transactions, isLoading }: TransactionListProps) {
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
        <p className="text-muted-foreground">Aucune transaction trouvée</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((transaction, index) => (
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
              <p className="font-medium text-foreground">
                {transaction.description || "Transaction"}
              </p>
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
          <div className="flex items-center gap-4">
            <Badge variant={getSourceBadgeVariant(transaction.source)}>
              {getSourceLabel(transaction.source)}
            </Badge>
            <p className="text-lg font-semibold text-foreground tabular-nums">
              {new Intl.NumberFormat("fr-FR", {
                style: "currency",
                currency: "EUR",
              }).format(transaction.amount)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
