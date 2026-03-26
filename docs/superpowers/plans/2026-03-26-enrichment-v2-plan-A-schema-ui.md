# Enrichment V2 — Plan A: Schema + UI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add database columns for enrichment metadata, build photo lightbox, navigation app picker, enhanced contact display, carousel improvements, and edit form photo management.

**Architecture:** Supabase migration adds columns to `spots` and `spot_photos` tables. New React components: PhotoLightbox, NavigationPicker. Existing components modified: SpotDetailModal, SpotFormModal.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, shadcn/ui (Sheet, Dialog), Supabase, Vite

**Spec:** `docs/superpowers/specs/2026-03-26-spot-enrichment-v2-design.md`

---

## File Structure

### New files
- `supabase/migrations/20260326000000_enrichment_v2_columns.sql` — Migration
- `src/components/spots/PhotoLightbox.tsx` — Fullscreen photo viewer with swipe
- `src/components/spots/NavigationPicker.tsx` — Bottom sheet with app choices

### Modified files
- `src/integrations/supabase/types.ts` — Regenerated (auto)
- `src/components/spots/SpotDetailModal.tsx` — Lightbox integration, nav picker, contacts, carousel dots
- `src/components/spots/SpotFormModal.tsx` — Load existing photos, delete/add, contact fields

---

### Task 1: Supabase Migration

**Files:**
- Create: `supabase/migrations/20260326000000_enrichment_v2_columns.sql`

- [ ] **Step 1: Write migration file**

```sql
-- Enrichment V2: new columns for spots and spot_photos

-- New social + map columns on spots
ALTER TABLE spots ADD COLUMN IF NOT EXISTS social_tiktok text;
ALTER TABLE spots ADD COLUMN IF NOT EXISTS social_youtube text;
ALTER TABLE spots ADD COLUMN IF NOT EXISTS google_maps_url text;

-- Enrichment metadata on spot_photos
ALTER TABLE spot_photos ADD COLUMN IF NOT EXISTS source_type text;
ALTER TABLE spot_photos ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE spot_photos ADD COLUMN IF NOT EXISTS photo_category text;
ALTER TABLE spot_photos ADD COLUMN IF NOT EXISTS confidence real;
ALTER TABLE spot_photos ADD COLUMN IF NOT EXISTS is_hero boolean DEFAULT false;
ALTER TABLE spot_photos ADD COLUMN IF NOT EXISTS author_name text;
```

- [ ] **Step 2: Push migration to Supabase**

Run: `npx supabase db push`
Expected: Migration applied successfully.

- [ ] **Step 3: Regenerate types**

Run: `npx supabase gen types typescript --project-id phmyokpqvigawoksidgw > src/integrations/supabase/types.ts`
Expected: types.ts updated with new columns.

- [ ] **Step 4: Verify types include new columns**

Check `src/integrations/supabase/types.ts` for `social_tiktok`, `social_youtube`, `google_maps_url`, `source_type`, `source_url`, `photo_category`, `confidence`, `is_hero`, `author_name`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260326000000_enrichment_v2_columns.sql src/integrations/supabase/types.ts
git commit -m "feat: add enrichment V2 schema columns (spots + spot_photos)"
```

---

### Task 2: PhotoLightbox Component

**Files:**
- Create: `src/components/spots/PhotoLightbox.tsx`
- Modify: `src/components/spots/SpotDetailModal.tsx`

- [ ] **Step 1: Create PhotoLightbox component**

```tsx
import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface PhotoLightboxProps {
  photos: { photo_url: string; author_name?: string | null }[];
  initialIndex: number;
  onClose: () => void;
}

