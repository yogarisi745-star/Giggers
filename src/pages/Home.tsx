import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Clock, MapPin, MessageSquare, LogOut, Briefcase } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { Job } from '../lib/types';

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const JobCard = ({ job, urgent = false }: { job: Job; urgent?: boolean }) => {
  const skills = job.ai_tags?.skill_required?.slice(0, 3) || [];

  return (
    <Link
      to={`/job/${job.id}`}
      className={`block bg-white rounded-2xl p-4 shadow-sm transition-all hover:shadow-md ${
        urgent || job.is_urgent ? 'border-2 border-warning-500' : ''
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary-50 text-primary-700">
            {job.posting_type === 'company' ? (job.company_name || 'Company') : 'Freelancer'}
          </span>
          {(urgent || job.is_urgent) && (
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-warning-500 text-white animate-pulse">
              URGENT
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatTimeAgo(job.created_at)}
        </span>
      </div>

      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{job.job_title}</h3>

      <div className="flex items-center text-sm text-gray-500 mb-2">
        <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
        <span className="truncate">{job.location}</span>
      </div>

      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {skills.map((skill) => (
            <span
              key={skill}
              className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
            >
              {skill}
            </span>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center pt-2 border-t border-gray-100">
        <span className="text-sm text-gray-500">
          {job.workers_required} {job.workers_required === 1 ? 'seat' : 'seats'}
        </span>
        <span className="font-semibold text-primary-600">{formatCurrency(job.budget_amount)}</span>
      </div>
    </Link>
  );
};

const Home = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [urgentJobs, setUrgentJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      const { data: allJobs, error } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const jobsWithRemaining = allJobs?.map((job) => ({
        ...job,
        workers_remaining: job.workers_required,
      })) || [];

      // Use is_urgent field from database
      const urgent = jobsWithRemaining.filter((job: Job) => job.is_urgent === true);

      setJobs(jobsWithRemaining);
      setUrgentJobs(urgent);
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobs.filter((job) =>
    searchQuery
      ? job.job_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.requirements_text?.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white px-4 pt-6 pb-4 sticky top-0 z-40">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500">Welcome back,</p>
              <h1 className="text-xl font-bold text-gray-900 truncate max-w-[200px]">
                {user?.email?.split('@')[0] || 'User'}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/chats"
                className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center"
              >
                <MessageSquare className="w-5 h-5 text-primary-600" />
              </Link>
              <button
                onClick={async () => {
                  await signOut();
                  navigate('/auth');
                }}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
              >
                <LogOut className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search for gig jobs, skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
            />
          </div>
        </div>
      </header>

      {/* Urgent Services */}
      {urgentJobs.length > 0 && (
        <section className="mb-6 max-w-lg mx-auto px-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-warning-500 animate-pulse"></span>
              Urgent Services
            </h2>
            <span className="text-xs text-warning-600 font-medium">
              {urgentJobs.length} urgent
            </span>
          </div>

          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mr-4 pr-4 snap-x snap-mandatory">
            {urgentJobs.map((job) => (
              <div key={job.id} className="w-[260px] flex-shrink-0 snap-start">
                <JobCard job={job} urgent />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* All Jobs */}
      <div className="max-w-lg mx-auto px-4 pb-8">
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">All Jobs</h2>
            <span className="text-sm text-gray-500">{filteredJobs.length} jobs</span>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-4 h-36 animate-pulse">
                  <div className="bg-gray-200 h-4 w-20 rounded mb-3"></div>
                  <div className="bg-gray-200 h-5 w-3/4 rounded mb-2"></div>
                  <div className="bg-gray-200 h-4 w-1/2 rounded"></div>
                </div>
              ))}
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <BriefCase className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No jobs found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredJobs.map((job) => (
                <JobCard key={job.id} job={job} urgent={job.is_urgent} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Home;
