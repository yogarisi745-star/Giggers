import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  User,
  MapPin,
  AlertCircle,
  Lock,
  CheckCircle,
  Pause,
  IndianRupee,
  Users,
  Plus,
  X,
  Loader2,
  Check,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { Job, PaymentStatus, Application } from '../lib/types';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const AddFundsModal = ({
  job,
  isOpen,
  onClose,
  onSuccess,
}: {
  job: Job;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDeposit = async () => {
    if (!user) return;
    setLoading(true);
    setError('');

    try {
      // Step 1: Add funds to wallet (deposit)
      const { error: depositError } = await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        type: 'deposit',
        amount: job.budget_amount,
        description: `Added funds for: ${job.job_title}`,
        related_job_id: job.id,
        status: 'completed',
      });

      if (depositError) throw depositError;

      // Step 2: Hold funds in escrow
      const { error: escrowError } = await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        type: 'escrow_hold',
        amount: job.budget_amount,
        description: `Escrow hold for: ${job.job_title}`,
        related_job_id: job.id,
        status: 'held',
      });

      if (escrowError) throw escrowError;

      // Step 3: Update job payment status
      const { error: jobError } = await supabase
        .from('jobs')
        .update({ payment_status: 'secured' })
        .eq('id', job.id);

      if (jobError) throw jobError;

      onSuccess();
      onClose();
    } catch (err) {
      setError('Failed to add funds. Please try again.');
      console.error('Deposit error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Add Funds</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-warning-50 border border-warning-200 rounded-xl p-4 mb-4">
          <p className="text-sm text-warning-700 font-medium">{job.job_title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {formatCurrency(job.budget_amount)}
          </p>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          This amount will be deposited and held in escrow until the job is completed.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-error-50 border border-error-200 rounded-xl text-sm text-error-700">
            {error}
          </div>
        )}

        <button
          onClick={handleDeposit}
          disabled={loading}
          className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Plus className="w-5 h-5" />
              Add {formatCurrency(job.budget_amount)}
            </>
          )}
        </button>

        <p className="text-xs text-gray-400 text-center mt-3">
          Simulated payment for demo purposes
        </p>
      </div>
    </div>
  );
};

const MarkCompletedModal = ({
  job,
  isOpen,
  onClose,
  onSuccess,
}: {
  job: Job;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen && job) {
      loadSelectedWorkers();
    }
  }, [isOpen, job]);

  const loadSelectedWorkers = async () => {
    try {
      const { data } = await supabase
        .from('applications')
        .select('user_id')
        .eq('job_id', job.id)
        .eq('status', 'selected');

      if (data) {
        setSelectedWorkers(data.map((a) => a.user_id));
      }
    } catch (err) {
      console.error('Error loading workers:', err);
    }
  };

  const handleMarkCompleted = async () => {
    if (!user || selectedWorkers.length === 0) return;
    setLoading(true);
    setError('');

    try {
      const perWorkerAmount = job.budget_amount / selectedWorkers.length;

      // Release escrow hold (mark as completed)
      const { error: releaseError } = await supabase
        .from('wallet_transactions')
        .update({ status: 'completed' })
        .eq('user_id', user.id)
        .eq('related_job_id', job.id)
        .eq('type', 'escrow_hold')
        .eq('status', 'held');

      if (releaseError) throw releaseError;

      // Create earning transactions for each selected worker
      const earningTransactions = selectedWorkers.map((workerId) => ({
        user_id: workerId,
        type: 'earning' as const,
        amount: perWorkerAmount,
        description: `Payment for completing: ${job.job_title}`,
        related_job_id: job.id,
        status: 'completed' as const,
      }));

      const { error: earningsError } = await supabase
        .from('wallet_transactions')
        .insert(earningTransactions);

      if (earningsError) throw earningsError;

      // Update job status
      const { error: jobError } = await supabase
        .from('jobs')
        .update({ payment_status: 'sent', job_status: 'completed' })
        .eq('id', job.id);

      if (jobError) throw jobError;

      onSuccess();
      onClose();
    } catch (err) {
      setError('Failed to complete job. Please try again.');
      console.error('Complete error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Mark Job Completed</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-success-50 border border-success-200 rounded-xl p-4 mb-4">
          <p className="text-sm text-success-700 font-medium">{job.job_title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {formatCurrency(job.budget_amount)}
          </p>
        </div>

        {selectedWorkers.length === 0 ? (
          <div className="bg-warning-50 border border-warning-200 rounded-xl p-4 mb-4">
            <p className="text-sm text-warning-700">
              No workers have been selected for this job. Please select workers from the applicants first.
            </p>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <p className="text-sm text-gray-600 mb-2">
              {selectedWorkers.length} selected {selectedWorkers.length === 1 ? 'worker' : 'workers'} will receive:
            </p>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(job.budget_amount / selectedWorkers.length)} each
            </p>
          </div>
        )}

        <p className="text-sm text-gray-600 mb-4">
          This will release the escrow and distribute funds evenly to all selected workers.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-error-50 border border-error-200 rounded-xl text-sm text-error-700">
            {error}
          </div>
        )}

        <button
          onClick={handleMarkCompleted}
          disabled={loading || selectedWorkers.length === 0}
          className="w-full py-3 bg-success-600 text-white rounded-xl font-medium hover:bg-success-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              Mark Completed & Release Payment
            </>
          )}
        </button>

        <p className="text-xs text-gray-400 text-center mt-3">
          This action cannot be undone
        </p>
      </div>
    </div>
  );
};

