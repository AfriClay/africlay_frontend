import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

type PageSeo = { title: string; description: string; path: string; image?: string; schema?: object };
const site = 'https://www.africlaymarket.com';

export const usePageSeo = ({ title, description, path, image, schema }: PageSeo): void => {
  const focused = useIsFocused();
  const structuredData = schema ? JSON.stringify(schema).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026') : '';
  useEffect(() => {
    if (Platform.OS !== 'web' || !focused || typeof document === 'undefined') return;
    const fullTitle = `${title} | AfriClay Market`;
    const cleanDescription = description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 165);
    const canonical = `${site}${path}`;
    const setMeta = (attribute: 'name' | 'property', key: string, value?: string) => {
      let node = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
      if (!value) { node?.remove(); return; }
      if (!node) { node = document.createElement('meta'); node.setAttribute(attribute, key); document.head.appendChild(node); }
      node.content = value;
    };
    document.title = fullTitle;
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
    link.href = canonical;
    setMeta('name', 'description', cleanDescription);
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', cleanDescription);
    setMeta('property', 'og:url', canonical);
    setMeta('property', 'og:site_name', 'AfriClay Market');
    setMeta('property', 'og:type', schema && 'offers' in schema ? 'product' : 'website');
    setMeta('property', 'og:image', image);
    setMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary');
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', cleanDescription);
    setMeta('name', 'twitter:image', image);
    document.head.querySelectorAll('script[type="application/ld+json"][data-africlay-seo]').forEach(node => node.remove());
    if (structuredData) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.dataset.africlaySeo = 'true';
      script.textContent = structuredData;
      document.head.appendChild(script);
    }
  }, [focused, title, description, path, image, structuredData]);
};
