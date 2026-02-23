import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, ExternalLink, Dribbble, Circle, Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function Credits() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 bg-background px-4 py-3 border-b border-border flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="p-1.5 rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-bold text-foreground">{t('credits.title')}</h1>
      </header>

      <main className="flex-1 overflow-auto p-5 max-w-lg mx-auto w-full space-y-8">
        {/* Histoire */}
        <section className="space-y-4">
          <h2 className="text-2xl font-black text-foreground tracking-tight">{t('credits.storyTitle')}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{t('credits.storyP1')}</p>
          <p className="text-sm leading-relaxed text-muted-foreground">{t('credits.storyP2')}</p>
        </section>

        {/* Soutenir */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-foreground">{t('credits.supportTitle')}</h2>
          <p className="text-sm text-muted-foreground">{t('credits.supportDesc')}</p>
          <a
            href="https://paypal.me/plantBeta"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-center gap-2.5 w-full py-3.5 rounded-2xl font-bold text-sm text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg"
            style={{ background: 'linear-gradient(135deg, hsl(35, 90%, 50%), hsl(15, 85%, 55%))' }}
          >
            <Heart size={18} className="transition-transform duration-300 group-hover:scale-110" />
            {t('credits.supportButton')}
            <ExternalLink size={14} className="opacity-60" />
          </a>
        </section>

        {/* Écosystème */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-foreground">{t('credits.ecosystemTitle')}</h2>
          <div className="grid gap-3">
            <a href="https://sport-tracker-global.lovable.app/" target="_blank" rel="noopener noreferrer">
              <Card className="relative overflow-hidden hover:bg-accent/50 transition-colors">
                <CardContent className="flex items-start gap-3 p-4">
                  <Dribbble size={24} className="text-orange-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-foreground">My Basket</p>
                      <Badge className="text-[10px] px-1.5 py-0 bg-primary text-primary-foreground">{t('credits.new')}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{t('credits.basketDesc')}</p>
                  </div>
                  <ExternalLink size={14} className="text-muted-foreground shrink-0 mt-1" />
                </CardContent>
              </Card>
            </a>

            <a href="https://sport-tracker-global.lovable.app/" target="_blank" rel="noopener noreferrer">
              <Card className="relative overflow-hidden hover:bg-accent/50 transition-colors">
                <CardContent className="flex items-start gap-3 p-4">
                  <Circle size={24} className="text-yellow-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-foreground">My Tennis</p>
                      <Badge className="text-[10px] px-1.5 py-0 bg-primary text-primary-foreground">{t('credits.new')}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{t('credits.tennisDesc')}</p>
                  </div>
                  <ExternalLink size={14} className="text-muted-foreground shrink-0 mt-1" />
                </CardContent>
              </Card>
            </a>

            <a href="https://sport-tracker-global.lovable.app/" target="_blank" rel="noopener noreferrer">
              <Card className="relative overflow-hidden hover:bg-accent/50 transition-colors">
                <CardContent className="flex items-start gap-3 p-4">
                  <Activity size={24} className="text-blue-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-foreground">My Padel</p>
                      <Badge className="text-[10px] px-1.5 py-0 bg-primary text-primary-foreground">{t('credits.new')}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{t('credits.padelDesc')}</p>
                  </div>
                  <ExternalLink size={14} className="text-muted-foreground shrink-0 mt-1" />
                </CardContent>
              </Card>
            </a>
          </div>
        </section>

        {/* Crédit technique */}
        <section className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">{t('credits.techNote')}</p>
        </section>
      </main>
    </div>
  );
}
