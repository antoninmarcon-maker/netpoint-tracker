import { MatchSummary } from '@/types/sports';
import { generateShareToken } from '@/lib/cloudStorage';
import { toast } from 'sonner';
import { TFunction } from 'i18next';

export function getMatchScoreText(match: MatchSummary, t: TFunction): string {
  const setsWon = { blue: 0, red: 0 };
  const setDetails: string[] = [];
  for (const s of match.completedSets) {
    if (s.winner === 'blue') setsWon.blue++;
    else if (s.winner === 'red') setsWon.red++;
    setDetails.push(`${s.score.blue}-${s.score.red}`);
  }
  const pts = match.points || [];
  const curBlue = pts.filter(p => p.team === 'blue').length;
  const curRed = pts.filter(p => p.team === 'red').length;
  if (!match.finished && (curBlue > 0 || curRed > 0)) {
    setDetails.push(`${curBlue}-${curRed}*`);
  }

  let text = `\u{1F3D0} ${match.teamNames.blue} vs ${match.teamNames.red}\n`;
  text += `${t('common.sets', 'Sets')}: ${setsWon.blue} - ${setsWon.red}`;
  if (setDetails.length > 0) {
    text += ` (${setDetails.join(', ')})`;
  }
  if (match.finished) text += ` \u2705`;
  return text;
}

export async function resolveShareUrl(matchId: string, isLoggedIn: boolean): Promise<string | null> {
  if (!isLoggedIn) return null;
  try {
    const token = await generateShareToken(matchId);
    if (!token) return null;
    return `https://www.my-volley.com/shared/${token}`;
  } catch {
    return null;
  }
}

export async function getShareText(match: MatchSummary, t: TFunction, isLoggedIn: boolean): Promise<string> {
  const score = getMatchScoreText(match, t);
  const url = await resolveShareUrl(match.id, isLoggedIn);
  return url ? `${score}\n${url}` : score;
}

export async function handleShareNative(match: MatchSummary, t: TFunction, isLoggedIn: boolean): Promise<void> {
  const text = await getShareText(match, t, isLoggedIn);
  const url = await resolveShareUrl(match.id, isLoggedIn);
  if (navigator.share) {
    try {
      await navigator.share({ title: `${match.teamNames.blue} vs ${match.teamNames.red}`, text, ...(url ? { url } : {}) });
    } catch { /* user cancelled */ }
  } else {
    navigator.clipboard.writeText(text)
      .then(() => toast.success(t('heatmap.linkCopied')))
      .catch(() => {});
  }
}

export function handleCopyScore(match: MatchSummary, t: TFunction): void {
  navigator.clipboard.writeText(getMatchScoreText(match, t))
    .then(() => toast.success(t('heatmap.linkCopied')))
    .catch(() => toast.error(t('heatmap.linkCopyError')));
}

export async function handleShareWhatsApp(match: MatchSummary, t: TFunction, isLoggedIn: boolean): Promise<void> {
  const text = await getShareText(match, t, isLoggedIn);
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
}

export async function handleShareTelegram(match: MatchSummary, t: TFunction, isLoggedIn: boolean): Promise<void> {
  const text = await getShareText(match, t, isLoggedIn);
  window.open(`https://t.me/share/url?url=${encodeURIComponent(' ')}&text=${encodeURIComponent(text)}`, '_blank');
}

export async function handleShareX(match: MatchSummary, t: TFunction, isLoggedIn: boolean): Promise<void> {
  const text = await getShareText(match, t, isLoggedIn);
  window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
}
