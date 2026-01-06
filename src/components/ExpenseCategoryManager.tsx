import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useExpenseCategories, type ExpenseCategory } from "@/hooks/useExpenseCategories";

interface ExpenseCategoryManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExpenseCategoryManager({
  open,
  onOpenChange,
}: ExpenseCategoryManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: categories, isLoading } = useExpenseCategories();
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom de la categorie ne peut pas etre vide.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("expense_categories")
        .insert({ name: newCategoryName.trim() });

      if (error) throw error;

      toast({
        title: "Categorie ajoutee",
        description: `La categorie "${newCategoryName}" a ete creee.`,
      });

      setNewCategoryName("");
      queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
    } catch (error) {
      console.error("Error adding category:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (category: ExpenseCategory) => {
    setDeletingId(category.id);

    try {
      // Check if category is in use
      const { count, error: countError } = await supabase
        .from("expenses")
        .select("*", { count: "exact", head: true })
        .eq("category_id", category.id);

      if (countError) throw countError;

      if (count && count > 0) {
        toast({
          title: "Impossible de supprimer",
          description: `Cette categorie est utilisee par ${count} depense(s).`,
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("expense_categories")
        .delete()
        .eq("id", category.id);

      if (error) throw error;

      toast({
        title: "Categorie supprimee",
        description: `La categorie "${category.name}" a ete supprimee.`,
      });

      queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
    } catch (error) {
      console.error("Error deleting category:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gerer les categories</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Add new category */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="newCategory" className="sr-only">
                Nouvelle categorie
              </Label>
              <Input
                id="newCategory"
                placeholder="Nouvelle categorie..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
              />
            </div>
            <Button
              onClick={handleAddCategory}
              disabled={isSubmitting || !newCategoryName.trim()}
              size="icon"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Category list */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-4 text-muted-foreground">
                Chargement...
              </div>
            ) : categories?.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                Aucune categorie
              </div>
            ) : (
              categories?.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <span className="font-medium">{category.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteCategory(category)}
                    disabled={deletingId === category.id}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
