import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, List, Map as MapIcon } from 'lucide-react';
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

  // Check moderator status
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email === MODERATOR_EMAIL) setIsModerator(true);
    });
  }, []);

  // Load spots for list view (only when list is visible)
  useEffect(() => {
    if (!showList) return;
    const query = supabase.from('spots_with_coords')
      .select('id, name, type, source, lat, lng, status, equip_sol, equip_eclairage, equip_acces_libre, equip_pmr, equip_saisonnier');
    if (!filters.showPending) query.eq('status', 'validated');
    query.then(({ data }) => {
      if (data) {
        const filtered = filterSpots(data, filters, userPosition);
        setSpotsForList(filtered);
      }
    });
  }, [filters, userPosition, refreshKey, showList]);

  const handleModerate = async (spotId: string, action: 'approve' | 'reject') => {
    const status = action === 'approve' ? 'validated' : 'rejected';
    const { error } = await supabase.from('spots').update({ status }).eq('id', spotId);
    if (error) { toast.error("Erreur modération"); return; }
    toast.success(action === 'approve' ? '✅ Terrain validé' : '❌ Terrain rejeté');
    setSelectedSpotId(null);
    setRefreshKey(k => k + 1);
  };

  const handleRefresh = () => setRefreshKey(k => k + 1);

  return (
    <div className="flex flex-col h-dvh bg-background overflow-hidden relative">
      {/* Header */}
      <header className="flex-none bg-background/80 backdrop-blur-md border-b border-border z-20" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate('/')} className="p-2 rounded-full bg-secondary hover:bg-secondary/80 text-foreground transition-colors">
            <ArrowLeft size={18} />
          </button>

          <h1 className="text-lg font-black text-foreground">📍 Où jouer ?</h1>

          <div className="flex items-center gap-2">
            {/* Toggle list / map */}
            <button
              onClick={() => setShowList(p => !p)}
              className={`p-2 rounded-full transition-colors ${showList ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-secondary/80'}`}
              title={showList ? 'Carte seule' : 'Vue liste'}
            >
              {showList ? <MapIcon size={18} /> : <List size={18} />}
            </button>

            <button
              onClick={() => { setSelectedSpotId(null); setIsAddingMode(true); }}
              className={`p-2 rounded-full transition-colors shadow-lg ${isAddingMode ? 'bg-secondary text-foreground' : 'bg-primary text-primary-foreground hover:opacity-90'}`}
              title="Ajouter un terrain"
            >
              <Plus size={18} className={isAddingMode ? "rotate-45" : ""} />
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 relative flex overflow-hidden">
        {/* Map always rendered */}
        <div className={`${showList ? 'hidden md:block md:flex-1' : 'flex-1'} h-full z-0 relative`}>
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

        {/* List view */}
        {showList && (
          <div className={`${showList ? 'flex-1 md:w-96 md:flex-none' : 'hidden'} h-full`}>
            <SpotListView
              spots={spotsForList}
              selectedSpotId={selectedSpotId}
              onSelectSpot={setSelectedSpotId}
              userPosition={userPosition}
              sortBy={listSort}
              onSortChange={setListSort}
            />
          </div>
        )}
      </div>

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
