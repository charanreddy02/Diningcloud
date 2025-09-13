/*
          # [Operation Name]
          Enable Realtime and Automate Bill Creation

          ## Query Description: This migration script performs two critical functions:
1. It ensures the `orders` and `bills` tables are enabled for real-time updates, which is essential for the dashboard notifications to work correctly.
2. It creates a database trigger that automatically generates a new bill in the `bills` table whenever an order's status is updated to 'completed'. This automates your financial record-keeping.

This operation is safe and will not affect existing data.
          
          ## Metadata:
          - Schema-Category: ["Structural", "Safe"]
          - Impact-Level: ["Low"]
          - Requires-Backup: false
          - Reversible: true
          
          ## Structure Details:
          - Tables affected: `orders`, `bills`
          - Operations: `ALTER PUBLICATION`, `CREATE FUNCTION`, `CREATE TRIGGER`
          
          ## Security Implications:
          - RLS Status: Unchanged
          - Policy Changes: No
          - Auth Requirements: None
          
          ## Performance Impact:
          - Indexes: None
          - Triggers: Adds one trigger to the `orders` table.
          - Estimated Impact: Negligible performance impact on order updates.
          */

-- Step 1: Ensure realtime is enabled for orders and bills
-- This allows the frontend to receive live updates for these tables.
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders, public.bills;

-- Step 2: Create a function to automatically create a bill when an order is completed.
-- This function calculates taxes and inserts a new row into the 'bills' table.
CREATE OR REPLACE FUNCTION public.create_bill_for_completed_order()
RETURNS TRIGGER AS $$
DECLARE
    rest_data RECORD;
    cgst_val NUMERIC;
    sgst_val NUMERIC;
    grand_total NUMERIC;
BEGIN
    -- Only run for orders being newly marked as 'completed'
    IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
        -- Get the restaurant's tax rates
        SELECT r.cgst_rate, r.sgst_rate INTO rest_data
        FROM public.restaurants r
        WHERE r.id = NEW.restaurant_id;

        -- Calculate tax amounts
        cgst_val := (NEW.total * COALESCE(rest_data.cgst_rate, 0)) / 100;
        sgst_val := (NEW.total * COALESCE(rest_data.sgst_rate, 0)) / 100;
        grand_total := NEW.total + cgst_val + sgst_val;

        -- Insert the new bill into the bills table
        INSERT INTO public.bills (order_id, restaurant_id, subtotal, cgst_amount, sgst_amount, total, status)
        VALUES (NEW.id, NEW.restaurant_id, NEW.total, cgst_val, sgst_val, grand_total, 'pending');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create the trigger that executes the function.
-- Drop the trigger first if it exists to ensure the script can be re-run safely.
DROP TRIGGER IF EXISTS on_order_completed_create_bill ON public.orders;

CREATE TRIGGER on_order_completed_create_bill
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.create_bill_for_completed_order();
