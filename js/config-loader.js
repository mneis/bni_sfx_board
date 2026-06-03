async function fetchJson(url) {
    const response = await fetch(url);
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
