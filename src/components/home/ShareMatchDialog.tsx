import { useState } from 'react';
import { Share2, Copy, LinkIcon, FileSpreadsheet } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { MatchSummary } from '@/types/sports';
import { handleShareNative, handleCopyScore, handleShareWhatsApp, handleShareTelegram, handleShareX, resolveShareUrl } from '@/lib/shareUtils';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface ShareMatchDialogProps {
  match: MatchSummary | null;
  onClose: () => void;
  isLoggedIn: boolean;
}

export function ShareMatchDialog({ match, onClose, isLoggedIn }: ShareMatchDialogProps) {
  const { t } = useTranslation();
  const [generatingShareLink, setGeneratingShareLink] = useState(false);
  const [shareLinkUrl, setShareLinkUrl] = useState('');
  const [shareLinkDialogOpen, setShareLinkDialogOpen] = useState(false);

  const handleGenerateShareLink = async (m: MatchSummary) => {
    if (!isLoggedIn) { toast.error(t('heatmap.loginForLink')); return; }
    setGeneratingShareLink(true);
    try {
      const url = await resolveShareUrl(m.id, true);
      if (!url) throw new Error('No token');
      setShareLinkUrl(url);
      onClose();
      setShareLinkDialogOpen(true);
    } catch {
      toast.error(t('heatmap.linkError'));
    } finally {
      setGeneratingShareLink(false);
    }
  };

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLinkUrl);
      toast.success(t('heatmap.linkCopied'));
    } catch {
      toast.error(t('heatmap.linkCopyError'));
    }
  };

  return (
    <>
      <Dialog open={!!match} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 size={18} /> {t('home.shareMatch', 'Partager le match')}
            </DialogTitle>
            {match && (
              <DialogDescription>
                {match.teamNames.blue} vs {match.teamNames.red}
              </DialogDescription>
            )}
          </DialogHeader>
          {match && (
            <div className="space-y-2">
              <button onClick={() => { handleShareNative(match, t, isLoggedIn); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm font-medium transition-all">
                <Share2 size={16} className="text-muted-foreground" /> {t('heatmap.shareDots', 'Partager...')}
              </button>
              <button onClick={() => handleShareWhatsApp(match, t, isLoggedIn)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm font-medium transition-all">
                <span className="text-base">{'\u{1F4AC}'}</span> WhatsApp
              </button>
              <button onClick={() => handleShareTelegram(match, t, isLoggedIn)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm font-medium transition-all">
                <span className="text-base">{'\u2708\uFE0F'}</span> Telegram
              </button>
              <button onClick={() => handleShareX(match, t, isLoggedIn)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm font-medium transition-all">
                <span className="text-base">{'\uD835\uDD4F'}</span> X (Twitter)
              </button>
              <div className="h-px bg-border my-1" />
              <button onClick={() => handleCopyScore(match, t)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm font-medium transition-all">
                <Copy size={16} className="text-muted-foreground" /> {t('heatmap.copyScore', 'Copier le score')}
              </button>
              <button onClick={async () => { const { exportMatchToExcel } = await import('@/lib/excelExport'); exportMatchToExcel(match.completedSets, match.points, match.currentSetNumber, match.teamNames, match.players || []); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm font-medium transition-all">
                <FileSpreadsheet size={16} className="text-muted-foreground" /> {t('heatmap.excelXlsx', 'Excel (.xlsx)')}
              </button>
              {isLoggedIn && (
                <button onClick={() => handleGenerateShareLink(match)} disabled={generatingShareLink} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-sm font-semibold transition-all">
                  <LinkIcon size={16} /> {generatingShareLink ? t('heatmap.generatingLink', 'Generation...') : t('heatmap.shareLink', '\uD83D\uDD17 Lien de partage')}
                </button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Share Link Ready Dialog */}
      <Dialog open={shareLinkDialogOpen} onOpenChange={setShareLinkDialogOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t('heatmap.linkReadyTitle')}</DialogTitle>
            <DialogDescription>{t('heatmap.linkReadyDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <input readOnly value={shareLinkUrl} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" />
            <div className="flex gap-2">
              <button onClick={handleCopyShareLink} className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all">
                {t('heatmap.copyLink')}
              </button>
              <button onClick={() => window.open(shareLinkUrl, '_blank', 'noopener,noreferrer')} className="flex-1 py-2.5 rounded-lg bg-secondary text-secondary-foreground text-sm font-semibold hover:bg-secondary/80 transition-all">
                {t('heatmap.openSharedPage')}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
