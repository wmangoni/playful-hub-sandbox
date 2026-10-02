// fontes: Mountains of Christmas (títulos), IM Fell English (texto de livro antigo),
// Patrick Hand (letra à mão: números, chat) e Griffy (logotipo e placas)
import '@fontsource/mountains-of-christmas/latin-700.css';
import '@fontsource/im-fell-english/latin-400.css';
import '@fontsource/im-fell-english/latin-400-italic.css';
import '@fontsource/patrick-hand/latin-400.css';
import '@fontsource/griffy/latin-400.css';
import './ui/styles.css';
import './ui/hud.css';
import './ui/touch.css';
import { Game } from './game.js';
import { prefersTouch } from './core/touch.js';
import { BOOT_TIPS } from './quests/data.js';

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
const game = new Game(app);
// no celular as dicas falam de dedos e botões (o modo toque ainda não existe aqui: vale a tela de toque do aparelho,
// menos com "Nunca" salvo nas opções)
const tips = BOOT_TIPS[prefersTouch() && game.settings.controls !== 'off' ? 'touch' : 'desk'];
loader.innerHTML = `<div class="boot-title">Tumbalacatumba</div><div class="boot-sub">Contos do Vale Assombrado</div><div class="boot-bar"><i></i></div><div class="boot-msg">Carregando…</div><div class="boot-tip">${tips[Math.floor(Math.random() * tips.length)]}</div>`;
document.body.appendChild(loader);
const bar = loader.querySelector('i'), msg = loader.querySelector('.boot-msg');

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
