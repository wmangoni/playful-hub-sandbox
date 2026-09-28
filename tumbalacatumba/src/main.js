// fontes: Mountains of Christmas (títulos), IM Fell English (texto de livro antigo),
// Patrick Hand (letra à mão: números, chat) e Griffy (logotipo e placas)
import '@fontsource/mountains-of-christmas/latin-700.css';
import '@fontsource/im-fell-english/latin-400.css';
import '@fontsource/im-fell-english/latin-400-italic.css';
import '@fontsource/patrick-hand/latin-400.css';
import '@fontsource/griffy/latin-400.css';
import './ui/styles.css';
import './ui/hud.css';
import { Game } from './game.js';

// guarda erros para diagnóstico (window.__errors)
window.__errors = [];
for (const k of ['error', 'warn']) {
  const orig = console[k].bind(console);
  console[k] = (...a) => {
    window.__errors.push(`[${k}] ` + a.map((x) => (x instanceof Error ? x.message : String(x))).join(' '));
    orig(...a);
  };
}
window.addEventListener('error', (e) => window.__errors.push('[uncaught] ' + e.message));

const app = document.getElementById('app');
const fade = document.createElement('div');
fade.id = 'fade';
document.body.appendChild(fade);
const loader = document.createElement('div');
loader.id = 'boot';
const tips = [
  'Dica: segure o botão direito do mouse para girar a câmera e o personagem ao mesmo tempo.',
  'Dica: um ! cor de abóbora sobre alguém indica uma missão. Um ? cor de abóbora, missão pronta para entregar.',
  'Dica: vaga-lumes só aparecem à noite. O coveiro deixa você cochilar até escurecer.',
  'Dica: a Lápide de Regresso (tecla 6) leva você de volta à praça.',
  'Dica: aperte R para correr sozinho e M para abrir o mapa.',
  'Dica: aperte 7 (ou clique com o botão direito numa criatura) para dar uma Lanternada.',
  'Dica: o nível das criaturas de cada região aparece no mapa (M). Comece pela Colina Espiral e pelo Sítio.',
  'Curiosidade: o Prefeito Abóbora tem duas caras. Literalmente.',
];
loader.innerHTML = `<div class="boot-title">Tumbalacatumba</div><div class="boot-sub">Contos do Vale Assombrado</div><div class="boot-bar"><i></i></div><div class="boot-msg">Carregando…</div><div class="boot-tip">${tips[Math.floor(Math.random() * tips.length)]}</div>`;
document.body.appendChild(loader);
const bar = loader.querySelector('i'), msg = loader.querySelector('.boot-msg');

const game = new Game(app);
game
  .init((p, m) => {
    bar.style.width = `${Math.round(p * 100)}%`;
    if (m) msg.textContent = m;
  })
  .then(() => {
    loader.classList.add('gone');
    setTimeout(() => loader.remove(), 800);
    game.start();
  })
  .catch((e) => {
    console.error(e);
    msg.textContent = 'Erro ao iniciar: ' + e.message;
  });
