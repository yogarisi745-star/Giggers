import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  User,
  X,
  Pencil,
  Plus,
  Loader2,
  Sparkles,
  MapPin,
  Users,
  IndianRupee,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { AITags, PostingType } from '../lib/types';

interface DraftJob {
  id: string;
  posting_type: PostingType;
  job_title: string;
  company_name: string;
  workers_required: number;
  location: string;
  start_date: string;
  end_date: string;
  requirements_text: string;
  ai_tags: AITags | null;
  budget_amount: string;
  is_urgent: boolean;
  ai_loading: boolean;
}

const initialDraft: DraftJob = {
  id: crypto.randomUUID(),
  posting_type: 'company',
  job_title: '',
  company_name: '',
  workers_required: 1,
  location: '',
  start_date: '',
  end_date: '',
  requirements_text: '',
  ai_tags: null,
  budget_amount: '',
  is_urgent: false,
  ai_loading: false,
};

const AITagPanel = ({
  aiTags,
  loading,
  onRemoveTag,
}: {
  aiTags: AITags | null;
  loading: boolean;
  onAddTag?: (category: keyof AITags, value: string) => void;
  onRemoveTag: (category: keyof AITags, index: number) => void;
}) => {
  if (loading) {
    return (
      <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-primary-500 mr-2" />
        <span className="text-sm text-gray-500">Analyzing requirements...</span>
      </div>
    );
  }

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
                className="inline-flex items-center gap-1 bg-white px-2 py-1 rounded-lg text-xs font-medium text-gray-700 border border-gray-200"
              >
                {skill}
                <button
                  onClick={() => onRemoveTag('skill_required', idx)}
                  className="text-gray-400 hover:text-error-500 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
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
                className="inline-flex items-center gap-1 bg-warning-50 px-2 py-1 rounded-lg text-xs font-medium text-warning-700 border border-warning-200"
              >
                {constraint}
                <button
                  onClick={() => onRemoveTag('constraints', idx)}
                  className="text-warning-400 hover:text-error-500 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
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

const PostJob = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [drafts, setDrafts] = useState<DraftJob[]>([{ ...initialDraft }]);
  const [activeDraftId, setActiveDraftId] = useState(drafts[0].id);
  const [publishing, setPublishing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const aiTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeDraft = drafts.find((d) => d.id === activeDraftId) || drafts[0];

  const extractAITags = useCallback(async (text: string, draftId: string) => {
    if (!text.trim()) {
      setDrafts((prev) =>
        prev.map((d) => (d.id === draftId ? { ...d, ai_tags: null, ai_loading: false } : d))
      );
      return;
    }

    setDrafts((prev) =>
      prev.map((d) => (d.id === draftId ? { ...d, ai_loading: true } : d))
    );

    try {
      const { data, error } = await supabase.functions.invoke('ai-extract-tags', {
        body: { text },
      });

      if (error) throw error;

      setDrafts((prev) =>
        prev.map((d) =>
          d.id === draftId ? { ...d, ai_tags: data as AITags, ai_loading: false } : d
        )
      );
    } catch (error) {
      console.error('AI extraction error:', error);
      setDrafts((prev) =>
        prev.map((d) => (d.id === draftId ? { ...d, ai_loading: false } : d))
      );
    }
  }, []);

  const handleRequirementsChange = (text: string) => {
    updateDraft('requirements_text', text);

    if (aiTimeoutRef.current) {
      clearTimeout(aiTimeoutRef.current);
    }

    aiTimeoutRef.current = setTimeout(() => {
      extractAITags(text, activeDraftId);
    }, 1000);
  };

  const updateDraft = <K extends keyof DraftJob>(key: K, value: DraftJob[K]) => {
    setDrafts((prev) =>
      prev.map((d) => (d.id === activeDraftId ? { ...d, [key]: value } : d))
    );
  };

  const addTag = (category: keyof AITags, value: string) => {
    if (!activeDraft.ai_tags) return;
    const newTags = {
      ...activeDraft.ai_tags,
      [category]: [...activeDraft.ai_tags[category], value],
    };
    updateDraft('ai_tags', newTags);
  };

  const removeTag = (category: keyof AITags, index: number) => {
    if (!activeDraft.ai_tags) return;
    const currentArray = activeDraft.ai_tags[category];
    if (!Array.isArray(currentArray)) return;
    const newTags = {
      ...activeDraft.ai_tags,
      [category]: currentArray.filter((_: string, i: number) => i !== index),
    };
    updateDraft('ai_tags', newTags);
  };

  const addNewDraft = () => {
    const newDraft: DraftJob = { ...initialDraft, id: crypto.randomUUID() };
    setDrafts([...drafts, newDraft]);
    setActiveDraftId(newDraft.id);
    setShowForm(true);
  };

  const removeDraft = (id: string) => {
    if (drafts.length === 1) return;
    const newDrafts = drafts.filter((d) => d.id !== id);
    setDrafts(newDrafts);
    if (activeDraftId === id) {
      setActiveDraftId(newDrafts[0].id);
    }
  };

  const publishAll = async () => {
    if (!user) return;

    const validDrafts = drafts.filter(
      (d) => d.job_title && d.location && d.budget_amount
    );

    if (validDrafts.length === 0) return;

    setPublishing(true);
    try {
      const jobsToInsert = validDrafts.map((draft) => ({
        user_id: user.id,
        posting_type: draft.posting_type,
        job_title: draft.job_title,
        company_name: draft.posting_type === 'company' ? draft.company_name.trim() : null,
        workers_required: draft.workers_required,
        location: draft.location,
        start_date: draft.start_date || null,
        end_date: draft.end_date || null,
        requirements_text: draft.requirements_text || null,
        ai_tags: draft.ai_tags || null,
        budget_amount: parseFloat(draft.budget_amount),
        is_urgent: draft.is_urgent,
        payment_status: 'waiting_deposit' as const,
        job_status: 'open' as const,
      }));

      const { error } = await supabase.from('jobs').insert(jobsToInsert);
      if (error) throw error;

      navigate('/my-postings');
    } catch (error) {
      console.error('Publish error:', error);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white px-4 py-4 sticky top-0 z-40 border-b border-gray-200">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-gray-600 hover:text-gray-900"
          >
            <X className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Post New Job</h1>
          <button
            onClick={publishAll}
            disabled={publishing || !drafts.some((d) => d.job_title && d.location && d.budget_amount)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {publishing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              `Publish All (${drafts.filter((d) => d.job_title && d.location && d.budget_amount).length})`
            )}
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        {!showForm ? (
          <div>
            {/* Step 1: Choose Posting Type */}
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Choose Job Posting Type
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => {
                  updateDraft('posting_type', 'company');
                  setShowForm(true);
                }}
                className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-primary-400 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center mb-3 group-hover:bg-primary-200 transition-colors">
                  <Building2 className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Company Posting</h3>
                <p className="text-sm text-gray-500">Hiring on behalf of a business</p>
              </button>

              <button
                onClick={() => {
                  updateDraft('posting_type', 'freelancer');
                  setShowForm(true);
                }}
                className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-primary-400 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-warning-100 flex items-center justify-center mb-3 group-hover:bg-warning-200 transition-colors">
                  <User className="w-6 h-6 text-warning-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Freelancer</h3>
                <p className="text-sm text-gray-500">Individual job posting</p>
              </button>
            </div>

            {/* Existing Drafts */}
            {drafts.some((d) => d.job_title) && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Draft Jobs</h3>
                <div className="space-y-3">
                  {drafts
                    .filter((d) => d.job_title)
                    .map((draft) => (
                      <div
                        key={draft.id}
                        className="bg-white rounded-xl p-4 border border-gray-200"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 mb-2 inline-block">
                              {draft.posting_type === 'company' ? 'Company' : 'Freelancer'}
                            </span>
                            <h4 className="font-medium text-gray-900">{draft.job_title}</h4>
                            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3" />
                              {draft.location}
                            </p>
                            <p className="text-xs text-gray-400 mt-2">
                              {draft.workers_required} {draft.workers_required === 1 ? 'seat' : 'seats'} remaining
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setActiveDraftId(draft.id);
                                setShowForm(true);
                              }}
                              className="p-2 text-gray-400 hover:text-primary-600 transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            {drafts.length > 1 && (
                              <button
                                onClick={() => removeDraft(draft.id)}
                                className="p-2 text-gray-400 hover:text-error-500 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* Back button */}
            <button
              onClick={() => setShowForm(false)}
              className="flex items-center gap-2 text-gray-600 mb-4 hover:text-gray-900"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              Back to drafts
            </button>

            {/* Posting Type Indicator */}
            <div className="flex items-center gap-3 mb-6">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  activeDraft.posting_type === 'company'
                    ? 'bg-primary-100'
                    : 'bg-warning-100'
                }`}
              >
                {activeDraft.posting_type === 'company' ? (
                  <Building2 className="w-5 h-5 text-primary-600" />
                ) : (
                  <User className="w-5 h-5 text-warning-600" />
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">Posting as</p>
                <p className="font-medium text-gray-900">
                  {activeDraft.posting_type === 'company' ? 'Company' : 'Freelancer'}
                </p>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-5">
              {activeDraft.posting_type === 'company' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={activeDraft.company_name}
                    onChange={(e) => updateDraft('company_name', e.target.value)}
                    placeholder="e.g., Acme Technologies"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Job Title <span className="text-error-500">*</span>
                </label>
                <input
                  type="text"
                  value={activeDraft.job_title}
                  onChange={(e) => updateDraft('job_title', e.target.value)}
                  placeholder="e.g., Senior React Developer"
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Number of Workers Required <span className="text-error-500">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      updateDraft(
                        'workers_required',
                        Math.max(1, activeDraft.workers_required - 1)
                      )
                    }
                    className="w-10 h-10 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 transition-colors"
                  >
                    -
                  </button>
                  <span className="text-lg font-semibold text-gray-900 w-12 text-center">
                    {activeDraft.workers_required}
                  </span>
                  <button
                    onClick={() =>
                      updateDraft('workers_required', activeDraft.workers_required + 1)
                    }
                    className="w-10 h-10 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 transition-colors"
                  >
                    +
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  This will show as "{activeDraft.workers_required} Seats Remaining" in Home
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Location <span className="text-error-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={activeDraft.location}
                    onChange={(e) => updateDraft('location', e.target.value)}
                    placeholder="e.g., Mumbai, India"
                    className="w-full pl-11 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={activeDraft.start_date}
                    onChange={(e) => updateDraft('start_date', e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={activeDraft.end_date}
                    onChange={(e) => updateDraft('end_date', e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Budget Amount <span className="text-error-500">*</span>
                </label>
                <div className="relative">
                  <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    value={activeDraft.budget_amount}
                    onChange={(e) => updateDraft('budget_amount', e.target.value)}
                    placeholder="e.g., 50000"
                    className="w-full pl-11 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Urgent Toggle */}
              <div className="bg-warning-50 border border-warning-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-warning-100 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-warning-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Mark as Urgent</p>
                      <p className="text-xs text-gray-500">Job will appear in Urgent Services section</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateDraft('is_urgent', !activeDraft.is_urgent)}
                    className={`relative w-12 h-7 rounded-full transition-colors ${
                      activeDraft.is_urgent ? 'bg-warning-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        activeDraft.is_urgent ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Work Requirements
                </label>
                <textarea
                  value={activeDraft.requirements_text}
                  onChange={(e) => handleRequirementsChange(e.target.value)}
                  rows={4}
                  placeholder="Describe the work requirements, skills needed, experience level (optional)..."
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                />

                {/* AI Tags Panel */}
                <div className="mt-3">
                  <AITagPanel
                    aiTags={activeDraft.ai_tags}
                    loading={activeDraft.ai_loading}
                    onAddTag={addTag}
                    onRemoveTag={removeTag}
                  />
                </div>
              </div>
            </div>

            {/* Add Another Job Button */}
            <button
              onClick={addNewDraft}
              className="w-full mt-6 py-3 bg-gray-100 rounded-xl flex items-center justify-center gap-2 text-gray-700 font-medium hover:bg-gray-200 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Another Job
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostJob;
