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

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
  lang?: 'fr' | 'en'
}

const t = {
  fr: {
    preview: 'Vous êtes invité à rejoindre My Volley',
    heading: 'Vous êtes invité ! 🏐',
    body1: 'Vous avez été invité à rejoindre',
    body2: ". Cliquez ci-dessous pour accepter l'invitation et créer votre compte.",
    cta: "Accepter l'invitation",
    footer: "Si vous n'attendiez pas cette invitation, ignorez simplement cet email.",
  },
  en: {
    preview: "You're invited to join My Volley",
    heading: "You're invited! 🏐",
    body1: "You've been invited to join",
    body2: '. Click below to accept the invitation and create your account.',
    cta: 'Accept invitation',
    footer: "If you weren't expecting this invitation, simply ignore this email.",
  },
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
  lang = 'fr',
}: InviteEmailProps) => {
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
            </Link>
            {l.body2}
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

export default InviteEmail
