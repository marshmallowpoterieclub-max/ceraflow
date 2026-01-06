-- Create transaction_items table to store product details from SumUp
CREATE TABLE public.transaction_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_price DECIMAL(10, 2) NOT NULL,
  vat_rate DECIMAL(5, 2),
  vat_amount DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on transaction_items
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;

-- Policies for transaction_items (public for demo)
CREATE POLICY "Allow public read access on transaction_items"
ON public.transaction_items
FOR SELECT
USING (true);

CREATE POLICY "Allow public insert access on transaction_items"
ON public.transaction_items
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public delete access on transaction_items"
ON public.transaction_items
FOR DELETE
USING (true);

-- Add index for faster lookups by transaction_id
CREATE INDEX idx_transaction_items_transaction_id ON public.transaction_items(transaction_id);

-- Add items_count column to transactions table for quick display
ALTER TABLE public.transactions ADD COLUMN items_count INTEGER DEFAULT 0;
