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
}

export interface ActionsConfig {
  hiddenActions: string[];
  customActions: CustomAction[];
}

function getConfig(): ActionsConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultConfig();
    return JSON.parse(raw);
  } catch { return getDefaultConfig(); }
}

function getDefaultConfig(): ActionsConfig {
  return { hiddenActions: ['other_offensive', 'other_volley_fault'], customActions: [] };
}

function saveConfig(config: ActionsConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  syncActionsToCloud(config);
}

async function syncActionsToCloud(config: ActionsConfig) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return;
    await patchCloudSettings(userId, { customActions: config.customActions, hiddenActions: config.hiddenActions });
  } catch {}
}

export function getActionsConfig(): ActionsConfig { return getConfig(); }

export function hydrateActionsConfig(cloud: { customActions?: CustomAction[]; hiddenActions?: string[] }) {
  const local = getConfig();
  const merged: ActionsConfig = { hiddenActions: cloud.hiddenActions ?? local.hiddenActions, customActions: cloud.customActions ?? local.customActions };
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
  points?: number, sigil?: string, showOnCourt?: boolean, assignToPlayer?: boolean
): ActionsConfig {
  const config = getConfig();
  config.customActions.push({
    id: crypto.randomUUID(), label: label.trim(), sport, category,
    ...(sigil ? { sigil: sigil.slice(0, 2).toUpperCase() } : {}),
    showOnCourt: showOnCourt ?? (category === 'neutral' ? false : true),
    assignToPlayer: assignToPlayer ?? true,
  });
  saveConfig(config);
  return config;
}

export function updateCustomAction(id: string, newLabel: string, points?: number, sigil?: string, showOnCourt?: boolean, assignToPlayer?: boolean): ActionsConfig {
  const config = getConfig();
  const action = config.customActions.find(a => a.id === id);
  if (action) {
    action.label = newLabel.trim();
    if (sigil !== undefined) action.sigil = sigil.slice(0, 2).toUpperCase();
    if (showOnCourt !== undefined) action.showOnCourt = showOnCourt;
    if (assignToPlayer !== undefined) action.assignToPlayer = assignToPlayer;
  }
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
export function setAdvantageRule(_sport: SportType, _value: boolean): void {}
export function hydrateAdvantageRule(_cloud: any) {}

export function getCustomActionRealKey(customAction: CustomAction): ActionType {
  const otherKeys = OTHER_ACTION_KEYS[customAction.sport];
  if (customAction.category === 'neutral') return otherKeys.neutral;
  return customAction.category === 'scored' ? otherKeys.scored : otherKeys.fault;
}

export function getVisibleActions(
  sport: SportType, category: PointType,
  defaultActions: { key: string; label: string; points?: number }[]
): { key: string; label: string; points?: number; customId?: string; sigil?: string; showOnCourt?: boolean }[] {
  const config = getConfig();
  const visible = defaultActions.filter(a => !config.hiddenActions.includes(a.key));
  const customs = config.customActions
    .filter(c => c.sport === sport && c.category === category && !config.hiddenActions.includes(c.id))
    .map(c => ({
      key: getCustomActionRealKey(c), label: c.label, customId: c.id,
      ...(c.sigil ? { sigil: c.sigil } : {}),
      ...(c.showOnCourt != null ? { showOnCourt: c.showOnCourt } : {}),
      ...(c.assignToPlayer != null ? { assignToPlayer: c.assignToPlayer } : {}),
    }));
  return [...visible, ...customs];
}
