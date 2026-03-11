import { toast } from 'sonner';

const LIMIT = 10;
const STORAGE_KEY = 'myvolley_daily_actions';

export function checkAndIncrementRateLimit(): boolean {
  const today = new Date().toISOString().split('T')[0];
  let data = { date: today, count: 0 };
  
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.date === today) {
        data = parsed;
      }
    }
  } catch (e) {}

  if (data.count >= LIMIT) {
    toast.error(`Limite d'actions journalière atteinte (${LIMIT}/jour). Afin d'éviter les abus, revenez demain !`);
    return false;
  }

  data.count += 1;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return true;
}
