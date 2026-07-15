// CORS proxy pre úřední desky. Niektorí poskytovatelia (e-deska.cz) neposielajú
// access-control-allow-origin, takže si feed/detail/PDF nevieme stiahnuť priamo
// z prehliadača. Proxy zároveň prekóduje text z windows-1250 / iso-8859-2 na UTF-8.
//
// Použitie: /api/fetch?url=<absolútna http(s) URL>
// Povolené sú len hostname z ALLOWED_HOSTS (aby to nebola open proxy).

var ALLOWED_HOSTS = [
    /(^|\.)imunis\.cz$/i,
    /(^|\.)e-deska\.cz$/i
];

var TEXT_TYPES = /^(text\/|application\/(rss\+xml|atom\+xml|xml|xhtml\+xml))/i;

function hostAllowed(hostname) {
    for (var i = 0; i < ALLOWED_HOSTS.length; i++) {
        if (ALLOWED_HOSTS[i].test(hostname)) return true;
    }
    return false;
}

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Type, X-Final-Url');

    var raw = req.query && req.query.url;
    if (!raw) {
        res.status(400).json({ error: 'Chybí parametr url.' });
        return;
    }

    var target;
    try {
        target = new URL(raw);
    } catch (e) {
        res.status(400).json({ error: 'Neplatná URL.' });
        return;
    }
    if (target.protocol !== 'https:' && target.protocol !== 'http:') {
        res.status(400).json({ error: 'Povoleno je jen http(s).' });
        return;
    }
    if (!hostAllowed(target.hostname)) {
        res.status(403).json({ error: 'Doména není na seznamu povolených úředních desek.' });
        return;
    }

    var upstream;
    try {
        upstream = await fetch(target.href, {
            redirect: 'follow',
            headers: {
                'User-Agent': 'qaro-edeska/1.0 (+https://qaro.cz)',
                'Accept': '*/*'
            }
        });
    } catch (e) {
        res.status(502).json({ error: 'Zdroj se nepodařilo načíst.' });
        return;
    }

    // po redirecte môže fetch skončiť na inej doméne — over aj finálnu URL
    try {
        if (!hostAllowed(new URL(upstream.url).hostname)) {
            res.status(403).json({ error: 'Cíl přesměrování není na seznamu povolených domén.' });
            return;
        }
    } catch (e) { /* upstream.url je vždy platná URL */ }

    var contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    var buf = Buffer.from(await upstream.arrayBuffer());

    if (TEXT_TYPES.test(contentType)) {
        var m = /charset=([\w-]+)/i.exec(contentType);
        var charset = (m ? m[1] : 'utf-8').toLowerCase();
        if (charset !== 'utf-8' && charset !== 'utf8') {
            try {
                var text = new TextDecoder(charset).decode(buf);
                // XML deklarácia by po prekódovaní klamala
                text = text.replace(/(<\?xml[^>]*encoding=")[^"]+(")/i, '$1utf-8$2');
                buf = Buffer.from(text, 'utf-8');
                contentType = contentType.replace(/charset=[\w-]+/i, 'charset=utf-8');
            } catch (e) { /* neznámy charset nechaj tak */ }
        }
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Final-Url', upstream.url);
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.status(upstream.status).send(buf);
};
