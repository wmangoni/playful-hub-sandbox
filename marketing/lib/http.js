// fetch com retentativa para falhas transitórias (rede, 429, 5xx). Erros de cliente (4xx) não são repetidos:
// repetir um post rejeitado só atrasaria o diagnóstico.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** caminho sem segredo: no Telegram o token fica no path (/bot<TOKEN>/metodo) */
const safePath = (url) => new URL(url).pathname.replace(/\/bot[^/]+\//, '/bot***/');

class HttpError extends Error {
    constructor(message, status, body) {
        super(message);
        this.status = status;
        this.body = body;
    }
}

// retries: use 0 em POST que cria algo sem chave de idempotência (Bluesky createRecord, Telegram send*): se o
// servidor publicou e a resposta se perdeu (502/timeout), repetir publicaria de novo.
async function request(fetchImpl, url, init = {}, { retries = 2, baseDelayMs = 1500, expect = [200, 201, 202], timeoutMs = 120000 } = {}) {
    let last;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const res = await fetchImpl(url, init.signal ? init : { ...init, signal: AbortSignal.timeout(timeoutMs) });
            if (expect.includes(res.status)) return res;
            const body = await res.text().catch(() => '');
            const err = new HttpError(`HTTP ${res.status} em ${safePath(url)}: ${body.slice(0, 300)}`, res.status, body);
            if (res.status !== 429 && res.status < 500) throw err;
            last = err;
            const retryAfter = Number(res.headers && res.headers.get && res.headers.get('retry-after'));
            await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 60) * 1000 : baseDelayMs * 2 ** attempt);
        } catch (e) {
            if (e instanceof HttpError && e.status !== 429 && e.status < 500) throw e;
            last = e;
            if (attempt < retries) await sleep(baseDelayMs * 2 ** attempt);
        }
    }
    throw last;
}

const json = async (res) => res.json();

module.exports = { request, json, HttpError, sleep, safePath };
