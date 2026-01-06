-- Create expense_categories table
CREATE TABLE public.expense_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on expense_categories
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

-- Policies for expense_categories (public for demo)
CREATE POLICY "Allow public read access on expense_categories"
ON public.expense_categories
FOR SELECT
USING (true);

CREATE POLICY "Allow public insert access on expense_categories"
ON public.expense_categories
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update access on expense_categories"
ON public.expense_categories
FOR UPDATE
USING (true);

CREATE POLICY "Allow public delete access on expense_categories"
ON public.expense_categories
FOR DELETE
USING (true);

-- Insert default categories
INSERT INTO public.expense_categories (name) VALUES
  ('Matieres premieres'),
  ('Fournitures'),
  ('Loyer'),
  ('Electricite/Gaz'),
  ('Equipement'),
  ('Marketing'),
  ('Autre');

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  amount DECIMAL(10, 2) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  supplier TEXT,
  product TEXT,
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  payment_method TEXT,
  vat_amount DECIMAL(10, 2),
  vat_rate DECIMAL(5, 2),
  expense_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on expenses
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Policies for expenses (public for demo)
CREATE POLICY "Allow public read access on expenses"
ON public.expenses
FOR SELECT
USING (true);

CREATE POLICY "Allow public insert access on expenses"
ON public.expenses
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update access on expenses"
ON public.expenses
FOR UPDATE
USING (true);

CREATE POLICY "Allow public delete access on expenses"
ON public.expenses
FOR DELETE
USING (true);

-- Create trigger for automatic timestamp updates on expenses
CREATE TRIGGER update_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
