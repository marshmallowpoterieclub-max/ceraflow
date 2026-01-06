import { useState, useEffect } from "react";
import { CalendarIcon, Settings } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
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
import { useExpenseCategories } from "@/hooks/useExpenseCategories";
import { ExpenseCategoryManager } from "@/components/ExpenseCategoryManager";
import type { Expense } from "@/hooks/useExpenses";

const PAYMENT_METHODS = [
  { value: "cb", label: "Carte bancaire" },
  { value: "virement", label: "Virement" },
  { value: "especes", label: "Especes" },
  { value: "cheque", label: "Cheque" },
  { value: "prelevement", label: "Prelevement" },
];

const VAT_RATES = [
  { value: "0", label: "0%" },
  { value: "5.5", label: "5,5%" },
  { value: "10", label: "10%" },
  { value: "20", label: "20%" },
];

interface ExpenseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense | null;
}

export function ExpenseFormDialog({
  open,
  onOpenChange,
  expense,
}: ExpenseFormDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: categories } = useExpenseCategories();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [supplier, setSupplier] = useState("");
  const [product, setProduct] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [vatRate, setVatRate] = useState<string>("");
  const [vatAmount, setVatAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState<Date>(new Date());

  const isEditMode = !!expense;

  // Reset form when dialog opens/closes or expense changes
  useEffect(() => {
    if (open) {
      if (expense) {
        setTitle(expense.title);
        setAmount(String(expense.amount));
        setDescription(expense.description || "");
        setSupplier(expense.supplier || "");
        setProduct(expense.product || "");
        setCategoryId(expense.category_id || "");
        setPaymentMethod(expense.payment_method || "");
        setVatRate(expense.vat_rate ? String(expense.vat_rate) : "");
        setVatAmount(expense.vat_amount ? String(expense.vat_amount) : "");
        setExpenseDate(new Date(expense.expense_date));
      } else {
        setTitle("");
        setAmount("");
        setDescription("");
        setSupplier("");
        setProduct("");
        setCategoryId("");
        setPaymentMethod("");
        setVatRate("");
        setVatAmount("");
        setExpenseDate(new Date());
      }
    }
  }, [open, expense]);

  // Auto-calculate VAT amount when amount or rate changes
  useEffect(() => {
    if (amount && vatRate) {
      const amountValue = parseFloat(amount);
      const rateValue = parseFloat(vatRate);
      if (!isNaN(amountValue) && !isNaN(rateValue)) {
        const calculatedVat = (amountValue * rateValue) / (100 + rateValue);
        setVatAmount(calculatedVat.toFixed(2));
      }
    }
  }, [amount, vatRate]);

  const handleSubmit = async () => {
    // Validation
    if (!title.trim()) {
      toast({
        title: "Erreur de validation",
        description: "Le titre est obligatoire.",
        variant: "destructive",
      });
      return;
    }

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
      const expenseData = {
        title: title.trim(),
        amount: amountValue,
        description: description || null,
        supplier: supplier || null,
        product: product || null,
        category_id: categoryId || null,
        payment_method: paymentMethod || null,
        vat_rate: vatRate ? parseFloat(vatRate) : null,
        vat_amount: vatAmount ? parseFloat(vatAmount) : null,
        expense_date: expenseDate.toISOString(),
      };

      if (isEditMode && expense) {
        const { error } = await supabase
          .from("expenses")
          .update(expenseData)
          .eq("id", expense.id);

        if (error) throw error;

        toast({
          title: "Depense modifiee",
          description: "La depense a ete mise a jour avec succes.",
        });
      } else {
        const { error } = await supabase
          .from("expenses")
          .insert(expenseData);

        if (error) throw error;

        toast({
          title: "Depense ajoutee",
          description: "La nouvelle depense a ete creee avec succes.",
        });
      }

      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expense-stats"] });

      onOpenChange(false);
    } catch (error) {
      console.error("Error saving expense:", error);
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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Modifier la depense" : "Nouvelle depense"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Titre *</Label>
              <Input
                id="title"
                placeholder="Ex: Achat argile, Facture EDF..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Montant TTC *</Label>
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

            {/* Expense Date */}
            <div className="space-y-2">
              <Label>Date de la depense *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !expenseDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expenseDate
                      ? format(expenseDate, "d MMMM yyyy", { locale: fr })
                      : "Selectionner une date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={expenseDate}
                    onSelect={(date) => date && setExpenseDate(date)}
                    locale={fr}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Supplier */}
            <div className="space-y-2">
              <Label htmlFor="supplier">Fournisseur</Label>
              <Input
                id="supplier"
                placeholder="Ex: Ceramique Pro, EDF..."
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
              />
            </div>

            {/* Product */}
            <div className="space-y-2">
              <Label htmlFor="product">Produit</Label>
              <Input
                id="product"
                placeholder="Ex: Argile blanche, Electricite..."
                value={product}
                onChange={(e) => setProduct(e.target.value)}
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Categorie</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-muted-foreground"
                  onClick={() => setIsCategoryManagerOpen(true)}
                >
                  <Settings className="h-3.5 w-3.5 mr-1" />
                  Gerer
                </Button>
              </div>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selectionner une categorie" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label>Methode de paiement</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Selectionner une methode" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* VAT Rate */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Taux TVA</Label>
                <Select value={vatRate} onValueChange={setVatRate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Taux" />
                  </SelectTrigger>
                  <SelectContent>
                    {VAT_RATES.map((rate) => (
                      <SelectItem key={rate.value} value={rate.value}>
                        {rate.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* VAT Amount */}
              <div className="space-y-2">
                <Label htmlFor="vatAmount">Montant TVA</Label>
                <div className="relative">
                  <Input
                    id="vatAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={vatAmount}
                    onChange={(e) => setVatAmount(e.target.value)}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    €
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Notes</Label>
              <Textarea
                id="description"
                placeholder="Notes additionnelles..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
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

      <ExpenseCategoryManager
        open={isCategoryManagerOpen}
        onOpenChange={setIsCategoryManagerOpen}
      />
    </>
  );
}
