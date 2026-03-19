import { Link } from 'react-router-dom';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const helpSections: { titleKey: string; descKeys: string[] }[] = [
  { titleKey: 'help.scoringTitle', descKeys: ['help.scoringP1', 'help.scoringP2'] },
  { titleKey: 'help.heatmapTitle', descKeys: ['help.heatmapP1', 'help.heatmapP2'] },
  { titleKey: 'help.teamTitle', descKeys: ['help.teamP1', 'help.teamP2'] },
  { titleKey: 'help.exportTitle', descKeys: ['help.exportDesc'] },
  { titleKey: 'help.playersTitle', descKeys: ['help.playersDesc'] },
  { titleKey: 'help.actionsTitle', descKeys: ['help.actionsDesc'] },
  { titleKey: 'help.perfModeTitle', descKeys: ['help.perfModeDesc'] },
  { titleKey: 'help.tournamentsTitle', descKeys: ['help.tournamentsDesc'] },
  { titleKey: 'help.aiAnalysisTitle', descKeys: ['help.aiAnalysisDesc'] },
  { titleKey: 'help.spotsTitle', descKeys: ['help.spotsDesc'] },
  { titleKey: 'help.spotFiltersTitle', descKeys: ['help.spotFiltersDesc'] },
];

export default function Help() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] border-b border-border flex items-center gap-3 bg-background">
        <Link to="/" className="p-1.5 rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-lg font-black text-foreground tracking-tight">{t('help.title')}</h1>
      </header>

      <main className="flex-1 overflow-auto p-4 max-w-2xl mx-auto w-full space-y-8">
        {helpSections.map(({ titleKey, descKeys }) => (
          <section key={titleKey}>
            <h2 className="text-xl font-bold text-foreground mb-3">{t(titleKey)}</h2>
            <div className="bg-card rounded-xl p-4 border border-border text-sm text-muted-foreground space-y-3">
              {descKeys.map(key => <p key={key}>{t(key)}</p>)}
            </div>
          </section>
        ))}

        <section className="pb-6">
          <a
            href="mailto:contact@my-volley.com"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
          >
            <MessageSquare size={16} /> {t('help.leaveFeedback')}
          </a>
        </section>
      </main>
    </div>
  );
}
