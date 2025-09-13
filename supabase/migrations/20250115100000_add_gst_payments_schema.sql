/*
# [Schema Upgrade] Add GST, Payments, and Bills Features
This migration adds the necessary database columns and tables to support new GST, online payment, and billing functionalities.

## Query Description: This operation is structural and adds new capabilities to the application.
- It adds new columns to the `restaurants` table for storing GST and payment configurations.
- It creates two new tables: `payments` for tracking online payment verifications and `bills` for storing generated bill records.
- It enables Row Level Security (RLS) on the new tables to ensure data is only accessible by authorized restaurant staff.
This is a non-destructive operation and should not impact existing data.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "Low"
- Requires-Backup: false
- Reversible: true

## Structure Details:
- **Alters `public.restaurants` table:**
  - Adds `gstin` (TEXT)
  - Adds `cgst_rate` (NUMERIC)
  - Adds `sgst_rate` (NUMERIC)
  - Adds `payment_enabled` (BOOLEAN)
  - Adds `upi_qr_code` (TEXT)
  - Adds `bank_details` (TEXT)
- **Creates `public.payments` table:**
  - `id`, `order_id`, `restaurant_id`, `table_id`, `customer_name`, `utr_number`, `amount`, `status`, `created_at`
- **Creates `public.bills` table:**
  - `id`, `order_id`, `restaurant_id`, `subtotal`, `cgst_amount`, `sgst_amount`, `total`, `status`, `payment_method`, `created_at`

## Security Implications:
- RLS Status: Enabled on new tables (`payments`, `bills`).
- Policy Changes: Yes, new policies are added for `payments` and `bills` to restrict access to data within a user's assigned restaurant.
- Auth Requirements: Policies rely on `auth.uid()` and the `profiles` table to determine restaurant association.

## Performance Impact:
- Indexes: Primary keys and foreign keys will have indexes created automatically.
- Triggers: None.
- Estimated Impact: Low. The changes are additive and should not degrade performance of existing queries.
*/

-- Add GST and Payment configuration columns to the restaurants table
ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS gstin TEXT,
ADD COLUMN IF NOT EXISTS cgst_rate NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS sgst_rate NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS upi_qr_code TEXT,
ADD COLUMN IF NOT EXISTS bank_details TEXT;

-- Create the payments table for tracking online payment verifications
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    utr_number TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- Can be 'pending', 'verified', 'failed'
    created_at TIMESTZ NOT NULL DEFAULT now(),
    CONSTRAINT payments_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id)
);

-- Create the bills table for storing generated bill records
CREATE TABLE IF NOT EXISTS public.bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    subtotal NUMERIC NOT NULL,
    cgst_amount NUMERIC NOT NULL,
    sgst_amount NUMERIC NOT NULL,
    total NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- Can be 'pending', 'paid'
    payment_method TEXT,
    created_at TIMESTZ NOT NULL DEFAULT now(),
    CONSTRAINT bills_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id)
);

-- Enable Row Level Security (RLS) and define policies for the new tables
-- This ensures that staff can only access data for their assigned restaurant.

-- RLS for 'payments' table
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow staff to manage payments for their restaurant" ON public.payments;
CREATE POLICY "Allow staff to manage payments for their restaurant" ON public.payments
FOR ALL
USING (
    restaurant_id IN (
        SELECT restaurant_id FROM public.profiles WHERE id = auth.uid() AND restaurant_id IS NOT NULL
    )
)
WITH CHECK (
    restaurant_id IN (
        SELECT restaurant_id FROM public.profiles WHERE id = auth.uid() AND restaurant_id IS NOT NULL
    )
);

-- RLS for 'bills' table
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow staff to manage bills for their restaurant" ON public.bills;
CREATE POLICY "Allow staff to manage bills for their restaurant" ON public.bills
FOR ALL
USING (
    restaurant_id IN (
        SELECT restaurant_id FROM public.profiles WHERE id = auth.uid() AND restaurant_id IS NOT NULL
    )
)
WITH CHECK (
    restaurant_id IN (
        SELECT restaurant_id FROM public.profiles WHERE id = auth.uid() AND restaurant_id IS NOT NULL
    )
);
