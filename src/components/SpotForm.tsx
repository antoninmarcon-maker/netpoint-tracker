import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ImagePlus, X, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface SpotFormProps {
  location: [number, number] | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function SpotForm({ location, onSuccess, onCancel }: SpotFormProps) {
  const { t } = useTranslation();
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
    if (!location) return toast.error(t('spots.chooseLocation'));

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error(t('spots.loginRequired'));
        setLoading(false);
        return;
      }

      const { data: spotData, error: spotError } = await supabase
        .from('spots')
        .insert([{
          name,
          description,
          type,
          availability_period: availability,
          lat: location[0],
          lng: location[1],
          user_id: user.id,
        }])
        .select('id')
        .single();

      if (spotError) throw spotError;

      const spotId = spotData.id;

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
          user_id: user.id
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
        {!location ? (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-xl flex items-center gap-2">
            <MapPin size={16} />
            <p>{t('spots.positionMarker')}</p>
          </div>
        ) : (
          <div className="bg-primary/10 text-primary text-xs p-2 rounded-lg flex items-center gap-2">
            <MapPin size={14} />
            <span className="font-mono">{location[0].toFixed(5)}, {location[1].toFixed(5)}</span>
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

        <div className="space-y-1.5">
          <Label htmlFor="availability">{t('spots.availability')}</Label>
          <Input 
            id="availability" 
            placeholder={t('spots.availabilityPlaceholder')} 
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            className="bg-secondary/50"
          />
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
        <Button type="submit" className="flex-1" disabled={loading || !location}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : t('spots.submitSpot')}
        </Button>
      </div>
    </form>
  );
}
