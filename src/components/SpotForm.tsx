import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ImagePlus, X, MapPin } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface SpotFormProps {
  location: [number, number] | null;
  onLocationChange?: (loc: [number, number]) => void;
  onSuccess: () => void;
  onCancel: () => void;
  spotToEdit?: any;
}

import { checkAndIncrementRateLimit } from '@/lib/rateLimit';

export default function SpotForm({ location, onLocationChange, onSuccess, onCancel, spotToEdit }: SpotFormProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(spotToEdit?.name || '');
  const [description, setDescription] = useState(spotToEdit?.description || '');
  const [type, setType] = useState<string>(spotToEdit?.type || 'outdoor_hard');
  const [availability, setAvailability] = useState(spotToEdit?.availability_period || '');
  const [photos, setPhotos] = useState<File[]>([]);
  
  // Availability states
  const parseInitAvailability = () => {
    if (!spotToEdit?.availability_period) return { allYear: true, start: '', end: '' };
    if (spotToEdit.availability_period === "Toute l'année") return { allYear: true, start: '', end: '' };
    
    // Attempt to parse 'De X à Y'
    const parts = spotToEdit.availability_period.match(/De (.+) à (.+)/);
    if (parts && parts.length === 3) {
      return { allYear: false, start: parts[1], end: parts[2] };
    }
    
    return { allYear: false, start: '', end: spotToEdit.availability_period }; // fallback
  };
  
  const initAv = parseInitAvailability();
  const [allYear, setAllYear] = useState(initAv.allYear);
  const [startMonth, setStartMonth] = useState(initAv.start);
  const [endMonth, setEndMonth] = useState(initAv.end);
  
  const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

  // Address search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    
    // Simple rate limiting/feedback for search
    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&countrycodes=fr,ch,be,ca`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error(err);
      toast.error(t('spots.searchError') || "Erreur lors de la recherche adresse.");
    } finally {
      setSearching(false);
    }
  };

  const handleSelectSearchResult = (result: any) => {
    if (onLocationChange) {
      onLocationChange([parseFloat(result.lat), parseFloat(result.lon)]);
    }
    setSearchResults([]);
    setSearchQuery('');
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      if (photos.length + selected.length > 5) {
        toast.error(t('spots.photosMax'));
        return;
      }
      setPhotos([...photos, ...selected]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error(t('spots.spotNameRequired'));
    if (!location && !spotToEdit) return toast.error(t('spots.chooseLocation'));
    
    let finalAvailability = availability;
    if (allYear) {
      finalAvailability = "Toute l'année";
    } else if (startMonth && endMonth) {
      finalAvailability = `De ${startMonth} à ${endMonth}`;
    }

    if (!checkAndIncrementRateLimit()) return;

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id || null;

      let spotId = spotToEdit?.id;

      if (spotToEdit) {
        const { error: spotError } = await supabase
          .from('spots')
          .update({
            name,
            description,
            type,
            availability_period: finalAvailability,
            is_verified: true,
            status: 'validated'
          })
          .eq('id', spotId);
        
        if (spotError) throw spotError;
      } else {
        const { data: spotData, error: spotError } = await supabase
          .from('spots')
          .insert([{
            name,
            description,
            type,
            availability_period: finalAvailability,
            lat: location![0],
            lng: location![1],
            user_id: userId,
          }])
          .select('id')
          .single();

        if (spotError) throw spotError;
        spotId = spotData.id;
      }

      for (const file of photos) {
        const fileExt = file.name.split('.').pop();
        const filePath = `${spotId}/${crypto.randomUUID()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('spot-photos')
          .upload(filePath, file);
          
        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('spot-photos')
          .getPublicUrl(filePath);

        await supabase.from('spot_photos').insert([{
          spot_id: spotId,
          photo_url: publicUrl,
          user_id: userId
        }]);
      }

      toast.success(t('spots.spotAdded'));
      onSuccess();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || t('spots.spotAddError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {!spotToEdit && (
          <div className="space-y-3 mb-2">
            <div className="flex gap-2">
              <Input
                placeholder="Rechercher une adresse, une ville..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
                className="bg-secondary/50 text-sm"
              />
              <Button type="button" variant="secondary" onClick={() => handleSearch()} disabled={searching || !searchQuery.trim()}>
                {searching ? <Loader2 size={16} className="animate-spin" /> : '🔍'}
              </Button>
            </div>
            {searchResults.length > 0 && (
              <div className="bg-secondary/30 rounded-lg border border-border overflow-hidden text-sm">
                {searchResults.map((res, i) => (
                  <button
                    key={i}
                    type="button"
                    className="w-full text-left px-3 py-2 border-b border-border last:border-0 hover:bg-secondary/50 transition-colors truncate"
                    onClick={() => handleSelectSearchResult(res)}
                  >
                    📍 {res.display_name}
                  </button>
                ))}
              </div>
            )}
            {!location ? (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-xl flex items-center gap-2">
                <MapPin size={16} />
                <p>{t('spots.positionMarker', 'Placez le marqueur sur la carte ou recherchez une adresse.')}</p>
              </div>
            ) : (
              <div className="bg-primary/10 text-primary text-xs p-2 rounded-lg flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-mono">
                  <MapPin size={14} />
                  <span>{location[0].toFixed(5)}, {location[1].toFixed(5)}</span>
                </div>
                <span className="text-[10px] uppercase opacity-70">Ajustable sur la carte</span>
              </div>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="name">{t('spots.spotName')} <span className="text-destructive">*</span></Label>
          <Input 
            id="name" 
            placeholder={t('spots.spotNamePlaceholder')} 
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="bg-secondary/50"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="type">{t('spots.spotType')}</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="bg-secondary/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beach">{t('spots.typeBeach')}</SelectItem>
              <SelectItem value="outdoor_hard">{t('spots.typeOutdoorHard')}</SelectItem>
              <SelectItem value="outdoor_grass">{t('spots.typeOutdoorGrass')}</SelectItem>
              <SelectItem value="indoor">{t('spots.typeIndoor')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3 p-3 bg-secondary/20 border border-border rounded-xl">
          <div className="flex items-center justify-between">
            <Label htmlFor="availability-switch" className="flex-1 cursor-pointer">Disponible toute l'année</Label>
            <Switch 
              id="availability-switch" 
              checked={allYear} 
              onCheckedChange={setAllYear} 
            />
          </div>
          
          {!allYear && (
            <div className="flex gap-2 items-center">
              <span className="text-sm">De</span>
              <Select value={startMonth} onValueChange={setStartMonth}>
                <SelectTrigger className="bg-secondary/50 h-8 text-sm"><SelectValue placeholder="Mois" /></SelectTrigger>
                <SelectContent>
                  {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <span className="text-sm">à</span>
              <Select value={endMonth} onValueChange={setEndMonth}>
                <SelectTrigger className="bg-secondary/50 h-8 text-sm"><SelectValue placeholder="Mois" /></SelectTrigger>
                <SelectContent>
                  {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">{t('spots.description')}</Label>
          <Textarea 
            id="description" 
            placeholder={t('spots.descriptionPlaceholder')} 
            className="h-24 resize-none bg-secondary/50"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>{t('spots.photos')} ({photos.length}/5)</Label>
          
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo, idx) => (
              <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-secondary/30">
                <img src={URL.createObjectURL(photo)} alt="preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(idx)}
                  className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            
            {photos.length < 5 && (
              <label className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors bg-secondary/10 hover:bg-secondary/30 text-muted-foreground hover:text-primary">
                <ImagePlus size={20} />
                <span className="text-[10px] uppercase font-bold tracking-wider">{t('spots.photoAdd')}</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  className="hidden" 
                  onChange={handlePhotoSelect}
                />
              </label>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-4 border-t border-border mt-auto">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1" disabled={loading}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" className="flex-1" disabled={loading || (!location && !spotToEdit)}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : spotToEdit ? "Enregistrer" : t('spots.submitSpot')}
        </Button>
      </div>
    </form>
  );
}
