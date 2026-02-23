import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fetchCloudSettings } from '@/lib/cloudSettings';
import { hydrateActionsConfig } from '@/lib/actionsConfig';
import { setJerseyEnabled } from '@/lib/savedPlayers';

export function useCloudSettingsHydration() {
  const hydrated = useRef(false);

  useEffect(() => {
    const hydrate = async () => {
      if (hydrated.current) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      hydrated.current = true;
      const settings = await fetchCloudSettings(session.user.id);
      if (!settings) return;
      if (settings.customActions || settings.hiddenActions) {
        hydrateActionsConfig({ customActions: settings.customActions, hiddenActions: settings.hiddenActions });
      }
      if (settings.jerseyConfig) {
        if ('volleyball' in settings.jerseyConfig) {
          setJerseyEnabled('volleyball', settings.jerseyConfig.volleyball);
        }
      }
    };
    hydrate();
  }, []);
}
