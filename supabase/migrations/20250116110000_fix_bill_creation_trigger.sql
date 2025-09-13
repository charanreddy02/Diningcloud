/*
          # [Operation Name]
          Fix Bill Creation Trigger

          ## Query Description: [This operation corrects the automated bill creation process. It replaces the existing database trigger function with a new one that runs with elevated permissions (`SECURITY DEFINER`). This ensures that a bill is successfully created in the `bills` table every time an order is marked as "Completed", regardless of the user's individual permissions. This is a safe and standard way to handle such automated background tasks.]
          
          ## Metadata:
          - Schema-Category: ["Structural"]
          - Impact-Level: ["Low"]
          - Requires-Backup: [false]
          - Reversible: [false]
          
          ## Structure Details:
          - Drops the existing `on_order_completed` trigger.
          - Drops the existing `create_bill_for_completed_order` function.
          - Re-creates the `create_bill_for_completed_order` function with `SECURITY DEFINER`.
          - Re-creates the `on_order_completed` trigger.
          
          ## Security Implications:
          - RLS Status: [Enabled]
          - Policy Changes: [No]
          - Auth Requirements: [None]
          
          ## Performance Impact:
          - Indexes: [None]
          - Triggers: [Modified]
          - Estimated Impact: [Negligible. This trigger only runs on a specific update event.]
          */

-- Drop existing trigger and function to ensure a clean slate
DROP TRIGGER IF EXISTS on_order_completed ON public.orders;
DROP FUNCTION IF EXISTS public.create_bill_for_completed_order();

-- Recreate the function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.create_bill_for_completed_order()
RETURNS TRIGGER AS $$
DECLARE
  restaurant_details RECORD;
  subtotal_val NUMERIC;
  cgst_val NUMERIC;
  sgst_val NUMERIC;
  total_val NUMERIC;
BEGIN
  -- Check if a bill for this order already exists to prevent duplicates
  IF EXISTS (SELECT 1 FROM public.bills WHERE order_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Fetch restaurant tax details
  SELECT cgst_rate, sgst_rate INTO restaurant_details
  FROM public.restaurants
  WHERE id = NEW.restaurant_id;

  -- Calculate amounts
  subtotal_val := NEW.total;
  cgst_val := subtotal_val * (COALESCE(restaurant_details.cgst_rate, 0) / 100.0);
  sgst_val := subtotal_val * (COALESCE(restaurant_details.sgst_rate, 0) / 100.0);
  total_val := subtotal_val + cgst_val + sgst_val;

  -- Insert into the bills table
  INSERT INTO public.bills (order_id, restaurant_id, subtotal, cgst_amount, sgst_amount, total, status)
  VALUES (NEW.id, NEW.restaurant_id, subtotal_val, cgst_val, sgst_val, total_val, 'pending');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_order_completed
AFTER UPDATE ON public.orders
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM 'completed' AND NEW.status = 'completed')
EXECUTE FUNCTION public.create_bill_for_completed_order();
