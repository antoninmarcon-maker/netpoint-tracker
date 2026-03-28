import { MapPin, Zap, Leaf, Phone, Globe, Mail, Info, ExternalLink } from 'lucide-react';
import { MONTHS_SHORT, MONTHS_FULL } from '@/lib/spotTypes';

interface SpotInfoProps {
  spot: any;
}

function parseSeasonality(period: string | null, saisonnier: boolean | null) {
  if (saisonnier === false || period === "Toute l'ann\u00e9e") return { type: 'yearly' as const };
  if (!period) return saisonnier ? { type: 'seasonal' as const, start: null, end: null } : null;
  const match = period.match(/De (.+) \u00e0 (.+)/);
  if (match) {
    const startIdx = MONTHS_FULL.indexOf(match[1]);
    const endIdx = MONTHS_FULL.indexOf(match[2]);
    return { type: 'seasonal' as const, start: startIdx >= 0 ? startIdx : null, end: endIdx >= 0 ? endIdx : null };
  }
  return { type: 'seasonal' as const, start: null, end: null };
}

export default function SpotInfo({ spot }: SpotInfoProps) {
  return (
    <>
      {/* Address */}
      {spot.address && (
        <div className="flex items-start gap-2.5">
          <MapPin size={14} className="text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-sm text-foreground/70 leading-snug">{spot.address}</p>
        </div>
      )}

      {/* Equipment badges -- hidden for clubs */}
      {spot.type !== 'club' && (
        <div className="flex flex-wrap gap-1.5">
          {spot.equip_acces_libre && (
            <span className="inline-flex items-center gap-1 bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground rounded-md">{"\uD83D\uDD13"} Libre acc{"\u00e8"}s</span>
          )}
          {spot.equip_eclairage && (
            <span className="inline-flex items-center gap-1 bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground rounded-md"><Zap size={10} /> {"\u00c9"}clair{"\u00e9"}</span>
          )}
          {spot.equip_pmr && (
            <span className="inline-flex items-center gap-1 bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground rounded-md">{"\u267F"} PMR</span>
          )}
          {spot.equip_sol && (
            <span className="inline-flex items-center gap-1 bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground rounded-md"><Leaf size={10} /> {spot.equip_sol}</span>
          )}
        </div>
      )}

      {/* Seasonality -- hidden for clubs */}
      {spot.type !== 'club' && (() => {
        const season = parseSeasonality(spot.availability_period, spot.equip_saisonnier);
        if (!season) return null;
        if (season.type === 'yearly') {
          return (
            <div className="border-b border-border py-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Disponibilit{"\u00e9"}</span>
              <span className="text-xs text-foreground/80">Toute l'ann{"\u00e9e"}</span>
            </div>
          );
        }
        return (
          <div className="border-b border-border py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Disponibilit{"\u00e9"}</span>
              <span className="text-xs text-foreground/80">Saisonnier</span>
            </div>
            <div className="flex gap-[3px]">
              {MONTHS_SHORT.map((m, i) => {
                const isActive = season.start != null && season.end != null
                  ? (season.start <= season.end
                    ? i >= season.start && i <= season.end
                    : i >= season.start || i <= season.end)
                  : false;
                return (
                  <div key={m} className="flex-1 flex flex-col items-center gap-1">
                    <div className={`w-full h-2.5 rounded-sm transition-colors ${isActive ? 'bg-accent' : 'bg-secondary'}`} />
                    <span className={`text-[7px] leading-none ${isActive ? 'text-accent font-bold' : 'text-muted-foreground/40'}`}>{m}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Social links -- for non-club spots */}
      {spot.type !== 'club' && spot.source !== 'ffvb_club' && (spot.social_instagram || spot.social_facebook || spot.social_whatsapp || spot.social_tiktok || spot.social_youtube) && (
        <div className="flex flex-wrap gap-2">
          {spot.social_instagram && (
            <a href={spot.social_instagram.startsWith('http') ? spot.social_instagram : `https://instagram.com/${spot.social_instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-xs font-medium text-foreground/80 hover:bg-secondary/80 transition-colors">{"\uD83D\uDCF8"} Instagram</a>
          )}
          {spot.social_facebook && (
            <a href={spot.social_facebook.startsWith('http') ? spot.social_facebook : `https://facebook.com/${spot.social_facebook}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-xs font-medium text-foreground/80 hover:bg-secondary/80 transition-colors">{"\uD83D\uDC64"} Facebook</a>
          )}
          {spot.social_whatsapp && (
            <a href={spot.social_whatsapp.startsWith('http') ? spot.social_whatsapp : `https://wa.me/${spot.social_whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-xs font-medium text-foreground/80 hover:bg-secondary/80 transition-colors">{"\uD83D\uDCAC"} WhatsApp</a>
          )}
          {spot.social_tiktok && (
            <a href={spot.social_tiktok.startsWith('http') ? spot.social_tiktok : `https://tiktok.com/@${spot.social_tiktok}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-xs font-medium text-foreground/80 hover:bg-secondary/80 transition-colors">{"\uD83C\uDFB5"} TikTok</a>
          )}
          {spot.social_youtube && (
            <a href={spot.social_youtube.startsWith('http') ? spot.social_youtube : `https://youtube.com/@${spot.social_youtube}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-xs font-medium text-foreground/80 hover:bg-secondary/80 transition-colors">{"\u25B6\uFE0F"} YouTube</a>
          )}
        </div>
      )}

      {/* Club info block */}
      {(spot.type === 'club' || spot.source === 'ffvb_club') && (
        <div className="p-3.5 rounded-xl bg-secondary/15 border border-border/30 space-y-3">
          <h3 className="font-bold text-xs text-foreground flex items-center gap-1.5">{"\uD83C\uDFDB\uFE0F"} Infos club</h3>
          {(spot.ffvb_ligue || spot.ffvb_comite) && (
            <p className="text-xs font-medium text-foreground/80">{[spot.ffvb_comite, spot.ffvb_ligue].filter(Boolean).join(' \u2014 ')}</p>
          )}
          <div className="space-y-1.5">
            {spot.club_site_web && (
              <a href={spot.club_site_web} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-sm text-primary hover:underline">
                <Globe size={14} className="shrink-0" /><span className="font-medium">Site du club</span><ExternalLink size={10} />
              </a>
            )}
            {spot.club_lien_fiche && (
              <a href={spot.club_lien_fiche} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-sm text-primary hover:underline">
                <Info size={14} className="shrink-0" /><span className="font-medium">Fiche FFVB</span><ExternalLink size={10} />
              </a>
            )}
            {spot.club_telephone && (
              <a href={`tel:${spot.club_telephone}`} className="flex items-center gap-2.5 text-sm text-primary hover:underline">
                <Phone size={14} className="shrink-0" /><span className="font-medium">{spot.club_telephone}</span>
              </a>
            )}
            {spot.club_email && (
              <a href={`mailto:${spot.club_email}`} className="flex items-center gap-2.5 text-sm text-primary hover:underline">
                <Mail size={14} className="shrink-0" /><span className="font-medium">{spot.club_email}</span>
              </a>
            )}
          </div>
          {(spot.social_instagram || spot.social_facebook || spot.social_tiktok || spot.social_youtube) && (
            <div className="flex flex-wrap gap-2 pt-1 border-t border-border/30">
              {spot.social_instagram && (
                <a href={spot.social_instagram.startsWith('http') ? spot.social_instagram : `https://instagram.com/${spot.social_instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/60 text-xs font-medium text-foreground/80 hover:bg-background/80 transition-colors">{"\uD83D\uDCF8"} Instagram</a>
              )}
              {spot.social_facebook && (
                <a href={spot.social_facebook.startsWith('http') ? spot.social_facebook : `https://facebook.com/${spot.social_facebook}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/60 text-xs font-medium text-foreground/80 hover:bg-background/80 transition-colors">{"\uD83D\uDC64"} Facebook</a>
              )}
              {spot.social_tiktok && (
                <a href={spot.social_tiktok.startsWith('http') ? spot.social_tiktok : `https://tiktok.com/@${spot.social_tiktok}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/60 text-xs font-medium text-foreground/80 hover:bg-background/80 transition-colors">{"\uD83C\uDFB5"} TikTok</a>
              )}
              {spot.social_youtube && (
                <a href={spot.social_youtube.startsWith('http') ? spot.social_youtube : `https://youtube.com/@${spot.social_youtube}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/60 text-xs font-medium text-foreground/80 hover:bg-background/80 transition-colors">{"\u25B6\uFE0F"} YouTube</a>
              )}
            </div>
          )}
        </div>
      )}

      {/* FFVB region for non-club FFVB spots */}
      {spot.type !== 'club' && spot.source !== 'ffvb_club' && (spot.ffvb_ligue || spot.ffvb_comite) && (
        <p className="text-xs text-muted-foreground">{[spot.ffvb_comite, spot.ffvb_ligue].filter(Boolean).join(' \u2014 ')}</p>
      )}

      {spot.description && (
        <p className="text-sm text-foreground/70 leading-relaxed">{spot.description}</p>
      )}
    </>
  );
}
