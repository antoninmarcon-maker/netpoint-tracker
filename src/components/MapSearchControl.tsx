import { useState } from 'react';
import { useMap } from 'react-leaflet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
    
    // Zoom and pan map
    map.flyTo([lat, lon], 15, {
        animate: true,
        duration: 1.5
    });

    // If we're adding a spot, update the pin
    if (isAddingMode && onLocationSelected) {
      onLocationSelected([lat, lon]);
    }

    setSearchResults([]);
    setSearchQuery('');
  };

  if (isAddingMode) return null;

  return (
    <div className="absolute top-4 right-14 z-[1000] w-64 md:w-80 shadow-xl rounded-xl">
      <form onSubmit={handleSearch} className="flex bg-background/95 backdrop-blur-md border border-border rounded-xl rounded-b-xl overflow-hidden shadow-lg transition-all focus-within:ring-2 focus-within:ring-primary/20">
        <Input
          placeholder={t('spots.searchMap', 'Rechercher une adresse...')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border-0 bg-transparent focus-visible:ring-0 px-4 h-11 text-sm rounded-none"
        />
        <Button 
          type="submit" 
          variant="ghost" 
          size="icon"
          className="h-11 w-11 rounded-none hover:bg-secondary/50 text-muted-foreground"
          disabled={searching || !searchQuery.trim()}
        >
          {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
        </Button>
      </form>

      {searchResults.length > 0 && (
        <div className="absolute mt-2 w-full bg-background/95 backdrop-blur-md border border-border shadow-2xl rounded-xl overflow-hidden max-h-60 overflow-y-auto">
          {searchResults.map((res, i) => (
            <button
              key={i}
              type="button"
              className="w-full text-left px-4 py-3 border-b border-border/50 last:border-0 hover:bg-secondary/80 transition-colors flex items-start gap-3"
              onClick={() => handleSelectResult(res)}
            >
              <MapPin size={16} className="mt-0.5 shrink-0 text-primary" />
              <span className="text-sm text-foreground/90 line-clamp-2 leading-tight">
                {res.display_name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
