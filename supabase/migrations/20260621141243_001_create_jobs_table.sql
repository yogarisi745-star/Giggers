CREATE TABLE jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  posting_type text NOT NULL CHECK (posting_type IN ('company', 'freelancer')),
  job_title text NOT NULL,
  workers_required integer NOT NULL DEFAULT 1,
  location text NOT NULL,
  start_date date,
  end_date date,
  requirements_text text,
  ai_tags jsonb,
  budget_amount numeric NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'waiting_deposit' CHECK (payment_status IN ('waiting_deposit', 'secured', 'sent', 'paused')),
  job_status text NOT NULL DEFAULT 'open' CHECK (job_status IN ('open', 'in_progress', 'completed', 'disputed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;