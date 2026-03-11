import { X, MapPin, Calendar, Info, MessageSquare, Plus, Loader2, Star, Upload, CheckCircle2, Edit3, ExternalLink, Sparkles } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { checkAndIncrementRateLimit } from '@/lib/rateLimit';
import SpotForm from '@/components/SpotForm';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface SpotSidebarProps {
  selectedSpotId: string | null;
  onClose: () => void;
  isAddingMode: boolean;
  onCloseAdding: () => void;
  newSpotLocation?: [number, number] | null;
  onLocationChange?: (loc: [number, number]) => void;
  onSpotAdded?: () => void;
}

export default function SpotSidebar({ 
  selectedSpotId, 
  onClose, 
  isAddingMode,
  onCloseAdding,
  newSpotLocation,
  onLocationChange,
  onSpotAdded
}: SpotSidebarProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [spot, setSpot] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newRating, setNewRating] = useState<number>(0);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [postingComment, setPostingComment] = useState(false);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsOpen(!!selectedSpotId || isAddingMode);
    
    if (selectedSpotId) {
      loadSpotDetails(selectedSpotId);
      setIsEditingMode(false);
    } else {
      setSpot(null);
      setPhotos([]);
      setComments([]);
      setIsEditingMode(false);
    }
  }, [selectedSpotId, isAddingMode]);

  const loadSpotDetails = async (id: string) => {
    setLoading(true);
    try {
      const { data: sData, error: sErr } = await (supabase as any)
        .from('spots')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (sErr) throw sErr;
      if (!sData) {
        setSpot(null);
        setPhotos([]);
        setComments([]);
        toast.error("Ce terrain n'existe plus. Recharge la carte.");
        onClose();
        return;
      }
      setSpot(sData);

      const { data: pData, error: pErr } = await (supabase as any).from('spot_photos').select('*').eq('spot_id', id).order('created_at', { ascending: false });
      if (pErr) throw pErr;
      setPhotos(pData || []);

      const { data: cData, error: cErr } = await (supabase as any).from('spot_comments').select('*').eq('spot_id', id).order('created_at', { ascending: false });
      if (cErr) throw cErr;
      
      // Fetch display names for comment authors
      const userIds = [...new Set((cData || []).map((c: any) => c.user_id).filter(Boolean))];
      let profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await (supabase as any).from('profiles').select('user_id, display_name').in('user_id', userIds);
        (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p.display_name; });
      }
      
      const mappedComments = (cData || []).map((c: any) => ({
        ...c,
        authorName: profileMap[c.user_id] || 'Anonyme'
      }));
      setComments(mappedComments);

    } catch (err) {
      console.error(err);
      toast.error(t('spots.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSpotId) return;
    if (!newComment.trim() && newRating === 0 && newPhotos.length === 0) return;

    if (!checkAndIncrementRateLimit()) return;

    setPostingComment(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id || null;

      // Upload photos sequentially
      const uploadedUrls: string[] = [];
      for (const file of newPhotos) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId || 'anon'}-${crypto.randomUUID()}.${fileExt}`;
        const filePath = `${selectedSpotId}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('spot-photos')
          .upload(filePath, file);

        if (uploadError) {
          toast.error(`Erreur upload: ${file.name}`);
          continue; // Skip failed file
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('spot-photos')
          .getPublicUrl(filePath);
          
        uploadedUrls.push(publicUrl);
      }

      const { error } = await (supabase as any).from('spot_comments').insert([{
        spot_id: selectedSpotId,
        user_id: userId,
        content: newComment.trim(),
        rating: newRating > 0 ? newRating : null,
        photos: uploadedUrls.length > 0 ? uploadedUrls : null
      }]);

      if (error) throw error;
      
      setNewComment('');
      setNewRating(0);
      setNewPhotos([]);
      loadSpotDetails(selectedSpotId);
      toast.success(t('spots.commentPosted'));
    } catch (err) {
      console.error(err);
      toast.error(t('spots.commentError'));
    } finally {
      setPostingComment(false);
    }
  };

  const confirmSpot = async () => {
    if (!spot) return;
    if (!checkAndIncrementRateLimit()) return;

    try {      
      const { error } = await supabase.from('spots')
        .update({ status: 'validated' })
        .eq('id', spot.id);
        
      if (error) throw error;
      toast.success("Terrain confirmé ! Merci.");
      loadSpotDetails(spot.id);
      if (onSpotAdded) onSpotAdded(); // trigger map refresh
    } catch(err) {
      toast.error("Erreur, impossible de confirmer.");
    }
  };

  const generateAiSummary = async () => {
    if (!spot) return;
    setGeneratingSummary(true);
    try {
      const { data, error } = await supabase.functions.invoke('summarize-spot', {
        body: { spot_id: spot.id }
      });
      if (error) throw error;
      if (data?.error === 'no_comments') {
        toast.info(data.message || "Pas assez de commentaires pour générer un résumé.");
        return;
      }
      if (data?.summary) {
        toast.success("Résumé IA généré !");
        loadSpotDetails(spot.id);
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la génération du résumé IA.");
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (newPhotos.length + files.length > 5) {
        toast.error("Maximum 5 photos.");
        return;
      }
      setNewPhotos([...newPhotos, ...files]);
    }
  };

  const averageRating = comments.length > 0 
    ? (comments.reduce((acc, c) => acc + (c.rating || 0), 0) / comments.filter(c => c.rating).length) || 0
    : 0;

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'beach': return t('spots.typeLabelBeach');
      case 'outdoor_hard': return t('spots.typeLabelOutdoorHard');
      case 'outdoor_grass': return t('spots.typeLabelOutdoorGrass');
      case 'indoor': return t('spots.typeLabelIndoor');
      default: return t('spots.typeLabelDefault');
    }
  };

  const handleClose = () => {
    if (selectedSpotId) onClose();
    if (isAddingMode) onCloseAdding();
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/40 z-30 md:hidden transition-opacity"
        onClick={handleClose}
      />
      
      <div className={`
        fixed inset-x-0 bottom-0 md:relative md:inset-auto md:w-96 
        h-[80vh] md:h-full 
        bg-card border-t md:border-t-0 md:border-l border-border 
        z-40 shadow-2xl flex flex-col
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:translate-x-full'}
      `}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-bold text-lg">
            {isAddingMode ? t('spots.addSpotTitle') : spot ? spot.name : t('spots.details')}
          </h2>
          <button 
            onClick={handleClose}
            className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
          {isAddingMode ? (
            <SpotForm 
              location={newSpotLocation || null}
              onLocationChange={onLocationChange}
              onCancel={handleClose}
              onSuccess={() => {
                handleClose();
                if (onSpotAdded) onSpotAdded();
              }}
            />
          ) : isEditingMode && spot ? (
            <SpotForm 
              location={[spot.lat, spot.lng]}
              spotToEdit={spot}
              onCancel={() => setIsEditingMode(false)}
              onSuccess={() => {
                setIsEditingMode(false);
                loadSpotDetails(spot.id);
                if (onSpotAdded) onSpotAdded();
              }}
            />
          ) : loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="animate-spin text-primary" />
            </div>
          ) : spot ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="inline-block px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold tracking-wide">
                  {getTypeLabel(spot.type)}
                </div>
                {averageRating > 0 && (
                  <div className="flex items-center gap-1 text-yellow-500 font-bold">
                    <Star size={18} fill="currentColor" />
                    <span>{averageRating.toFixed(1)}/5</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button onClick={() => setIsEditingMode(true)} variant="outline" className="flex-1 text-xs h-9">
                  <Edit3 size={14} className="mr-2" /> Modifier
                </Button>
                
                {spot.status === 'waiting_for_validation' && (
                  <Button onClick={confirmSpot} variant="secondary" className="flex-1 text-xs h-9 bg-primary/10 text-primary hover:bg-primary/20">
                    <CheckCircle2 size={14} className="mr-2" /> Confirmer
                  </Button>
                )}
              </div>

              {photos.length > 0 ? (
                <div className="flex overflow-x-auto snap-x hide-scrollbar gap-2 pb-2 -mx-4 px-4">
                  {photos.map((p: any, i: number) => (
                    <div key={i} className="relative shrink-0 snap-center">
                      <img src={p.photo_url} alt="Spot" className={`w-64 h-48 object-cover rounded-xl border border-border transition-all ${spot.status === 'waiting_for_validation' ? 'grayscale opacity-60' : ''}`} />
                      {spot.status === 'waiting_for_validation' && (
                        <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] uppercase font-bold px-2 py-1 rounded-md backdrop-blur-sm">
                          À valider
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-32 bg-secondary/30 rounded-xl border border-dashed border-border flex items-center justify-center text-muted-foreground text-sm">
                  {t('spots.noPhotos')}
                </div>
              )}

              <div className="space-y-4">
                {spot.description && (
                  <div className="flex items-start gap-3 text-sm">
                    <Info size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-foreground leading-relaxed">
                      {spot.status === 'waiting_for_validation' && (
                        <span className="inline-flex items-center text-primary/90 font-semibold mr-2 bg-primary/10 px-1.5 py-0.5 rounded text-xs gap-1">
                          ✨ Résumé IA
                        </span>
                      )}
                      {spot.description}
                    </p>
                  </div>
                )}
                
                {spot.availability_period && (
                  <div className="flex items-start gap-3 text-sm">
                    <Calendar size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-foreground">
                      <span className="font-semibold text-muted-foreground mr-1">{t('spots.availabilityLabel')} :</span> 
                      {spot.availability_period}
                    </p>
                  </div>
                )}

                {spot.lat && spot.lng && (
                  <a 
                    href={`https://www.google.com/maps?q=${spot.lat},${spot.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm text-primary hover:underline"
                  >
                    <MapPin size={16} className="shrink-0" />
                    <span className="font-medium">Ouvrir dans Google Maps</span>
                    <ExternalLink size={12} className="shrink-0" />
                  </a>
                )}
              </div>

              {comments.length > 0 && (
                <Button 
                  onClick={generateAiSummary} 
                  disabled={generatingSummary}
                  variant="outline"
                  className="w-full text-xs h-9 gap-2"
                >
                  {generatingSummary ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Sparkles size={14} />
                  )}
                  {generatingSummary ? 'Génération en cours...' : 'Générer un résumé IA des avis'}
                </Button>
              )}

              <div className="h-px bg-border my-6" />

              <div className="space-y-4">
                <h3 className="font-bold flex items-center gap-2">
                  <MessageSquare size={16} /> {t('spots.comments')} ({comments.length})
                </h3>
                
                <form onSubmit={handlePostComment} className="flex flex-col gap-3 bg-secondary/20 p-4 rounded-xl border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-muted-foreground mr-2">Note :</span>
                    {[1,2,3,4,5].map(star => (
                      <button key={star} type="button" onClick={() => setNewRating(star)} className="focus:outline-none">
                        <Star size={20} className={star <= newRating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"} />
                      </button>
                    ))}
                  </div>
                  <Input 
                    placeholder={t('spots.addComment')} 
                    value={newComment} 
                    onChange={e => setNewComment(e.target.value)}
                    className="flex-1 bg-background"
                  />
                  <div className="flex items-center justify-between">
                     <div className="flex gap-2 items-center">
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept="image/*" className="hidden" />
                        <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                          <Upload size={14} className="mr-2"/> Photos ({newPhotos.length}/5)
                        </Button>
                     </div>
                    <Button type="submit" disabled={postingComment || (!newComment.trim() && newRating === 0 && newPhotos.length === 0)}>
                      <Plus size={16} className="mr-2" /> Envoyer
                    </Button>
                  </div>
                </form>

                <div className="space-y-4 mt-6">
                  {comments.map((c: any, i: number) => (
                    <div key={i} className="bg-secondary/30 p-4 rounded-xl border border-border/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm text-foreground">{c.authorName}</span>
                        <div className="flex items-center gap-2">
                           {c.rating && (
                              <div className="flex items-center text-yellow-500">
                                <Star size={12} fill="currentColor" className="mr-1"/>
                                <span className="text-xs font-bold">{c.rating}</span>
                              </div>
                           )}
                           <span className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {c.content && <p className="text-sm text-foreground/80 leading-relaxed">{c.content}</p>}
                      {c.photos && c.photos.length > 0 && (
                        <div className="flex overflow-x-auto gap-2 mt-3 snap-x hide-scrollbar pb-1">
                          {c.photos.map((url: string, idx: number) => (
                             <img key={idx} src={url} alt="Avis" className="w-20 h-20 object-cover rounded-lg shrink-0 snap-center" />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className="text-sm text-center text-muted-foreground py-6 bg-secondary/10 rounded-xl border border-dashed border-border">{t('spots.firstComment')}</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-center text-muted-foreground py-8">
              {t('spots.loadDataError')}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
