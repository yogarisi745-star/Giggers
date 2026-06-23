CREATE TABLE chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  poster_user_id text NOT NULL,
  applicant_user_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(job_id, applicant_user_id)
);

ALTER TABLE chats ENABLE ROW LEVEL SECURITY;