const PaymentStatusCard = ({
  job,
  onAddFunds,
  onMarkCompleted,
}: {
  job: Job;
  onAddFunds: () => void;
  onMarkCompleted: () => void;
}) => {
  const statusConfig: Record<PaymentStatus, { bg: string; icon: React.ReactNode; title: string; description: string; actions?: React.ReactNode }> = {
    waiting_deposit: {
      bg: 'bg-warning-50 border-warning-200',
      icon: <AlertCircle className="w-5 h-5 text-warning-600" />,
      title: 'Waiting for Deposit',
      description: 'Add funds to secure this job and attract candidates.',
      actions: (
        <button
          onClick={onAddFunds}
          className="w-full py-2.5 bg-warning-500 text-white rounded-lg font-medium hover:bg-warning-600 transition-colors"
        >
          Add Funds
        </button>
      ),
    },
    secured: {
      bg: 'bg-primary-50 border-primary-200',
      icon: <Lock className="w-5 h-5 text-primary-600" />,
      title: 'Budget Secured in Escrow',
      description: `${formatCurrency(job.budget_amount)} is held safely.`,
      actions: (
        <div className="flex gap-2">
          <button
            onClick={onMarkCompleted}
            className="flex-1 py-2.5 bg-success-500 text-white rounded-lg font-medium hover:bg-success-600 transition-colors"
          >
            Mark Completed
          </button>
          <button className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors">
            Report Issue
          </button>
        </div>
      ),
    },
    sent: {
      bg: 'bg-success-50 border-success-200',
      icon: <CheckCircle className="w-5 h-5 text-success-600" />,
      title: 'Payment Sent',
      description: `${formatCurrency(job.budget_amount)} has been transferred to workers.`,
    },
    paused: {
      bg: 'bg-error-50 border-error-200',
      icon: <Pause className="w-5 h-5 text-error-600" />,
      title: 'Dispute Under Admin Review',
      description: 'Platform team is investigating. Auto-payout paused (24 hrs remaining until auto-release).',
    },
  };

  const config = statusConfig[job.payment_status];

  return (
    <div className={`${config.bg} border rounded-xl p-4`}>
      <div className="flex items-start gap-3 mb-3">
        {config.icon}
        <div>
          <h4 className="font-semibold text-gray-900">{config.title}</h4>
          <p className="text-sm text-gray-600">{config.description}</p>
        </div>
      </div>
      {config.actions && <div className="mt-3">{config.actions}</div>}
    </div>
  );
};

const MyPostings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applicationCounts, setApplicationCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [addFundsJob, setAddFundsJob] = useState<Job | null>(null);
  const [markCompletedJob, setMarkCompletedJob] = useState<Job | null>(null);

  useEffect(() => {
    if (user) loadJobs();
  }, [user]);

  const loadJobs = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);

      if (data && data.length > 0) {
        const jobIds = data.map((j) => j.id);
        const { data: apps } = await supabase
          .from('applications')
          .select('job_id')
          .in('job_id', jobIds);

        const counts: Record<string, number> = {};
        apps?.forEach((app) => {
          counts[app.job_id] = (counts[app.job_id] || 0) + 1;
        });
        setApplicationCounts(counts);
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white px-4 py-4 sticky top-0 z-40 border-b border-gray-200">
        <div className="max-w-lg mx-auto">
          <h1 className="text-lg font-semibold text-gray-900">My Postings & Payments</h1>
          <p className="text-sm text-gray-500">Manage your job postings</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-4 h-48 animate-pulse">
                <div className="bg-gray-200 h-4 w-20 rounded mb-3"></div>
                <div className="bg-gray-200 h-5 w-3/4 rounded mb-3"></div>
                <div className="bg-gray-200 h-20 w-full rounded"></div>
              </div>
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <h3 className="font-medium text-gray-900 mb-1">No Job Postings</h3>
            <p className="text-sm text-gray-500 mb-4">Start by posting your first job</p>
            <Link
              to="/post-job"
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg font-medium"
            >
              Post a Job
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div key={job.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {job.posting_type === 'company' ? (
                      <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-primary-600" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-warning-100 flex items-center justify-center">
                        <User className="w-4 h-4 text-warning-600" />
                      </div>
                    )}
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {job.posting_type === 'company' ? (job.company_name || 'Company') : 'Freelancer'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {job.job_status.replace('_', ' ')}
                  </span>
                </div>

                <h3 className="font-semibold text-gray-900 mb-1">{job.job_title}</h3>

                <div className="flex items-center text-sm text-gray-500 mb-1">
                  <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                  <span>{job.location}</span>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                  <span>{job.workers_required} workers</span>
                  <span className="flex items-center font-medium text-gray-900">
                    <IndianRupee className="w-4 h-4 mr-0.5" />
                    {job.budget_amount.toLocaleString('en-IN')}
                  </span>
                </div>

                <Link
                  to={`/job/${job.id}/applicants`}
                  className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5 mb-3 hover:bg-gray-100 transition-colors"
                >
                  <span className="text-sm text-gray-700 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {applicationCounts[job.id] || 0} applicants
                  </span>
                  <span className="text-xs text-primary-600 font-medium">
                    View all
                  </span>
                </Link>

                <PaymentStatusCard
                  job={job}
                  onAddFunds={() => setAddFundsJob(job)}
                  onMarkCompleted={() => setMarkCompletedJob(job)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {addFundsJob && (
        <AddFundsModal
          job={addFundsJob}
          isOpen={true}
          onClose={() => setAddFundsJob(null)}
          onSuccess={loadJobs}
        />
      )}

      {markCompletedJob && (
        <MarkCompletedModal
          job={markCompletedJob}
          isOpen={true}
          onClose={() => setMarkCompletedJob(null)}
          onSuccess={loadJobs}
        />
      )}
    </div>
  );
};

export default MyPostings;
