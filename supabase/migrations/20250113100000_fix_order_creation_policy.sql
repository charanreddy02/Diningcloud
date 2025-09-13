/*
# [Allow Anonymous Order Creation]
This migration script adds a Row Level Security (RLS) policy to the `orders` table. This policy is essential for the QR Menu feature to function correctly. It specifically allows non-authenticated (anonymous) users to create new orders.

## Query Description: [This operation enables the core ordering functionality for customers using the QR menu by granting them permission to insert new rows into the 'orders' table. It does not grant them any permission to read, update, or delete existing orders, maintaining the security of your data.]

## Metadata:
- Schema-Category: ["Structural"]
- Impact-Level: ["Low"]
- Requires-Backup: [false]
- Reversible: [true]

## Structure Details:
- Table: public.orders
- Operation: CREATE POLICY

## Security Implications:
- RLS Status: [Enabled]
- Policy Changes: [Yes] - Adds an INSERT policy for the 'anon' role.
- Auth Requirements: [None for insert, authenticated for other operations]

## Performance Impact:
- Indexes: [None]
- Triggers: [None]
- Estimated Impact: [Negligible. Adds a simple check for new inserts.]
*/

-- Drop the policy if it exists to ensure a clean slate and prevent errors on re-run.
DROP POLICY IF EXISTS "Allow anonymous users to create orders" ON public.orders;

-- Create the policy to allow anonymous users (customers using the QR menu) to insert into the orders table.
-- This is crucial for the QR code ordering system to work.
CREATE POLICY "Allow anonymous users to create orders"
ON public.orders
FOR INSERT
TO anon
WITH CHECK (true);
