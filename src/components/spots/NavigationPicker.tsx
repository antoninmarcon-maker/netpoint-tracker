import { Copy, X } from 'lucide-react';
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
