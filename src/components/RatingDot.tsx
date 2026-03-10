interface RatingDotProps {
  rating: 'negative' | 'neutral' | 'positive';
  size?: number;
  className?: string;
}

const RATING_COLORS: Record<string, string> = {
  negative: 'bg-destructive',
  neutral: 'bg-orange-500',
  positive: 'bg-green-500',
};

export function RatingDot({ rating, size = 8, className = '' }: RatingDotProps) {
  return (
    <span
      className={`inline-block rounded-full ${RATING_COLORS[rating]} ${className}`}
      style={{ width: size, height: size, minWidth: size }}
    />
  );
}

export function RatingDots({ items, showRatings }: { items: { rating?: string }[]; showRatings: boolean }) {
  if (!showRatings) return null;
  const pos = items.filter(p => p.rating === 'positive').length;
  const neu = items.filter(p => p.rating === 'neutral').length;
  const neg = items.filter(p => p.rating === 'negative').length;
  if (!pos && !neu && !neg) return null;
  return (
    <span className="inline-flex items-center gap-1 ml-1">
      {pos > 0 && <span className="inline-flex items-center gap-0.5"><RatingDot rating="positive" size={6} /><span className="text-[10px] text-green-500 font-semibold">{pos}</span></span>}
      {neu > 0 && <span className="inline-flex items-center gap-0.5"><RatingDot rating="neutral" size={6} /><span className="text-[10px] text-orange-500 font-semibold">{neu}</span></span>}
      {neg > 0 && <span className="inline-flex items-center gap-0.5"><RatingDot rating="negative" size={6} /><span className="text-[10px] text-destructive font-semibold">{neg}</span></span>}
    </span>
  );
}
