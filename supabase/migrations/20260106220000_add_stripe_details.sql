-- Add columns for Stripe transaction details
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS card_brand TEXT,
ADD COLUMN IF NOT EXISTS card_last4 TEXT,
ADD COLUMN IF NOT EXISTS customer_phone TEXT,
ADD COLUMN IF NOT EXISTS customer_city TEXT,
ADD COLUMN IF NOT EXISTS receipt_url TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_transactions_source ON public.transactions(source);
