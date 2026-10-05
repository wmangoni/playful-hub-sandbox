/**
 * Bestiário (TASK_010): os 74 combatentes do catálogo (20 monstros do SRD 3.0 e 54 fichas de
 * Holy Avenger) em cards. Cada cartão abre o card completo num popup (`ficha-card.js`).
 *
 * A URL guarda o que a tela mostra: `#/bestiario?aba=holy&q=dragao&nd=11-15&ver=troll`. Quem abre
 * o link vê a mesma busca e o mesmo card aberto.
 */
import { html, render } from '../core/dom.js';
import { normalize, plural } from '../core/format.js';
import { montarCardCatalogo } from '../rules/card30.js';
import { icon } from '../ui/icons.js';
import { emptyState, loadingState, pageHead } from '../ui/page.js';
import { toast } from '../ui/toast.js';
import { AVISO_SEM_GLOSSARIO, FAIXAS_DE_ND, carregarCatalogo, contextoDoCard, rotuloFaixa } from './card-dados.js';
import { abrirCard, cartaoCompacto } from './ficha-card.js';

const ABAS = [
  { key: 'monstros', label: 'Monstros', icone: 'flame' },
  { key: 'holy', label: 'Holy Avenger', icone: 'shield' },
];

function cabecalho() {
  return pageHead({
    eyebrow: 'Compêndio · regras 3.0',
    eyebrowIcon: 'book',
    title: 'Bestiário',
    lead: 'Os monstros do Livro dos Monstros 3.0 e os heróis de Holy Avenger, com todas as estatísticas e habilidades. Toque num card para ver a ficha completa.',
  });
}

