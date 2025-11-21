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

/**
 * Get notifications translations for a specific language
 */
export function getNotificationTranslations(lang: 'vi' | 'en') {
    return translations[lang]?.notifications || translations.vi.notifications;
}

/**
 * Get translation for a specific key and language
 */
export function getTranslation(lang: 'vi' | 'en', key: string): string {
    const langTranslations = translations[lang] || translations.vi;
    const keys = key.split('.');
    let value: any = langTranslations;

    for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
            value = value[k];
        } else {
            // Fallback to vi if not found
            value = translations.vi;
            for (const k2 of keys) {
                if (value && typeof value === 'object' && k2 in value) {
                    value = value[k2];
                } else {
                    return key;
                }
            }
            break;
        }
    }

    return typeof value === 'string' ? value : key;
}
