import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTransactionItems } from "@/hooks/useTransactionItems";
import type { Transaction } from "@/hooks/useTransactions";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CreditCard, Mail, Phone, MapPin, ExternalLink, User } from "lucide-react";

interface TransactionDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
}

function getCardBrandDisplay(brand: string | null): string {
  if (!brand) return "";
  const brands: Record<string, string> = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "American Express",
    discover: "Discover",
    diners: "Diners Club",
    jcb: "JCB",
  };
  return brands[brand.toLowerCase()] || brand;
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

export function TransactionDetailsDialog({
  open,
  onOpenChange,
  transaction,
}: TransactionDetailsDialogProps) {
  const { data: items, isLoading } = useTransactionItems(
    open && transaction?.items_count && transaction.items_count > 0
      ? transaction.id
      : null
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  if (!transaction) return null;

  const hasCustomerInfo =
    transaction.customer_name ||
    transaction.customer_email ||
    transaction.customer_phone ||
    transaction.customer_city;

  const hasCardInfo = transaction.card_brand && transaction.card_last4;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Details de la transaction</DialogTitle>
            <Badge variant={getSourceBadgeVariant(transaction.source)}>
              {getSourceLabel(transaction.source)}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-5">
          {/* Amount and date */}
          <div className="text-center py-2">
            <p className="text-3xl font-bold">{formatCurrency(transaction.amount)}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {format(new Date(transaction.transaction_date), "EEEE d MMMM yyyy 'a' HH:mm", {
                locale: fr,
              })}
            </p>
          </div>

          {/* Customer info */}
          {hasCustomerInfo && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Client</h4>
              <div className="rounded-lg border p-3 space-y-2">
                {transaction.customer_name && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{transaction.customer_name}</span>
                  </div>
                )}
                {transaction.customer_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`mailto:${transaction.customer_email}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {transaction.customer_email}
                    </a>
                  </div>
                )}
                {transaction.customer_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`tel:${transaction.customer_phone}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {transaction.customer_phone}
                    </a>
                  </div>
                )}
                {transaction.customer_city && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{transaction.customer_city}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Payment info */}
          {hasCardInfo && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Paiement</h4>
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {getCardBrandDisplay(transaction.card_brand)} •••• {transaction.card_last4}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Items (for SumUp transactions with multiple items) */}
          {transaction.items_count && transaction.items_count > 1 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">
                Articles ({transaction.items_count})
              </h4>
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="animate-pulse rounded-lg bg-muted/50 h-12"
                    />
                  ))}
                </div>
              ) : items && items.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg border p-2 text-sm"
                    >
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity} x {formatCurrency(item.price)}
                        </p>
                      </div>
                      <p className="font-semibold tabular-nums">
                        {formatCurrency(item.total_price)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          {/* Receipt link */}
          {transaction.receipt_url && (
            <Button
              variant="outline"
              className="w-full gap-2"
              asChild
            >
              <a href={transaction.receipt_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Voir le recu Stripe
              </a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
