import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Clock,
  IndianRupee,
  Users,
  Building2,
  User,
  Sparkles,
  Send,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { Job, Application, AITags } from '../lib/types';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

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

const AITagsDisplay = ({ aiTags }: { aiTags: AITags | null }) => {
  if (!aiTags) return null;

  return (
    <div className="bg-gradient-to-br from-primary-50 to-primary-100/50 rounded-xl p-4 border border-primary-200">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-primary-500" />
        <span className="text-sm font-medium text-primary-700">AI-Extracted Tags</span>
      </div>

      {aiTags.skill_required.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-gray-600 mb-1.5">Skills Required</p>
          <div className="flex flex-wrap gap-1.5">
            {aiTags.skill_required.map((skill, idx) => (
              <span
                key={idx}
                className="inline-flex items-center bg-white px-2 py-1 rounded-lg text-xs font-medium text-gray-700 border border-gray-200"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {aiTags.constraints.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-gray-600 mb-1.5">Constraints</p>
          <div className="flex flex-wrap gap-1.5">
            {aiTags.constraints.map((constraint, idx) => (
              <span
                key={idx}
                className="inline-flex items-center bg-warning-50 px-2 py-1 rounded-lg text-xs font-medium text-warning-700 border border-warning-200"
              >
                {constraint}
              </span>
            ))}
          </div>
        </div>
      )}

      {aiTags.experience_level && (
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1.5">Experience Level</p>
          <span className="inline-flex items-center bg-white px-2 py-1 rounded-lg text-xs font-medium text-gray-700 border border-gray-200">
            {aiTags.experience_level}
          </span>
        </div>
      )}
    </div>
  );
};

const JobDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [application, setApplication] = useState<Application | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applicantName, setApplicantName] = useState('');
  const [applicantRole, setApplicantRole] = useState('');

  const isOwnJob = job?.user_id === user?.id;

  useEffect(() => {
    if (id) loadJob();
  }, [id]);

  const loadJob = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setJob(data);

      // Check if user already applied
      if (user) {
        const { data: appData } = await supabase
          .from('applications')
          .select('*')
          .eq('job_id', id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (appData) {
          setApplied(true);
          setApplication(appData);
        }
      }
    } catch (error) {
      console.error('Error loading job:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!user || !job) return;
    if (!applicantName.trim() || !applicantRole.trim()) return;

    setApplying(true);
    try {
      const { data, error } = await supabase
        .from('applications')
        .insert({
          job_id: job.id,
          user_id: user.id,
          applicant_name: applicantName.trim(),
          applicant_role: applicantRole.trim(),
          status: 'applied',
        })
        .select()
        .single();

      if (error) throw error;

      setApplied(true);
      setApplication(data);
      setShowApplyModal(false);
    } catch (error) {
      console.error('Apply error:', error);
    } finally {
      setApplying(false);
    }
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

  const skills = job.ai_tags?.skill_required || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white px-4 py-4 sticky top-0 z-40 border-b border-gray-200">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900 truncate">Job Details</h1>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Job Type & Urgency */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary-50 text-primary-700">
            {job.posting_type === 'company' ? 'Company' : 'Freelancer'}
          </span>
          {job.is_urgent && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-warning-500 text-white">
              URGENT
            </span>
          )}
          <span className="text-xs text-gray-500 flex items-center gap-1 ml-auto">
            <Clock className="w-3 h-3" />
            {formatTimeAgo(job.created_at)}
          </span>
        </div>

        {/* Title */}
        <div>
          <h2 className="text-xl font-bold text-gray-900">{job.job_title}</h2>
        </div>

        {/* Poster Info */}
        <div className="flex items-center gap-3 bg-white rounded-xl p-4 border border-gray-100">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              job.posting_type === 'company' ? 'bg-primary-100' : 'bg-warning-100'
            }`}
          >
            {job.posting_type === 'company' ? (
              <Building2 className="w-6 h-6 text-primary-600" />
            ) : (
              <User className="w-6 h-6 text-warning-600" />
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900">
              {job.posting_type === 'company'
                ? (job.company_name || 'Company Posting')
                : 'Freelancer Posting'}
            </p>
            <p className="text-sm text-gray-500">Posted this job</p>
          </div>
        </div>

        {/* Key Details */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Location</p>
              <p className="font-medium text-gray-900">{job.location}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Budget</p>
              <p className="font-medium text-gray-900">{formatCurrency(job.budget_amount)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Workers Required</p>
              <p className="font-medium text-gray-900">
                {job.workers_required} {job.workers_required === 1 ? 'person' : 'people'}
              </p>
            </div>
          </div>

          {(job.start_date || job.end_date) && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Duration</p>
                <p className="font-medium text-gray-900">
                  {job.start_date ? new Date(job.start_date).toLocaleDateString('en-IN') : 'Flexible start'}
                  {' - '}
                  {job.end_date ? new Date(job.end_date).toLocaleDateString('en-IN') : 'Flexible end'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Requirements */}
        {job.requirements_text && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-3">Work Requirements</h3>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
              {job.requirements_text}
            </p>
          </div>
        )}

        {/* AI Tags */}
        <AITagsDisplay aiTags={job.ai_tags} />

        {/* Skills */}
        {skills.length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-3">Skills Required</h3>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="text-sm bg-primary-50 text-primary-700 px-3 py-1.5 rounded-lg font-medium"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Payment Status */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-3">Payment Status</h3>
          <div className="flex items-center gap-2">
            {job.payment_status === 'waiting_deposit' && (
              <>
                <AlertTriangle className="w-5 h-5 text-warning-500" />
                <span className="text-sm text-warning-700">Waiting for deposit</span>
              </>
            )}
            {job.payment_status === 'secured' && (
              <>
                <div className="w-2 h-2 rounded-full bg-success-500" />
                <span className="text-sm text-success-700">Payment secured in escrow</span>
              </>
            )}
            {job.payment_status === 'sent' && (
              <>
                <div className="w-2 h-2 rounded-full bg-primary-500" />
                <span className="text-sm text-primary-700">Payment sent to worker</span>
              </>
            )}
          </div>
        </div>

        {/* Apply / Status CTA */}
        <div className="sticky bottom-4 z-30">
          {isOwnJob ? (
            <Link
              to="/my-postings"
              className="block w-full py-3.5 bg-gray-100 text-gray-700 rounded-xl font-medium text-center hover:bg-gray-200 transition-colors"
            >
              View in My Postings
            </Link>
          ) : applied ? (
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-primary-500" />
                <span className="font-medium text-gray-900">
                  Application Status: {application?.status}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                You applied as <span className="font-medium">{application?.applicant_name}</span> — {application?.applicant_role}
              </p>
            </div>
          ) : (
            <button
              onClick={() => setShowApplyModal(true)}
              className="w-full py-3.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors shadow-lg flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              Apply for this Job
            </button>
          )}
        </div>
      </div>

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowApplyModal(false)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Apply for Job</h2>
            <p className="text-sm text-gray-500 mb-5">{job.job_title}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Name</label>
                <input
                  type="text"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  placeholder="e.g. Alex R."
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Role / Title</label>
                <input
                  type="text"
                  value={applicantRole}
                  onChange={(e) => setApplicantRole(e.target.value)}
                  placeholder="e.g. Senior Video Editor"
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            <button
              onClick={handleApply}
              disabled={applying || !applicantName.trim() || !applicantRole.trim()}
              className="w-full mt-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {applying ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Applying...
                </>
              ) : (
                <>Submit Application</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobDetail;
