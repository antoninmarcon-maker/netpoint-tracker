import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ImagePlus, X, MapPin } from 'lucide-react';
import { toast } from 'sonner';

interface SpotFormProps {
  location: [number, number] | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function SpotForm({ location, onSuccess, onCancel }: SpotFormProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<string>('outdoor_hard');
  const [availability, setAvailability] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      if (photos.length + selected.length > 5) {
        toast.error("Vous ne pouvez ajouter que 5 photos maximum.");
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
    if (!name.trim()) return toast.error("Le nom du terrain est requis.");
    if (!location) return toast.error("Veuillez choisir un emplacement sur la carte.");

    setLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Vous devez être connecté pour ajouter un terrain.");
        setLoading(false);
        return;
      }

      // Step 1: Insert spot into DB with geography point
      const pointStr = `POINT(${location[1]} ${location[0]})`; // Longitude, Latitude format correctly for PostGIS
      const { data: spotData, error: spotError } = await supabase
        .from('spots')
        .insert({
          name,
          description,
          type,
          availability_period: availability,
          location: pointStr as any // Need to cast as any for RPC or handle via raw SQL if types complain, but PostGIS accepts EWKT strings.
        })
        .select('id')
        .single();

      if (spotError) throw spotError;

      const spotId = spotData.id;

      // Step 2: Upload photos if any
      for (const file of photos) {
        const fileExt = file.name.split('.').pop();
        const filePath = `${spotId}/${crypto.randomUUID()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('spot-photos')
          .upload(filePath, file);
          
        if (uploadError) {
          console.error("Erreur lors de l'upload de l'image:", uploadError);
          continue; // Skip failed uploads but continue with others
        }

        const { data: { publicUrl } } = supabase.storage
          .from('spot-photos')
          .getPublicUrl(filePath);

        await supabase.from('spot_photos').insert({
          spot_id: spotId,
          photo_url: publicUrl,
          user_id: user.id
        });
      }

      toast.success("Terrain ajouté et en attente de validation !");
      onSuccess();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erreur lors de l'ajout du terrain.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {!location ? (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-xl flex items-center gap-2">
            <MapPin size={16} />
            <p>Déplacez la carte pour positionner le marqueur.</p>
          </div>
        ) : (
          <div className="bg-primary/10 text-primary text-xs p-2 rounded-lg flex items-center gap-2">
            <MapPin size={14} />
            <span className="font-mono">{location[0].toFixed(5)}, {location[1].toFixed(5)}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="name">Nom du terrain <span className="text-destructive">*</span></Label>
          <Input 
            id="name" 
            placeholder="Ex: Terrain de la plage des Blancs Sablons" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="bg-secondary/50"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="type">Type de terrain</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="bg-secondary/50">
              <SelectValue placeholder="Sélectionnez le type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beach">Beach Volley (Sable)</SelectItem>
              <SelectItem value="outdoor_hard">Extérieur (Dur/Goudron)</SelectItem>
              <SelectItem value="outdoor_grass">Extérieur (Herbe)</SelectItem>
              <SelectItem value="indoor">En salle (Gymnase)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="availability">Période de disponibilité annuelle</Label>
          <Input 
            id="availability" 
            placeholder="Ex: De mai à septembre (filets retirés l'hiver)" 
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            className="bg-secondary/50"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Description et infos pratiques</Label>
          <Textarea 
            id="description" 
            placeholder="Ex: Accès libre, point d'eau à proximité, prévoir son propre ballon... " 
            className="h-24 resize-none bg-secondary/50"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Photos ({photos.length}/5)</Label>
          
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
                <span className="text-[10px] uppercase font-bold tracking-wider">Ajouter</span>
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
          Annuler
        </Button>
        <Button type="submit" className="flex-1" disabled={loading || !location}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : 'Proposer le terrain'}
        </Button>
      </div>
    </form>
  );
}
