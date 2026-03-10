import { useState } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SpotMap from '@/components/SpotMap';
import SpotSidebar from '@/components/SpotSidebar';

export default function Spots() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [newSpotLocation, setNewSpotLocation] = useState<[number, number] | null>(null);

  const handleStartAdding = () => {
    setSelectedSpotId(null);
    setIsAddingMode(true);
  };

  const handleStopAdding = () => {
    setIsAddingMode(false);
    setNewSpotLocation(null);
  };

  return (
    <div className="flex flex-col h-dvh bg-background overflow-hidden relative">
      <header className="flex-none bg-background/80 backdrop-blur-md border-b border-border z-20" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-full bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          
          <h1 className="text-xl font-black text-foreground">
            {t('spots.title')}
          </h1>

          <button
            onClick={handleStartAdding}
            className={`p-2 rounded-full transition-colors shadow-lg ${isAddingMode ? 'bg-secondary text-foreground' : 'bg-primary text-primary-foreground hover:opacity-90'}`}
            title={t('spots.addSpot')}
          >
            <Plus size={20} className={isAddingMode ? "rotate-45" : ""} />
          </button>
        </div>
      </header>

      <div className="flex-1 relative flex">
        <div className="flex-1 h-full z-0 relative">
          <SpotMap 
            selectedSpotId={selectedSpotId}
            onSelectSpot={setSelectedSpotId}
            isAddingMode={isAddingMode}
            newSpotLocation={newSpotLocation || undefined}
            onNewSpotLocationChange={setNewSpotLocation}
          />
        </div>

        <SpotSidebar 
          selectedSpotId={selectedSpotId}
          onClose={() => setSelectedSpotId(null)}
          isAddingMode={isAddingMode}
          onCloseAdding={handleStopAdding}
          newSpotLocation={newSpotLocation || null}
        />
      </div>
    </div>
  );
}
