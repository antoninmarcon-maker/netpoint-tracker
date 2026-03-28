import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function useSpotDetail(spotId: string | null) {
  const { t } = useTranslation();
  const [spot, setSpot] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);

  const loadSpotDetails = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const { data: sData, error: sErr } = await (supabase as any).from('spots').select('*').eq('id', id).maybeSingle();
      if (sErr) throw sErr;
      if (!sData) { toast.error("Ce terrain n'existe plus."); return null; }
      setSpot(sData);

      const { data: pData } = await (supabase as any).from('spot_photos').select('*').eq('spot_id', id).order('created_at', { ascending: false });
      setPhotos(pData || []);

      const { data: cData } = await (supabase as any).from('spot_comments').select('*').eq('spot_id', id).order('created_at', { ascending: false });
      const userIds: string[] = [...new Set<string>((cData || []).map((c: any) => c.user_id).filter(Boolean))];
      let profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await (supabase as any).from('profiles').select('user_id, display_name').in('user_id', userIds);
        (profiles || []).forEach((p: any) => {
          if (p.user_id) profileMap[p.user_id] = p.display_name || '';
        });
        const missingIds = userIds.filter(uid => !profileMap[uid]);
        if (missingIds.length > 0) {
          const { data: session } = await supabase.auth.getUser();
          if (session?.user && missingIds.includes(session.user.id)) {
            profileMap[session.user.id] = session.user.email?.split('@')[0] || '';
          }
        }
      }
      setComments((cData || []).map((c: any) => ({ ...c, authorName: profileMap[c.user_id] || 'Anonyme' })));
      return sData;
    } catch (err) {
      console.error(err);
      toast.error(t('spots.loadError'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [t]);

  const checkFavorite = useCallback((id: string) => {
    try {
      const favs = JSON.parse(localStorage.getItem('spot_favorites') || '[]');
      setIsFavorite(favs.includes(id));
    } catch { setIsFavorite(false); }
  }, []);

  const toggleFavorite = useCallback(() => {
    if (!spotId) return;
    const favs: string[] = JSON.parse(localStorage.getItem('spot_favorites') || '[]');
    const next = isFavorite ? favs.filter(f => f !== spotId) : [...favs, spotId];
    localStorage.setItem('spot_favorites', JSON.stringify(next));
    setIsFavorite(!isFavorite);
    toast.success(isFavorite ? t('spots.removedFromFavorites', 'Removed from favorites') : t('spots.addedToFavorites', 'Added to favorites'));
  }, [spotId, isFavorite, t]);

  useEffect(() => {
    if (spotId) {
      loadSpotDetails(spotId);
      checkFavorite(spotId);
    } else {
      setSpot(null);
    }
  }, [spotId, loadSpotDetails, checkFavorite]);

  const refresh = useCallback(() => {
    if (spotId) loadSpotDetails(spotId);
  }, [spotId, loadSpotDetails]);

  return { spot, loading, photos, comments, isFavorite, toggleFavorite, refresh };
}
