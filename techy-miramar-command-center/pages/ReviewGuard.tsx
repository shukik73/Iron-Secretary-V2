import React, { useState } from 'react';
import { ShieldCheck, Star, Clock, MessageSquare, ThumbsUp, ThumbsDown, AlertTriangle, Send, Sparkles, CheckCircle2, Eye } from 'lucide-react';
import StatCard from '../components/StatCard';

// ── Mock Data ────────────────────────────────────────────────────────────

interface Review {
  id: string;
  author: string;
  rating: number;
  text: string;
  date: string;
  platform: string;
  status: 'pending' | 'responded' | 'flagged';
  draftResponse?: string;
}

const mockReviews: Review[] = [
  {
    id: 'r-1',
    author: 'Sarah M.',
    rating: 5,
    text: 'Amazing service! Dropped off my MacBook with a cracked screen and they had it fixed same day. Very professional and fair pricing. Highly recommend Techy Miramar!',
    date: '2026-02-05',
    platform: 'Google',
    status: 'pending',
    draftResponse: 'Thank you so much, Sarah! We\'re glad we could get your MacBook back to you the same day. We always strive for fast, quality repairs at fair prices. See you next time!',
  },
  {
    id: 'r-2',
    author: 'James R.',
    rating: 5,
    text: 'Fixed my iPhone 14 Pro that another shop said was unfixable. Great work and great price.',
    date: '2026-02-04',
    platform: 'Google',
    status: 'pending',
    draftResponse: 'Thanks James! We love a good challenge. Glad we could bring your iPhone 14 Pro back to life. We appreciate you trusting us with it!',
  },
  {
    id: 'r-3',
    author: 'Maria L.',
    rating: 2,
    text: 'Waited 3 days for a simple screen repair. Was told it would be done next day. Communication could be better.',
    date: '2026-02-03',
    platform: 'Google',
    status: 'flagged',
    draftResponse: 'Hi Maria, we sincerely apologize for the delay and the miscommunication about the timeline. We had an unexpected parts shortage that week, but that\'s no excuse for not keeping you updated. We\'ve improved our notification system to prevent this. We\'d love to make it right — please reach out directly and we\'ll take care of you.',
  },
  {
    id: 'r-4',
    author: 'Carlos D.',
    rating: 4,
    text: 'Good repair service, reasonable prices. Only issue was parking is a bit tricky.',
    date: '2026-02-01',
    platform: 'Google',
    status: 'responded',
  },
  {
    id: 'r-5',
    author: 'Lisa T.',
    rating: 5,
    text: 'Best repair shop in Miami! They recovered all my data after I thought it was gone forever.',
    date: '2026-01-28',
    platform: 'Google',
    status: 'responded',
  },
];

// ── Component ────────────────────────────────────────────────────────────

