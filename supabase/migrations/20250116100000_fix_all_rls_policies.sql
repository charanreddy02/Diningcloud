/*
# [CRITICAL FIX] Correct All Row Level Security (RLS) Policies

This script performs a complete overhaul of the Row Level Security (RLS) policies to fix the recurring 'column "restaurant_id" does not exist' error. It ensures that all data access is correctly and securely linked to the user's assigned restaurant.

## Query Description:
This is a critical, non-destructive structural update. It will:
1.  DROP all previously defined (and potentially faulty) RLS policies on all application tables.
2.  CREATE new, correct policies that properly join tables to verify user permissions.
3.  The main fix is on the 'tables' table, which now correctly links to 'restaurants' via the 'branches' table, resolving the persistent error.
This operation is safe to re-run.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "Medium"
- Requires-Backup: false
- Reversible: true (by dropping the new policies)

## Security Implications:
- RLS Status: Enabled on all tables.
- Policy Changes: Yes, all policies are replaced.
- Auth Requirements: Policies rely on `auth.uid()` to identify the current user.
*/

-- Helper function to get user's restaurant_id from their profile
CREATE OR REPLACE FUNCTION public.get_my_restaurant_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT restaurant_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Helper function to get user's role from their profile
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;


-- =============================================
-- ========== RESTAURANTS TABLE RLS ==========
-- =============================================
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow owner to read their own restaurant" ON public.restaurants;
CREATE POLICY "Allow owner to read their own restaurant"
ON public.restaurants FOR SELECT
USING (id = public.get_my_restaurant_id());

DROP POLICY IF EXISTS "Allow owner to update their own restaurant" ON public.restaurants;
CREATE POLICY "Allow owner to update their own restaurant"
ON public.restaurants FOR UPDATE
USING (id = public.get_my_restaurant_id() AND public.get_my_role() = 'owner');


-- =============================================
-- ========== PROFILES TABLE RLS =============
-- =============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow user to read their own profile" ON public.profiles;
CREATE POLICY "Allow user to read their own profile"
ON public.profiles FOR SELECT
USING (id = auth.uid());

DROP POLICY IF EXISTS "Allow owner/manager to read staff profiles in their restaurant" ON public.profiles;
CREATE POLICY "Allow owner/manager to read staff profiles in their restaurant"
ON public.profiles FOR SELECT
USING (restaurant_id = public.get_my_restaurant_id() AND public.get_my_role() IN ('owner', 'manager'));

DROP POLICY IF EXISTS "Allow user to update their own profile" ON public.profiles;
CREATE POLICY "Allow user to update their own profile"
ON public.profiles FOR UPDATE
USING (id = auth.uid());

DROP POLICY IF EXISTS "Allow owner/manager to update staff profiles" ON public.profiles;
CREATE POLICY "Allow owner/manager to update staff profiles"
ON public.profiles FOR UPDATE
USING (restaurant_id = public.get_my_restaurant_id() AND public.get_my_role() IN ('owner', 'manager'));


-- =============================================
-- ========== BRANCHES TABLE RLS =============
-- =============================================
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow staff to read branches in their restaurant" ON public.branches;
CREATE POLICY "Allow staff to read branches in their restaurant"
ON public.branches FOR SELECT
USING (restaurant_id = public.get_my_restaurant_id());

DROP POLICY IF EXISTS "Allow owner/manager to manage branches" ON public.branches;
CREATE POLICY "Allow owner/manager to manage branches"
ON public.branches FOR ALL
USING (restaurant_id = public.get_my_restaurant_id() AND public.get_my_role() IN ('owner', 'manager'));


-- =============================================
-- ========== TABLES TABLE RLS (CRITICAL FIX) ==========
-- =============================================
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;

-- ** THE FIX IS HERE **
-- This policy correctly checks for access via the branches table.
DROP POLICY IF EXISTS "Allow staff to read tables in their restaurant" ON public.tables;
CREATE POLICY "Allow staff to read tables in their restaurant"
ON public.tables FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.branches b
    WHERE b.id = tables.branch_id AND b.restaurant_id = public.get_my_restaurant_id()
  )
);

DROP POLICY IF EXISTS "Allow owner/manager to manage tables" ON public.tables;
CREATE POLICY "Allow owner/manager to manage tables"
ON public.tables FOR ALL
USING (
  public.get_my_role() IN ('owner', 'manager') AND
  EXISTS (
    SELECT 1
    FROM public.branches b
    WHERE b.id = tables.branch_id AND b.restaurant_id = public.get_my_restaurant_id()
  )
);


-- =============================================
-- ========== MENU ITEMS TABLE RLS ===========
-- =============================================
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to menu items" ON public.menu_items;
CREATE POLICY "Allow public read access to menu items"
ON public.menu_items FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow owner/manager to manage menu items" ON public.menu_items;
CREATE POLICY "Allow owner/manager to manage menu items"
ON public.menu_items FOR ALL
USING (restaurant_id = public.get_my_restaurant_id() AND public.get_my_role() IN ('owner', 'manager'));


-- =============================================
-- ========== ORDERS TABLE RLS ===============
-- =============================================
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow staff to read orders in their restaurant" ON public.orders;
CREATE POLICY "Allow staff to read orders in their restaurant"
ON public.orders FOR SELECT
USING (restaurant_id = public.get_my_restaurant_id());

DROP POLICY IF EXISTS "Allow staff to update orders in their restaurant" ON public.orders;
CREATE POLICY "Allow staff to update orders in their restaurant"
ON public.orders FOR UPDATE
USING (restaurant_id = public.get_my_restaurant_id());

DROP POLICY IF EXISTS "Allow anyone to insert orders" ON public.orders;
CREATE POLICY "Allow anyone to insert orders"
ON public.orders FOR INSERT
WITH CHECK (true);


-- =============================================
-- ========== BILLS TABLE RLS ================
-- =============================================
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow staff to manage bills in their restaurant" ON public.bills;
CREATE POLICY "Allow staff to manage bills in their restaurant"
ON public.bills FOR ALL
USING (restaurant_id = public.get_my_restaurant_id());


-- =============================================
-- ========== PAYMENTS TABLE RLS =============
-- =============================================
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow staff to manage payments in their restaurant" ON public.payments;
CREATE POLICY "Allow staff to manage payments in their restaurant"
ON public.payments FOR ALL
USING (restaurant_id = public.get_my_restaurant_id());
