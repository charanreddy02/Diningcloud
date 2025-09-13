-- =================================================================
-- Comprehensive Schema and RLS Policy Fix
-- This script is idempotent and can be run safely multiple times.
-- It corrects all previously identified schema and RLS issues.
-- =================================================================

-- Step 1: Add missing columns to the restaurants table if they don't exist.
DO $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'restaurants' AND column_name = 'gstin') THEN
    ALTER TABLE public.restaurants ADD COLUMN gstin TEXT;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'restaurants' AND column_name = 'cgst_rate') THEN
    ALTER TABLE public.restaurants ADD COLUMN cgst_rate NUMERIC;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'restaurants' AND column_name = 'sgst_rate') THEN
    ALTER TABLE public.restaurants ADD COLUMN sgst_rate NUMERIC;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'restaurants' AND column_name = 'payment_enabled') THEN
    ALTER TABLE public.restaurants ADD COLUMN payment_enabled BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'restaurants' AND column_name = 'upi_qr_code') THEN
    ALTER TABLE public.restaurants ADD COLUMN upi_qr_code TEXT;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'restaurants' AND column_name = 'bank_details') THEN
    ALTER TABLE public.restaurants ADD COLUMN bank_details TEXT;
  END IF;
END $$;


-- Step 2: Create 'bills' and 'payments' tables if they don't exist.
CREATE TABLE IF NOT EXISTS public.bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    subtotal NUMERIC NOT NULL,
    cgst_amount NUMERIC NOT NULL DEFAULT 0,
    sgst_amount NUMERIC NOT NULL DEFAULT 0,
    total NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, failed
    payment_method TEXT, -- cash, upi, card
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    utr_number TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, verified, failed
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- Step 3: Drop all existing RLS policies on relevant tables to ensure a clean slate.
DROP POLICY IF EXISTS "Allow select for assigned users" ON public.restaurants;
DROP POLICY IF EXISTS "Allow update for owners" ON public.restaurants;
DROP POLICY IF EXISTS "Allow select for assigned users" ON public.branches;
DROP POLICY IF EXISTS "Allow select for assigned users" ON public.tables; -- This was the problematic one
DROP POLICY IF EXISTS "Allow insert for assigned users" ON public.tables;
DROP POLICY IF EXISTS "Allow delete for assigned users" ON public.tables;
DROP POLICY IF EXISTS "Allow select for assigned users" ON public.menu_items;
DROP POLICY IF EXISTS "Allow full access for assigned users" ON public.menu_items;
DROP POLICY IF EXISTS "Allow select for assigned users" ON public.orders;
DROP POLICY IF EXISTS "Allow full access for assigned users" ON public.orders;
DROP POLICY IF EXISTS "Allow select for assigned users" ON public.bills;
DROP POLICY IF EXISTS "Allow full access for assigned users" ON public.bills;
DROP POLICY IF EXISTS "Allow select for assigned users" ON public.payments;
DROP POLICY IF EXISTS "Allow full access for assigned users" ON public.payments;
DROP POLICY IF EXISTS "Allow select for assigned users" ON public.profiles;
DROP POLICY IF EXISTS "Allow update for owners on their staff" ON public.profiles;

-- Helper function to get user's restaurant_id
CREATE OR REPLACE FUNCTION get_my_restaurant_id()
RETURNS UUID AS $$
DECLARE
  restaurant_uuid UUID;
BEGIN
  SELECT restaurant_id INTO restaurant_uuid FROM public.profiles WHERE id = auth.uid();
  RETURN restaurant_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Step 4: Recreate all RLS policies with the CORRECT logic.

-- RLS for 'restaurants' table
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow select for assigned users" ON public.restaurants FOR SELECT USING (id = get_my_restaurant_id());
CREATE POLICY "Allow update for owners" ON public.restaurants FOR UPDATE USING (owner_id = auth.uid());

-- RLS for 'branches' table
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow select for assigned users" ON public.branches FOR SELECT USING (restaurant_id = get_my_restaurant_id());

-- RLS for 'tables' table -- THE CORRECTED LOGIC
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow select for assigned users" ON public.tables FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.branches b WHERE b.id = tables.branch_id AND b.restaurant_id = get_my_restaurant_id()
  )
);
CREATE POLICY "Allow insert for assigned users" ON public.tables FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.branches b WHERE b.id = tables.branch_id AND b.restaurant_id = get_my_restaurant_id()
  )
);
CREATE POLICY "Allow delete for assigned users" ON public.tables FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.branches b WHERE b.id = tables.branch_id AND b.restaurant_id = get_my_restaurant_id()
  )
);

-- RLS for 'menu_items' table
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access for assigned users" ON public.menu_items FOR ALL USING (restaurant_id = get_my_restaurant_id());

-- RLS for 'orders' table
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access for assigned users" ON public.orders FOR ALL USING (restaurant_id = get_my_restaurant_id());

-- RLS for 'bills' table
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access for assigned users" ON public.bills FOR ALL USING (restaurant_id = get_my_restaurant_id());

-- RLS for 'payments' table
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access for assigned users" ON public.payments FOR ALL USING (restaurant_id = get_my_restaurant_id());

-- RLS for 'profiles' table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow select for assigned users" ON public.profiles FOR SELECT USING (restaurant_id = get_my_restaurant_id());
CREATE POLICY "Allow update for owners on their staff" ON public.profiles FOR UPDATE USING (restaurant_id = get_my_restaurant_id());
