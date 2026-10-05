/** Home: boas-vindas originais, atalhos do compêndio e explicação dos dados. */
import { html, render } from '../core/dom.js';
import { plural } from '../core/format.js';
import { ENTITIES } from '../entities/index.js';
import { icon } from '../ui/icons.js';
import { pageHead } from '../ui/page.js';
import { BRAND_MARK } from '../ui/shell.js';

const SUMMARY = {
  personagens: 'Heróis da sua mesa, com atributos, tendência e pontos de vida.',
  classes: 'Classes básicas e de prestígio, com dado de vida, BBA e resistências.',
  talentos: 'O códice de talentos: tipos, pré-requisitos, benefício e normal.',
  pericias: 'Atributo-chave, uso sem treinamento e perícias de cada classe.',
  races: 'Ajustes de atributo, tamanho e classe favorecida.',
};

export async function renderHome({ root, store }) {
  const counts = await Promise.all(ENTITIES.map(e => store.count(e.table).catch(() => null)));
  const modified = store.modifiedTables();
  if (!root.isConnected) return;

  render(root, html`
    <section class="hero">
      <div class="hero__mark" aria-hidden="true">${BRAND_MARK}</div>
      ${pageHead({
        eyebrow: 'Forja de Heróis · D&D 3ª edição',
        eyebrowIcon: 'flame',
        title: 'Bem-vindo ao D&D Make Character!',
        lead: 'Este sistema permite a você criar de forma rápida e intuitiva um personagem do zero usando todas as regras do aclamado D&D 3.0.',
        actions: html`
          <a class="btn btn--primary" href="#/personagens/novo">${icon('plus')}Novo Personagem</a>
          <a class="btn btn--outline" href="#/classes">${icon('book')}Explorar o compêndio</a>`,
      })}
    </section>

    <section class="home-section" aria-labelledby="h-compendio">
      <div class="section-title">
        <h2 id="h-compendio">Selecione a opção desejada</h2>
      </div>
      <ul class="tile-grid">
        ${ENTITIES.map((entity, i) => html`<li>
          <a class="tile" href="#/${entity.slug}">
            <span class="tile__icon">${icon(entity.icon)}</span>
            <span class="tile__body">
              <span class="tile__title">${entity.names.plural}</span>
              <span class="tile__text">${SUMMARY[entity.table]}</span>
            </span>
            <span class="tile__meta">
              <span class="tile__count">${counts[i] == null ? '—' : plural(counts[i], 'registro', 'registros')}</span>
              ${modified.includes(entity.table) ? html`<span class="badge">Cópia local</span>` : ''}
            </span>
            <span class="tile__go" aria-hidden="true">${icon('chevron-right')}</span>
          </a>
        </li>`)}
        <li>
          <a class="tile" href="#/arena">
            <span class="tile__icon">${icon('arena')}</span>
            <span class="tile__body">
              <span class="tile__title">Arena</span>
              <span class="tile__text">Seus personagens, monstros do Livro dos Monstros 3.0 e heróis de Holy Avenger lutam pelas regras 3.0, rolagem por rolagem.</span>
            </span>
            <span class="tile__meta"><span class="badge badge--ember">Simulador de combate</span></span>
            <span class="tile__go" aria-hidden="true">${icon('chevron-right')}</span>
          </a>
        </li>
        <li>
          <a class="tile" href="#/bestiario">
            <span class="tile__icon">${icon('skull')}</span>
            <span class="tile__body">
              <span class="tile__title">Bestiário</span>
              <span class="tile__text">Os monstros do Livro dos Monstros 3.0 e os heróis de Holy Avenger em cards, com todas as estatísticas e habilidades.</span>
            </span>
            <span class="tile__meta"><span class="badge badge--arcane">Fichas de combate</span></span>
            <span class="tile__go" aria-hidden="true">${icon('chevron-right')}</span>
          </a>
        </li>
      </ul>
    </section>

    <section class="home-section card card--pad lore-card" aria-labelledby="h-dados">
      <div class="lore-card__icon" aria-hidden="true">${icon('scroll')}</div>
      <div>
        <h2 id="h-dados" class="lore-card__title">Como seus dados são guardados</h2>
        <p>Os registros vêm do banco de dados original do sistema, publicado aqui como <strong>arquivos somente leitura</strong>. Quando você cria, edita ou exclui algo, o sistema copia automaticamente a tabela correspondente para o <strong>armazenamento local do seu navegador</strong> e aplica a alteração nessa cópia. Os dados originais nunca são modificados.</p>
        <p class="lore-card__hint">Para desfazer tudo, use <strong>Restaurar originais</strong> na lista de cada módulo ou <strong>Restaurar tudo</strong> no menu lateral.</p>
      </div>
    </section>`);
}
