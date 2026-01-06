import { useState, useEffect } from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/hooks/useTransactions";

type PaymentSource = "stripe" | "sumup" | "cash" | "other";

interface TransactionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null; // null = create mode, Transaction = edit mode
}

const SOURCE_OPTIONS: { value: PaymentSource; label: string }[] = [
  { value: "cash", label: "Especes" },
  { value: "stripe", label: "Stripe" },
  { value: "sumup", label: "SumUp" },
  { value: "other", label: "Autre" },
];

export function TransactionFormDialog({
  open,
  onOpenChange,
  transaction,
}: TransactionFormDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [source, setSource] = useState<PaymentSource>("cash");
  const [transactionDate, setTransactionDate] = useState<Date>(new Date());

  const isEditMode = !!transaction;

  // Reset form when dialog opens/closes or transaction changes
  useEffect(() => {
    if (open) {
      if (transaction) {
        setAmount(String(transaction.amount));
        setDescription(transaction.description || "");
        setCustomerName(transaction.customer_name || "");
        setCustomerEmail(transaction.customer_email || "");
        setSource(transaction.source);
        setTransactionDate(new Date(transaction.transaction_date));
      } else {
        setAmount("");
        setDescription("");
        setCustomerName("");
        setCustomerEmail("");
        setSource("cash");
        setTransactionDate(new Date());
      }
    }
  }, [open, transaction]);

  const handleSubmit = async () => {
    // Validation
    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      toast({
        title: "Erreur de validation",
        description: "Le montant doit etre un nombre positif.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const transactionData = {
        amount: amountValue,
        description: description || null,
        customer_name: customerName || null,
        customer_email: customerEmail || null,
        source,
        transaction_date: transactionDate.toISOString(),
      };

      if (isEditMode && transaction) {
        // Update existing transaction
        const { error } = await supabase
          .from("transactions")
          .update(transactionData)
          .eq("id", transaction.id);

        if (error) throw error;

        toast({
          title: "Transaction modifiee",
          description: "La transaction a ete mise a jour avec succes.",
        });
      } else {
        // Create new transaction
        const { error } = await supabase
          .from("transactions")
          .insert(transactionData);

        if (error) throw error;

        toast({
          title: "Transaction ajoutee",
          description: "La nouvelle transaction a ete creee avec succes.",
        });
      }

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transaction-stats"] });

      onOpenChange(false);
    } catch (error) {
      console.error("Error saving transaction:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Modifier la transaction" : "Nouvelle transaction"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Montant *</Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                €
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Ex: Cours de poterie, Vente vase..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Customer Name */}
          <div className="space-y-2">
            <Label htmlFor="customerName">Nom du client</Label>
            <Input
              id="customerName"
              placeholder="Ex: Marie Dupont"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>

          {/* Customer Email */}
          <div className="space-y-2">
            <Label htmlFor="customerEmail">Email du client</Label>
            <Input
              id="customerEmail"
              type="email"
              placeholder="Ex: marie@example.com"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
            />
          </div>

          {/* Source */}
          <div className="space-y-2">
            <Label>Source de paiement</Label>
            <Select value={source} onValueChange={(v) => setSource(v as PaymentSource)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Transaction Date */}
          <div className="space-y-2">
            <Label>Date de la transaction</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !transactionDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {transactionDate
                    ? format(transactionDate, "d MMMM yyyy", { locale: fr })
                    : "Selectionner une date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={transactionDate}
                  onSelect={(date) => date && setTransactionDate(date)}
                  locale={fr}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting
              ? "Enregistrement..."
              : isEditMode
              ? "Enregistrer"
              : "Ajouter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
