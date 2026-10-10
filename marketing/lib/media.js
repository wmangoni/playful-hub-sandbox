// Resolve a mídia de um post para caminhos de arquivo.
//   media: { clip: "<tomada>", alt }                                  vídeo gravado pelo Cineasta (+ poster)
//   media: { video: "assets/...mp4", poster: "assets/...jpg", alt }   vídeo já existente no repositório
//   media: { image: "assets/images/x.png", alt }                      só imagem
const fs = require('fs');
const path = require('path');
const { ROOT, CLIPS_DIR } = require('../config');

function resolveMedia(post) {
    const m = post.media;
    if (!m) return null;
    if (m.clip) {
        const base = path.join(CLIPS_DIR, `${m.game || post.game}--${m.clip}`);
        return { kind: 'video', video: base + '.mp4', poster: base + '.jpg', report: base + '.json', alt: m.alt, generated: true };
    }
    if (m.video) return { kind: 'video', video: path.resolve(ROOT, m.video), poster: m.poster ? path.resolve(ROOT, m.poster) : null, alt: m.alt, generated: false };
    if (m.image) return { kind: 'image', image: path.resolve(ROOT, m.image), poster: path.resolve(ROOT, m.image), alt: m.alt, generated: false };
    return null;
}

/** arquivos que precisam existir para publicar */
// o relatório (.json) do Cineasta também é exigido: ele diz se o clipe passou no controle de qualidade
const requiredFiles = (media) => (media ? [media.video, media.image, media.poster, media.generated ? media.report : null].filter(Boolean) : []);
const missingFiles = (media) => requiredFiles(media).filter((f) => !fs.existsSync(f));

// Mídia que vem do repositório só pode estar em assets/ e ter extensão de mídia: o calendário é escrito por
// agentes, e "falha fechada" não pode deixar subir package.json (ou qualquer arquivo) para uma rede social.
const ASSETS = path.join(ROOT, 'assets');
const ALLOWED_EXT = new Set(['.mp4', '.jpg', '.jpeg', '.png']);
function insideAssets(file) {
    const rel = path.relative(ASSETS, file);
    return Boolean(rel) && !rel.startsWith('..') && !path.isAbsolute(rel) && ALLOWED_EXT.has(path.extname(file).toLowerCase());
}

module.exports = { resolveMedia, requiredFiles, missingFiles, insideAssets };
