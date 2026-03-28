import { useState, useRef } from 'react';
import { MessageSquare, Star, Upload, Flag, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { checkAndIncrementRateLimit } from '@/lib/rateLimit';
import { uploadSpotPhoto } from '@/lib/uploadSpotPhoto';
import { useAuth } from '@/contexts/AuthContext';

interface SpotCommentsProps {
  spotId: string;
  comments: any[];
  reportMode: boolean;
  onReportModeChange: (mode: boolean) => void;
  onRefresh: () => void;
  isModerator?: boolean;
}

export default function SpotComments({ spotId, comments, reportMode, onReportModeChange, onRefresh, isModerator }: SpotCommentsProps) {
  const { t } = useTranslation();
  const { requireAuth } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [newRating, setNewRating] = useState(0);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [postingComment, setPostingComment] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reportMode && !reportReason) { toast.error(t('spots.reportReasonRequired', 'Veuillez choisir une raison.')); return; }
    if (!reportMode && !newComment.trim() && newRating === 0 && newPhotos.length === 0) return;
    if (!checkAndIncrementRateLimit()) return;
    setPostingComment(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) { requireAuth(t('spots.loginRequired')); return; }

      const uploadedUrls = (await Promise.all(newPhotos.map(f => uploadSpotPhoto(spotId, f, userId)))).filter(Boolean) as string[];

      await (supabase as any).from('spot_comments').insert([{
        spot_id: spotId, user_id: userId, content: newComment.trim(),
        rating: reportMode ? null : (newRating > 0 ? newRating : null),
        photos: uploadedUrls.length > 0 ? uploadedUrls : null,
        report_reason: reportMode ? reportReason : null,
      }]);
      setNewComment(''); setNewRating(0); setNewPhotos([]); setReportReason('');
      onReportModeChange(false);
      onRefresh();
      toast.success(reportMode ? t('spots.reportSubmitted', 'Signalement envoye') : t('spots.commentPosted'));
    } catch (err) { console.error(err); toast.error(t('spots.commentError')); }
    finally { setPostingComment(false); }
  };

  const generateAiSummary = async () => {
    setGeneratingSummary(true);
    try {
      const { data, error } = await supabase.functions.invoke('summarize-spot', { body: { spot_id: spotId } });
      if (error) throw error;
      if (data?.error === 'no_comments') { toast.info(t('spots.noCommentsForSummary', 'Not enough comments.')); return; }
      if (data?.summary) { toast.success(t('spots.aiSummaryGenerated', 'AI summary generated!')); onRefresh(); }
    } catch { toast.error(t('spots.aiSummaryError', 'AI summary error.')); }
    finally { setGeneratingSummary(false); }
  };

  const reportCount = comments.filter((c: any) => c.report_reason).length;

  return (
    <>
      {/* Report count for moderator */}
      {isModerator && reportCount > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-500/8 border border-red-500/15 rounded-xl text-xs text-red-400">
          <Flag size={12} />
          {reportCount} signalement{reportCount > 1 ? 's' : ''}
        </div>
      )}

      {/* AI summary */}
      {comments.length > 0 && (
        <Button onClick={generateAiSummary} disabled={generatingSummary} variant="outline" className="w-full text-xs h-10 gap-2 rounded-xl">
          {generatingSummary ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {generatingSummary ? 'Generation...' : 'Resume IA des avis'}
        </Button>
      )}

      {/* Comments */}
      <div className="border-t border-border/40 pt-5 space-y-4">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <MessageSquare size={14} /> Commentaires ({comments.length})
        </h3>

        <form onSubmit={handlePostComment} className={`space-y-3 p-3.5 rounded-xl border ${reportMode ? 'bg-red-500/5 border-red-500/20' : 'bg-secondary/15 border-border/40'}`}>
          {reportMode ? (
            <>
              <div className="flex items-center gap-2 text-red-400 text-xs font-semibold">
                <Flag size={12} /> {t('spots.reportTitle', 'Signaler ce terrain')}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: 'gone', label: t('spots.reportGone', "N'existe plus") },
                  { key: 'duplicate', label: t('spots.reportDuplicate', 'Doublon') },
                  { key: 'wrong_location', label: t('spots.reportWrongLocation', 'Mauvais emplacement') },
                  { key: 'wrong_info', label: t('spots.reportWrongInfo', 'Infos incorrectes') },
                  { key: 'other', label: t('spots.reportOther', 'Autre') },
                ].map(r => (
                  <button
                    key={r.key} type="button"
                    onClick={() => setReportReason(r.key)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all active:scale-95 ${
                      reportReason === r.key
                        ? 'bg-red-500 text-white border-red-500'
                        : 'bg-background/80 text-foreground/70 border-border/50'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} type="button" onClick={() => setNewRating(star)} className="p-0.5 active:scale-110 transition-transform">
                  <Star size={20} className={star <= newRating ? "text-accent fill-accent" : "text-border"} />
                </button>
              ))}
            </div>
          )}
          <Input
            placeholder={reportMode ? t('spots.reportPlaceholder', 'Details (optionnel)...') : 'Votre avis...'}
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            className="bg-background text-sm rounded-lg h-10"
          />
          <div className="flex items-center justify-between">
            <div>
              <input type="file" ref={fileInputRef} onChange={e => {
                if (e.target.files) {
                  const files = Array.from(e.target.files);
                  if (newPhotos.length + files.length > 5) { toast.error("Max 5 photos"); return; }
                  setNewPhotos([...newPhotos, ...files]);
                }
              }} multiple accept="image/*" className="hidden" />
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="text-[10px] rounded-lg h-8">
                <Upload size={11} className="mr-1" /> Photos ({newPhotos.length}/5)
              </Button>
            </div>
            <Button
              type="submit" size="sm"
              disabled={postingComment || (reportMode ? !reportReason : (!newComment.trim() && newRating === 0 && newPhotos.length === 0))}
              className={`rounded-lg h-8 text-xs ${reportMode ? 'bg-red-600 hover:bg-red-700 text-white' : ''}`}
            >
              {reportMode ? t('spots.reportSend', 'Signaler') : 'Envoyer'}
            </Button>
          </div>
        </form>

        {comments.map((c: any, i: number) => (
          <div key={i} className={`p-3.5 rounded-xl border ${c.report_reason ? 'bg-red-500/5 border-red-500/20' : 'bg-secondary/15 border-border/30'}`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-xs text-foreground">{c.authorName}</span>
              <div className="flex items-center gap-2">
                {c.report_reason && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full">
                    <Flag size={8} /> {
                      { gone: "N'existe plus", duplicate: 'Doublon', wrong_location: 'Mauvais lieu', wrong_info: 'Infos fausses', other: 'Autre' }[c.report_reason as string] || c.report_reason
                    }
                  </span>
                )}
                {c.rating && !c.report_reason && (
                  <div className="flex items-center text-yellow-500">
                    <Star size={10} fill="currentColor" className="mr-0.5" />
                    <span className="text-[10px] font-bold">{c.rating}</span>
                  </div>
                )}
                <span className="text-[9px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            {c.content && <p className="text-xs text-foreground/70 leading-relaxed">{c.content}</p>}
          </div>
        ))}

        {comments.length === 0 && (
          <p className="text-xs text-center text-muted-foreground py-8 bg-secondary/10 rounded-xl border border-dashed border-border/40">
            Soyez le premier a commenter !
          </p>
        )}
      </div>
    </>
  );
}
