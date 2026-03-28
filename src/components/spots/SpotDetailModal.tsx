import { useState, useRef } from 'react';
import { X, MapPin, Star, Edit3, Navigation, Heart, Flag, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { getTypeLabel, calcAverageRating } from '@/lib/spotTypes';
import { useSpotDetail } from '@/hooks/useSpotDetail';
import SpotPhotos from './SpotPhotos';
import SpotInfo from './SpotInfo';
import SpotComments from './SpotComments';
import NavigationPicker from './NavigationPicker';

interface SpotDetailModalProps {
  spotId: string | null;
  onClose: () => void;
  onEdit: (spot: any) => void;
  isModerator?: boolean;
  onModerate?: (spotId: string, action: 'approve' | 'reject') => void;
  onDelete?: (spotId: string) => void;
}

const PLACEHOLDER_GRADIENTS: Record<string, string> = {
  beach: 'from-yellow-500/10 via-amber-500/10 to-orange-500/5',
  club: 'from-blue-600/10 via-blue-500/10 to-indigo-500/5',
  outdoor_hard: 'from-green-500/10 via-emerald-500/10 to-green-400/5',
  outdoor_grass: 'from-green-400/10 via-lime-500/10 to-green-300/5',
  green_volley: 'from-green-600/10 via-emerald-600/10 to-green-500/5',
};

export default function SpotDetailModal({ spotId, onClose, onEdit, isModerator, onModerate, onDelete }: SpotDetailModalProps) {
  const { t } = useTranslation();
  const { spot, loading, photos, comments, isFavorite, toggleFavorite, refresh } = useSpotDetail(spotId);
  const [reportMode, setReportMode] = useState(false);
  const [showNavPicker, setShowNavPicker] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

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
    if (dragOffset > 120) onClose();
    setDragOffset(0);
    dragStartY.current = null;
  };

  const averageRating = calcAverageRating(comments);
  const placeholderGradient = spot ? (PLACEHOLDER_GRADIENTS[spot.type] || 'from-primary/10 via-secondary/20 to-primary/5') : 'from-primary/10 via-secondary/20 to-primary/5';

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
        <div className="glass-overlay rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border-t border-border/40">
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
              <SpotPhotos photos={photos} placeholderGradient={placeholderGradient} />

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

                {/* Spot details: address, equipment, seasonality, social, club, description */}
                <SpotInfo spot={spot} />

                {/* Navigation buttons */}
                {spot.lat && spot.lng && (
                  <div className="flex gap-2">
                    <a
                      href={spot.google_maps_url
                        || (spot.google_place_id
                          ? `https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${spot.google_place_id}`
                          : `https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 text-xs font-semibold text-primary bg-primary/8 hover:bg-primary/15 rounded-xl py-3 transition-colors active:scale-[0.98]"
                    >
                      <MapPin size={14} /> Google Maps
                    </a>
                    <button
                      onClick={() => setShowNavPicker(true)}
                      className="flex-1 flex items-center justify-center gap-2 text-xs font-semibold text-primary bg-primary/8 hover:bg-primary/15 rounded-xl py-3 transition-colors active:scale-[0.98]"
                    >
                      <Navigation size={14} /> Itin{"\u00e9"}raire
                    </button>
                  </div>
                )}

                {/* Actions row */}
                <div className="flex gap-2">
                  <Button onClick={() => onEdit(spot)} variant="outline" className="flex-1 text-xs h-10 rounded-[10px]">
                    <Edit3 size={14} className="mr-1.5" /> {t('spots.suggestEdit', 'Modifier')}
                  </Button>
                  <Button
                    onClick={() => { setReportMode(r => !r); }}
                    variant="outline"
                    className={`text-xs h-10 rounded-[10px] px-3 ${reportMode ? 'border-red-500/50 text-red-500' : ''}`}
                  >
                    <Flag size={14} />
                  </Button>
                </div>

                {/* Moderator actions */}
                {isModerator && (
                  <div className="flex gap-2 p-3 bg-yellow-500/8 border border-yellow-500/15 rounded-xl">
                    {spot.status !== 'validated' && (
                      <Button onClick={() => onModerate?.(spot.id, 'approve')} className="flex-1 text-xs h-9 bg-green-600 hover:bg-green-700 rounded-lg">
                        Valider
                      </Button>
                    )}
                    {spot.status !== 'validated' && (
                      <Button onClick={() => onModerate?.(spot.id, 'reject')} variant="destructive" className="flex-1 text-xs h-9 rounded-lg">
                        Rejeter
                      </Button>
                    )}
                    <Button
                      onClick={() => { if (confirm('Supprimer d\u00e9finitivement ce terrain ?')) onDelete?.(spot.id); }}
                      variant="destructive"
                      className="flex-1 text-xs h-9 rounded-lg gap-1.5"
                    >
                      <Trash2 size={13} /> Supprimer
                    </Button>
                  </div>
                )}

                {/* Comments section */}
                <SpotComments
                  spotId={spotId}
                  comments={comments}
                  reportMode={reportMode}
                  onReportModeChange={setReportMode}
                  onRefresh={refresh}
                  isModerator={isModerator}
                />

                {/* Bottom safe padding for mobile */}
                <div className="h-[env(safe-area-inset-bottom)]" />
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-muted-foreground text-sm">Terrain introuvable</div>
          )}
        </div>
      </div>

      {/* Navigation app picker */}
      {showNavPicker && spot?.lat && spot?.lng && (
        <NavigationPicker
          lat={spot.lat}
          lng={spot.lng}
          address={spot.address}
          onClose={() => setShowNavPicker(false)}
        />
      )}
    </>
  );
}
