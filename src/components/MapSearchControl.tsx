import { useState } from 'react';
import { useMap } from 'react-leaflet';
import { Input } from '@/components/ui/input';
import { Loader2, Search, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface MapSearchControlProps {
  isAddingMode?: boolean;
  onLocationSelected?: (latlng: [number, number]) => void;
}

export default function MapSearchControl({ isAddingMode, onLocationSelected }: MapSearchControlProps) {
  const { t } = useTranslation();
  const map = useMap();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&countrycodes=fr,ch,be,ca`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error(err);
      toast.error(t('spots.searchError') || "Erreur de recherche");
    } finally {
      setSearching(false);
    }
  };

  const handleSelectResult = (result: any) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);

    map.flyTo([lat, lon], 15, { animate: true, duration: 1.5 });

    if (isAddingMode && onLocationSelected) {
      onLocationSelected([lat, lon]);
    }

    setSearchResults([]);
    setSearchQuery('');
  };

  return (
    <div className="absolute top-[4.5rem] left-3 right-3 z-[400] pointer-events-auto">
      <form
        onSubmit={handleSearch}
        className="flex bg-background/95 backdrop-blur-md border border-border/50 rounded-full overflow-hidden shadow-lg transition-all focus-within:shadow-xl focus-within:border-primary/30"
      >
        <div className="flex items-center pl-3.5">
          <Search size={15} className="text-muted-foreground/60" />
        </div>
        <input
          placeholder={t('spots.searchMap', 'Rechercher un lieu...')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent border-0 outline-none px-2.5 h-10 text-sm text-foreground placeholder:text-muted-foreground/50"
        />
        {searching && (
          <div className="flex items-center pr-3">
            <Loader2 size={14} className="animate-spin text-muted-foreground" />
          </div>
        )}
      </form>

      {searchResults.length > 0 && (
        <div className="mt-1.5 bg-background/95 backdrop-blur-xl border border-border/50 shadow-2xl rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
          {searchResults.map((res, i) => (
            <button
              key={i}
              type="button"
              className="w-full text-left px-4 py-3 border-b border-border/30 last:border-0 hover:bg-secondary/60 transition-colors flex items-start gap-3 active:bg-secondary"
              onClick={() => handleSelectResult(res)}
            >
              <MapPin size={14} className="mt-0.5 shrink-0 text-primary" />
              <span className="text-[13px] text-foreground/80 line-clamp-2 leading-snug">
                {res.display_name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
