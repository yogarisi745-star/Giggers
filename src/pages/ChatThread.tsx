import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Lock,
  CheckCircle,
  AlertCircle,
  Pause,
  Send,
  Loader2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { Chat, Message, Job, PaymentStatus } from '../lib/types';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const PaymentStatusBanner = ({ job, isPoster }: { job: Job; isPoster: boolean }) => {
  const statusConfig: Record<PaymentStatus, { bg: string; icon: React.ReactNode; title: string; description: string }> = {
    waiting_deposit: {
      bg: 'bg-warning-50 border-warning-200',
      icon: <AlertCircle className="w-5 h-5 text-warning-600" />,
      title: 'Waiting for Deposit',
      description: isPoster
        ? 'Add funds to escrow before work begins.'
        : 'Job poster has not added funds yet. Do not start work.',
    },
    secured: {
      bg: 'bg-primary-50 border-primary-200',
      icon: <Lock className="w-5 h-5 text-primary-600" />,
      title: 'Payment Secured',
      description: `${formatCurrency(job.budget_amount)} is held in escrow.`,
    },
    sent: {
      bg: 'bg-success-50 border-success-200',
      icon: <CheckCircle className="w-5 h-5 text-success-600" />,
      title: 'Payment Sent',
      description: `${formatCurrency(job.budget_amount)} has been transferred to the worker.`,
    },
    paused: {
      bg: 'bg-error-50 border-error-200',
      icon: <Pause className="w-5 h-5 text-error-600" />,
      title: 'Job Paused',
      description: 'A reported issue is under review. Payout is paused.',
    },
  };

  const config = statusConfig[job.payment_status];

  return (
    <div className={`${config.bg} border rounded-xl p-3 mb-4`}>
      <div className="flex items-center gap-2 mb-1">
        {config.icon}
        <span className="font-medium text-gray-900">{config.title}</span>
      </div>
      <p className="text-sm text-gray-600">{config.description}</p>
      {!isPoster && job.payment_status === 'secured' && (
        <div className="mt-3 flex gap-2">
          <button className="flex-1 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">
            Submit Proof of Work
          </button>
          <button className="py-2 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
            Ask for Help
          </button>
        </div>
      )}
    </div>
  );
};

const ChatThread = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [chat, setChat] = useState<Chat | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherUserName, setOtherUserName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isPoster = chat?.poster_user_id === user?.id;

  useEffect(() => {
    if (chatId) loadChat();
  }, [chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChat = async () => {
    try {
      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .select('*')
        .eq('id', chatId)
        .single();

      if (chatError) throw chatError;
      setChat(chatData);

      // Load job details
      const { data: jobData } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', chatData.job_id)
        .single();
      setJob(jobData);

      // Load messages
      const { data: messagesData } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });
      setMessages(messagesData || []);

      // Load applicant name for poster view
      if (chatData.poster_user_id === user?.id) {
        const { data: appData } = await supabase
          .from('applications')
          .select('applicant_name')
          .eq('user_id', chatData.applicant_user_id)
          .eq('job_id', chatData.job_id)
          .maybeSingle();
        setOtherUserName(appData?.applicant_name || 'Applicant');
      } else {
        setOtherUserName(
          jobData?.posting_type === 'company'
            ? (jobData?.company_name || 'Company')
            : 'Freelancer'
        );
      }
    } catch (error) {
      console.error('Error loading chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !user) return;

    setSending(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_user_id: user.id,
          body: newMessage.trim(),
        })
        .select()
        .single();

      if (error) throw error;
      setMessages((prev) => [...prev, data]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!chat || !job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Chat not found</p>
      </div>
    );
  }

  const displayName = otherUserName || 'User';

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white px-4 py-3 border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate('/chats')}
            className="p-2 -ml-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold">
            {displayName.charAt(0)}
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-gray-900">{displayName}</h3>
            <p className="text-xs text-gray-500">{job.job_title}</p>
          </div>
        </div>
      </header>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 py-4 max-w-lg mx-auto w-full">
        {/* Payment Status Banner */}
        <PaymentStatusBanner job={job} isPoster={isPoster} />

        {/* Messages */}
        <div className="space-y-3">
          {messages.map((message) => {
            const isOwn = message.sender_user_id === user?.id;
            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    isOwn
                      ? 'bg-primary-600 text-white rounded-br-md'
                      : 'bg-white text-gray-900 rounded-bl-md shadow-sm'
                  }`}
                >
                  <p className="text-sm">{message.body}</p>
                  <p
                    className={`text-xs mt-1 ${isOwn ? 'text-primary-200' : 'text-gray-400'}`}
                  >
                    {formatTime(message.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-4 py-3 sticky bottom-0">
        <div className="max-w-lg mx-auto flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className="w-10 h-10 bg-primary-600 text-white rounded-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-700 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatThread;
