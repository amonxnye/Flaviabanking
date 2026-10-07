export type Locale = 'en-US' | 'en-GB' | 'de-DE' | 'fr-FR' | 'es-ES' | 'pt-BR' | 'ja-JP' | 'ar-SA';

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'BRL';

export interface LocaleConfig {
  code: Locale;
  name: string;
  currency: CurrencyCode;
  direction: 'ltr' | 'rtl';
}

export const SUPPORTED_LOCALES: Record<Locale, LocaleConfig> = {
  'en-US': { code: 'en-US', name: 'English (US)', currency: 'USD', direction: 'ltr' },
  'en-GB': { code: 'en-GB', name: 'English (UK)', currency: 'GBP', direction: 'ltr' },
  'de-DE': { code: 'de-DE', name: 'Deutsch', currency: 'EUR', direction: 'ltr' },
  'fr-FR': { code: 'fr-FR', name: 'Français', currency: 'EUR', direction: 'ltr' },
  'es-ES': { code: 'es-ES', name: 'Español', currency: 'EUR', direction: 'ltr' },
  'pt-BR': { code: 'pt-BR', name: 'Português (BR)', currency: 'BRL', direction: 'ltr' },
  'ja-JP': { code: 'ja-JP', name: '日本語', currency: 'JPY', direction: 'ltr' },
  'ar-SA': { code: 'ar-SA', name: 'العربية', currency: 'USD', direction: 'rtl' },
};

export function getLocaleConfig(locale?: string): LocaleConfig {
  if (locale && locale in SUPPORTED_LOCALES) {
    return SUPPORTED_LOCALES[locale as Locale];
  }
  return SUPPORTED_LOCALES['en-US'];
}

export function formatAmountLocale(amount: number, currency?: CurrencyCode, locale?: Locale): string {
  const localeConfig = getLocaleConfig(locale);
  const curr = currency || localeConfig.currency;
  const loc = locale || localeConfig.code;

  return new Intl.NumberFormat(loc, {
    style: 'currency',
    currency: curr,
    minimumFractionDigits: curr === 'JPY' ? 0 : 2,
  }).format(amount);
}

export function formatDateLocale(date: Date | string, locale?: Locale, options?: Intl.DateTimeFormatOptions): string {
  const loc = locale || 'en-US';
  const defaultOptions: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: loc === 'en-US' || loc === 'en-GB',
  };

  return new Date(date).toLocaleString(loc, options || defaultOptions);
}

export function formatDateOnlyLocale(date: Date | string, locale?: Locale): string {
  const loc = locale || 'en-US';
  return new Date(date).toLocaleDateString(loc, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
