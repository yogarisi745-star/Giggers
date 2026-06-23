-- For dev mode without auth, we use a simpler policy structure
-- that checks for the user_id field directly
-- This maintains the structure for when proper auth is added

-- Drop existing restrictive policies that won't work without JWT auth
DROP POLICY IF EXISTS select_own_jobs ON jobs;
DROP POLICY IF EXISTS insert_own_jobs ON jobs;
DROP POLICY IF EXISTS update_own_jobs ON jobs;
DROP POLICY IF EXISTS delete_own_jobs ON jobs;

DROP POLICY IF EXISTS select_applications ON applications;
DROP POLICY IF EXISTS insert_applications ON applications;
DROP POLICY IF EXISTS update_applications ON applications;
DROP POLICY IF EXISTS delete_applications ON applications;

DROP POLICY IF EXISTS select_chats ON chats;
DROP POLICY IF EXISTS insert_chats ON chats;
DROP POLICY IF EXISTS update_chats ON chats;
DROP POLICY IF EXISTS delete_chats ON chats;

DROP POLICY IF EXISTS select_messages ON messages;
DROP POLICY IF EXISTS insert_messages ON messages;
DROP POLICY IF EXISTS update_messages ON messages;
DROP POLICY IF EXISTS delete_messages ON messages;

DROP POLICY IF EXISTS select_wallet ON wallet_transactions;
DROP POLICY IF EXISTS insert_wallet ON wallet_transactions;
DROP POLICY IF EXISTS update_wallet ON wallet_transactions;
DROP POLICY IF EXISTS delete_wallet ON wallet_transactions;

-- Jobs policies
CREATE POLICY "select_jobs" ON jobs FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_jobs" ON jobs FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_jobs" ON jobs FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_jobs" ON jobs FOR DELETE
  TO authenticated USING (user_id = 'dev-user-001' OR auth.uid()::text = user_id);

-- Applications policies
CREATE POLICY "select_applications" ON applications FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_applications" ON applications FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_applications" ON applications FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_applications" ON applications FOR DELETE
  TO authenticated USING (user_id = 'dev-user-001' OR auth.uid()::text = user_id);

-- Chats policies
CREATE POLICY "select_chats" ON chats FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_chats" ON chats FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_chats" ON chats FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_chats" ON chats FOR DELETE
  TO authenticated USING (
    poster_user_id = 'dev-user-001' 
    OR auth.uid()::text = poster_user_id
  );

-- Messages policies
CREATE POLICY "select_messages" ON messages FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_messages" ON messages FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_messages" ON messages FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_messages" ON messages FOR DELETE
  TO authenticated USING (
    sender_user_id = 'dev-user-001' 
    OR auth.uid()::text = sender_user_id
  );

-- Wallet transactions policies - READ ONLY for security
CREATE POLICY "select_wallet" ON wallet_transactions FOR SELECT
  TO authenticated USING (true);

-- Disable INSERT/UPDATE/DELETE on wallet_transactions for clients
-- All wallet operations should go through server-side functions
CREATE POLICY "no_insert_wallet" ON wallet_transactions FOR INSERT
  TO authenticated WITH CHECK (false);
CREATE POLICY "no_update_wallet" ON wallet_transactions FOR UPDATE
  TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "no_delete_wallet" ON wallet_transactions FOR DELETE
  TO authenticated USING (false);