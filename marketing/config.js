// Configuração central da divulgação automatizada.
const path = require('path');

module.exports = {
    ROOT: path.resolve(__dirname, '..'),
    SITE: 'https://playfulhub.com.br',
    SITE_HOST: 'playfulhub.com.br',
    TZ: 'America/Sao_Paulo',
    CHANNELS: ['bluesky', 'mastodon', 'telegram'],

    // Limites de cada canal (caracteres/graphemas do texto final que o canal publica)
    TEXT_LIMITS: { bluesky: 300, mastodon: 500, telegram: 1024 },
    // Link na Mastodon conta sempre 23 caracteres, qualquer que seja o tamanho
    MASTODON_LINK_LENGTH: 23,
    // Tamanho máximo do thumbnail do card do Bluesky (o limite do blob de imagem é ~1 MB)
    BLUESKY_IMAGE_MAX_BYTES: 950_000,
    VIDEO_MAX_BYTES: 40 * 1024 * 1024,

    // Frequência: o Guardião reprova calendários que passem disso
    MAX_POSTS_PER_DAY_PER_CHANNEL: 2,
    MIN_HOURS_BETWEEN_POSTS_PER_CHANNEL: 4,
    // Post que ficou para trás (ex.: o workflow ficou parado) por mais que isso não é publicado:
    // melhor perder um post do que despejar vários de uma vez
    STALE_AFTER_HOURS: 36,

    MAX_HASHTAGS: 3,
    MAX_EMOJIS: 3,
    MIN_TEXT_LENGTH: 40,

    // Onde ficam os clipes gravados pelo Cineasta e o ledger (o que já foi publicado)
    CLIPS_DIR: process.env.MARKETING_CLIPS_DIR ? path.resolve(process.env.MARKETING_CLIPS_DIR) : path.resolve(__dirname, 'out/clips'),
    LEDGER_FILE: process.env.MARKETING_LEDGER || path.resolve(__dirname, '.ledger/ledger.json'),
    CALENDAR_DIR: path.resolve(__dirname, 'calendar')
};
