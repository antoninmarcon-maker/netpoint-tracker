import { Shield } from 'lucide-react';

export default function Privacy() {
  return (
    <div className="overflow-auto p-5 max-w-lg mx-auto w-full space-y-8">
      <section className="flex items-center gap-3">
        <Shield size={32} className="text-primary shrink-0" />
        <div>
          <h2 className="text-2xl font-black text-foreground tracking-tight">Privacy Policy</h2>
          <p className="text-xs text-muted-foreground">Last updated: March 20, 2026</p>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-bold text-foreground">What data we collect</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          When you sign in with Google, we receive your <strong className="text-foreground">email address</strong>, <strong className="text-foreground">display name</strong>, and <strong className="text-foreground">profile picture</strong> from your Google account. We use this information solely to create and manage your My Volley account.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-bold text-foreground">How we use your data</h3>
        <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
          <li>Authenticate you and maintain your session</li>
          <li>Display your name and avatar in the app</li>
          <li>Sync your match history and settings across devices</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-bold text-foreground">Data storage</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Your data is stored securely on <strong className="text-foreground">Supabase</strong> (hosted on AWS). Match data, player profiles, and settings are associated with your account. We do not sell or share your personal data with third parties.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-bold text-foreground">Third-party services</h3>
        <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
          <li><strong className="text-foreground">Google OAuth</strong> — authentication only</li>
          <li><strong className="text-foreground">Supabase</strong> — database and auth backend</li>
          <li><strong className="text-foreground">Vercel</strong> — hosting and serverless functions</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-bold text-foreground">Your rights</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          You can request deletion of your account and all associated data at any time by contacting us. Upon deletion, all your personal data, match history, and settings will be permanently removed.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-bold text-foreground">Contact</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          For any questions about this privacy policy or to request data deletion, reach out via the feedback form in the app or email us at <a href="mailto:contact@my-volley.com" className="text-primary underline underline-offset-2">contact@my-volley.com</a>.
        </p>
      </section>

      <section className="pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          This policy applies to the My Volley web application.
        </p>
      </section>
    </div>
  );
}
