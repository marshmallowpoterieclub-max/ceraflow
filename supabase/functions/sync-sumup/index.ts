import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SumUpProduct {
  name: string | null;
  price: number | null;
  quantity: number | null;
  total_price: number | null;
  vat_rate?: number | null;
  vat_amount?: number | null;
  description?: string | null;
}

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
  products?: SumUpProduct[];
}

interface SumUpHistoryResponse {
  items: SumUpTransaction[];
  links?: Array<{ rel: string; href: string }>;
}

interface SumUpReceiptResponse {
  transaction_data?: {
    products?: SumUpProduct[];
  };
}

async function fetchTransactionDetails(
  transactionCode: string,
  apiKey: string
): Promise<SumUpProduct[]> {
  try {
    // Use /v0.1/me/transactions?transaction_code=XXX to get full transaction details with products
    const response = await fetch(
      `https://api.sumup.com/v0.1/me/transactions?transaction_code=${transactionCode}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.log(`Could not fetch transaction details for ${transactionCode}: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const products = data.products || [];
    if (products.length > 0) {
      console.log(`Found ${products.length} products for ${transactionCode}:`, JSON.stringify(products));
    }
    return products;
  } catch (error) {
    console.log(`Error fetching transaction details for ${transactionCode}:`, error);
    return [];
  }
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

    // Use the working /history endpoint
    const startDate = "2020-01-01";
    const endDate = new Date().toISOString().split("T")[0];

    const allTransactions: SumUpTransaction[] = [];
    let hasMore = true;
    let offset = 0;
    const limit = 100;

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

      const sumupData: SumUpHistoryResponse = await sumupResponse.json();
      const fetchedCount = sumupData.items?.length || 0;
      console.log(`Fetched ${fetchedCount} transactions in this batch`);

      if (sumupData.items && sumupData.items.length > 0) {
        allTransactions.push(...sumupData.items);
        offset += sumupData.items.length;

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

    // Filter only successful transactions
    const successfulTransactions = allTransactions.filter(
      (t) => t.status === "SUCCESSFUL"
    );

    console.log(`Processing ${successfulTransactions.length} successful transactions`);

    let syncedCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;

    for (const transaction of successfulTransactions) {
      // Check if transaction already exists
      const { data: existing } = await supabase
        .from("transactions")
        .select("id, items_count")
        .eq("external_id", transaction.transaction_code)
        .eq("source", "sumup")
        .maybeSingle();

      // Fetch receipt details to get products
      let products = transaction.products || [];

      // If no products in transaction, try to fetch full transaction details
      if (products.length === 0) {
        products = await fetchTransactionDetails(transaction.transaction_code, sumupApiKey);
      }

      const itemsCount = products.filter(p => p.name).length;

      // Build description based on products
      let description: string;
      if (itemsCount > 0) {
        if (itemsCount === 1) {
          description = products[0]?.name || "Paiement SumUp";
        } else {
          description = `${itemsCount} articles`;
        }
      } else {
        description = transaction.product_summary || `Paiement SumUp - ${transaction.payment_type}`;
      }

      if (existing) {
        // Update existing transaction if items_count is 0/null and we now have items
        // Also force fetch receipt for transactions without items to check for products
        if (existing.items_count === 0 || existing.items_count === null) {
          // Try to fetch products if we don't have any yet
          if (itemsCount === 0 && !products.length) {
            console.log(`Fetching receipt for existing transaction ${transaction.transaction_code}...`);
            products = await fetchReceiptDetails(transaction.transaction_code, sumupApiKey);
            const newItemsCount = products.filter(p => p.name).length;
            if (newItemsCount > 0) {
              console.log(`Found ${newItemsCount} products for ${transaction.transaction_code}`);
            }
          }
        }

        const finalItemsCount = products.filter(p => p.name).length;

        if ((existing.items_count === 0 || existing.items_count === null) && finalItemsCount > 0) {
          // Rebuild description with new products
          let newDescription: string;
          if (finalItemsCount === 1) {
            newDescription = products[0]?.name || "Paiement SumUp";
          } else {
            newDescription = `${finalItemsCount} articles`;
          }

          const { error: updateError } = await supabase
            .from("transactions")
            .update({
              description: newDescription,
              items_count: finalItemsCount
            })
            .eq("id", existing.id);

          if (!updateError) {
            // Insert product items
            for (const product of products) {
              if (product.name) {
                await supabase.from("transaction_items").insert({
                  transaction_id: existing.id,
                  name: product.name,
                  description: product.description || null,
                  price: product.price || 0,
                  quantity: product.quantity || 1,
                  total_price: product.total_price || product.price || 0,
                  vat_rate: product.vat_rate || null,
                  vat_amount: product.vat_amount || null,
                });
              }
            }
            updatedCount++;
            console.log(`Updated transaction ${transaction.transaction_code} with ${itemsCount} items`);
          }
        } else {
          skippedCount++;
        }
        continue;
      }

      // Insert new transaction
      const { data: insertedTransaction, error: insertError } = await supabase
        .from("transactions")
        .insert({
          amount: transaction.amount,
          description,
          source: "sumup",
          external_id: transaction.transaction_code,
          transaction_date: transaction.timestamp,
          items_count: itemsCount,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error(`Error inserting transaction ${transaction.transaction_code}:`, insertError);
      } else {
        console.log(`Synced transaction ${transaction.transaction_code} with ${itemsCount} items`);
        syncedCount++;

        // Insert product items if any
        if (insertedTransaction && itemsCount > 0) {
          for (const product of products) {
            if (product.name) {
              const { error: itemError } = await supabase
                .from("transaction_items")
                .insert({
                  transaction_id: insertedTransaction.id,
                  name: product.name,
                  description: product.description || null,
                  price: product.price || 0,
                  quantity: product.quantity || 1,
                  total_price: product.total_price || product.price || 0,
                  vat_rate: product.vat_rate || null,
                  vat_amount: product.vat_amount || null,
                });

              if (itemError) {
                console.error(`Error inserting item for transaction ${transaction.transaction_code}:`, itemError);
              }
            }
          }
        }
      }
    }

    console.log(`Sync complete: ${syncedCount} synced, ${updatedCount} updated, ${skippedCount} skipped`);

    return new Response(
      JSON.stringify({
        message: "Sync completed",
        synced: syncedCount,
        updated: updatedCount,
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
