import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SumUpTransaction {
  id: string;
  transaction_code: string;
  amount: number;
  currency: string;
  timestamp: string;
  status: string;
  payment_type: string;
  card_type?: string;
  product_summary?: string;
  payout_plan?: string;
  installments_count?: number;
}

interface SumUpResponse {
  items: SumUpTransaction[];
  links?: Array<{ rel: string; href: string }>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sumupApiKey = Deno.env.get("SUMUP_API_KEY");

    if (!sumupApiKey) {
      console.error("SUMUP_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "SumUp API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Fetching all transactions from SumUp API...");

    // Fetch ALL transactions from SumUp API using pagination
    // Start from a very old date to get everything
    const startDate = "2020-01-01"; // Far enough back to capture all transactions
    const endDate = new Date().toISOString().split("T")[0];

    const allTransactions: SumUpTransaction[] = [];
    let hasMore = true;
    let offset = 0;
    const limit = 100; // Max allowed by SumUp API

    while (hasMore) {
      console.log(`Fetching transactions with offset ${offset}...`);

      const sumupResponse = await fetch(
        `https://api.sumup.com/v0.1/me/transactions/history?oldest_time=${startDate}&newest_time=${endDate}&limit=${limit}&offset=${offset}`,
        {
          headers: {
            Authorization: `Bearer ${sumupApiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!sumupResponse.ok) {
        const errorText = await sumupResponse.text();
        console.error("SumUp API error:", sumupResponse.status, errorText);
        return new Response(
          JSON.stringify({
            error: "Failed to fetch from SumUp",
            details: errorText,
            status: sumupResponse.status,
          }),
          {
            status: sumupResponse.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const sumupData: SumUpResponse = await sumupResponse.json();
      const fetchedCount = sumupData.items?.length || 0;
      console.log(`Fetched ${fetchedCount} transactions in this batch`);

      if (sumupData.items && sumupData.items.length > 0) {
        allTransactions.push(...sumupData.items);
        offset += sumupData.items.length;

        // If we got fewer items than the limit, we've reached the end
        if (sumupData.items.length < limit) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    console.log(`Fetched ${allTransactions.length} total transactions from SumUp`);

    if (allTransactions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No transactions found", synced: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const sumupData = { items: allTransactions };

    // Filter only successful transactions
    const successfulTransactions = sumupData.items.filter(
      (t) => t.status === "SUCCESSFUL"
    );

    console.log(`Processing ${successfulTransactions.length} successful transactions`);

    let syncedCount = 0;
    let skippedCount = 0;

    for (const transaction of successfulTransactions) {
      // Check if transaction already exists
      const { data: existing } = await supabase
        .from("transactions")
        .select("id")
        .eq("external_id", transaction.transaction_code)
        .eq("source", "sumup")
        .maybeSingle();

      if (existing) {
        console.log(`Transaction ${transaction.transaction_code} already exists, skipping`);
        skippedCount++;
        continue;
      }

      // Insert new transaction
      const { error: insertError } = await supabase.from("transactions").insert({
        amount: transaction.amount,
        description: transaction.product_summary || `Paiement SumUp - ${transaction.payment_type}`,
        source: "sumup",
        external_id: transaction.transaction_code,
        transaction_date: transaction.timestamp,
      });

      if (insertError) {
        console.error(`Error inserting transaction ${transaction.transaction_code}:`, insertError);
      } else {
        console.log(`Synced transaction ${transaction.transaction_code}`);
        syncedCount++;
      }
    }

    console.log(`Sync complete: ${syncedCount} synced, ${skippedCount} skipped`);

    return new Response(
      JSON.stringify({
        message: "Sync completed",
        synced: syncedCount,
        skipped: skippedCount,
        total: successfulTransactions.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in sync-sumup function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
