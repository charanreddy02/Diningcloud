/*
          # [Operation Name]
          Fix Automated Bill Creation Trigger

          ## Query Description: [This operation corrects the security context of the database function responsible for automatically creating a bill when an order is marked as 'completed'. The previous function was failing due to a permission mismatch with Row Level Security policies. This change ensures the function runs with the permissions of the admin user updating the order, allowing it to succeed. This is a safe and non-destructive change.]
          
          ## Metadata:
          - Schema-Category: ["Structural"]
          - Impact-Level: ["Low"]
          - Requires-Backup: [false]
          - Reversible: [true]
          
          ## Structure Details:
          - Drops the existing 'on_order_completed_create_bill' trigger.
          - Drops and recreates the 'handle_completed_order' function with 'SECURITY INVOKER'.
          - Recreates the 'on_order_completed_create_bill' trigger.
          
          ## Security Implications:
          - RLS Status: [Enabled]
          - Policy Changes: [No]
          - Auth Requirements: [Authenticated user with rights to update orders]
          
          ## Performance Impact:
          - Indexes: [None]
          - Triggers: [Modified]
          - Estimated Impact: [Negligible performance impact. Fixes a critical workflow.]
          */

-- Drop the existing trigger and function to ensure a clean slate
DROP TRIGGER IF EXISTS on_order_completed_create_bill ON public.orders;
DROP FUNCTION IF EXISTS public.handle_completed_order();

-- Recreate the function with the correct SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.handle_completed_order()
RETURNS TRIGGER AS $$
DECLARE
    v_restaurant_id UUID;
    v_cgst_rate NUMERIC;
    v_sgst_rate NUMERIC;
    v_subtotal NUMERIC;
    v_cgst_amount NUMERIC;
    v_sgst_amount NUMERIC;
    v_total NUMERIC;
BEGIN
    -- Only run if the status is updated to 'completed'
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- Get restaurant tax rates
        SELECT
            cgst_rate,
            sgst_rate
        INTO
            v_cgst_rate,
            v_sgst_rate
        FROM
            public.restaurants
        WHERE
            id = NEW.restaurant_id;

        -- Use 0 if rates are null
        v_cgst_rate := COALESCE(v_cgst_rate, 0);
        v_sgst_rate := COALESCE(v_sgst_rate, 0);

        -- Calculate amounts
        v_subtotal := NEW.total;
        v_cgst_amount := (v_subtotal * v_cgst_rate) / 100;
        v_sgst_amount := (v_subtotal * v_sgst_rate) / 100;
        v_total := v_subtotal + v_cgst_amount + v_sgst_amount;

        -- Insert into the bills table
        INSERT INTO public.bills (order_id, restaurant_id, subtotal, cgst_amount, sgst_amount, total, status)
        VALUES (NEW.id, NEW.restaurant_id, v_subtotal, v_cgst_amount, v_sgst_amount, v_total, 'pending');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Recreate the trigger
CREATE TRIGGER on_order_completed_create_bill
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_completed_order();
