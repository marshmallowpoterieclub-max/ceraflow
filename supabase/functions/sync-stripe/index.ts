import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface StripeCharge {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  description: string | null;
  customer: string | null;
  receipt_url: string | null;
  billing_details?: {
    name: string | null;
    email: string | null;
    phone: string | null;
    address?: {
      city: string | null;
      country: string | null;
      line1: string | null;
      line2: string | null;
      postal_code: string | null;
      state: string | null;
    };
  };
  payment_method_details?: {
    type: string;
    card?: {
      brand: string | null;
      last4: string | null;
      funding: string | null;
    };
  };
  metadata?: Record<string, string>;
}

interface StripeListResponse {
  object: string;
  data: StripeCharge[];
  has_more: boolean;
  url: string;
}

async function fetchStripeCharges(
  apiKey: string,
  startingAfter?: string
): Promise<StripeListResponse> {
  const params = new URLSearchParams({
    limit: "100",
  });

  if (startingAfter) {
    params.append("starting_after", startingAfter);
  }

  const response = await fetch(
    `https://api.stripe.com/v1/charges?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Stripe API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeApiKey = Deno.env.get("STRIPE_API_KEY");

    if (!stripeApiKey) {
      console.error("STRIPE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Stripe API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Fetching all charges from Stripe API...");

    const allCharges: StripeCharge[] = [];
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      console.log(
        `Fetching charges${startingAfter ? ` after ${startingAfter}` : ""}...`
      );

      const response = await fetchStripeCharges(stripeApiKey, startingAfter);
      const fetchedCount = response.data?.length || 0;
      console.log(`Fetched ${fetchedCount} charges in this batch`);

      if (response.data && response.data.length > 0) {
        allCharges.push(...response.data);
        startingAfter = response.data[response.data.length - 1].id;
        hasMore = response.has_more;
      } else {
        hasMore = false;
      }
    }

    console.log(`Fetched ${allCharges.length} total charges from Stripe`);

    if (allCharges.length === 0) {
      return new Response(
        JSON.stringify({ message: "No charges found", synced: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Filter only successful charges
    const successfulCharges = allCharges.filter(
      (c) => c.status === "succeeded"
    );

    console.log(`Processing ${successfulCharges.length} successful charges`);

    let syncedCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;

    for (const charge of successfulCharges) {
      // Extract card details
      const cardBrand = charge.payment_method_details?.card?.brand || null;
      const cardLast4 = charge.payment_method_details?.card?.last4 || null;
      const paymentMethod = charge.payment_method_details?.type || null;

      // Extract customer details
      const customerName = charge.billing_details?.name || null;
      const customerEmail = charge.billing_details?.email || null;
      const customerPhone = charge.billing_details?.phone || null;
      const customerCity = charge.billing_details?.address?.city || null;

      // Check if charge already exists
      const { data: existing } = await supabase
        .from("transactions")
        .select("id, card_brand")
        .eq("external_id", charge.id)
        .eq("source", "stripe")
        .maybeSingle();

      if (existing) {
        // Update existing transaction if it's missing card details
        if (!existing.card_brand && cardBrand) {
          const { error: updateError } = await supabase
            .from("transactions")
            .update({
              card_brand: cardBrand,
              card_last4: cardLast4,
              customer_phone: customerPhone,
              customer_city: customerCity,
              receipt_url: charge.receipt_url,
              payment_method: paymentMethod,
            })
            .eq("id", existing.id);

          if (!updateError) {
            updatedCount++;
            console.log(`Updated transaction ${charge.id} with card details`);
          }
        } else {
          skippedCount++;
        }
        continue;
      }

      // Convert amount from cents to euros
      const amountInEuros = charge.amount / 100;

      // Build description
      const description =
        charge.description || charge.metadata?.product_name || "Paiement Stripe";

      // Convert Unix timestamp to ISO date
      const transactionDate = new Date(charge.created * 1000).toISOString();

      // Insert new transaction
      const { error: insertError } = await supabase.from("transactions").insert({
        amount: amountInEuros,
        description,
        source: "stripe",
        external_id: charge.id,
        transaction_date: transactionDate,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        customer_city: customerCity,
        card_brand: cardBrand,
        card_last4: cardLast4,
        receipt_url: charge.receipt_url,
        payment_method: paymentMethod,
      });

      if (insertError) {
        console.error(`Error inserting charge ${charge.id}:`, insertError);
      } else {
        console.log(`Synced charge ${charge.id}`);
        syncedCount++;
      }
    }

    console.log(`Sync complete: ${syncedCount} synced, ${updatedCount} updated, ${skippedCount} skipped`);

    return new Response(
      JSON.stringify({
        message: "Sync completed",
        synced: syncedCount,
        updated: updatedCount,
        skipped: skippedCount,
        total: successfulCharges.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in sync-stripe function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
