/*
          # [Operation Name]
          Fix Order Creation RLS and Enable RLS on Orders Table

          ## Query Description: [This script fixes a critical bug preventing customers from placing orders. It enables Row Level Security (RLS) on the 'orders' table and creates a specific policy that allows anonymous users (customers using the QR menu) to create new orders. This is a safe operation that only adds permissions and does not affect existing data.]
          
          ## Metadata:
          - Schema-Category: ["Security"]
          - Impact-Level: ["Low"]
          - Requires-Backup: [false]
          - Reversible: [true]
          
          ## Structure Details:
          - Tables Affected: public.orders
          - Policies Added: "Allow anonymous users to create orders"
          
          ## Security Implications:
          - RLS Status: [Enabled]
          - Policy Changes: [Yes]
          - Auth Requirements: [Allows anonymous 'INSERT' operations]
          
          ## Performance Impact:
          - Indexes: [No change]
          - Triggers: [No change]
          - Estimated Impact: [Negligible. RLS checks are highly optimized.]
          */

-- Step 1: Enable Row Level Security on the orders table if it's not already enabled.
-- This is a prerequisite for any policies to take effect.
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop any previous, potentially faulty policies to ensure a clean slate.
DROP POLICY IF EXISTS "Allow anonymous users to create orders" ON public.orders;
DROP POLICY IF EXISTS "Allow anon insert" ON public.orders;
DROP POLICY IF EXISTS "Allow anonymous order creation" ON public.orders;

-- Step 3: Create the definitive policy to allow anonymous users to create (INSERT) new orders.
-- This is the key fix for the "new row violates row-level security policy" error.
CREATE POLICY "Allow anonymous users to create orders" 
ON public.orders 
FOR INSERT 
TO anon 
WITH CHECK (true);
