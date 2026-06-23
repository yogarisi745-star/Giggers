CREATE OR REPLACE FUNCTION create_chat_on_selection(
  p_job_id uuid,
  p_applicant_user_id text,
  p_applicant_name text,
  p_job_title text,
  p_status text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_chat_id uuid;
  v_poster_user_id text;
  v_message text;
BEGIN
  SELECT user_id INTO v_poster_user_id FROM jobs WHERE id = p_job_id;
  
  IF p_status = 'shortlisted' THEN
    v_message := 'Congratulations ' || p_applicant_name || '! You have been shortlisted for "' || p_job_title || '". The poster will be in touch soon with more details.';
  ELSIF p_status = 'selected' THEN
    v_message := 'Great news ' || p_applicant_name || '! You have been selected for "' || p_job_title || '". Welcome aboard! Feel free to discuss next steps here.';
  ELSE
    RETURN NULL;
  END IF;
  
  INSERT INTO chats (job_id, poster_user_id, applicant_user_id)
  VALUES (p_job_id, v_poster_user_id, p_applicant_user_id)
  ON CONFLICT (job_id, applicant_user_id) DO NOTHING
  RETURNING id INTO v_chat_id;
  
  IF v_chat_id IS NULL THEN
    SELECT id INTO v_chat_id FROM chats 
    WHERE job_id = p_job_id AND applicant_user_id = p_applicant_user_id;
  END IF;
  
  IF v_chat_id IS NOT NULL THEN
    INSERT INTO messages (chat_id, sender_user_id, body)
    VALUES (v_chat_id, v_poster_user_id, v_message);
  END IF;
  
  RETURN v_chat_id;
END;
$$;