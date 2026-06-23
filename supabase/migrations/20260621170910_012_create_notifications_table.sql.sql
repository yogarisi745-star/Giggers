CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  type text NOT NULL CHECK (type IN ('application', 'status', 'payment', 'selection')),
  title text NOT NULL,
  message text NOT NULL,
  related_job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  related_application_id uuid REFERENCES applications(id) ON DELETE CASCADE,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid()::text = user_id);

CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (auth.uid()::text = user_id);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);

CREATE OR REPLACE FUNCTION notify_on_application()
RETURNS TRIGGER AS $$
DECLARE
  job_record RECORD;
BEGIN
  SELECT * INTO job_record FROM jobs WHERE id = NEW.job_id;
  
  INSERT INTO notifications (user_id, type, title, message, related_job_id, related_application_id)
  VALUES (
    job_record.user_id,
    'application',
    'New Application Received',
    NEW.applicant_name || ' applied for ' || job_record.job_title,
    NEW.job_id,
    NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_on_application
AFTER INSERT ON applications
FOR EACH ROW
EXECUTE FUNCTION notify_on_application();