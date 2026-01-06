import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TransactionItem {
  id: string;
  transaction_id: string;
  name: string;
  description: string | null;
  price: number;
  quantity: number;
  total_price: number;
  vat_rate: number | null;
  vat_amount: number | null;
  created_at: string;
}

export function useTransactionItems(transactionId: string | null) {
  return useQuery({
    queryKey: ["transaction-items", transactionId],
    queryFn: async () => {
      if (!transactionId) return [];

      const { data, error } = await supabase
        .from("transaction_items")
        .select("*")
        .eq("transaction_id", transactionId)
        .order("created_at", { ascending: true });

      if (error) {
        throw error;
      }

      return data as TransactionItem[];
    },
    enabled: !!transactionId,
  });
}
