import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ExpenseFormDialog } from "@/components/ExpenseFormDialog";
import { DeleteExpenseDialog } from "@/components/DeleteExpenseDialog";
import type { Expense, ExpenseWithCategory } from "@/hooks/useExpenses";

interface ExpenseListProps {
  expenses: ExpenseWithCategory[];
  isLoading?: boolean;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cb: "CB",
  virement: "Virement",
  especes: "Especes",
  cheque: "Cheque",
  prelevement: "Prelevement",
};

export function ExpenseList({ expenses, isLoading }: ExpenseListProps) {
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [deleteExpense, setDeleteExpense] = useState<Expense | null>(null);

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

  if (expenses.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Aucune depense trouvee</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {expenses.map((expense, index) => (
          <div
            key={expense.id}
            className={cn(
              "group flex items-center justify-between rounded-xl bg-card p-4 shadow-card transition-all duration-300 hover:shadow-soft hover:-translate-y-0.5 animate-slide-up"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
                <span className="text-lg font-display font-semibold text-destructive">
                  {expense.supplier?.charAt(0) || expense.title.charAt(0)}
                </span>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-foreground">
                  {expense.title}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {expense.supplier && (
                    <>
                      <p className="text-sm text-muted-foreground">
                        {expense.supplier}
                      </p>
                      <span className="text-muted-foreground/50">•</span>
                    </>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(expense.expense_date), "d MMM yyyy", {
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
                  onClick={() => setEditExpense(expense)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => setDeleteExpense(expense)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {expense.expense_categories && (
                <Badge variant="outline">
                  {expense.expense_categories.name}
                </Badge>
              )}
              {expense.payment_method && (
                <Badge variant="secondary">
                  {PAYMENT_METHOD_LABELS[expense.payment_method] || expense.payment_method}
                </Badge>
              )}
              <p className="text-lg font-semibold text-destructive tabular-nums min-w-[80px] text-right">
                -{new Intl.NumberFormat("fr-FR", {
                  style: "currency",
                  currency: "EUR",
                }).format(expense.amount)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Dialog */}
      <ExpenseFormDialog
        open={!!editExpense}
        onOpenChange={(open) => !open && setEditExpense(null)}
        expense={editExpense}
      />

      {/* Delete Dialog */}
      <DeleteExpenseDialog
        open={!!deleteExpense}
        onOpenChange={(open) => !open && setDeleteExpense(null)}
        expense={deleteExpense}
      />
    </>
  );
}