const ReviewGuard: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>(mockReviews);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [draftText, setDraftText] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'flagged' | 'responded'>('all');

  const pendingCount = reviews.filter(r => r.status === 'pending').length;
  const flaggedCount = reviews.filter(r => r.status === 'flagged').length;
  const avgRating = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);
  const respondedCount = reviews.filter(r => r.status === 'responded').length;

  const filteredReviews = filter === 'all' ? reviews : reviews.filter(r => r.status === filter);

  const handleSelectReview = (review: Review) => {
    setSelectedReview(review);
    setDraftText(review.draftResponse || '');
  };

  const handleApproveResponse = () => {
    if (!selectedReview) return;
    setReviews(prev => prev.map(r =>
      r.id === selectedReview.id ? { ...r, status: 'responded' as const } : r
    ));
    setSelectedReview(null);
    setDraftText('');
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={14}
        className={i < rating ? 'text-amber-400 fill-amber-400' : 'text-gray-600'}
      />
    ));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="border-b border-gray-800/50 pb-6">
        <h1 className="text-4xl font-bold text-white tracking-tight mb-2 flex items-center gap-3">
          <ShieldCheck className="w-9 h-9 text-emerald-400" />
          ReviewGuard
        </h1>
        <p className="text-gray-400">Google Review monitoring, AI-drafted responses, and reputation management</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Avg. Rating" value={avgRating} icon={Star} color="amber" />
        <StatCard title="Pending" value={String(pendingCount)} icon={Clock} color="blue" />
        <StatCard title="Flagged" value={String(flaggedCount)} icon={AlertTriangle} color="rose" />
        <StatCard title="Responded" value={String(respondedCount)} icon={CheckCircle2} trend="up" color="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reviews List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filter Tabs */}
          <div className="flex gap-2">
            {(['all', 'pending', 'flagged', 'responded'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                  filter === f
                    ? 'bg-white/10 text-white ring-1 ring-white/10'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {f} {f === 'pending' && pendingCount > 0 ? `(${pendingCount})` : f === 'flagged' && flaggedCount > 0 ? `(${flaggedCount})` : ''}
              </button>
            ))}
          </div>

          {/* Review Cards */}
          {filteredReviews.length === 0 && (
            <div className="glass-card rounded-xl p-8 text-center">
              <ShieldCheck size={32} className="text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No reviews matching this filter.</p>
            </div>
          )}

          {filteredReviews.map(review => (
            <div
              key={review.id}
              onClick={() => handleSelectReview(review)}
              className={`glass-card rounded-xl p-5 cursor-pointer transition-all ${
                selectedReview?.id === review.id ? 'ring-1 ring-purple-500/50' : ''
              } ${review.status === 'flagged' ? 'border-l-4 border-rose-500' : ''}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-white">{review.author}</p>
                    <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{review.platform}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {renderStars(review.rating)}
                    <span className="text-xs text-gray-500 ml-2">{review.date}</span>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                  review.status === 'pending' ? 'bg-blue-500/10 text-blue-400' :
                  review.status === 'flagged' ? 'bg-rose-500/10 text-rose-400' :
                  'bg-emerald-500/10 text-emerald-400'
                }`}>
                  {review.status}
                </span>
              </div>

              <p className="text-sm text-gray-300 leading-relaxed">{review.text}</p>

              {review.status !== 'responded' && review.draftResponse && (
                <div className="mt-3 pt-3 border-t border-white/5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles size={12} className="text-purple-400" />
                    <p className="text-[10px] text-purple-400 uppercase tracking-wider font-semibold">AI Draft</p>
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-2">{review.draftResponse}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Response Panel */}
        <div className="space-y-4">
          {selectedReview ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 sticky top-4">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <MessageSquare size={14} className="text-purple-400" />
                Respond to {selectedReview.author}
              </h3>

              <div className="flex items-center gap-1 mb-3">
                {renderStars(selectedReview.rating)}
                <span className={`ml-2 text-xs font-medium ${
                  selectedReview.rating >= 4 ? 'text-emerald-400' :
                  selectedReview.rating >= 3 ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {selectedReview.rating >= 4 ? 'Positive' : selectedReview.rating >= 3 ? 'Neutral' : 'Needs Attention'}
                </span>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-3 mb-4 text-xs text-gray-400 italic">
                "{selectedReview.text}"
              </div>

              <label className="block text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">
                Response
              </label>
              <textarea
                value={draftText}
                onChange={e => setDraftText(e.target.value)}
                rows={5}
                maxLength={1000}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
                placeholder="Write your response..."
              />
              <p className="text-[10px] text-gray-600 mt-1 text-right">{draftText.length}/1000</p>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleApproveResponse}
                  disabled={!draftText.trim()}
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Send size={14} /> Approve & Send
                </button>
                <button
                  onClick={() => { setSelectedReview(null); setDraftText(''); }}
                  className="px-3 py-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
              <Eye size={24} className="text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-400 mb-1">Select a review to respond</p>
              <p className="text-xs text-gray-600">AI-drafted responses are ready for pending reviews</p>
            </div>
          )}

          {/* Quick Stats */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-bold text-white mb-4">Review Health</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">5-star</span>
                  <span className="text-gray-500">{reviews.filter(r => r.rating === 5).length} reviews</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${(reviews.filter(r => r.rating === 5).length / reviews.length) * 100}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">4-star</span>
                  <span className="text-gray-500">{reviews.filter(r => r.rating === 4).length} reviews</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5">
                  <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${(reviews.filter(r => r.rating === 4).length / reviews.length) * 100}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">1-3 star</span>
                  <span className="text-gray-500">{reviews.filter(r => r.rating <= 3).length} reviews</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5">
                  <div className="bg-rose-500 h-1.5 rounded-full" style={{ width: `${(reviews.filter(r => r.rating <= 3).length / reviews.length) * 100}%` }} />
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-800">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Avg. Response Time</span>
                <span className="text-white font-medium">4.2 hours</span>
              </div>
              <div className="flex justify-between text-xs mt-2">
                <span className="text-gray-400">Response Rate</span>
                <span className="text-emerald-400 font-medium">92%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewGuard;
