import { SportType, ActionType, PointType, OTHER_ACTION_KEYS } from '@/types/sports';
import { getCurrentUserId, patchCloudSettings } from './cloudSettings';

const STORAGE_KEY = 'myvolley-actions-config';

export interface CustomAction {
  id: string;
  label: string;
  sport: SportType;
  category: PointType;
  points?: number;
  sigil?: string;
  showOnCourt?: boolean;
  assignToPlayer?: boolean;
  /** Whether this action requires a direction (2-click: origin + destination) */
  hasDirection?: boolean;
  /** Whether we prompt for action quality rating (+ / ! / -) */
  hasRating?: boolean;
}

export interface ActionsConfig {
  hiddenActions: string[];
  customActions: CustomAction[];
  /** Overrides for predefined/default actions (e.g., hasRating, assignToPlayer, etc.) */
  defaultActionsConfig?: Record<string, Partial<Omit<CustomAction, 'id' | 'sport' | 'category' | 'label' | 'points'>>>;
}

function getConfig(): ActionsConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultConfig();
    return JSON.parse(raw);
  } catch { return getDefaultConfig(); }
}

function getDefaultConfig(): ActionsConfig {
  return { hiddenActions: ['other_offensive', 'other_volley_fault', 'other_volley_neutral'], customActions: [], defaultActionsConfig: {} };
}

function saveConfig(config: ActionsConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  syncActionsToCloud(config);
}

async function syncActionsToCloud(config: ActionsConfig) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return;
    await patchCloudSettings(userId, { customActions: config.customActions, hiddenActions: config.hiddenActions, defaultActionsConfig: config.defaultActionsConfig });

  } catch { }
}

export function getActionsConfig(): ActionsConfig { return getConfig(); }

export function hydrateActionsConfig(cloud: { customActions?: CustomAction[]; hiddenActions?: string[]; defaultActionsConfig?: Record<string, any> }) {
  const local = getConfig();
  const merged: ActionsConfig = {
    hiddenActions: cloud.hiddenActions ?? local.hiddenActions,
    customActions: cloud.customActions ?? local.customActions,
    defaultActionsConfig: cloud.defaultActionsConfig ?? local.defaultActionsConfig ?? {}
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
}

export function toggleActionVisibility(actionKey: string): ActionsConfig {
  const config = getConfig();
  const idx = config.hiddenActions.indexOf(actionKey);
  if (idx >= 0) config.hiddenActions.splice(idx, 1);
  else config.hiddenActions.push(actionKey);
  saveConfig(config);
  return config;
}

export function addCustomAction(
  label: string, sport: SportType, category: PointType,
  points?: number, sigil?: string, showOnCourt?: boolean, assignToPlayer?: boolean, hasDirection?: boolean, hasRating?: boolean
): ActionsConfig {
  const config = getConfig();
  config.customActions.push({
    id: crypto.randomUUID(), label: label.trim(), sport, category,
    ...(sigil ? { sigil: sigil.slice(0, 2).toUpperCase() } : {}),
    showOnCourt: hasDirection ? true : (showOnCourt ?? (category === 'neutral' ? false : true)),
    assignToPlayer: assignToPlayer ?? true,
    ...(hasDirection ? { hasDirection: true } : {}),
    ...(hasRating ? { hasRating: true } : {}),
  });
  saveConfig(config);
  return config;
}

export function updateCustomAction(id: string, newLabel: string, points?: number, sigil?: string, showOnCourt?: boolean, assignToPlayer?: boolean, hasDirection?: boolean, hasRating?: boolean): ActionsConfig {
  const config = getConfig();
  const action = config.customActions.find(a => a.id === id);
  if (action) {
    action.label = newLabel.trim();
    if (sigil !== undefined) action.sigil = sigil.slice(0, 2).toUpperCase();
    if (hasDirection !== undefined) action.hasDirection = hasDirection;
    if (hasDirection) {
      action.showOnCourt = true;
    } else if (showOnCourt !== undefined) {
      action.showOnCourt = showOnCourt;
    }
    if (assignToPlayer !== undefined) action.assignToPlayer = assignToPlayer;
    if (hasRating !== undefined) action.hasRating = hasRating;
  }
  saveConfig(config);
  return config;
}

export function updateDefaultActionConfig(key: string, assignToPlayer?: boolean, hasDirection?: boolean, hasRating?: boolean): ActionsConfig {
  const config = getConfig();
  if (!config.defaultActionsConfig) {
    config.defaultActionsConfig = {};
  }

  if (!config.defaultActionsConfig[key]) {
    config.defaultActionsConfig[key] = {};
  }

  const overrides = config.defaultActionsConfig[key];
  if (hasDirection !== undefined) overrides.hasDirection = hasDirection;
  if (hasDirection) {
    overrides.showOnCourt = true;
  }
  if (assignToPlayer !== undefined) overrides.assignToPlayer = assignToPlayer;
  if (hasRating !== undefined) overrides.hasRating = hasRating;

  saveConfig(config);
  return config;
}

export function deleteCustomAction(id: string): ActionsConfig {
  const config = getConfig();
  config.customActions = config.customActions.filter(a => a.id !== id);
  saveConfig(config);
  return config;
}

// Advantage rule not needed for volleyball-only, but keep stubs for compatibility
export function getAdvantageRule(_sport: SportType): boolean { return true; }
export function setAdvantageRule(_sport: SportType, _value: boolean): void { }
export function hydrateAdvantageRule(_cloud: any) { }

export function getCustomActionRealKey(customAction: CustomAction): ActionType {
  const otherKeys = OTHER_ACTION_KEYS[customAction.sport];
  if (customAction.category === 'neutral') return otherKeys.neutral;
  return customAction.category === 'scored' ? otherKeys.scored : otherKeys.fault;
}

export function getVisibleActions(
  sport: SportType, category: PointType,
  defaultActions: { key: string; label: string; points?: number; customId?: string; hasRating?: boolean }[]
): { key: string; label: string; points?: number; customId?: string; sigil?: string; showOnCourt?: boolean; hasDirection?: boolean; hasRating?: boolean }[] {
  const config = getConfig();
  const visible = defaultActions.filter(a => !config.hiddenActions.includes(a.key)).map(a => {
    const overrides = config.defaultActionsConfig?.[a.key] || {};
    return {
      ...a,
      assignToPlayer: overrides.assignToPlayer ?? true, // Default true for actions requiring assigning
      hasDirection: overrides.hasDirection ?? false,
      showOnCourt: overrides.showOnCourt ?? overrides.hasDirection ?? false,
      hasRating: overrides.hasRating ?? a.hasRating ?? (['attack'].includes(a.key) || ['Réception', 'Passe', 'Service', 'Attaque', 'Défense', 'Block', 'block'].includes(a.label))
    };
  });
  const customs = config.customActions
    .filter(c => c.sport === sport && c.category === category && !config.hiddenActions.includes(c.id))
    .map(c => ({
      key: getCustomActionRealKey(c), label: c.label, customId: c.id,
      ...(c.sigil ? { sigil: c.sigil } : {}),
      ...(c.showOnCourt != null ? { showOnCourt: c.showOnCourt } : {}),
      ...(c.assignToPlayer != null ? { assignToPlayer: c.assignToPlayer } : {}),
      ...(c.hasDirection ? { hasDirection: true } : {}),
      hasRating: c.hasRating ?? ['Réception', 'Passe', 'Service', 'Attaque', 'Défense'].includes(c.label),
    }));
  return [...visible, ...customs];
}
