/*
          # [Operation Name]
          Schema and RLS Fix for GST, Payments, and Bills

          ## Query Description: "This migration script corrects previous errors and properly sets up the database for new features. It alters the 'restaurants' table to add columns for GST and payment settings. It creates new tables for 'bills' and 'payments' to store financial data. It also corrects Row Level Security (RLS) policies, including a fix for the 'tables' table that caused the previous error. This script is designed to be safe to re-run."
          
          ## Metadata:
          - Schema-Category: "Structural"
          - Impact-Level: "Medium"
          - Requires-Backup: false
          - Reversible: false
          
          ## Structure Details:
          - Alters 'restaurants' table.
          - Creates 'bills' and 'payments' tables.
          - Creates and corrects RLS policies for 'restaurants', 'bills', 'payments', and 'tables'.
          
          ## Security Implications:
          - RLS Status: Enabled on new tables.
          - Policy Changes: Yes. Corrects faulty policies and adds new ones.
          - Auth Requirements: Policies are based on authenticated user roles.
          
          ## Performance Impact:
          - Indexes: Primary keys and foreign keys are indexed by default.
          - Triggers: None.
          - Estimated Impact: Low.
          */

-- 1. Alter 'restaurants' table for GST and Payment settings
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS gstin TEXT;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS cgst_rate REAL NOT NULL DEFAULT 0;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS sgst_rate REAL NOT NULL DEFAULT 0;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS payment_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS upi_qr_code TEXT;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS bank_details TEXT;

-- 2. Create 'bills' table
CREATE TABLE IF NOT EXISTS public.bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    subtotal REAL NOT NULL,
    cgst_amount REAL NOT NULL DEFAULT 0,
    sgst_amount REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'failed'
    payment_method TEXT, -- 'cash', 'upi', 'card'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create 'payments' table for online payment verification
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    utr_number TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'verified', 'failed'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Correct RLS for 'tables' table (THE FIX IS HERE)
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow owners to manage tables" ON public.tables;
CREATE POLICY "Allow owners to manage tables" ON public.tables
FOR ALL USING (
    branch_id IN (
        SELECT b.id FROM public.branches b
        JOIN public.profiles p ON b.restaurant_id = p.restaurant_id
        WHERE p.id = auth.uid() AND p.role = 'owner'
    )
);

DROP POLICY IF EXISTS "Allow staff to view tables" ON public.tables;
CREATE POLICY "Allow staff to view tables" ON public.tables
FOR SELECT USING (
    branch_id IN (
        SELECT b.id FROM public.branches b
        JOIN public.profiles p ON b.restaurant_id = p.restaurant_id
        WHERE p.id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Allow authenticated users to read tables" ON public.tables;
CREATE POLICY "Allow authenticated users to read tables" ON public.tables
FOR SELECT USING (auth.role() = 'authenticated');


-- 5. RLS for new 'bills' table
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow owners to manage bills" ON public.bills;
CREATE POLICY "Allow owners to manage bills" ON public.bills
FOR ALL USING (
    restaurant_id IN (
        SELECT restaurant_id FROM public.profiles WHERE id = auth.uid() AND role = 'owner'
    )
);

DROP POLICY IF EXISTS "Allow staff to view bills" ON public.bills;
CREATE POLICY "Allow staff to view bills" ON public.bills
FOR SELECT USING (
    restaurant_id IN (
        SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
    )
);


-- 6. RLS for new 'payments' table
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow owners to manage payments" ON public.payments;
CREATE POLICY "Allow owners to manage payments" ON public.payments
FOR ALL USING (
    restaurant_id IN (
        SELECT restaurant_id FROM public.profiles WHERE id = auth.uid() AND role = 'owner'
    )
);

DROP POLICY IF EXISTS "Allow staff to view payments" ON public.payments;
CREATE POLICY "Allow staff to view payments" ON public.payments
FOR SELECT USING (
    restaurant_id IN (
        SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
    )
);

-- 7. RLS for 'restaurants' table
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow owners to manage their restaurant" ON public.restaurants;
CREATE POLICY "Allow owners to manage their restaurant" ON public.restaurants
FOR ALL USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Allow staff to view their assigned restaurant" ON public.restaurants;
CREATE POLICY "Allow staff to view their assigned restaurant" ON public.restaurants
FOR SELECT USING (id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Allow public read access to restaurants" ON public.restaurants;
CREATE POLICY "Allow public read access to restaurants" ON public.restaurants
FOR SELECT USING (true);
