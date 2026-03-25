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

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
  lang?: 'fr' | 'en'
}

const t = {
  fr: {
    preview: "Confirmez votre changement d'email My Volley",
    heading: "Changement d'email",
    body1: "Vous avez demandé à changer votre email My Volley de",
    body2: 'vers',
    body3: 'Cliquez ci-dessous pour confirmer ce changement :',
    cta: 'Confirmer le changement',
    footer: "Si vous n'avez pas fait cette demande, sécurisez votre compte immédiatement.",
  },
  en: {
    preview: 'Confirm your My Volley email change',
    heading: 'Email change',
    body1: 'You requested to change your My Volley email from',
    body2: 'to',
    body3: 'Click below to confirm this change:',
    cta: 'Confirm change',
    footer: "If you didn't make this request, secure your account immediately.",
  },
}

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  confirmationUrl,
  lang = 'fr',
}: EmailChangeEmailProps) => {
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
            <Link href={`mailto:${email}`} style={link}>{email}</Link>{' '}
            {l.body2}{' '}
            <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>.
          </Text>
          <Text style={text}>{l.body3}</Text>
          <Button style={button} href={confirmationUrl}>
            {l.cta}
          </Button>
          <Text style={footer}>{l.footer}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export default EmailChangeEmail
