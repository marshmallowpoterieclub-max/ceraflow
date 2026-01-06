import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTransactionItems } from "@/hooks/useTransactionItems";
import type { Transaction } from "@/hooks/useTransactions";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface TransactionItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
}

export function TransactionItemsDialog({
  open,
  onOpenChange,
  transaction,
}: TransactionItemsDialogProps) {
  const { data: items, isLoading } = useTransactionItems(
    open ? transaction?.id || null : null
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Details de la transaction</DialogTitle>
        </DialogHeader>

        {transaction && (
          <div className="space-y-4">
            {/* Transaction info */}
            <div className="text-sm text-muted-foreground">
              {format(new Date(transaction.transaction_date), "d MMMM yyyy 'a' HH:mm", {
                locale: fr,
              })}
            </div>

            {/* Items list */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Articles</h4>

              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="animate-pulse rounded-lg bg-muted/50 h-14"
                    />
                  ))}
                </div>
              ) : items && items.length > 0 ? (
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="space-y-0.5">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} x {formatCurrency(item.price)}
                        </p>
                      </div>
                      <p className="font-semibold tabular-nums">
                        {formatCurrency(item.total_price)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Aucun detail disponible pour cette transaction
                </p>
              )}
            </div>

            {/* Total */}
            <div className="flex items-center justify-between border-t pt-4">
              <span className="font-medium">Total</span>
              <span className="text-lg font-bold">
                {formatCurrency(transaction.amount)}
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
