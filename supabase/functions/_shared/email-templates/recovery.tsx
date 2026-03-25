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

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
  lang?: 'fr' | 'en'
}

const t = {
  fr: {
    preview: 'Réinitialisez votre mot de passe My Volley',
    heading: 'Réinitialiser votre mot de passe',
    body: 'Vous avez demandé à réinitialiser votre mot de passe My Volley. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.',
    cta: 'Réinitialiser le mot de passe',
    footer: "Si vous n'avez pas fait cette demande, ignorez cet email. Votre mot de passe ne sera pas modifié.",
  },
  en: {
    preview: 'Reset your My Volley password',
    heading: 'Reset your password',
    body: 'You requested a password reset for your My Volley account. Click the button below to choose a new one.',
    cta: 'Reset password',
    footer: "If you didn't make this request, ignore this email. Your password will not be changed.",
  },
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
  lang = 'fr',
}: RecoveryEmailProps) => {
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

export default RecoveryEmail
