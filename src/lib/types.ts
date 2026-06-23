export type PostingType = 'company' | 'freelancer';
export type PaymentStatus = 'waiting_deposit' | 'secured' | 'sent' | 'paused';
export type JobStatus = 'open' | 'in_progress' | 'completed' | 'disputed';
export type ApplicationStatus = 'applied' | 'shortlisted' | 'selected' | 'rejected';
export type TransactionType = 'withdrawal' | 'earning' | 'escrow_hold' | 'escrow_release' | 'subscription' | 'deposit';
export type TransactionStatus = 'processing' | 'completed' | 'held';

export interface AITags {
  skill_required: string[];
  constraints: string[];
  experience_level: string;
}

export interface Job {
  id: string;
  user_id: string;
  posting_type: PostingType;
  job_title: string;
  company_name: string | null;
  workers_required: number;
  location: string;
  start_date: string | null;
  end_date: string | null;
  requirements_text: string | null;
  ai_tags: AITags | null;
  budget_amount: number;
  payment_status: PaymentStatus;
  job_status: JobStatus;
  is_urgent: boolean;
  created_at: string;
  workers_remaining?: number;
}

export interface Application {
  id: string;
  job_id: string;
  user_id: string;
  applicant_name: string;
  applicant_role: string;
  status: ApplicationStatus;
  created_at: string;
  job?: Job;
}

export interface Chat {
  id: string;
  job_id: string;
  poster_user_id: string;
  applicant_user_id: string;
  created_at: string;
  job?: Job;
  last_message?: Message;
  other_user_name?: string;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_user_id: string;
  body: string;
  created_at: string;
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  description: string;
  related_job_id: string | null;
  status: TransactionStatus;
  created_at: string;
}

export type NotificationType = 'application' | 'status' | 'payment' | 'selection';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  related_job_id: string | null;
  related_application_id: string | null;
  read: boolean;
  created_at: string;
}
