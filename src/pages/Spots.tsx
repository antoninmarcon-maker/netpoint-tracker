import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, List, Map as MapIcon, X } from 'lucide-react';
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

const MODERATOR_EMAIL = 'antonin.marcon@gmail.com';

export default function Spots() {
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

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email === MODERATOR_EMAIL) setIsModerator(true);
    });
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
    if (error) { toast.error("Erreur modération"); return; }
    toast.success(action === 'approve' ? 'Terrain validé' : 'Terrain rejeté');
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
        />
      </div>

      {/* Floating top bar */}
      <div className="relative z-10 pointer-events-none" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center justify-between px-3 py-2">
          {/* Back button */}
          <button
            onClick={() => navigate('/')}
            className="pointer-events-auto w-10 h-10 rounded-full bg-background/90 backdrop-blur-md border border-border/50 shadow-lg flex items-center justify-center text-foreground hover:bg-background transition-colors active:scale-95"
          >
            <ArrowLeft size={18} />
          </button>

          {/* Title pill */}
          <div className="pointer-events-none">
            <h1 className="text-sm font-black text-foreground bg-background/90 backdrop-blur-md border border-border/50 shadow-lg px-4 py-2 rounded-full">
              Où jouer ?
            </h1>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={() => setShowList(p => !p)}
              className={`w-10 h-10 rounded-full border shadow-lg flex items-center justify-center transition-all active:scale-95 ${
                showList
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-background/90 backdrop-blur-md text-foreground border-border/50 hover:bg-background'
              }`}
              title={showList ? 'Carte seule' : 'Vue liste'}
            >
              {showList ? <MapIcon size={16} /> : <List size={16} />}
            </button>

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
              className={`w-10 h-10 rounded-full border shadow-lg flex items-center justify-center transition-all active:scale-95 ${
                isAddingMode
                  ? 'bg-destructive text-destructive-foreground border-destructive'
                  : 'bg-primary text-primary-foreground border-primary hover:opacity-90'
              }`}
              title="Ajouter un terrain"
            >
              {isAddingMode ? <X size={16} /> : <Plus size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* List overlay — slides from bottom on mobile, side panel on desktop */}
      {showList && (
        <div className="absolute inset-x-0 bottom-0 top-0 z-20 md:left-auto md:w-[380px] md:top-0 animate-slide-in-right">
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
