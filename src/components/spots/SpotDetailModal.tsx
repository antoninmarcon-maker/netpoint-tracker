import { useEffect, useState, useRef } from 'react';
import { X, MapPin, Calendar, Info, MessageSquare, Plus, Loader2, Star, Upload, Edit3, ExternalLink, Sparkles, Navigation, Zap, Phone, Globe, Leaf, Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
      toast.error("Erreur chargement");
    } finally {
      setLoading(false);
    }
  };

  const checkFavorite = async (id: string) => {
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
    toast.success(isFavorite ? 'Retiré des favoris' : 'Ajouté aux favoris ❤️');
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spotId || (!newComment.trim() && newRating === 0 && newPhotos.length === 0)) return;
    if (!checkAndIncrementRateLimit()) return;
    setPostingComment(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) { toast.error("Connectez-vous pour commenter."); return; }

      const uploadedUrls = (await Promise.all(newPhotos.map(f => uploadSpotPhoto(spotId!, f, userId)))).filter(Boolean) as string[];

      await (supabase as any).from('spot_comments').insert([{
        spot_id: spotId, user_id: userId, content: newComment.trim(),
        rating: newRating > 0 ? newRating : null, photos: uploadedUrls.length > 0 ? uploadedUrls : null,
      }]);
      setNewComment(''); setNewRating(0); setNewPhotos([]);
      loadSpotDetails(spotId);
      toast.success("Commentaire publié");
    } catch (err) { console.error(err); toast.error("Erreur commentaire"); }
    finally { setPostingComment(false); }
  };

  const generateAiSummary = async () => {
    if (!spot) return;
    setGeneratingSummary(true);
    try {
      const { data, error } = await supabase.functions.invoke('summarize-spot', { body: { spot_id: spot.id } });
      if (error) throw error;
      if (data?.error === 'no_comments') { toast.info("Pas assez de commentaires."); return; }
      if (data?.summary) { toast.success("Résumé IA généré !"); loadSpotDetails(spot.id); }
    } catch { toast.error("Erreur résumé IA."); }
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
    <Dialog open={!!spotId} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto p-0">
        {loading ? (
          <div className="flex items-center justify-center p-12"><Loader2 className="animate-spin text-primary" size={28} /></div>
        ) : spot ? (
          <div className="flex flex-col">
            {/* Header with photo or placeholder */}
            {photos.length > 0 ? (
              <div className="flex overflow-x-auto snap-x hide-scrollbar gap-0">
                {photos.map((p: any, i: number) => (
                  <img key={i} src={p.photo_url} alt="Spot" className="w-full h-48 object-cover shrink-0 snap-center" />
                ))}
              </div>
            ) : (
              <div className="h-32 bg-gradient-to-br from-primary/20 to-secondary/30 flex items-center justify-center">
                <MapPin size={32} className="text-muted-foreground/40" />
              </div>
            )}

            <div className="p-5 space-y-5">
              {/* Title + type + favorite */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-foreground leading-tight">{spot.name}</h2>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-primary/15 text-primary text-[11px] font-bold">
                    {getTypeLabel(spot.type)}
                  </span>
                  {spot.status === 'waiting_for_validation' && (
                    <span className="inline-block mt-1 ml-2 px-2.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 text-[11px] font-bold">
                      ⏳ En attente
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {averageRating > 0 && (
                    <div className="flex items-center gap-1 text-yellow-500 font-bold text-sm">
                      <Star size={16} fill="currentColor" />
                      {averageRating.toFixed(1)}
                    </div>
                  )}
                  <button onClick={toggleFavorite} className="p-2 rounded-full hover:bg-secondary transition-colors">
                    <Heart size={20} className={isFavorite ? 'text-red-500 fill-red-500' : 'text-muted-foreground'} />
                  </button>
                </div>
              </div>

              {/* Address */}
              {spot.address && (
                <div className="flex items-start gap-2.5 text-sm">
                  <MapPin size={15} className="text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-foreground/80">{spot.address}</p>
                </div>
              )}

              {/* Equipment badges */}
              <div className="flex flex-wrap gap-1.5">
                {spot.equip_acces_libre && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 text-[11px] font-semibold border border-green-500/20">🔓 Libre accès</span>
                )}
                {spot.equip_eclairage && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 text-[11px] font-semibold border border-yellow-500/20"><Zap size={10} /> Éclairé</span>
                )}
                {spot.equip_pmr && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[11px] font-semibold border border-blue-500/20">♿ PMR</span>
                )}
                {spot.equip_sol && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-foreground text-[11px] font-semibold border border-border"><Leaf size={10} /> {spot.equip_sol}</span>
                )}
              </div>

              {/* Seasonality visual */}
              {(() => {
                const season = parseSeasonality(spot.availability_period, spot.equip_saisonnier);
                if (!season) return null;
                if (season.type === 'yearly') {
                  return (
                    <div className="flex items-center gap-2 text-sm bg-green-500/10 border border-green-500/20 rounded-lg p-2.5">
                      <Calendar size={15} className="text-green-600 dark:text-green-400 shrink-0" />
                      <span className="font-semibold text-green-600 dark:text-green-400">Disponible toute l'année</span>
                    </div>
                  );
                }
                return (
                  <div className="bg-secondary/30 border border-border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar size={14} className="text-muted-foreground" />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Saisonnier</span>
                    </div>
                    <div className="flex gap-0.5">
                      {MONTHS_SHORT.map((m, i) => {
                        const isActive = season.start != null && season.end != null
                          ? (season.start <= season.end
                            ? i >= season.start && i <= season.end
                            : i >= season.start || i <= season.end)
                          : false;
                        return (
                          <div key={m} className="flex-1 flex flex-col items-center gap-1">
                            <div className={`w-full h-3 rounded-sm transition-colors ${isActive ? 'bg-primary' : 'bg-secondary'}`} />
                            <span className={`text-[8px] ${isActive ? 'text-primary font-bold' : 'text-muted-foreground/50'}`}>{m}</span>
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
                <p className="text-sm text-foreground/80 leading-relaxed">{spot.description}</p>
              )}

              {/* Navigation links */}
              {spot.lat && spot.lng && (
                <div className="flex gap-2">
                  <a href={`https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`} target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg py-2.5 transition-colors">
                    <MapPin size={14} /> Google Maps
                  </a>
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`} target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg py-2.5 transition-colors">
                    <Navigation size={14} /> Itinéraire
                  </a>
                </div>
              )}

              {/* Actions: Edit + Suggest modification */}
              <div className="flex gap-2">
                <Button onClick={() => onEdit(spot)} variant="outline" className="flex-1 text-xs h-9">
                  <Edit3 size={14} className="mr-1.5" /> Suggérer une modification
                </Button>
              </div>

              {/* Moderator actions */}
              {isModerator && spot.status !== 'validated' && (
                <div className="flex gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <Button onClick={() => onModerate?.(spot.id, 'approve')} className="flex-1 text-xs h-9 bg-green-600 hover:bg-green-700">
                    ✅ Valider
                  </Button>
                  <Button onClick={() => onModerate?.(spot.id, 'reject')} variant="destructive" className="flex-1 text-xs h-9">
                    ❌ Rejeter
                  </Button>
                </div>
              )}

              {/* AI summary */}
              {comments.length > 0 && (
                <Button onClick={generateAiSummary} disabled={generatingSummary} variant="outline" className="w-full text-xs h-9 gap-2">
                  {generatingSummary ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {generatingSummary ? 'Génération...' : 'Résumé IA des avis'}
                </Button>
              )}

              {/* Comments section */}
              <div className="border-t border-border pt-5 space-y-4">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <MessageSquare size={15} /> Commentaires ({comments.length})
                </h3>

                <form onSubmit={handlePostComment} className="flex flex-col gap-2.5 bg-secondary/20 p-3 rounded-xl border border-border">
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(star => (
                      <button key={star} type="button" onClick={() => setNewRating(star)}>
                        <Star size={18} className={star <= newRating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"} />
                      </button>
                    ))}
                  </div>
                  <Input placeholder="Votre avis..." value={newComment} onChange={e => setNewComment(e.target.value)} className="bg-background text-sm" />
                  <div className="flex items-center justify-between">
                    <div>
                      <input type="file" ref={fileInputRef} onChange={e => {
                        if (e.target.files) {
                          const files = Array.from(e.target.files);
                          if (newPhotos.length + files.length > 5) { toast.error("Max 5 photos"); return; }
                          setNewPhotos([...newPhotos, ...files]);
                        }
                      }} multiple accept="image/*" className="hidden" />
                      <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="text-[10px]">
                        <Upload size={12} className="mr-1" /> Photos ({newPhotos.length}/5)
                      </Button>
                    </div>
                    <Button type="submit" size="sm" disabled={postingComment || (!newComment.trim() && newRating === 0 && newPhotos.length === 0)}>
                      Envoyer
                    </Button>
                  </div>
                </form>

                {comments.map((c: any, i: number) => (
                  <div key={i} className="bg-secondary/30 p-3 rounded-xl border border-border/50">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-xs">{c.authorName}</span>
                      <div className="flex items-center gap-2">
                        {c.rating && <div className="flex items-center text-yellow-500"><Star size={10} fill="currentColor" className="mr-0.5" /><span className="text-[10px] font-bold">{c.rating}</span></div>}
                        <span className="text-[9px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {c.content && <p className="text-xs text-foreground/80">{c.content}</p>}
                  </div>
                ))}

                {comments.length === 0 && (
                  <p className="text-xs text-center text-muted-foreground py-6 bg-secondary/10 rounded-xl border border-dashed border-border">
                    Soyez le premier à commenter !
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground text-sm">Terrain introuvable</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
