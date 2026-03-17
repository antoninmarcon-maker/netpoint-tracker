import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, ImagePlus, X, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { checkAndIncrementRateLimit } from '@/lib/rateLimit';

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

interface SpotFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  location?: [number, number] | null;
  onLocationChange?: (loc: [number, number]) => void;
  spotToEdit?: any;
  isSuggestion?: boolean;
}

export default function SpotFormModal({ open, onClose, onSuccess, location, onLocationChange, spotToEdit, isSuggestion }: SpotFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(spotToEdit?.name || '');
  const [description, setDescription] = useState(spotToEdit?.description || '');
  const [type, setType] = useState(spotToEdit?.type || 'outdoor_hard');
  const [photos, setPhotos] = useState<File[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const parseAvailability = () => {
    if (!spotToEdit?.availability_period) return { allYear: true, start: '', end: '' };
    if (spotToEdit.availability_period === "Toute l'année") return { allYear: true, start: '', end: '' };
    const parts = spotToEdit.availability_period.match(/De (.+) à (.+)/);
    if (parts?.length === 3) return { allYear: false, start: parts[1], end: parts[2] };
    return { allYear: false, start: '', end: '' };
  };

  const init = parseAvailability();
  const [allYear, setAllYear] = useState(init.allYear);
  const [startMonth, setStartMonth] = useState(init.start);
  const [endMonth, setEndMonth] = useState(init.end);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&countrycodes=fr,ch,be,ca`);
      const data = await res.json();
      setSearchResults(data);
    } catch { toast.error("Erreur recherche adresse."); }
    finally { setSearching(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Le nom du terrain est requis.");
    if (!location && !spotToEdit) return toast.error("Choisissez un emplacement.");
    if (!checkAndIncrementRateLimit()) return;

    const finalAvailability = allYear ? "Toute l'année" : (startMonth && endMonth ? `De ${startMonth} à ${endMonth}` : '');

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) { toast.error("Connectez-vous d'abord."); return; }

      let spotId = spotToEdit?.id;

      if (spotToEdit && !isSuggestion) {
        await supabase.from('spots').update({ name, description, type, availability_period: finalAvailability, status: 'validated' }).eq('id', spotId);
      } else if (isSuggestion && spotToEdit) {
        // Create a suggestion entry (new spot marked as pending)
        const { data: newSpot } = await supabase.from('spots').insert([{
          name, description, type, availability_period: finalAvailability,
          lat: spotToEdit.lat, lng: spotToEdit.lng, user_id: userId,
          status: 'waiting_for_validation',
        }]).select('id').single();
        spotId = newSpot?.id;
      } else {
        const { data: newSpot, error } = await supabase.from('spots').insert([{
          name, description, type, availability_period: finalAvailability,
          lat: location![0], lng: location![1], user_id: userId,
        }]).select('id').single();
        if (error) throw error;
        spotId = newSpot?.id;
      }

      for (const file of photos) {
        const ext = file.name.split('.').pop();
        const path = `${spotId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from('spot-photos').upload(path, file);
        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from('spot-photos').getPublicUrl(path);
          await supabase.from('spot_photos').insert([{ spot_id: spotId, photo_url: publicUrl, user_id: userId }]);
        }
      }

      toast.success(isSuggestion ? "Modification suggérée !" : "Terrain ajouté !");
      onSuccess();
      onClose();
    } catch (err: any) { console.error(err); toast.error(err.message || "Erreur"); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{spotToEdit ? (isSuggestion ? '💡 Suggérer une modification' : '✏️ Modifier le terrain') : '📍 Nouveau terrain'}</DialogTitle>
          <DialogDescription>
            {spotToEdit ? 'Proposez vos corrections, elles seront soumises à validation.' : 'Ajoutez un terrain de volley pour la communauté.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Address search (new spots only) */}
          {!spotToEdit && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input placeholder="Rechercher une adresse..." value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
                  className="bg-secondary/50 text-sm" />
                <Button type="button" variant="secondary" onClick={handleSearch} disabled={searching || !searchQuery.trim()}>
                  {searching ? <Loader2 size={14} className="animate-spin" /> : '🔍'}
                </Button>
              </div>
              {searchResults.length > 0 && (
                <div className="bg-secondary/30 rounded-lg border border-border overflow-hidden text-sm max-h-40 overflow-y-auto">
                  {searchResults.map((res, i) => (
                    <button key={i} type="button" className="w-full text-left px-3 py-2 border-b border-border last:border-0 hover:bg-secondary/50 transition-colors truncate"
                      onClick={() => { onLocationChange?.([parseFloat(res.lat), parseFloat(res.lon)]); setSearchResults([]); setSearchQuery(''); }}>
                      📍 {res.display_name}
                    </button>
                  ))}
                </div>
              )}
              {location ? (
                <div className="bg-primary/10 text-primary text-xs p-2 rounded-lg flex items-center gap-2 font-mono">
                  <MapPin size={14} />{location[0].toFixed(5)}, {location[1].toFixed(5)}
                </div>
              ) : (
                <div className="bg-destructive/10 text-destructive text-sm p-2.5 rounded-lg flex items-center gap-2">
                  <MapPin size={14} /> Placez le marqueur ou cherchez une adresse
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Nom du terrain <span className="text-destructive">*</span></Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Terrain de la plage" required className="bg-secondary/50" />
          </div>

          <div className="space-y-1.5">
            <Label>Type de terrain</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="beach">🏖️ Beach (Sable)</SelectItem>
                <SelectItem value="outdoor_hard">☀️ Extérieur (Dur)</SelectItem>
                <SelectItem value="outdoor_grass">🌱 Extérieur (Herbe)</SelectItem>
                <SelectItem value="indoor">🏟️ Gymnase</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2.5 p-3 bg-secondary/20 border border-border rounded-xl">
            <div className="flex items-center justify-between">
              <Label className="cursor-pointer">Disponible toute l'année</Label>
              <Switch checked={allYear} onCheckedChange={setAllYear} />
            </div>
            {!allYear && (
              <div className="flex gap-2 items-center">
                <span className="text-sm">De</span>
                <Select value={startMonth} onValueChange={setStartMonth}>
                  <SelectTrigger className="bg-secondary/50 h-8 text-sm"><SelectValue placeholder="Mois" /></SelectTrigger>
                  <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
                <span className="text-sm">à</span>
                <Select value={endMonth} onValueChange={setEndMonth}>
                  <SelectTrigger className="bg-secondary/50 h-8 text-sm"><SelectValue placeholder="Mois" /></SelectTrigger>
                  <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Infos pratiques..." className="h-20 resize-none bg-secondary/50" />
          </div>

          <div className="space-y-2">
            <Label>Photos ({photos.length}/5)</Label>
            <div className="grid grid-cols-4 gap-2">
              {photos.map((photo, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-secondary/30">
                  <img src={URL.createObjectURL(photo)} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 p-0.5 bg-black/60 text-white rounded-full">
                    <X size={10} />
                  </button>
                </div>
              ))}
              {photos.length < 5 && (
                <label className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors bg-secondary/10 text-muted-foreground hover:text-primary">
                  <ImagePlus size={18} />
                  <input type="file" accept="image/*" multiple className="hidden" onChange={e => {
                    if (e.target.files) {
                      const sel = Array.from(e.target.files);
                      if (photos.length + sel.length > 5) { toast.error("Max 5 photos"); return; }
                      setPhotos([...photos, ...sel]);
                    }
                  }} />
                </label>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1" disabled={loading}>Annuler</Button>
            <Button type="submit" className="flex-1" disabled={loading || (!location && !spotToEdit)}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : (isSuggestion ? 'Proposer' : spotToEdit ? 'Enregistrer' : 'Ajouter')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
