import { useState, useRef, useCallback } from 'react';
import { MapPin } from 'lucide-react';
import { sortSpotPhotos } from '@/lib/sortSpotPhotos';
import PhotoLightbox from './PhotoLightbox';

interface SpotPhotosProps {
  photos: any[];
  placeholderGradient: string;
}

export default function SpotPhotos({ photos, placeholderGradient }: SpotPhotosProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const sortedPhotos = sortSpotPhotos(photos);

  const handleCarouselScroll = useCallback(() => {
    const el = carouselRef.current;
    if (!el) return;
    setActivePhotoIndex(Math.round(el.scrollLeft / el.clientWidth));
  }, []);

  const scrollToPhoto = useCallback((i: number) => {
    const el = carouselRef.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  }, []);

  return (
    <>
      {sortedPhotos.length > 0 ? (
        <>
          <div ref={carouselRef} onScroll={handleCarouselScroll} className="flex overflow-x-auto snap-x hide-scrollbar">
            {sortedPhotos.map((p: any, i: number) => (
              <img
                key={i}
                src={p.photo_url}
                alt="Spot"
                className="w-full h-52 object-cover shrink-0 snap-center cursor-pointer"
                onClick={() => setLightboxIndex(i)}
                loading="lazy"
              />
            ))}
          </div>
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
        </>
      ) : (
        <div className={`h-28 bg-gradient-to-br ${placeholderGradient} flex items-center justify-center`}>
          <MapPin size={28} className="text-muted-foreground/30" />
        </div>
      )}

      {/* Photo lightbox */}
      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={sortedPhotos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}
