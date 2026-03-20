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

const MODERATOR_EMAIL = 'antonin.marcon@gmail.com';

export default function Spots() {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
      setIsModerator(data?.user?.email === MODERATOR_EMAIL);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsModerator(session?.user?.email === MODERATOR_EMAIL);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!showList) return;
    const query = supabase.from('spots_with_coords')
      .select('id, name, type, source, lat, lng, status, equip_sol, equip_eclairage, equip_acces_libre, equip_pmr, equip_saisonnier');
    if (!filters.showPending) query.eq('status', 'validated');
    query.then(({ data }) => {
      if (data) setSpotsForList(filterSpots(data, filters, userPosition));
    });
  }, [filters, userPosition, refreshKey, showList]);

  const handleModerate = async (spotId: string, action: 'approve' | 'reject') => {
    const status = action === 'approve' ? 'validated' : 'rejected';
    const { error } = await supabase.from('spots').update({ status }).eq('id', spotId);
    if (error) { toast.error(t('spots.moderationError', 'Moderation error')); return; }
    toast.success(action === 'approve' ? t('spots.spotApproved', 'Court approved') : t('spots.spotRejected', 'Court rejected'));
    setSelectedSpotId(null);
    setRefreshKey(k => k + 1);
  };

  const handleRefresh = () => setRefreshKey(k => k + 1);

  return (
    <div className="flex flex-col h-dvh bg-background overflow-hidden relative">
      {/* Full-bleed map */}
      <div className="absolute inset-0 z-0">
        <SpotMap
          key={refreshKey}
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
        />
      </div>

      {/* ── Top bar: back + search ── */}
      <div
        className="relative z-10 pointer-events-none"
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-2 px-3 py-2 pointer-events-auto">
          <button
            onClick={() => navigate('/')}
            className="w-10 h-10 rounded-2xl bg-[rgba(9,9,11,0.85)] backdrop-blur-xl border border-border/50 shadow-lg flex items-center justify-center text-foreground hover:bg-[rgba(9,9,11,0.95)] transition-colors active:scale-95 flex-none"
          >
            <ArrowLeft size={18} />
          </button>

          {/* Search is rendered inside SpotMap (needs useMap), this is just a visual placeholder label when not searching */}
          <div className="flex-1" />
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
            className="w-12 h-12 rounded-2xl bg-[rgba(9,9,11,0.85)] backdrop-blur-xl border border-border/50 shadow-lg flex items-center justify-center text-foreground hover:bg-[rgba(9,9,11,0.95)] transition-all active:scale-95"
            title="Ma position"
          >
            <Locate size={18} />
          </button>

          {/* List toggle */}
          <button
            onClick={() => setShowList(p => !p)}
            className={`h-12 rounded-2xl border shadow-lg flex items-center gap-2 px-5 font-semibold text-sm transition-all active:scale-95 ${
              showList
                ? 'bg-foreground text-background border-foreground'
                : 'bg-[rgba(9,9,11,0.85)] backdrop-blur-xl text-foreground border-border/50 hover:bg-[rgba(9,9,11,0.95)]'
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
                setSelectedSpotId(null);
                setIsAddingMode(true);
              }
            }}
            className={`w-12 h-12 rounded-2xl border shadow-lg flex items-center justify-center transition-all active:scale-95 ${
              isAddingMode
                ? 'bg-destructive text-destructive-foreground border-destructive'
                : 'bg-accent/15 border-accent/25 text-accent hover:bg-accent/25'
            }`}
            title="Ajouter un terrain"
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
        onEdit={(spot) => { setEditSpot(spot); setIsSuggestion(true); }}
        isModerator={isModerator}
        onModerate={handleModerate}
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
