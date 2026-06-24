import { APP_VERSION } from './app-version.js?v=2026.06.24.2';

async function fetchJson(url) {
    const versionedUrl = `${url}?v=${encodeURIComponent(APP_VERSION)}`;
    const response = await fetch(versionedUrl);
    if (!response.ok) {
        throw new Error(`Failed to load ${url}: ${response.status}`);
    }
    return response.json();
}

export async function loadAppResources() {
    const [config, enus, ptbr] = await Promise.all([
        fetchJson('config.json'),
        fetchJson('i18n/enus.json'),
        fetchJson('i18n/ptbr.json')
    ]);

    return {
        config,
        locales: { enus, ptbr }
    };
}
