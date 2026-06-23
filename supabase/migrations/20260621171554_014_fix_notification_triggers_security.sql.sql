CREATE OR REPLACE FUNCTION notify_on_application()
RETURNS TRIGGER 
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
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
$$;

CREATE OR REPLACE FUNCTION notify_on_application_status_change()
RETURNS TRIGGER 
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  job_record RECORD;
  notification_type text;
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT * INTO job_record FROM jobs WHERE id = NEW.job_id;

  notification_type := CASE NEW.status
    WHEN 'shortlisted' THEN 'status'
    WHEN 'selected' THEN 'selection'
    WHEN 'rejected' THEN 'status'
    ELSE 'status'
  END;

  INSERT INTO notifications (user_id, type, title, message, related_job_id, related_application_id)
  VALUES (
    NEW.user_id,
    notification_type,
    CASE NEW.status
      WHEN 'shortlisted' THEN 'Application Shortlisted'
      WHEN 'selected' THEN 'You Were Selected!'
      WHEN 'rejected' THEN 'Application Update'
      ELSE 'Application Update'
    END,
    CASE NEW.status
      WHEN 'shortlisted' THEN 'Your application for ' || job_record.job_title || ' has been shortlisted'
      WHEN 'selected' THEN 'Congratulations! You have been selected for ' || job_record.job_title
      WHEN 'rejected' THEN 'Your application for ' || job_record.job_title || ' was not selected'
      ELSE 'Your application for ' || job_record.job_title || ' has been updated'
    END,
    NEW.job_id,
    NEW.id
  );

  RETURN NEW;
END;
$$;