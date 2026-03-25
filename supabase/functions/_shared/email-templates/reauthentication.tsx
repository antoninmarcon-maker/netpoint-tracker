/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

import { LOGO_URL, main, container, logo, h1, text, codeStyle, footer } from './styles.ts'

interface ReauthenticationEmailProps {
  token: string
  lang?: 'fr' | 'en'
}

const t = {
  fr: {
    preview: 'Votre code de vérification My Volley',
    heading: 'Code de vérification',
    body: 'Utilisez le code ci-dessous pour confirmer votre identité :',
    footer: "Ce code expire rapidement. Si vous n'avez pas fait cette demande, ignorez cet email.",
  },
  en: {
    preview: 'Your My Volley verification code',
    heading: 'Verification code',
    body: 'Use the code below to confirm your identity:',
    footer: "This code expires quickly. If you didn't make this request, ignore this email.",
  },
}

export const ReauthenticationEmail = ({ token, lang = 'fr' }: ReauthenticationEmailProps) => {
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
          <Text style={codeStyle}>{token}</Text>
          <Text style={footer}>{l.footer}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export default ReauthenticationEmail
