import { Mail, MessageSquare } from 'lucide-react';
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
    <div className="p-4 max-w-2xl mx-auto w-full space-y-8 pb-8">
      <div>
        <h1 className="text-2xl font-black text-foreground tracking-tight">{t('help.title')}</h1>
      </div>

      {/* Contact CTA */}
      <section className="rounded-2xl border border-accent/30 bg-accent/5 p-5 space-y-3">
        <h2 className="text-lg font-bold text-foreground">{t('help.contactTitle')}</h2>
        <p className="text-sm text-muted-foreground">{t('help.contactDesc')}</p>
        <a
          href="mailto:contact@myvolley.app"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-accent-foreground font-semibold text-sm hover:brightness-110 transition-all"
        >
          <Mail size={16} />
          {t('help.contactCta')}
        </a>
        <p className="text-xs text-muted-foreground/70">{t('help.contactHint')}</p>
      </section>

      {/* FAQ sections */}
      {helpSections.map(({ titleKey, descKeys }) => (
        <section key={titleKey}>
          <h2 className="text-xl font-bold text-foreground mb-3">{t(titleKey)}</h2>
          <div className="bg-card rounded-xl p-4 border border-border text-sm text-muted-foreground space-y-3">
            {descKeys.map(key => <p key={key}>{t(key)}</p>)}
          </div>
        </section>
      ))}

      {/* Bottom feedback CTA */}
      <section className="pb-2">
        <a
          href="mailto:contact@myvolley.app"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
        >
          <MessageSquare size={16} /> {t('help.leaveFeedback')}
        </a>
      </section>
    </div>
  );
}
