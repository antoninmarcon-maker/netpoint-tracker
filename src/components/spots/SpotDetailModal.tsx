import { useEffect, useState, useRef } from 'react';
import { X, MapPin, Calendar, Info, MessageSquare, Loader2, Star, Upload, Edit3, ExternalLink, Sparkles, Navigation, Zap, Phone, Globe, Leaf, Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { checkAndIncrementRateLimit } from '@/lib/rateLimit';
import { MONTHS_SHORT, MONTHS_FULL, getTypeLabel, calcAverageRating } from '@/lib/spotTypes';
import { uploadSpotPhoto } from '@/lib/uploadSpotPhoto';

interface SpotDetailModalProps {
  spotId: string | null;
  onClose: () => void;
  onEdit: (spot: any) => void;
  isModerator?: boolean;
  onModerate?: (spotId: string, action: 'approve' | 'reject') => void;
}

export default function SpotDetailModal({ spotId, onClose, onEdit, isModerator, onModerate }: SpotDetailModalProps) {
  const { t } = useTranslation();
  const [spot, setSpot] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newRating, setNewRating] = useState(0);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [postingComment, setPostingComment] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  // Swipe-down to close
  const handleTouchStart = (e: React.TouchEvent) => {
    const el = sheetRef.current;
    if (el && el.scrollTop <= 0) {
      dragStartY.current = e.touches[0].clientY;
    }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    const dy = e.touches[0].clientY - dragStartY.current;
    if (dy > 0) setDragOffset(dy);
  };
  const handleTouchEnd = () => {
    if (dragOffset > 120) {
      onClose();
    }
    setDragOffset(0);
    dragStartY.current = null;
  };

  useEffect(() => {
    if (spotId) {
      loadSpotDetails(spotId);
      checkFavorite(spotId);
    } else {
      setSpot(null);
    }
  }, [spotId]);

  const loadSpotDetails = async (id: string) => {
    setLoading(true);
    try {
      const { data: sData, error: sErr } = await (supabase as any).from('spots').select('*').eq('id', id).maybeSingle();
      if (sErr) throw sErr;
      if (!sData) { toast.error("Ce terrain n'existe plus."); onClose(); return; }
      setSpot(sData);

      const { data: pData } = await (supabase as any).from('spot_photos').select('*').eq('spot_id', id).order('created_at', { ascending: false });
      setPhotos(pData || []);

      const { data: cData } = await (supabase as any).from('spot_comments').select('*').eq('spot_id', id).order('created_at', { ascending: false });
      const userIds = [...new Set((cData || []).map((c: any) => c.user_id).filter(Boolean))];
      let profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await (supabase as any).from('profiles').select('user_id, display_name').in('user_id', userIds);
        (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p.display_name; });
      }
      setComments((cData || []).map((c: any) => ({ ...c, authorName: profileMap[c.user_id] || 'Anonyme' })));
    } catch (err) {
      console.error(err);
      toast.error(t('spots.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const checkFavorite = (id: string) => {
    try {
      const favs = JSON.parse(localStorage.getItem('spot_favorites') || '[]');
      setIsFavorite(favs.includes(id));
    } catch { setIsFavorite(false); }
  };

  const toggleFavorite = () => {
    if (!spotId) return;
    const favs: string[] = JSON.parse(localStorage.getItem('spot_favorites') || '[]');
    const next = isFavorite ? favs.filter(f => f !== spotId) : [...favs, spotId];
    localStorage.setItem('spot_favorites', JSON.stringify(next));
    setIsFavorite(!isFavorite);
    toast.success(isFavorite ? t('spots.removedFromFavorites', 'Removed from favorites') : t('spots.addedToFavorites', 'Added to favorites'));
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spotId || (!newComment.trim() && newRating === 0 && newPhotos.length === 0)) return;
    if (!checkAndIncrementRateLimit()) return;
    setPostingComment(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) { toast.error(t('spots.loginRequired')); return; }

      const uploadedUrls = (await Promise.all(newPhotos.map(f => uploadSpotPhoto(spotId!, f, userId)))).filter(Boolean) as string[];

      await (supabase as any).from('spot_comments').insert([{
        spot_id: spotId, user_id: userId, content: newComment.trim(),
        rating: newRating > 0 ? newRating : null, photos: uploadedUrls.length > 0 ? uploadedUrls : null,
      }]);
      setNewComment(''); setNewRating(0); setNewPhotos([]);
      loadSpotDetails(spotId);
      toast.success(t('spots.commentPosted'));
    } catch (err) { console.error(err); toast.error(t('spots.commentError')); }
    finally { setPostingComment(false); }
  };

  const generateAiSummary = async () => {
    if (!spot) return;
    setGeneratingSummary(true);
    try {
      const { data, error } = await supabase.functions.invoke('summarize-spot', { body: { spot_id: spot.id } });
      if (error) throw error;
      if (data?.error === 'no_comments') { toast.info(t('spots.noCommentsForSummary', 'Not enough comments.')); return; }
      if (data?.summary) { toast.success(t('spots.aiSummaryGenerated', 'AI summary generated!')); loadSpotDetails(spot.id); }
    } catch { toast.error(t('spots.aiSummaryError', 'AI summary error.')); }
    finally { setGeneratingSummary(false); }
  };

  const parseSeasonality = (period: string | null, saisonnier: boolean | null) => {
    if (saisonnier === false || period === "Toute l'année") return { type: 'yearly' as const };
    if (!period) return saisonnier ? { type: 'seasonal' as const, start: null, end: null } : null;
    const match = period.match(/De (.+) à (.+)/);
    if (match) {
      const startIdx = MONTHS_FULL.indexOf(match[1]);
      const endIdx = MONTHS_FULL.indexOf(match[2]);
      return { type: 'seasonal' as const, start: startIdx >= 0 ? startIdx : null, end: endIdx >= 0 ? endIdx : null };
    }
    return { type: 'seasonal' as const, start: null, end: null };
  };

  const averageRating = calcAverageRating(comments);

  if (!spotId) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${spotId ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 max-h-[90vh] transition-transform duration-300 ease-out ${spotId ? 'translate-y-0' : 'translate-y-full'}`}
        style={dragOffset > 0 ? { transform: `translateY(${dragOffset}px)`, transition: 'none' } : undefined}
      >
        <div className="bg-[rgba(9,9,11,0.92)] backdrop-blur-2xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Drag handle + close button */}
          <div className="flex items-center justify-between px-4 pt-3 pb-1 flex-none">
            <div className="w-9" />
            <div className="w-10 h-1 rounded-full bg-border" />
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-secondary/60 flex items-center justify-center hover:bg-secondary transition-colors active:scale-95"
            >
              <X size={16} className="text-muted-foreground" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-16">
              <Loader2 className="animate-spin text-primary" size={24} />
            </div>
          ) : spot ? (
            <div
              ref={sheetRef}
              className="overflow-y-auto flex-1 overscroll-contain"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Photo carousel */}
              {photos.length > 0 ? (
                <div className="flex overflow-x-auto snap-x hide-scrollbar">
                  {photos.map((p: any, i: number) => (
                    <img key={i} src={p.photo_url} alt="Spot" className="w-full h-52 object-cover shrink-0 snap-center" />
                  ))}
                </div>
              ) : (
                <div className="h-28 bg-gradient-to-br from-primary/10 via-secondary/20 to-primary/5 flex items-center justify-center">
                  <MapPin size={28} className="text-muted-foreground/30" />
                </div>
              )}

              <div className="px-5 pb-8 pt-4 space-y-5">
                {/* Title row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-black text-foreground leading-tight tracking-tight">{spot.name}</h2>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                        {getTypeLabel(spot.type)}
                      </span>
                      {spot.status === 'waiting_for_validation' && (
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-[11px] font-bold">
                          En attente
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-none">
                    {averageRating > 0 && (
                      <div className="flex items-center gap-1 bg-yellow-500/10 px-2 py-1 rounded-full">
                        <Star size={13} className="text-yellow-500" fill="currentColor" />
                        <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400">{averageRating.toFixed(1)}</span>
                      </div>
                    )}
                    <button
                      onClick={toggleFavorite}
                      className="w-9 h-9 rounded-full bg-secondary/60 flex items-center justify-center hover:bg-secondary transition-colors active:scale-95"
                    >
                      <Heart size={16} className={isFavorite ? 'text-red-500 fill-red-500' : 'text-muted-foreground'} />
                    </button>
                  </div>
                </div>

                {/* Address */}
                {spot.address && (
                  <div className="flex items-start gap-2.5">
                    <MapPin size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-sm text-foreground/70 leading-snug">{spot.address}</p>
                  </div>
                )}

                {/* Equipment badges */}
                <div className="flex flex-wrap gap-1.5">
                  {spot.equip_acces_libre && (
                    <span className="inline-flex items-center gap-1 bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground rounded-md">🔓 Libre accès</span>
                  )}
                  {spot.equip_eclairage && (
                    <span className="inline-flex items-center gap-1 bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground rounded-md"><Zap size={10} /> Éclairé</span>
                  )}
                  {spot.equip_pmr && (
                    <span className="inline-flex items-center gap-1 bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground rounded-md">♿ PMR</span>
                  )}
                  {spot.equip_sol && (
                    <span className="inline-flex items-center gap-1 bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground rounded-md"><Leaf size={10} /> {spot.equip_sol}</span>
                  )}
                </div>

                {/* Seasonality */}
                {(() => {
                  const season = parseSeasonality(spot.availability_period, spot.equip_saisonnier);
                  if (!season) return null;
                  if (season.type === 'yearly') {
                    return (
                      <div className="border-b border-border py-3 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Disponibilité</span>
                        <span className="text-xs text-foreground/80">Toute l'année</span>
                      </div>
                    );
                  }
                  return (
                    <div className="border-b border-border py-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">Disponibilité</span>
                        <span className="text-xs text-foreground/80">Saisonnier</span>
                      </div>
                      <div className="flex gap-[3px]">
                        {MONTHS_SHORT.map((m, i) => {
                          const isActive = season.start != null && season.end != null
                            ? (season.start <= season.end
                              ? i >= season.start && i <= season.end
                              : i >= season.start || i <= season.end)
                            : false;
                          return (
                            <div key={m} className="flex-1 flex flex-col items-center gap-1">
                              <div className={`w-full h-2.5 rounded-sm transition-colors ${isActive ? 'bg-accent' : 'bg-secondary'}`} />
                              <span className={`text-[7px] leading-none ${isActive ? 'text-accent font-bold' : 'text-muted-foreground/40'}`}>{m}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Club contact */}
                {spot.source === 'ffvb_club' && (
                  <div className="space-y-2">
                    {spot.club_lien_fiche && (
                      <a href={spot.club_lien_fiche} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-sm text-primary hover:underline">
                        <Info size={14} className="shrink-0" /><span className="font-medium">Fiche club FFVB</span><ExternalLink size={10} />
                      </a>
                    )}
                    {spot.club_site_web && (
                      <a href={spot.club_site_web} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-sm text-primary hover:underline">
                        <Globe size={14} className="shrink-0" /><span className="font-medium">Site du club</span><ExternalLink size={10} />
                      </a>
                    )}
                    {spot.club_telephone && (
                      <a href={`tel:${spot.club_telephone}`} className="flex items-center gap-2.5 text-sm text-primary hover:underline">
                        <Phone size={14} className="shrink-0" /><span className="font-medium">{spot.club_telephone}</span>
                      </a>
                    )}
                  </div>
                )}

                {/* FFVB region */}
                {(spot.ffvb_ligue || spot.ffvb_comite) && (
                  <p className="text-xs text-muted-foreground">{[spot.ffvb_comite, spot.ffvb_ligue].filter(Boolean).join(' — ')}</p>
                )}

                {spot.description && (
                  <p className="text-sm text-foreground/70 leading-relaxed">{spot.description}</p>
                )}

                {/* Navigation buttons */}
                {spot.lat && spot.lng && (
                  <div className="flex gap-2">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 text-xs font-semibold text-primary bg-primary/8 hover:bg-primary/15 rounded-xl py-3 transition-colors active:scale-[0.98]"
                    >
                      <MapPin size={14} /> Google Maps
                    </a>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 text-xs font-semibold text-primary bg-primary/8 hover:bg-primary/15 rounded-xl py-3 transition-colors active:scale-[0.98]"
                    >
                      <Navigation size={14} /> Itinéraire
                    </a>
                  </div>
                )}

                {/* Edit action */}
                <Button onClick={() => onEdit(spot)} variant="outline" className="w-full text-xs h-10 rounded-[10px]">
                  <Edit3 size={14} className="mr-1.5" /> Suggérer une modification
                </Button>

                {/* Moderator actions */}
                {isModerator && spot.status !== 'validated' && (
                  <div className="flex gap-2 p-3 bg-yellow-500/8 border border-yellow-500/15 rounded-xl">
                    <Button onClick={() => onModerate?.(spot.id, 'approve')} className="flex-1 text-xs h-9 bg-green-600 hover:bg-green-700 rounded-lg">
                      Valider
                    </Button>
                    <Button onClick={() => onModerate?.(spot.id, 'reject')} variant="destructive" className="flex-1 text-xs h-9 rounded-lg">
                      Rejeter
                    </Button>
                  </div>
                )}

                {/* AI summary */}
                {comments.length > 0 && (
                  <Button onClick={generateAiSummary} disabled={generatingSummary} variant="outline" className="w-full text-xs h-10 gap-2 rounded-xl">
                    {generatingSummary ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    {generatingSummary ? 'Génération...' : 'Résumé IA des avis'}
                  </Button>
                )}

                {/* Comments */}
                <div className="border-t border-border/40 pt-5 space-y-4">
                  <h3 className="font-bold text-sm flex items-center gap-2">
                    <MessageSquare size={14} /> Commentaires ({comments.length})
                  </h3>

                  <form onSubmit={handlePostComment} className="space-y-3 bg-secondary/15 p-3.5 rounded-xl border border-border/40">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button key={star} type="button" onClick={() => setNewRating(star)} className="p-0.5 active:scale-110 transition-transform">
                          <Star size={20} className={star <= newRating ? "text-accent fill-accent" : "text-border"} />
                        </button>
                      ))}
                    </div>
                    <Input
                      placeholder="Votre avis..."
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
                      <Button type="submit" size="sm" disabled={postingComment || (!newComment.trim() && newRating === 0 && newPhotos.length === 0)} className="rounded-lg h-8 text-xs">
                        Envoyer
                      </Button>
                    </div>
                  </form>

                  {comments.map((c: any, i: number) => (
                    <div key={i} className="bg-secondary/15 p-3.5 rounded-xl border border-border/30">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-semibold text-xs text-foreground">{c.authorName}</span>
                        <div className="flex items-center gap-2">
                          {c.rating && (
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
                      Soyez le premier à commenter !
                    </p>
                  )}
                </div>

                {/* Bottom safe padding for mobile */}
                <div className="h-[env(safe-area-inset-bottom)]" />
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-muted-foreground text-sm">Terrain introuvable</div>
          )}
        </div>
      </div>
    </>
  );
}
