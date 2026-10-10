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
const requiredFiles = (media) => (media ? [media.video, media.image, media.poster].filter(Boolean) : []);
const missingFiles = (media) => requiredFiles(media).filter((f) => !fs.existsSync(f));

module.exports = { resolveMedia, requiredFiles, missingFiles };
