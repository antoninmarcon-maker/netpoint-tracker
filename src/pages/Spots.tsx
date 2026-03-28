import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, List, Map as MapIcon, X, Locate } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SpotMap from '@/components/SpotMap';
import { filterSpots } from '@/lib/filterSpots';
import SpotListView from '@/components/spots/SpotListView';
import SpotDetailModal from '@/components/spots/SpotDetailModal';
import SpotFormModal from '@/components/spots/SpotFormModal';
import { DEFAULT_FILTERS, type SpotFiltersState } from '@/components/spots/SpotFilters';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { useAuth } from '@/contexts/AuthContext';

const MODERATOR_EMAILS = ['antonin.marcon@gmail.com', 'myvolley.testbot@gmail.com'];

export default function Spots() {
  const { t } = useTranslation();
  useDocumentMeta({ titleKey: 'meta.spotsTitle', descriptionKey: 'meta.spotsDesc', path: '/spots' });
  const navigate = useNavigate();
  const { requireAuth } = useAuth();
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [newSpotLocation, setNewSpotLocation] = useState<[number, number] | null>(null);
  const [showList, setShowList] = useState(false);
  const [listSort, setListSort] = useState<'distance' | 'type' | 'name'>('name');
  const [filters, setFilters] = useState<SpotFiltersState>(DEFAULT_FILTERS);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const [isModerator, setIsModerator] = useState(false);
  const [editSpot, setEditSpot] = useState<Tables<'spots_with_coords'> | null>(null);
  const [isSuggestion, setIsSuggestion] = useState(false);
  const [spotsForList, setSpotsForList] = useState<Tables<'spots_with_coords'>[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [recenterTrigger, setRecenterTrigger] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setIsModerator(MODERATOR_EMAILS.includes(data?.user?.email || ''));
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsModerator(MODERATOR_EMAILS.includes(session?.user?.email || ''));
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!showList) return;
    const cols = 'id, name, type, source, lat, lng, status, equip_sol, equip_eclairage, equip_acces_libre, equip_pmr, equip_saisonnier';

    if (filters.showPending) {
      // Fetch pending + reported spots
      Promise.all([
        supabase.from('spots_with_coords').select(cols).eq('status', 'waiting_for_validation'),
        supabase.from('spot_comments').select('spot_id').not('report_reason', 'is', null),
      ]).then(async ([pendingRes, reportedIdsRes]) => {
        let allSpots = pendingRes.data || [];
        const reportedIds = [...new Set((reportedIdsRes.data || []).map((r: any) => r.spot_id))];
        const pendingIds = new Set(allSpots.map(s => s.id));
        const missingIds = reportedIds.filter(id => !pendingIds.has(id));

        if (missingIds.length > 0) {
          const { data: reportedSpots } = await supabase.from('spots_with_coords').select(cols).in('id', missingIds);
          if (reportedSpots) allSpots = [...allSpots, ...reportedSpots];
        }
        setSpotsForList(filterSpots(allSpots, filters, userPosition));
      });
    } else {
      supabase.from('spots_with_coords').select(cols).eq('status', 'validated').then(({ data }) => {
        if (data) setSpotsForList(filterSpots(data, filters, userPosition));
      });
    }
  }, [filters, userPosition, refreshKey, showList]);

  const handleModerate = async (spotId: string, action: 'approve' | 'reject') => {
    const status = action === 'approve' ? 'validated' : 'rejected';
    const { error } = await supabase.from('spots').update({ status }).eq('id', spotId);
    if (error) { toast.error(t('spots.moderationError', 'Moderation error')); return; }
    toast.success(action === 'approve' ? t('spots.spotApproved', 'Court approved') : t('spots.spotRejected', 'Court rejected'));
    setSelectedSpotId(null);
    setRefreshKey(k => k + 1);
  };

  const handleDelete = async (spotId: string) => {
    // FK ON DELETE CASCADE handles comments & photos automatically
    const { error, count } = await supabase.from('spots').delete({ count: 'exact' }).eq('id', spotId);
    if (error) { toast.error(t('spots.deleteError', 'Erreur lors de la suppression')); return; }
    if (count === 0) { toast.error('Suppression refusée — vérifiez vos permissions'); return; }
    toast.success(t('spots.spotDeleted', 'Terrain supprimé'));
    setSelectedSpotId(null);
    setRefreshKey(k => k + 1);
  };

  const handleRefresh = () => setRefreshKey(k => k + 1);

  return (
    <div className="flex flex-col h-dvh bg-background overflow-hidden relative">
      {/* Full-bleed map */}
      <div className="absolute inset-0 z-0">
        <SpotMap
          selectedSpotId={selectedSpotId}
          onSelectSpot={setSelectedSpotId}
          isAddingMode={isAddingMode}
          newSpotLocation={newSpotLocation || undefined}
          onNewSpotLocationChange={setNewSpotLocation}
          filters={filters}
          onFiltersChange={setFilters}
          isModerator={isModerator}
          onUserPositionChange={setUserPosition}
          recenterTrigger={recenterTrigger}
          refreshTrigger={refreshKey}
          onLongPressAdd={(latlng) => {
            if (!requireAuth(t('spots.loginRequired'))) return;
            setSelectedSpotId(null);
            setNewSpotLocation(latlng);
            setIsAddingMode(true);
          }}
        />
      </div>

      {/* ── Top bar: back + search ── */}
      <div
        className="relative z-10 pointer-events-none"
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
      >
        <div className="px-3 py-2">
          <button
            onClick={() => navigate('/')}
            aria-label={t('common.back')}
            className="w-10 h-10 rounded-2xl glass-btn border border-border/50 shadow-lg flex items-center justify-center text-foreground transition-colors active:scale-95 pointer-events-auto"
          >
            <ArrowLeft size={18} />
          </button>
        </div>
      </div>

      {/* ── Bottom dock: recenter + list + add ── */}
      <div
        className={`absolute left-0 right-0 z-10 pointer-events-none transition-[bottom] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          showList ? 'bottom-[calc(50vh+0.75rem)] md:bottom-0' : 'bottom-0'
        }`}
        style={{
          paddingBottom: showList ? '0' : 'max(1.25rem, env(safe-area-inset-bottom))',
        }}
      >
        <div className="flex items-center justify-center gap-3 px-4 py-2 pointer-events-auto">
          {/* Recenter */}
          <button
            onClick={() => setRecenterTrigger(t => t + 1)}
            className="w-12 h-12 rounded-2xl glass-btn border border-border/50 shadow-lg flex items-center justify-center text-foreground transition-all active:scale-95"
            aria-label={t('common.myPosition')}
            title={t('common.myPosition')}
          >
            <Locate size={18} />
          </button>

          {/* List toggle */}
          <button
            onClick={() => setShowList(p => !p)}
            className={`h-12 rounded-2xl border shadow-lg flex items-center gap-2 px-5 font-semibold text-sm transition-all active:scale-95 ${
              showList
                ? 'bg-foreground text-background border-foreground'
                : 'glass-btn text-foreground border-border/50'
            }`}
          >
            {showList ? <><MapIcon size={16} /> Carte</> : <><List size={16} /> Liste</>}
          </button>

          {/* Add spot */}
          <button
            onClick={() => {
              if (isAddingMode) {
                setIsAddingMode(false);
                setNewSpotLocation(null);
              } else {
                if (!requireAuth(t('spots.loginRequired'))) return;
                setSelectedSpotId(null);
                setIsAddingMode(true);
              }
            }}
            className={`w-12 h-12 rounded-2xl border shadow-lg flex items-center justify-center transition-all active:scale-95 ${
              isAddingMode
                ? 'bg-destructive text-destructive-foreground border-destructive'
                : 'bg-accent/15 border-accent/25 text-accent hover:bg-accent/25'
            }`}
            aria-label={isAddingMode ? t('common.cancel') : t('common.addCourt')}
            title={isAddingMode ? t('common.cancel') : t('common.addCourt')}
          >
            {isAddingMode ? <X size={18} /> : <Plus size={18} />}
          </button>
        </div>
      </div>

      {/* ── List half-sheet (mobile: bottom 50vh, desktop: side panel) ── */}
      {showList && (
        <div className="absolute inset-x-0 bottom-0 z-20 h-[50vh] md:h-full md:inset-x-auto md:right-0 md:w-[380px] md:top-0 spot-list-enter">
          <SpotListView
            spots={spotsForList}
            selectedSpotId={selectedSpotId}
            onSelectSpot={(id) => { setSelectedSpotId(id); setShowList(false); }}
            userPosition={userPosition}
            sortBy={listSort}
            onSortChange={setListSort}
            onClose={() => setShowList(false)}
          />
        </div>
      )}

      {/* Detail modal */}
      <SpotDetailModal
        spotId={selectedSpotId}
        onClose={() => setSelectedSpotId(null)}
        onEdit={(spot) => { if (!requireAuth(t('spots.loginRequired'))) return; setEditSpot(spot); setIsSuggestion(true); }}
        isModerator={isModerator}
        onModerate={handleModerate}
        onDelete={handleDelete}
      />

      {/* Add form modal */}
      <SpotFormModal
        open={isAddingMode}
        onClose={() => { setIsAddingMode(false); setNewSpotLocation(null); }}
        onSuccess={handleRefresh}
        location={newSpotLocation}
        onLocationChange={setNewSpotLocation}
      />

      {/* Edit/suggest modal */}
      <SpotFormModal
        open={!!editSpot}
        onClose={() => { setEditSpot(null); setIsSuggestion(false); }}
        onSuccess={handleRefresh}
        spotToEdit={editSpot}
        isSuggestion={isSuggestion}
      />
    </div>
  );
}
