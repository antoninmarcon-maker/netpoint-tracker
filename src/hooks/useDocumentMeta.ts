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
  }, [path]);

  useEffect(() => {
    document.documentElement.lang = i18n.resolvedLanguage || i18n.language || 'fr';
  }, [i18n.resolvedLanguage, i18n.language]);
}
