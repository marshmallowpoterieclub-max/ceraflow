-- Create enum for payment sources
CREATE TYPE public.payment_source AS ENUM ('stripe', 'sumup', 'cash', 'other');

-- Create transactions table for revenues
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  source payment_source NOT NULL DEFAULT 'other',
  external_id TEXT,
  customer_name TEXT,
  customer_email TEXT,
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (public read for now, will add auth later)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (temporary for demo)
CREATE POLICY "Allow public read access" 
ON public.transactions 
FOR SELECT 
USING (true);

-- Create policy for public insert access (temporary for demo)
CREATE POLICY "Allow public insert access" 
ON public.transactions 
FOR INSERT 
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert test data
INSERT INTO public.transactions (amount, description, source, customer_name, customer_email, transaction_date) VALUES
  (85.00, 'Atelier poterie adultes - 2h', 'stripe', 'Marie Dupont', 'marie.dupont@email.com', NOW() - INTERVAL '1 day'),
  (45.00, 'Vase en grès émaillé', 'sumup', 'Pierre Martin', 'pierre.m@email.com', NOW() - INTERVAL '2 days'),
  (120.00, 'Stage week-end initiation', 'stripe', 'Sophie Bernard', 'sophie.b@email.com', NOW() - INTERVAL '3 days'),
  (35.00, 'Bol céramique raku', 'sumup', 'Jean Lefebvre', NULL, NOW() - INTERVAL '4 days'),
  (65.00, 'Atelier enfants anniversaire', 'stripe', 'Claire Moreau', 'claire.moreau@email.com', NOW() - INTERVAL '5 days'),
  (55.00, 'Set de tasses artisanales', 'cash', 'Lucas Petit', NULL, NOW() - INTERVAL '6 days'),
  (95.00, 'Atelier tournage débutant', 'stripe', 'Emma Durand', 'emma.d@email.com', NOW() - INTERVAL '7 days'),
  (150.00, 'Cours particulier 3h', 'sumup', 'Antoine Roux', 'antoine.roux@email.com', NOW() - INTERVAL '8 days'),
  (40.00, 'Théière faite main', 'sumup', 'Camille Simon', NULL, NOW() - INTERVAL '9 days'),
  (75.00, 'Abonnement mensuel atelier', 'stripe', 'Julie Lambert', 'julie.l@email.com', NOW() - INTERVAL '10 days');