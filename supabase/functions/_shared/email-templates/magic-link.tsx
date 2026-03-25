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
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

import { LOGO_URL, main, container, logo, h1, text, button, footer } from './styles.ts'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
  lang?: 'fr' | 'en'
}

const t = {
  fr: {
    preview: 'Votre lien de connexion My Volley',
    heading: 'Connexion rapide 🏐',
    body: 'Cliquez sur le bouton ci-dessous pour vous connecter à My Volley. Ce lien expire rapidement.',
    cta: 'Se connecter',
    footer: "Si vous n'avez pas demandé ce lien, ignorez simplement cet email.",
  },
  en: {
    preview: 'Your My Volley login link',
    heading: 'Quick login 🏐',
    body: 'Click the button below to sign in to My Volley. This link expires quickly.',
    cta: 'Sign in',
    footer: "If you didn't request this link, simply ignore this email.",
  },
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
  lang = 'fr',
}: MagicLinkEmailProps) => {
  const l = t[lang] || t.fr
  return (
    <Html lang={lang} dir="ltr">
      <Head />
      <Preview>{l.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img src={LOGO_URL} width="48" height="48" alt="My Volley" style={logo} />
          <Heading style={h1}>{l.heading}</Heading>
          <Text style={text}>{l.body}</Text>
          <Button style={button} href={confirmationUrl}>
            {l.cta}
          </Button>
          <Text style={footer}>{l.footer}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export default MagicLinkEmail