export default function PhotoLightbox({ photos, initialIndex, onClose }: PhotoLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const photo = photos[index];

  const prev = useCallback(() => setIndex(i => (i > 0 ? i - 1 : photos.length - 1)), [photos.length]);
  const next = useCallback(() => setIndex(i => (i < photos.length - 1 ? i + 1 : 0)), [photos.length]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, prev, next]);

  // Touch swipe
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const dx = e.changedTouches[0].clientX - touchStart;
    if (dx > 60) prev();
    if (dx < -60) next();
    setTouchStart(null);
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Close */}
      <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
        <X size={20} />
      </button>

      {/* Nav arrows (desktop) */}
      {photos.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-3 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors hidden sm:flex">
            <ChevronLeft size={24} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-3 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors hidden sm:flex">
            <ChevronRight size={24} />
          </button>
        </>
      )}

      {/* Photo */}
      <img
        src={photo.photo_url}
        alt=""
        className="max-w-[95vw] max-h-[90vh] object-contain select-none"
        onClick={(e) => e.stopPropagation()}
        draggable={false}
      />

      {/* Counter + Attribution */}
      <div className="absolute bottom-4 left-0 right-0 text-center">
        <span className="text-white/80 text-sm font-medium">{index + 1} / {photos.length}</span>
        {photo.author_name && (
          <p className="text-white/40 text-xs mt-1">Photo: {photo.author_name}</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Integrate into SpotDetailModal carousel**

In `SpotDetailModal.tsx`, add state and render:

```tsx
// Add state at top of component
const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

// Replace the img in carousel with clickable version
<img
  key={i}
  src={p.photo_url}
  alt="Spot"
  className="w-full h-52 object-cover shrink-0 snap-center cursor-pointer"
  onClick={() => setLightboxIndex(i)}
  loading="lazy"
/>

// Add at end of component (before closing fragments)
{lightboxIndex !== null && (
  <PhotoLightbox
    photos={photos}
    initialIndex={lightboxIndex}
    onClose={() => setLightboxIndex(null)}
  />
)}
```

- [ ] **Step 3: Sort photos by category + hero-first**

Before rendering, sort the photos array:

```tsx
const categoryOrder = ['terrain', 'action', 'groupe', 'vue_exterieure', 'logo'];
const sortedPhotos = [...photos].sort((a: any, b: any) => {
  if (a.is_hero && !b.is_hero) return -1;
  if (!a.is_hero && b.is_hero) return 1;
  const aIdx = categoryOrder.indexOf(a.photo_category) ?? 99;
  const bIdx = categoryOrder.indexOf(b.photo_category) ?? 99;
  return aIdx - bIdx;
});
```

Use `sortedPhotos` in the carousel and lightbox instead of `photos`.

- [ ] **Step 4: Add functional dot indicators below carousel**

Track scroll position with a ref and IntersectionObserver:

```tsx
const [activePhotoIndex, setActivePhotoIndex] = useState(0);
const carouselRef = useRef<HTMLDivElement>(null);

// Scroll tracking via scroll event
const handleCarouselScroll = () => {
  const el = carouselRef.current;
  if (!el) return;
  const scrollLeft = el.scrollLeft;
  const width = el.clientWidth;
  setActivePhotoIndex(Math.round(scrollLeft / width));
};

// Scroll to photo on dot click
const scrollToPhoto = (i: number) => {
  const el = carouselRef.current;
  if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
};

// In JSX — carousel div:
<div ref={carouselRef} onScroll={handleCarouselScroll}
  className="flex overflow-x-auto snap-x hide-scrollbar">

// Dots below carousel:
{sortedPhotos.length > 1 && (
  <div className="flex justify-center gap-1.5 py-2">
    {sortedPhotos.map((_, i) => (
      <button
        key={i}
        onClick={() => scrollToPhoto(i)}
        className={`w-1.5 h-1.5 rounded-full transition-colors ${i === activePhotoIndex ? 'bg-accent' : 'bg-border'}`}
      />
    ))}
  </div>
)}
```

- [ ] **Step 4: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/spots/PhotoLightbox.tsx src/components/spots/SpotDetailModal.tsx
git commit -m "feat: add photo lightbox with swipe, dots, lazy loading"
```

---

### Task 3: Navigation App Picker

**Files:**
- Create: `src/components/spots/NavigationPicker.tsx`
- Modify: `src/components/spots/SpotDetailModal.tsx`

- [ ] **Step 1: Create NavigationPicker component**

```tsx
import { MapPin, Navigation, Copy, X } from 'lucide-react';
import { toast } from 'sonner';

interface NavigationPickerProps {
  lat: number;
  lng: number;
  address?: string | null;
  onClose: () => void;
}

const NAV_APPS = [
  {
    name: 'Google Maps',
    icon: '🗺️',
    getUrl: (lat: number, lng: number) =>
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
  },
  {
    name: 'Waze',
    icon: '🚗',
    getUrl: (lat: number, lng: number) =>
      `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,
  },
  {
    name: 'Apple Plans',
    icon: '🍎',
    getUrl: (lat: number, lng: number) =>
      `maps://maps.apple.com/?daddr=${lat},${lng}`,
  },
];

export default function NavigationPicker({ lat, lng, address, onClose }: NavigationPickerProps) {
  const copyAddress = () => {
    const text = address || `${lat}, ${lng}`;
    navigator.clipboard.writeText(text);
    toast.success('Adresse copiée');
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 glass-overlay rounded-t-2xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-3 border-t border-border/40">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-sm">Ouvrir avec...</h3>
          <button onClick={onClose} className="p-1.5 rounded-full bg-secondary/60 hover:bg-secondary">
            <X size={14} className="text-muted-foreground" />
          </button>
        </div>
        {NAV_APPS.map((app) => (
          <a
            key={app.name}
            href={app.getUrl(lat, lng)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary/30 hover:bg-secondary/60 transition-colors active:scale-[0.98]"
          >
            <span className="text-lg">{app.icon}</span>
            <span className="text-sm font-medium text-foreground">{app.name}</span>
          </a>
        ))}
        <button
          onClick={copyAddress}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-secondary/30 hover:bg-secondary/60 transition-colors active:scale-[0.98]"
        >
          <Copy size={16} className="text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Copier l'adresse</span>
        </button>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Replace "Itinéraire" button in SpotDetailModal**

Replace the direct Google Maps directions link with:

```tsx
const [showNavPicker, setShowNavPicker] = useState(false);

// Replace the <a> for Itinéraire with:
<button
  onClick={() => setShowNavPicker(true)}
  className="flex-1 flex items-center justify-center gap-2 text-xs font-semibold text-primary bg-primary/8 hover:bg-primary/15 rounded-xl py-3 transition-colors active:scale-[0.98]"
>
  <Navigation size={14} /> Itinéraire
</button>

// Add NavigationPicker render:
{showNavPicker && spot.lat && spot.lng && (
  <NavigationPicker
    lat={spot.lat}
    lng={spot.lng}
    address={spot.address}
    onClose={() => setShowNavPicker(false)}
  />
)}
```

- [ ] **Step 3: Update Google Maps button to use place link**

```tsx
// Replace the Google Maps <a> href with:
href={spot.google_maps_url
  || (spot.google_place_id
    ? `https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${spot.google_place_id}`
    : `https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`)}
```

- [ ] **Step 4: Verify build**

Run: `npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add src/components/spots/NavigationPicker.tsx src/components/spots/SpotDetailModal.tsx
git commit -m "feat: navigation app picker + Google Maps place link"
```

---

### Task 4: Enhanced Contact Display

**Files:**
- Modify: `src/components/spots/SpotDetailModal.tsx`

- [ ] **Step 1: Update club info block with all social fields**

In SpotDetailModal.tsx, find the club info block and add TikTok + YouTube display. Add imports for any needed icons. Display only non-empty fields:

```tsx
{spot.social_tiktok && (
  <a
    href={spot.social_tiktok.startsWith('http') ? spot.social_tiktok : `https://tiktok.com/@${spot.social_tiktok}`}
    target="_blank" rel="noopener noreferrer"
    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/60 text-xs font-medium text-foreground/80 hover:bg-background/80 transition-colors"
  >
    🎵 TikTok
  </a>
)}
{spot.social_youtube && (
  <a
    href={spot.social_youtube.startsWith('http') ? spot.social_youtube : `https://youtube.com/@${spot.social_youtube}`}
    target="_blank" rel="noopener noreferrer"
    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/60 text-xs font-medium text-foreground/80 hover:bg-background/80 transition-colors"
  >
    ▶️ YouTube
  </a>
)}
```

Also fix `club_email` icon: change from `Globe` to `Mail` (import `Mail` from lucide-react). The current code at SpotDetailModal.tsx:388 uses Globe incorrectly for email.

- [ ] **Step 2: Add TikTok + YouTube for non-club spots too**

In the non-club social links section, add the same TikTok/YouTube buttons if fields are filled.

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/components/spots/SpotDetailModal.tsx
git commit -m "feat: display TikTok, YouTube, and all contact fields conditionally"
```

---

### Task 5: Photo Management in Edit Form

**Files:**
- Modify: `src/components/spots/SpotFormModal.tsx`

- [ ] **Step 1: Load existing photos when editing**

Add to SpotFormModal: when `spotToEdit` is provided, fetch existing photos from `spot_photos` table on mount.

```tsx
const [existingPhotos, setExistingPhotos] = useState<{ id: string; photo_url: string }[]>([]);
const [photosToDelete, setPhotosToDelete] = useState<string[]>([]); // IDs to delete on submit

useEffect(() => {
  if (spotToEdit?.id) {
    supabase
      .from('spot_photos')
      .select('id, photo_url')
      .eq('spot_id', spotToEdit.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => setExistingPhotos(data || []));
  }
}, [spotToEdit?.id]);
```

- [ ] **Step 2: Display existing + new photos in unified grid**

```tsx
const visibleExisting = existingPhotos.filter(p => !photosToDelete.includes(p.id));
const totalPhotos = visibleExisting.length + photos.length;

// Grid shows existing photos first, then new uploads
<div className="grid grid-cols-4 gap-2">
  {visibleExisting.map((photo) => (
    <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-secondary/30">
      <img src={photo.photo_url} alt="" className="w-full h-full object-cover" />
      <button type="button" onClick={() => setPhotosToDelete([...photosToDelete, photo.id])}
        className="absolute top-1 right-1 p-0.5 bg-black/60 text-white rounded-full">
        <X size={10} />
      </button>
    </div>
  ))}
  {/* New photos + add button (existing code, but check totalPhotos < 5) */}
</div>
```

- [ ] **Step 3: Handle deletion on submit**

In the form submit handler, before uploading new photos:

```tsx
// Delete removed existing photos
for (const photoId of photosToDelete) {
  const photo = existingPhotos.find(p => p.id === photoId);
  if (photo) {
    // Extract storage path from URL
    const urlParts = photo.photo_url.split('/spot-photos/');
    if (urlParts[1]) {
      await supabase.storage.from('spot-photos').remove([urlParts[1]]);
    }
    const { error } = await supabase.from('spot_photos').delete().eq('id', photoId);
    if (error) console.error('Failed to delete photo:', error.message);
  }
}
```

Note: The edit form uses the authenticated Supabase client. RLS policies allow owners and moderators to delete. If deletion fails (permission denied), log the error silently — the photo stays.

- [ ] **Step 4: Verify build**

Run: `npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add src/components/spots/SpotFormModal.tsx
git commit -m "feat: manage existing photos in edit form (view, delete, add)"
```

---

### Task 6: Contact Fields in Edit Form

**Files:**
- Modify: `src/components/spots/SpotFormModal.tsx`

- [ ] **Step 1: Add social link inputs**

After the existing social links section, add TikTok and YouTube fields:

```tsx
<Input placeholder="TikTok (@handle ou URL)" value={socialTiktok} onChange={e => setSocialTiktok(e.target.value)} />
<Input placeholder="YouTube (@channel ou URL)" value={socialYoutube} onChange={e => setSocialYoutube(e.target.value)} />
```

Add state variables and include in the submit payload.

- [ ] **Step 2: Add club contact fields (conditional on type=club)**

```tsx
{type === 'club' && (
  <div className="space-y-2">
    <Label>Contact du club</Label>
    <Input placeholder="Site web" value={clubSiteWeb} onChange={e => setClubSiteWeb(e.target.value)} />
    <Input placeholder="Téléphone" value={clubTelephone} onChange={e => setClubTelephone(e.target.value)} />
    <Input placeholder="Email" value={clubEmail} onChange={e => setClubEmail(e.target.value)} />
  </div>
)}
```

- [ ] **Step 3: Pre-fill fields from spotToEdit data**

When editing, populate all social + contact fields from the existing spot data.

- [ ] **Step 4: Include new fields in the update/insert Supabase call**

Add `social_tiktok`, `social_youtube`, `club_site_web`, `club_telephone`, `club_email` to the spot insert/update payload.

- [ ] **Step 5: Verify build**

Run: `npx tsc --noEmit`

- [ ] **Step 6: Commit**

```bash
git add src/components/spots/SpotFormModal.tsx
git commit -m "feat: add social + club contact fields to edit form"
```

---

### Task 7: Final Integration + Type-Themed Placeholder

**Files:**
- Modify: `src/components/spots/SpotDetailModal.tsx`

- [ ] **Step 1: Type-themed placeholder when no photos**

Replace the generic gradient placeholder:

```tsx
{(() => {
  const gradients: Record<string, string> = {
    beach: 'from-yellow-500/10 via-amber-500/10 to-orange-500/5',
    club: 'from-blue-600/10 via-blue-500/10 to-indigo-500/5',
    outdoor_hard: 'from-green-500/10 via-emerald-500/10 to-green-400/5',
    outdoor_grass: 'from-green-400/10 via-lime-500/10 to-green-300/5',
    green_volley: 'from-green-600/10 via-emerald-600/10 to-green-500/5',
  };
  const gradient = gradients[spot.type] || 'from-primary/10 via-secondary/20 to-primary/5';
  return (
    <div className={`h-28 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
      <MapPin size={28} className="text-muted-foreground/30" />
    </div>
  );
})()}
```

- [ ] **Step 2: Verify full build and no regressions**

Run: `npx tsc --noEmit`
Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/spots/SpotDetailModal.tsx
git commit -m "feat: type-themed photo placeholder + final V2 UI integration"
```
