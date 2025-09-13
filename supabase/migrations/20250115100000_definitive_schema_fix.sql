/*
          # [DEFINITIVE SCHEMA FIX & RESET]
          This script performs a full reset and correction of the database schema for GST, Payments, Customers, and related security policies. It is designed to fix previous migration errors.

          ## Query Description: [This operation will remove and recreate several tables (bills, payments, customers) and their security policies to fix persistent errors. This is a necessary reset to ensure a clean and correct database structure. No user or restaurant data will be lost, but any data in the previously broken bills/payments/customers tables will be cleared.]
          
          ## Metadata:
          - Schema-Category: ["Structural", "Dangerous"]
          - Impact-Level: ["High"]
          - Requires-Backup: true
          - Reversible: false
          
          ## Structure Details:
          - Tables Dropped & Recreated: public.bills, public.payments, public.customers
          - Policies Dropped & Recreated: Policies on public.restaurants, public.tables, public.orders, public.menu_items, and new tables.
          - Columns Added: gstin, cgst_rate, sgst_rate, etc., on public.restaurants
          
          ## Security Implications:
          - RLS Status: RLS will be dropped and re-enabled on multiple tables to apply correct policies.
          - Policy Changes: Yes, major corrections and additions.
          - Auth Requirements: Policies are based on auth.uid() and user's restaurant affiliation.
          
          ## Performance Impact:
          - Indexes: Standard primary key indexes will be created.
          - Triggers: No new triggers.
          - Estimated Impact: Minimal performance impact after initial setup.
          */

-- Step 1: Drop existing problematic objects to ensure a clean slate.
DROP POLICY IF EXISTS "Enable access for restaurant members" ON public.tables;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.tables;
DROP TABLE IF EXISTS public.customers;
DROP TABLE IF EXISTS public.bills;
DROP TABLE IF EXISTS public.payments;

-- Step 2: Alter the 'restaurants' table to add new columns for GST and Payments.
ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS gstin TEXT,
ADD COLUMN IF NOT EXISTS cgst_rate NUMERIC,
ADD COLUMN IF NOT EXISTS sgst_rate NUMERIC,
ADD COLUMN IF NOT EXISTS payment_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS upi_qr_code TEXT,
ADD COLUMN IF NOT EXISTS bank_details TEXT;

-- Step 3: Create the new tables required for the application features.

-- Customers Table
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    total_orders INT NOT NULL DEFAULT 0,
    total_spent NUMERIC NOT NULL DEFAULT 0,
    last_visit TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bills Table
CREATE TABLE public.bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    subtotal NUMERIC NOT NULL,
    cgst_amount NUMERIC NOT NULL,
    sgst_amount NUMERIC NOT NULL,
    total NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, failed
    payment_method TEXT, -- cash, upi, card
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payments Table (for online payment verification)
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_id UUID REFERENCES public.tables(id),
    customer_name TEXT NOT NULL,
    utr_number TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, verified, failed
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- Step 4: Enable Row Level Security (RLS) on all relevant tables.
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop all old policies to prevent conflicts.
DROP POLICY IF EXISTS "Enable access for restaurant members" ON public.restaurants;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.restaurants;
DROP POLICY IF EXISTS "Enable access for restaurant members" ON public.branches;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.branches;
DROP POLICY IF EXISTS "Enable access for restaurant members" ON public.menu_items;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.menu_items;
DROP POLICY IF EXISTS "Enable access for restaurant members" ON public.orders;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.orders;

-- Step 6: Create new, corrected RLS policies.

-- Policy for 'restaurants' table
CREATE POLICY "Enable access for restaurant members"
ON public.restaurants
FOR ALL
USING (
  id = (
    SELECT restaurant_id
    FROM public.profiles
    WHERE id = auth.uid()
  )
);

-- Policy for 'branches' table
CREATE POLICY "Enable access for restaurant members"
ON public.branches
FOR ALL
USING (
  restaurant_id = (
    SELECT restaurant_id
    FROM public.profiles
    WHERE id = auth.uid()
  )
);

-- CORRECTED Policy for 'tables' table
CREATE POLICY "Enable access for restaurant members"
ON public.tables
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.branches b
    WHERE b.id = tables.branch_id
    AND b.restaurant_id = (
      SELECT restaurant_id
      FROM public.profiles
      WHERE id = auth.uid()
    )
  )
);

-- Policy for 'menu_items' table
CREATE POLICY "Enable access for restaurant members"
ON public.menu_items
FOR ALL
USING (
  restaurant_id = (
    SELECT restaurant_id
    FROM public.profiles
    WHERE id = auth.uid()
  )
);

-- Policy for 'orders' table
CREATE POLICY "Enable access for restaurant members"
ON public.orders
FOR ALL
USING (
  restaurant_id = (
    SELECT restaurant_id
    FROM public.profiles
    WHERE id = auth.uid()
  )
);

-- Policy for 'customers' table
CREATE POLICY "Enable access for restaurant members"
ON public.customers
FOR ALL
USING (
  restaurant_id = (
    SELECT restaurant_id
    FROM public.profiles
    WHERE id = auth.uid()
  )
);

-- Policy for 'bills' table
CREATE POLICY "Enable access for restaurant members"
ON public.bills
FOR ALL
USING (
  restaurant_id = (
    SELECT restaurant_id
    FROM public.profiles
    WHERE id = auth.uid()
  )
);

-- Policy for 'payments' table
CREATE POLICY "Enable access for restaurant members"
ON public.payments
FOR ALL
USING (
  restaurant_id = (
    SELECT restaurant_id
    FROM public.profiles
    WHERE id = auth.uid()
  )
);
