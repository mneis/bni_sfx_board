export function t(locales, locale, path, fallback) {
    const localeData = locales[locale] || locales.enus || {};
    const value = path
        .split('.')
        .reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), localeData);

    return value !== undefined ? value : fallback;
}
