-- Fix wallet transactions RLS to allow users to insert their own transactions
-- This is needed for the demo app to allow deposits and escrow operations

DROP POLICY IF EXISTS no_insert_wallet ON wallet_transactions;
DROP POLICY IF EXISTS no_update_wallet ON wallet_transactions;
DROP POLICY IF EXISTS no_delete_wallet ON wallet_transactions;

-- Allow users to insert their own wallet transactions
CREATE POLICY "insert_wallet" ON wallet_transactions FOR INSERT TO authenticated 
  WITH CHECK (auth.uid()::text = user_id);

-- Allow users to update their own wallet transactions (needed for escrow release)
CREATE POLICY "update_wallet" ON wallet_transactions FOR UPDATE TO authenticated 
  USING (auth.uid()::text = user_id) 
  WITH CHECK (auth.uid()::text = user_id);

-- Prevent deletion of wallet transactions for audit trail
CREATE POLICY "no_delete_wallet" ON wallet_transactions FOR DELETE TO authenticated 
  USING (false);