export async function renderBestiario({ root, router, query, store }) {
  render(root, html`${cabecalho()}${loadingState(4)}`);
  let cat;
  let contexto;
  try {
    [cat, contexto] = await Promise.all([carregarCatalogo(), contextoDoCard(store)]);
  } catch {
    if (!root.isConnected) return undefined;
    render(root, html`${cabecalho()}<section class="card">${emptyState({
      glyph: 'alert',
      title: 'Não foi possível carregar o bestiário',
      text: 'O catálogo de monstros não chegou. Verifique a conexão e tente de novo.',
      action: html`<button type="button" class="btn btn--primary" data-action="recarregar">${icon('restore')}Tentar de novo</button>`,
    })}</section>`);
    root.querySelector('[data-action="recarregar"]').addEventListener('click', () => router.reload());
    return undefined;
  }
  if (!root.isConnected) return undefined;

  const listas = { monstros: cat.monstros, holy: cat.holy_avenger };
  const todos = [...cat.monstros, ...cat.holy_avenger];
  const modelos = new Map(todos.map(e => [e.id, montarCardCatalogo(e, contexto)]));
  const porId = new Map(todos.map(e => [e.id, e]));

  const pedido = query.get('ver');
  const alvo = pedido ? porId.get(pedido) : null;
  const state = {
    aba: alvo ? (alvo.categoria === 'holy_avenger' ? 'holy' : 'monstros') : query.get('aba') === 'holy' ? 'holy' : 'monstros',
    busca: query.get('q') || '',
    nd: Object.hasOwn(FAIXAS_DE_ND, query.get('nd')) ? query.get('nd') : 'todos',
    aberto: null,
  };
  let card = null;
  let vivo = true; // depois de sair da página, fechar o card não pode mexer na URL da página nova
  let recarregarDepois = false; // dados mudaram em outra aba com o card aberto: a página recarrega ao fechá-lo

  const consulta = () => ({
    aba: state.aba === 'holy' ? 'holy' : null,
    q: state.busca.trim() || null,
    nd: state.nd === 'todos' ? null : state.nd,
    ver: state.aberto,
  });
  const salvarNaUrl = () => router.replaceQuery(consulta());

  function filtrados() {
    const termo = normalize(state.busca);
    const [min, max] = FAIXAS_DE_ND[state.nd];
    return listas[state.aba]
      .filter(e => e.nd >= min && e.nd <= max)
      .filter(e => {
        if (!termo) return true;
        const m = modelos.get(e.id);
        return normalize(`${e.nome} ${e.nome_original || ''} ${m.subtitulo} ${m.identidade} ${e.resumo}`).includes(termo);
      })
      .sort((x, y) => x.nd - y.nd || x.nome.localeCompare(y.nome, 'pt-BR'));
  }

  function grade() {
    const itens = filtrados();
    const total = listas[state.aba].length;
    const contagem = itens.length === total ? plural(total, 'ficha', 'fichas') : `${itens.length} de ${plural(total, 'ficha', 'fichas')}`;
    return {
      contagem,
      corpo: itens.length
        ? html`<ul class="bst-grid">${itens.map(e => html`<li>${cartaoCompacto(modelos.get(e.id))}</li>`)}</ul>`
        : html`<div class="arena-picker__empty">${icon('search')}<p>Nenhuma ficha com esses filtros.</p></div>`,
    };
  }

  function redesenharGrade() {
    const g = grade();
    root.querySelector('[data-slot="contagem"]').textContent = g.contagem;
    render(root.querySelector('[data-slot="grade"]'), g.corpo);
  }

  function desenhar() {
    const g = grade();
    render(root, html`${cabecalho()}
      ${contexto.semGlossario ? html`<p class="fc-aviso" role="status">${icon('alert')}${AVISO_SEM_GLOSSARIO}</p>` : ''}
      <section class="card card--pad" aria-label="Fichas do bestiário">
        <div class="bst-tabs" role="tablist" aria-label="Origem das fichas">
          ${ABAS.map(a => html`<button type="button" role="tab" id="bst-aba-${a.key}" aria-controls="bst-painel" aria-selected="${String(state.aba === a.key)}" tabindex="${state.aba === a.key ? 0 : -1}" data-aba="${a.key}">${icon(a.icone)}${a.label}</button>`)}
        </div>
        <div class="bst-tools">
          <div class="search">
            <label class="visually-hidden" for="bst-busca">Buscar ficha</label>
            <div class="search__field">${icon('search')}<input class="search__input" id="bst-busca" type="search" placeholder="Buscar por nome, tipo ou classe…" value="${state.busca}" autocomplete="off" data-busca></div>
          </div>
          <label class="visually-hidden" for="bst-nd">Faixa de ND</label>
          <select class="select arena-picker__nd" id="bst-nd" data-nd>
            ${Object.keys(FAIXAS_DE_ND).map(k => html`<option value="${k}" ${state.nd === k ? 'selected' : ''}>${rotuloFaixa(k)}</option>`)}
          </select>
        </div>
        <p class="bst-count" aria-live="polite" data-slot="contagem">${g.contagem}</p>
        <div id="bst-painel" role="tabpanel" aria-labelledby="bst-aba-${state.aba}" data-slot="grade">${g.corpo}</div>
      </section>`);
  }

  function abrir(id) {
    const modelo = modelos.get(id);
    if (!modelo) return;
    card?.fechar();
    state.aberto = id;
    salvarNaUrl();
    card = abrirCard({
      modelo,
      aviso: contexto.semGlossario ? AVISO_SEM_GLOSSARIO : '',
      aoFechar: () => {
        card = null;
        state.aberto = null;
        if (!vivo) return;
        salvarNaUrl();
        if (recarregarDepois) router.reload();
      },
    });
  }

  root.addEventListener('click', event => {
    const aba = event.target.closest('[data-aba]');
    if (aba) {
      state.aba = aba.dataset.aba;
      salvarNaUrl();
      desenhar();
      root.querySelector(`[data-aba="${state.aba}"]`).focus();
      return;
    }
    const cartao = event.target.closest('[data-abrir]');
    if (cartao) abrir(cartao.dataset.abrir);
  });
  root.addEventListener('keydown', event => {
    const aba = event.target.closest?.('[data-aba]');
    if (!aba || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const i = ABAS.findIndex(a => a.key === state.aba);
    const vai = { Home: 0, End: ABAS.length - 1 }[event.key] ?? (i + (event.key === 'ArrowRight' ? 1 : ABAS.length - 1)) % ABAS.length;
    state.aba = ABAS[vai].key;
    salvarNaUrl();
    desenhar();
    root.querySelector(`[data-aba="${state.aba}"]`).focus();
  });
  root.addEventListener('input', event => {
    if (event.target.matches('[data-busca]')) {
      state.busca = event.target.value;
      salvarNaUrl();
      redesenharGrade();
    }
  });
  root.addEventListener('change', event => {
    if (event.target.matches('[data-nd]')) {
      state.nd = event.target.value;
      salvarNaUrl();
      redesenharGrade();
    }
  });

  desenhar();
  if (pedido && !alvo) {
    toast({ type: 'warning', title: 'Ficha não encontrada', message: 'O link pedia uma ficha que não está no bestiário.' });
    salvarNaUrl();
  } else if (alvo) {
    abrir(alvo.id);
  }
  const cleanup = () => {
    vivo = false;
    card?.fechar();
  };
  // o app não recarrega a página (outra aba, "Restaurar tudo") com o card aberto: marca a recarga (`adiar`)
  cleanup.ocupada = () => Boolean(card);
  cleanup.adiar = () => {
    recarregarDepois = true;
  };
  cleanup.avisoAdiado = 'O Bestiário se atualiza quando você fechar o card.';
  return cleanup;
}
