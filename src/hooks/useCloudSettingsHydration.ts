import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fetchCloudSettings, type CloudSettings } from '@/lib/cloudSettings';
import { hydrateActionsConfig, hydrateAdvantageRule } from '@/lib/actionsConfig';
import { setJerseyEnabled, getJerseyConfig } from '@/lib/savedPlayers';
import type { SportType } from '@/types/sports';

/**
 * On app startup, if a user is logged in, download their cloud settings
 * and merge them into localStorage so every lib reads the latest values.
 */
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

      // Hydrate actions config
      if (settings.customActions || settings.hiddenActions) {
        hydrateActionsConfig({
          customActions: settings.customActions,
          hiddenActions: settings.hiddenActions,
        });
      }

      // Hydrate advantage rule
      if (settings.advantageRule) {
        hydrateAdvantageRule(settings.advantageRule);
      }

      // Hydrate jersey config
      if (settings.jerseyConfig) {
        const sports: SportType[] = ['volleyball', 'basketball', 'tennis', 'padel'];
        for (const s of sports) {
          if (s in settings.jerseyConfig) {
            setJerseyEnabled(s, settings.jerseyConfig[s]);
          }
        }
      }

      // Hydrate custom logo
      if (settings.customLogo !== undefined) {
        if (settings.customLogo) {
          localStorage.setItem('customLogo', settings.customLogo);
        } else {
          localStorage.removeItem('customLogo');
        }
      }
    };

    hydrate();
  }, []);
}
