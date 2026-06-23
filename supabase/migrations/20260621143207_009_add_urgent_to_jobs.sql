-- Add is_urgent column to jobs table
ALTER TABLE jobs ADD COLUMN is_urgent boolean DEFAULT false;

-- Update some existing jobs to be urgent for testing
UPDATE jobs SET is_urgent = true WHERE start_date IS NOT NULL 
  AND start_date <= CURRENT_DATE + INTERVAL '3 days'
  AND start_date > CURRENT_DATE;

-- Also set the Mobile App Tester job as urgent explicitly
UPDATE jobs SET is_urgent = true WHERE job_title = 'Mobile App Tester';