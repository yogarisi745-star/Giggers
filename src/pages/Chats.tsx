import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, ChevronRight, Bookmark } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { Chat, Message, Job } from '../lib/types';

interface ChatWithDetails extends Chat {
  job: Job;
  last_message?: Message;
  applicant_name?: string;
}

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

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const Chats = () => {
  const { user } = useAuth();
  const [posterChats, setPosterChats] = useState<ChatWithDetails[]>([]);
  const [applicantChats, setApplicantChats] = useState<ChatWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'poster' | 'applicant'>('poster');

  useEffect(() => {
    if (user) loadChats();
  }, [user]);

  const loadChats = async () => {
    if (!user) return;
    try {
      const { data: posterData, error: posterError } = await supabase
        .from('chats')
        .select(`*, job:jobs!chats_job_id_fkey (*)`)
        .eq('poster_user_id', user.id);

      const { data: applicantData, error: applicantError } = await supabase
        .from('chats')
        .select(`*, job:jobs!chats_job_id_fkey (*)`)
        .eq('applicant_user_id', user.id);

      if (posterError) throw posterError;
      if (applicantError) throw applicantError;

      const allChats = [...(posterData || []), ...(applicantData || [])];
      const chatIds = allChats.map((c) => c.id);

      if (chatIds.length > 0) {
        const { data: messages } = await supabase
          .from('messages')
          .select('*')
          .in('chat_id', chatIds)
          .order('created_at', { ascending: false });

        const messagesByChat = new Map<string, Message>();
        messages?.forEach((m) => {
          if (!messagesByChat.has(m.chat_id)) {
            messagesByChat.set(m.chat_id, m);
          }
        });

        const applicantUserIds = (posterData || [])
          .map((c) => c.applicant_user_id)
          .filter(Boolean);

        let applicantNames: Record<string, string> = {};
        if (applicantUserIds.length > 0) {
          const { data: apps } = await supabase
            .from('applications')
            .select('user_id, applicant_name')
            .in('user_id', applicantUserIds);

          apps?.forEach((app) => {
            applicantNames[app.user_id] = app.applicant_name;
          });
        }

        const enrichChats = (chats: typeof posterData, isPosterView: boolean) =>
          (chats || []).map((chat) => ({
            ...chat,
            last_message: messagesByChat.get(chat.id),
            applicant_name: isPosterView
              ? applicantNames[chat.applicant_user_id] || 'Applicant'
              : undefined,
          }));

        setPosterChats(enrichChats(posterData, true));
        setApplicantChats(enrichChats(applicantData, false));
      }
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeChats = activeTab === 'poster' ? posterChats : applicantChats;
  const isPoster = activeTab === 'poster';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white px-4 py-4 sticky top-0 z-40 border-b border-gray-200">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">
            My Chats - {isPoster ? 'Posters Side' : 'Applier Side'}
          </h1>
          <button className="p-2 text-gray-500 hover:text-gray-700">
            <Bookmark className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-white sticky top-[57px] z-30">
          <button
            onClick={() => setActiveTab('poster')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'poster'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500'
            }`}
          >
            As Poster
          </button>
          <button
            onClick={() => setActiveTab('applicant')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'applicant'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500'
            }`}
          >
            As Applicant
          </button>
        </div>

        <div className="px-4 pt-4 pb-20">
          {/* Info Banner */}
          <div
            className={`rounded-xl p-4 mb-5 border ${
              isPoster
                ? 'bg-orange-50 border-orange-200'
                : 'bg-amber-50 border-amber-200'
            }`}
          >
            <div className="space-y-1.5">
              {isPoster ? (
                <>
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">You can initiate a chat with candidates you've shortlisted.</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Only candidates who have been contacted can reply.
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Gig Posters will initiate a chat with you if you have been selected for a job.</span>
                </p>
              )}
            </div>
          </div>

          {/* Chat List */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-4 h-[72px] animate-pulse">
                  <div className="bg-gray-200 h-4 w-32 rounded mb-2"></div>
                  <div className="bg-gray-200 h-3 w-48 rounded"></div>
                </div>
              ))}
            </div>
          ) : activeChats.length === 0 ? (
            <div className="text-center py-12">
              {isPoster ? (
                <>
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <h3 className="font-medium text-gray-900 mb-1">No Chats Yet</h3>
                  <p className="text-sm text-gray-500 px-6">
                    Shortlist applicants from your job postings to start chatting
                  </p>
                </>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No Additional Matches Selected
                    </h3>
                    <p className="text-sm text-gray-500 leading-relaxed px-4">
                      Only job posters who select you will appear in your chat list. Keep applying to find new opportunities.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {activeChats.map((chat) => {
                const displayName = isPoster
                  ? chat.applicant_name || 'Applicant'
                  : chat.job?.posting_type === 'company'
                  ? (chat.job?.company_name || 'Company')
                  : 'Freelancer';

                return (
                  <Link
                    key={chat.id}
                    to={`/chats/${chat.id}`}
                    className="block bg-white rounded-2xl p-4 border border-gray-100 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-3.5">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold text-sm flex-shrink-0">
                        {getInitials(displayName)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <h3 className="font-semibold text-gray-900 text-[15px]">
                            {displayName}
                          </h3>
                          {chat.last_message && (
                            <span className="text-[11px] text-gray-400 flex-shrink-0 ml-2">
                              {formatTimeAgo(chat.last_message.created_at)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 font-medium">
                          {chat.job?.job_title}
                        </p>
                        {chat.last_message && (
                          <p className="text-[13px] text-gray-400 truncate mt-0.5">
                            {chat.last_message.body}
                          </p>
                        )}
                      </div>

                      <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chats;
