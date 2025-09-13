/*
          # [Schema Upgrade] Add GST, Payments, and Customer Features
          This migration upgrades the database schema to support new features including GST configuration, online payment processing, and customer data aggregation. It adds new columns to the `restaurants` table, creates new `bills`, `payments`, and `customers` tables, and establishes necessary relationships and security policies.

          ## Query Description: [This operation will add new tables and alter existing ones. It is designed to be non-destructive to existing data. However, backing up your database before applying major schema changes is always recommended.]
          
          ## Metadata:
          - Schema-Category: ["Structural"]
          - Impact-Level: ["Medium"]
          - Requires-Backup: [true]
          - Reversible: [false]
          
          ## Structure Details:
          - **Alters `restaurants` table:** Adds `gstin`, `cgst_rate`, `sgst_rate`, `payment_enabled`, `upi_qr_code`, `bank_details`.
          - **Creates `bills` table:** Stores billing information linked to orders.
          - **Creates `payments` table:** Stores online payment verification details.
          - **Creates `customers` table:** For aggregated customer data (this table is illustrative and data will be aggregated from orders in the app).
          
          ## Security Implications:
          - RLS Status: [Enabled]
          - Policy Changes: [Yes]
          - Auth Requirements: [Enables RLS and adds policies for `bills` and `payments` to ensure only authorized users (restaurant owners/staff) can access data relevant to their restaurant.]
          
          ## Performance Impact:
          - Indexes: [Added]
          - Triggers: [None]
          - Estimated Impact: [Low. Adds indexes on foreign keys to maintain query performance.]
          */

-- 1. Add new columns to the restaurants table for GST and Payment settings
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS gstin TEXT;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS cgst_rate NUMERIC(5, 2) DEFAULT 0;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS sgst_rate NUMERIC(5, 2) DEFAULT 0;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS payment_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS upi_qr_code TEXT;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS bank_details TEXT;

-- 2. Create the bills table
CREATE TABLE IF NOT EXISTS public.bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    subtotal NUMERIC(10, 2) NOT NULL,
    cgst_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    sgst_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, failed
    payment_method TEXT, -- cash, upi, card
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bills_order_id ON public.bills(order_id);
CREATE INDEX IF NOT EXISTS idx_bills_restaurant_id ON public.bills(restaurant_id);

-- 3. Create the payments table for online payment verification
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    utr_number TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, verified, failed
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_restaurant_id ON public.payments(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_payments_utr_number ON public.payments(utr_number);

-- 4. Create the customers table (for aggregated data, managed by app logic)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    total_orders INTEGER NOT NULL DEFAULT 0,
    total_spent NUMERIC(10, 2) NOT NULL DEFAULT 0,
    last_visit TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customers_restaurant_id ON public.customers(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);

-- 5. Enable RLS and define policies for new tables
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow owner and staff to manage bills" ON public.bills;
CREATE POLICY "Allow owner and staff to manage bills" ON public.bills
FOR ALL
USING (
    restaurant_id IN (
        SELECT restaurant_id FROM public.profiles WHERE user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Allow owner and staff to manage payments" ON public.payments;
CREATE POLICY "Allow owner and staff to manage payments" ON public.payments
FOR ALL
USING (
    restaurant_id IN (
        SELECT restaurant_id FROM public.profiles WHERE user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Allow owner and staff to manage customers" ON public.customers;
CREATE POLICY "Allow owner and staff to manage customers" ON public.customers
FOR ALL
USING (
    restaurant_id IN (
        SELECT restaurant_id FROM public.profiles WHERE user_id = auth.uid()
    )
);
