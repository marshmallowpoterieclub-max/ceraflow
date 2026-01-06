import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Expense {
  id: string;
  amount: number;
  title: string;
  description: string | null;
  supplier: string | null;
  product: string | null;
  category_id: string | null;
  payment_method: string | null;
  vat_amount: number | null;
  vat_rate: number | null;
  expense_date: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseWithCategory extends Expense {
  expense_categories: {
    id: string;
    name: string;
  } | null;
}

interface UseExpensesOptions {
  categoryId?: string | null;
}

export function useExpenses(options: UseExpensesOptions = {}) {
  return useQuery({
    queryKey: ["expenses", options.categoryId],
    queryFn: async () => {
      let query = supabase
        .from("expenses")
        .select(`
          *,
          expense_categories (
            id,
            name
          )
        `)
        .order("expense_date", { ascending: false });

      if (options.categoryId) {
        query = query.eq("category_id", options.categoryId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data as ExpenseWithCategory[];
    },
  });
}

export function useExpenseStats() {
  return useQuery({
    queryKey: ["expense-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("amount, vat_amount, category_id, expense_date");

      if (error) {
        throw error;
      }

      const total = data.reduce((sum, e) => sum + Number(e.amount), 0);
      const totalVat = data.reduce((sum, e) => sum + Number(e.vat_amount || 0), 0);
      const expenseCount = data.length;

      // Group by category
      const byCategory: Record<string, number> = {};
      data.forEach((e) => {
        const catId = e.category_id || "uncategorized";
        byCategory[catId] = (byCategory[catId] || 0) + Number(e.amount);
      });

      return {
        total,
        totalVat,
        expenseCount,
        byCategory,
      };
    },
  });
}
