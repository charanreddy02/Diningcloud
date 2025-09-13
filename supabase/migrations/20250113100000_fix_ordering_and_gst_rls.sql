/*
          # [Schema Fix] RLS Policies for Orders and Restaurants
          [This script fixes the critical ordering error and the missing GST data issue by updating the database's security policies.]

          ## Query Description: [This operation resets and correctly configures the security policies for the 'orders' and 'restaurants' tables. It first removes any old, faulty policies and then creates new ones. This is a safe operation that only affects access permissions and does not risk any of your existing data. It is necessary to allow customers to place orders and for the system to correctly calculate GST on bills.]
          
          ## Metadata:
          - Schema-Category: ["Safe"]
          - Impact-Level: ["Low"]
          - Requires-Backup: [false]
          - Reversible: [true]
          
          ## Structure Details:
          - Affects policies on tables: `public.orders`, `public.restaurants`
          
          ## Security Implications:
          - RLS Status: [Enabled]
          - Policy Changes: [Yes]
          - Auth Requirements: [This allows anonymous users to create orders and read restaurant settings.]
          
          ## Performance Impact:
          - Indexes: [No change]
          - Triggers: [No change]
          - Estimated Impact: [None]
          */

-- Enable RLS on the tables if not already enabled.
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- Drop any previous, potentially incorrect policies to ensure a clean state.
DROP POLICY IF EXISTS "Allow anonymous users to create orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public read access for all" ON public.restaurants;
DROP POLICY IF EXISTS "Allow public read access to restaurants" ON public.restaurants;

-- Create a new, correct policy to allow anonymous users (customers) to create orders.
-- This is essential for the QR menu ordering to work.
CREATE POLICY "Allow anonymous users to create orders"
ON public.orders
FOR INSERT
TO anon
WITH CHECK (true);

-- Create a new policy to allow anonymous users (customers) to read restaurant details.
-- This is required to get the restaurant name, and critically, the GST rates for bill calculation.
CREATE POLICY "Allow public read access to restaurants"
ON public.restaurants
FOR SELECT
TO anon
USING (true);
