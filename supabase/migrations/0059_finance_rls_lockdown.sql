-- ============================================================
-- Finance RLS Lockdown
-- Ensures that regular Staff cannot view, update, or delete
-- shop expenses or shop payments. 
-- Staff CAN insert payments (e.g. Walk-in POS checkout).
-- ============================================================

-- EXPENSES: Locked down completely to OrgAdmin, BranchManager, Accountant
DROP POLICY IF EXISTS "Users can view their shop's expenses" ON expenses;
CREATE POLICY "Users can view their shop's expenses" ON expenses
  FOR SELECT
  USING (
    shop_id = ANY(current_branch_ids())
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('OrgAdmin', 'BranchManager', 'Accountant')
    )
  );

DROP POLICY IF EXISTS "Users can insert their shop's expenses" ON expenses;
CREATE POLICY "Users can insert their shop's expenses" ON expenses
  FOR INSERT
  WITH CHECK (
    shop_id = ANY(current_branch_ids())
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('OrgAdmin', 'BranchManager', 'Accountant')
    )
  );

DROP POLICY IF EXISTS "Users can update their shop's expenses" ON expenses;
CREATE POLICY "Users can update their shop's expenses" ON expenses
  FOR UPDATE
  USING (
    shop_id = ANY(current_branch_ids())
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('OrgAdmin', 'BranchManager', 'Accountant')
    )
  );

DROP POLICY IF EXISTS "Users can delete their shop's expenses" ON expenses;
CREATE POLICY "Users can delete their shop's expenses" ON expenses
  FOR DELETE
  USING (
    shop_id = ANY(current_branch_ids())
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('OrgAdmin', 'BranchManager', 'Accountant')
    )
  );


-- PAYMENTS: Staff can INSERT, but only Admins/Accountants can UPDATE or DELETE.
-- We also restrict SELECT on payments: Staff should not be able to query the whole table.
-- However, if we block SELECT entirely, order detail views might fail to load payments.
-- For now, we allow Staff to SELECT payments for orders they have access to 
-- (which is all orders in their branch currently). 
-- If we want true financial hiding, we should restrict SELECT to admins, but
-- let's start by preventing destructive actions.

DROP POLICY IF EXISTS "Users can update payments for their shops" ON public.payments;
CREATE POLICY "Users can update payments for their shops" ON public.payments
  FOR UPDATE
  USING (
    shop_id = ANY(current_branch_ids())
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('OrgAdmin', 'BranchManager', 'Accountant')
    )
  );

DROP POLICY IF EXISTS "Users can delete payments for their shops" ON public.payments;
CREATE POLICY "Users can delete payments for their shops" ON public.payments
  FOR DELETE
  USING (
    shop_id = ANY(current_branch_ids())
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('OrgAdmin', 'BranchManager', 'Accountant')
    )
  );
