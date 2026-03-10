import { X, MapPin, Calendar, Info, MessageSquare, Plus, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
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
  onSpotAdded?: () => void;
}

export default function SpotSidebar({ 
  selectedSpotId, 
  onClose, 
  isAddingMode,
  onCloseAdding,
  newSpotLocation,
  onSpotAdded
}: SpotSidebarProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [spot, setSpot] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  useEffect(() => {
    setIsOpen(!!selectedSpotId || isAddingMode);
    
    if (selectedSpotId) {
      loadSpotDetails(selectedSpotId);
    } else {
      setSpot(null);
      setPhotos([]);
      setComments([]);
    }
  }, [selectedSpotId, isAddingMode]);

  const loadSpotDetails = async (id: string) => {
    setLoading(true);
    try {
      const { data: sData, error: sErr } = await (supabase as any).from('spots').select('*').eq('id', id).single();
      if (sErr) throw sErr;
      setSpot(sData);

      const { data: pData, error: pErr } = await (supabase as any).from('spot_photos').select('*').eq('spot_id', id).order('created_at', { ascending: false });
      if (pErr) throw pErr;
      setPhotos(pData || []);

      const { data: cData, error: cErr } = await (supabase as any).from('spot_comments').select(`
        *,
        profiles:user_id (display_name)
      `).eq('spot_id', id).order('created_at', { ascending: false });
      if (cErr) throw cErr;
      
      const mappedComments = (cData || []).map((c: any) => ({
        ...c,
        authorName: (c.profiles as any)?.display_name || t('spots.details')
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
    if (!newComment.trim() || !selectedSpotId) return;

    setPostingComment(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error(t('spots.loginRequired'));
        setPostingComment(false);
        return;
      }

      const { error } = await (supabase as any).from('spot_comments').insert([{
        spot_id: selectedSpotId,
        user_id: user.id,
        content: newComment.trim()
      }]);

      if (error) throw error;
      
      setNewComment('');
      loadSpotDetails(selectedSpotId);
      toast.success(t('spots.commentPosted'));
    } catch (err) {
      console.error(err);
      toast.error(t('spots.commentError'));
    } finally {
      setPostingComment(false);
    }
  };

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
              onCancel={handleClose}
              onSuccess={() => {
                handleClose();
                if (onSpotAdded) onSpotAdded();
              }}
            />
          ) : loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="animate-spin text-primary" />
            </div>
          ) : spot ? (
            <div className="space-y-6">
              <div className="inline-block px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold tracking-wide">
                {getTypeLabel(spot.type)}
              </div>

              {photos.length > 0 ? (
                <div className="flex overflow-x-auto snap-x hide-scrollbar gap-2 pb-2 -mx-4 px-4">
                  {photos.map((p: any, i: number) => (
                    <img key={i} src={p.photo_url} alt="Spot" className="w-64 h-48 object-cover rounded-xl shrink-0 snap-center border border-border" />
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
                    <p className="text-foreground leading-relaxed">{spot.description}</p>
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
              </div>

              <div className="h-px bg-border my-6" />

              <div className="space-y-4">
                <h3 className="font-bold flex items-center gap-2">
                  <MessageSquare size={16} /> {t('spots.comments')} ({comments.length})
                </h3>
                
                <form onSubmit={handlePostComment} className="flex gap-2">
                  <Input 
                    placeholder={t('spots.addComment')} 
                    value={newComment} 
                    onChange={e => setNewComment(e.target.value)}
                    className="flex-1 bg-secondary/50"
                  />
                  <Button type="submit" disabled={postingComment || !newComment.trim()}>
                    <Plus size={16} />
                  </Button>
                </form>

                <div className="space-y-3">
                  {comments.map((c: any, i: number) => (
                    <div key={i} className="bg-secondary/30 p-3 rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-xs text-foreground">{c.authorName}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-foreground/80">{c.content}</p>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className="text-xs text-center text-muted-foreground py-4">{t('spots.firstComment')}</p>
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
