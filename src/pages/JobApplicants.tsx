import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, User, CheckCircle, XCircle, Clock, Loader2, Users, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { Application, Job } from '../lib/types';

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const JobApplicants = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [chatCreated, setChatCreated] = useState<string | null>(null);

  useEffect(() => {
    if (jobId && user) {
      loadData();
    }
  }, [jobId, user]);

  const loadData = async () => {
    try {
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (jobError) throw jobError;

      if (jobData.user_id !== user!.id) {
        navigate('/');
        return;
      }

      setJob(jobData);

      const { data: appData, error: appError } = await supabase
        .from('applications')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      if (appError) throw appError;
      setApplications(appData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (applicationId: string, newStatus: 'shortlisted' | 'selected' | 'rejected') => {
    const application = applications.find((a) => a.id === applicationId);
    if (!application || !job) return;

    setUpdating(applicationId);
    try {
      const { error } = await supabase
        .from('applications')
        .update({ status: newStatus })
        .eq('id', applicationId);

      if (error) throw error;

      if (newStatus === 'shortlisted' || newStatus === 'selected') {
        const { data: chatId, error: rpcError } = await supabase.rpc('create_chat_on_selection', {
          p_job_id: job.id,
          p_applicant_user_id: application.user_id,
          p_applicant_name: application.applicant_name,
          p_job_title: job.job_title,
          p_status: newStatus,
        });

        if (rpcError) {
          console.error('Error creating chat:', rpcError);
        } else if (chatId) {
          setChatCreated(chatId);
        }
      }

      setApplications((prev) =>
        prev.map((app) =>
          app.id === applicationId ? { ...app, status: newStatus } : app
        )
      );
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdating(null);
    }
  };

  const statusConfig = {
    applied: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Applied' },
    shortlisted: { bg: 'bg-warning-100', text: 'text-warning-700', label: 'Shortlisted' },
    selected: { bg: 'bg-success-100', text: 'text-success-700', label: 'Selected' },
    rejected: { bg: 'bg-error-100', text: 'text-error-700', label: 'Rejected' },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Job not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white px-4 py-4 sticky top-0 z-40 border-b border-gray-200">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900">Applicants</h1>
            <p className="text-sm text-gray-500">{job.job_title}</p>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        {applications.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <h3 className="font-medium text-gray-900 mb-1">No Applicants Yet</h3>
            <p className="text-sm text-gray-500">
              When people apply to your job, they'll appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => {
              const config = statusConfig[app.status];
              return (
                <div
                  key={app.id}
                  className="bg-white rounded-xl p-4 border border-gray-100"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                      <User className="w-6 h-6 text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">{app.applicant_name}</h3>
                      <p className="text-sm text-gray-600">{app.applicant_role}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.bg} ${config.text}`}
                        >
                          {config.label}
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimeAgo(app.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {app.status === 'applied' && (
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => updateStatus(app.id, 'shortlisted')}
                        disabled={updating === app.id}
                        className="flex-1 py-2 bg-warning-500 text-white rounded-lg font-medium hover:bg-warning-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        {updating === app.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Clock className="w-4 h-4" />
                            Shortlist
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => updateStatus(app.id, 'rejected')}
                        disabled={updating === app.id}
                        className="py-2 px-3 bg-error-100 text-error-600 rounded-lg font-medium hover:bg-error-200 transition-colors disabled:opacity-50"
                      >
                        {updating === app.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <XCircle className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  )}

                  {app.status === 'shortlisted' && (
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => updateStatus(app.id, 'selected')}
                        disabled={updating === app.id}
                        className="flex-1 py-2 bg-success-500 text-white rounded-lg font-medium hover:bg-success-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        {updating === app.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Select
                          </>
                        )}
                      </button>
                      <Link
                        to="/chats"
                        className="py-2 px-3 bg-primary-100 text-primary-600 rounded-lg font-medium hover:bg-primary-200 transition-colors flex items-center justify-center"
                      >
                        <MessageCircle className="w-5 h-5" />
                      </Link>
                      <button
                        onClick={() => updateStatus(app.id, 'rejected')}
                        disabled={updating === app.id}
                        className="py-2 px-3 bg-error-100 text-error-600 rounded-lg font-medium hover:bg-error-200 transition-colors disabled:opacity-50"
                      >
                        {updating === app.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <XCircle className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  )}

                  {app.status === 'selected' && (
                    <div className="flex gap-2 mt-4">
                      <Link
                        to="/chats"
                        className="flex-1 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Chat
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default JobApplicants;
