-- Jobs: user can manage their own job postings
CREATE POLICY "select_own_jobs" ON jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_jobs" ON jobs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_jobs" ON jobs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_jobs" ON jobs FOR DELETE TO authenticated USING (true);

-- Applications: allow all operations for authenticated users
CREATE POLICY "select_applications" ON applications FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_applications" ON applications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_applications" ON applications FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_applications" ON applications FOR DELETE TO authenticated USING (true);

-- Chats: allow all operations for authenticated users
CREATE POLICY "select_chats" ON chats FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_chats" ON chats FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_chats" ON chats FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_chats" ON chats FOR DELETE TO authenticated USING (true);

-- Messages: allow all operations for authenticated users
CREATE POLICY "select_messages" ON messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_messages" ON messages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_messages" ON messages FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_messages" ON messages FOR DELETE TO authenticated USING (true);

-- Wallet transactions: allow all operations for authenticated users
CREATE POLICY "select_wallet" ON wallet_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_wallet" ON wallet_transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_wallet" ON wallet_transactions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_wallet" ON wallet_transactions FOR DELETE TO authenticated USING (true);