import vi from './vi.json';
import en from './en.json';

const translations = { vi, en };

type NestedKeys<T> = T extends object
    ? {
          [K in keyof T]: K extends string
              ? T[K] extends object
                  ? `${K}.${NestedKeys<T[K]>}`
                  : K
              : never;
      }[keyof T]
    : never;

export type TranslationKey = NestedKeys<typeof vi>;

export function getLang(Astro: any) {
    return (Astro.params.lang || 'vi') as 'vi' | 'en';
}

function getNestedValue(obj: any, path: string): string {
    const keys = path.split('.');
    let value = obj;
    for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
            value = value[key];
        } else {
            return path; // fallback to key if not found
        }
    }
    return typeof value === 'string' ? value : path;
}

export function getTranslations(Astro: any) {
    const lang = getLang(Astro);
    const t = (key: TranslationKey): string => {
        const langTranslations = translations[lang] || translations.vi;
        const value = getNestedValue(langTranslations, key);
        // If not found in current lang, try vi as fallback
        if (value === key) {
            return getNestedValue(translations.vi, key);
        }
        return value;
    };
    return t;
}

export function getStaticPaths() {
    return [{ params: { lang: 'vi' } }, { params: { lang: 'en' } }];
}

export function getPathWithLang(Astro: any) {
    const lang = getLang(Astro);
    return (path: string) =>
        `/${lang}${path.startsWith('/') ? path : `/${path}`}`;
}

export function useTranslate(Astro: any) {
    const lang = getLang(Astro);
    const t = getTranslations(Astro);
    const l = getPathWithLang(Astro);
    return { lang, t, l };
}
