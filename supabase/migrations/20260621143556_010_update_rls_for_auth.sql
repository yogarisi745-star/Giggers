-- Drop existing policies
DROP POLICY IF EXISTS select_jobs ON jobs;
DROP POLICY IF EXISTS insert_jobs ON jobs;
DROP POLICY IF EXISTS update_jobs ON jobs;
DROP POLICY IF EXISTS delete_jobs ON jobs;

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
DROP POLICY IF EXISTS no_insert_wallet ON wallet_transactions;
DROP POLICY IF EXISTS no_update_wallet ON wallet_transactions;
DROP POLICY IF EXISTS no_delete_wallet ON wallet_transactions;

-- Jobs: Anyone can view, only owner can modify
CREATE POLICY "select_jobs" ON jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_jobs" ON jobs FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "update_jobs" ON jobs FOR UPDATE TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "delete_jobs" ON jobs FOR DELETE TO authenticated USING (auth.uid()::text = user_id);

-- Applications: Users can view their own applications OR applications on their jobs
CREATE POLICY "select_applications" ON applications FOR SELECT TO authenticated USING (
  auth.uid()::text = user_id 
  OR auth.uid()::text IN (SELECT user_id FROM jobs WHERE id = job_id)
);
CREATE POLICY "insert_applications" ON applications FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "update_applications" ON applications FOR UPDATE TO authenticated USING (
  auth.uid()::text = user_id 
  OR auth.uid()::text IN (SELECT user_id FROM jobs WHERE id = job_id)
) WITH CHECK (
  auth.uid()::text = user_id 
  OR auth.uid()::text IN (SELECT user_id FROM jobs WHERE id = job_id)
);
CREATE POLICY "delete_applications" ON applications FOR DELETE TO authenticated USING (auth.uid()::text = user_id);

-- Chats: Users can only access chats they participate in
CREATE POLICY "select_chats" ON chats FOR SELECT TO authenticated USING (
  auth.uid()::text = poster_user_id OR auth.uid()::text = applicant_user_id
);
CREATE POLICY "insert_chats" ON chats FOR INSERT TO authenticated WITH CHECK (
  auth.uid()::text = poster_user_id
);
CREATE POLICY "update_chats" ON chats FOR UPDATE TO authenticated USING (
  auth.uid()::text = poster_user_id OR auth.uid()::text = applicant_user_id
) WITH CHECK (
  auth.uid()::text = poster_user_id OR auth.uid()::text = applicant_user_id
);
CREATE POLICY "delete_chats" ON chats FOR DELETE TO authenticated USING (auth.uid()::text = poster_user_id);

-- Messages: Users can only access messages in chats they participate in
CREATE POLICY "select_messages" ON messages FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM chats WHERE chats.id = messages.chat_id 
    AND (chats.poster_user_id = auth.uid()::text OR chats.applicant_user_id = auth.uid()::text)
  )
);
CREATE POLICY "insert_messages" ON messages FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM chats WHERE chats.id = messages.chat_id 
    AND (chats.poster_user_id = auth.uid()::text OR chats.applicant_user_id = auth.uid()::text)
  )
  AND auth.uid()::text = sender_user_id
);
CREATE POLICY "update_messages" ON messages FOR UPDATE TO authenticated USING (auth.uid()::text = sender_user_id)
  WITH CHECK (auth.uid()::text = sender_user_id);
CREATE POLICY "delete_messages" ON messages FOR DELETE TO authenticated USING (auth.uid()::text = sender_user_id);

-- Wallet transactions: Users can only access their own transactions (READ ONLY for clients)
CREATE POLICY "select_wallet" ON wallet_transactions FOR SELECT TO authenticated USING (auth.uid()::text = user_id);
CREATE POLICY "no_insert_wallet" ON wallet_transactions FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "no_update_wallet" ON wallet_transactions FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "no_delete_wallet" ON wallet_transactions FOR DELETE TO authenticated USING (false);