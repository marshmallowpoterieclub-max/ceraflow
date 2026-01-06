import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Transaction {
  id: string;
  amount: number;
  description: string | null;
  source: "stripe" | "sumup" | "cash" | "other";
  external_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_city: string | null;
  card_brand: string | null;
  card_last4: string | null;
  receipt_url: string | null;
  payment_method: string | null;
  transaction_date: string;
  created_at: string;
  updated_at: string;
  items_count: number | null;
}

interface UseTransactionsOptions {
  source?: string | null;
}

export function useTransactions(options: UseTransactionsOptions = {}) {
  return useQuery({
    queryKey: ["transactions", options.source],
    queryFn: async () => {
      let query = supabase
        .from("transactions")
        .select("*")
        .order("transaction_date", { ascending: false });

      if (options.source) {
        query = query.eq("source", options.source as "stripe" | "sumup" | "cash" | "other");
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data as Transaction[];
    },
  });
}

export function useTransactionStats() {
  return useQuery({
    queryKey: ["transaction-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("amount, source, transaction_date");

      if (error) {
        throw error;
      }

      const total = data.reduce((sum, t) => sum + Number(t.amount), 0);
      const stripeTotal = data
        .filter((t) => t.source === "stripe")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const sumupTotal = data
        .filter((t) => t.source === "sumup")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const transactionCount = data.length;

      return {
        total,
        stripeTotal,
        sumupTotal,
        transactionCount,
      };
    },
  });
}
