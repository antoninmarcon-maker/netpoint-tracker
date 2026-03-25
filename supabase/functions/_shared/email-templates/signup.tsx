/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

import { LOGO_URL, main, container, logo, h1, text, link, button, footer } from './styles.ts'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  lang?: 'fr' | 'en'
}

const t = {
  fr: {
    preview: 'Confirmez votre email pour My Volley',
    heading: 'Bienvenue sur My Volley ! 🏐',
    body1: 'Merci de vous être inscrit sur',
    body2: '— votre outil de scouting et statistiques volleyball.',
    body3: 'Confirmez votre adresse email (',
    body4: ') pour commencer à tracker vos matchs :',
    cta: 'Confirmer mon email',
    footer: "Si vous n'avez pas créé de compte, vous pouvez ignorer cet email.",
  },
  en: {
    preview: 'Confirm your email for My Volley',
    heading: 'Welcome to My Volley! 🏐',
    body1: 'Thank you for signing up on',
    body2: '— your volleyball scouting & statistics tool.',
    body3: 'Confirm your email address (',
    body4: ') to start tracking your matches:',
    cta: 'Confirm my email',
    footer: "If you didn't create an account, you can safely ignore this email.",
  },
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
  lang = 'fr',
}: SignupEmailProps) => {
  const l = t[lang] || t.fr
  return (
    <Html lang={lang} dir="ltr">
      <Head />
      <Preview>{l.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img src={LOGO_URL} width="48" height="48" alt="My Volley" style={logo} />
          <Heading style={h1}>{l.heading}</Heading>
          <Text style={text}>
            {l.body1}{' '}
            <Link href={siteUrl} style={link}>
              <strong>My Volley</strong>
            </Link>{' '}
            {l.body2}
          </Text>
          <Text style={text}>
            {l.body3}
            <Link href={`mailto:${recipient}`} style={link}>
              {recipient}
            </Link>
            {l.body4}
          </Text>
          <Button style={button} href={confirmationUrl}>
            {l.cta}
          </Button>
          <Text style={footer}>{l.footer}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export default SignupEmail
