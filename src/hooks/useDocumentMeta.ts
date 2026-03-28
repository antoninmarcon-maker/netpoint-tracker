import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const BASE_URL = 'https://www.my-volley.com';

interface DocumentMetaOptions {
  titleKey: string;
  descriptionKey?: string;
  path: string;
}

export function useDocumentMeta({ titleKey, descriptionKey, path }: DocumentMetaOptions) {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    document.title = t(titleKey);
  }, [t, titleKey]);

  useEffect(() => {
    if (!descriptionKey) return;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute('content', t(descriptionKey));
    }
  }, [t, descriptionKey]);

  useEffect(() => {
    const link = document.querySelector('link[rel="canonical"]');
    if (link) {
      link.setAttribute('href', `${BASE_URL}${path}`);
    }
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) {
      ogUrl.setAttribute('content', `${BASE_URL}${path}`);
    }
  }, [path]);

  useEffect(() => {
    const title = t(titleKey);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', title);
    const twTitle = document.querySelector('meta[name="twitter:title"]');
    if (twTitle) twTitle.setAttribute('content', title);
  }, [t, titleKey]);

  useEffect(() => {
    if (!descriptionKey) return;
    const desc = t(descriptionKey);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', desc);
    const twDesc = document.querySelector('meta[name="twitter:description"]');
    if (twDesc) twDesc.setAttribute('content', desc);
  }, [t, descriptionKey]);

  useEffect(() => {
    document.documentElement.lang = i18n.resolvedLanguage || i18n.language || 'fr';
  }, [i18n.resolvedLanguage, i18n.language]);
}
