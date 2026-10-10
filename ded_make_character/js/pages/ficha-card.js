/**
 * O card de combatente na tela (TASK_010): desenha o modelo de `rules/card30.js` e o abre num
 * popup (<dialog>). O Bestiário e a Arena usam as mesmas funções.
 *
 *   cardHtml(modelo)            o card inteiro
 *   cartaoCompacto(modelo)      o cartão da galeria do Bestiário
 *   abrirCard({ modelo, … })    o popup; devolve { fechar }
 */
import { html, nextId, render } from '../core/dom.js';
import { LEGENDA_DAS_NATUREZAS } from '../rules/card30.js';
import { MAPA_TOKENS_PADRAO, obterUrlToken } from '../rules/tokens.js';
import { icon } from '../ui/icons.js';

/**
 * Uma seção que se recolhe (`<details>`): as principais começam abertas. `ordem` é a posição no
 * celular, onde as duas colunas viram uma (CSS `order`): números, defesas, ataques, habilidades,
 * magias, talentos, perícias e equipamento.
 */
function secao(titulo, conteudo, { aberta = true, contagem = null, ordem = 0 } = {}) {
  return html`<details class="fc-sec" style="--ordem:${ordem}" ${aberta ? 'open' : ''}>
    <summary class="fc-sec__titulo"><span>${titulo}</span>${contagem != null ? html`<small class="fc-sec__n">${contagem}</small>` : ''}${icon('chevron-down')}</summary>
    <div class="fc-sec__corpo">${conteudo}</div>
  </details>`;
}

const LARGAS = ['CA', 'Deslocamento', 'Resistências'];

function numeros(m) {
  return html`<dl class="fc-stats">${m.numeros.map(n => html`<div class="fc-stat ${LARGAS.includes(n.rotulo) || n.valor.length > 16 ? 'fc-stat--larga' : ''}">
    <dt>${n.rotulo}</dt>
    <dd><b>${n.valor}</b>${n.detalhe ? html` <small>${n.detalhe}</small>` : ''}</dd>
  </div>`)}</dl>`;
}

function atributos(m) {
  return html`<ul class="fc-abil" aria-label="Atributos">${m.atributos.map(a => html`<li class="fc-abil__item">
    <span class="fc-abil__nome">${a.rotulo}</span><b class="fc-abil__valor">${a.valor}</b><i class="fc-abil__mod">${a.mod}</i>
  </li>`)}</ul>`;
}

function defesas(m) {
  if (!m.defesas.length) return html`<p class="fc-vazio">Sem defesas especiais.</p>`;
  return html`<dl class="fc-stats fc-stats--linhas">${m.defesas.map(d => html`<div class="fc-stat"><dt>${d.rotulo}</dt><dd>${d.valor}</dd></div>`)}</dl>`;
}

function linhaDoAtaque(a) {
  const detalhes = [a.critico, a.tipoDano].filter(Boolean).join(', ');
  return html`<li class="fc-atk">
    <span class="fc-atk__nome">${a.nome}</span>
    <span class="fc-atk__bonus">${a.bonus}</span>
    <span class="fc-atk__tipo">${a.tipo}</span>
    <span class="fc-atk__dano">${a.dano}${detalhes ? html` <small>(${detalhes})</small>` : ''}</span>
    ${a.alcance ? html`<span class="fc-atk__alcance">${a.alcance}</span>` : ''}
    ${a.extras.length ? html`<span class="fc-atk__extra">${a.extras.join(' · ')}</span>` : ''}
    ${a.efeitos.length ? html`<span class="fc-atk__efeitos">dispara: ${a.efeitos.join(', ')}</span>` : ''}
  </li>`;
}

function ataques(m) {
  const grupos = [['Ataque único', m.ataques.unico], ['Ataque total', m.ataques.total], ['Ataque total à distância', m.ataques.distancia]].filter(([, l]) => l.length);
  if (!grupos.length) return html`<p class="fc-vazio">Sem ataques.</p>`;
  return grupos.map(([titulo, itens]) => html`<h3 class="fc-sub">${titulo}</h3><ul class="fc-atks">${itens.map(linhaDoAtaque)}</ul>`);
}

function chips(lista) {
  return lista?.length ? html`<ul class="fc-chips">${lista.map(n => html`<li class="fc-chip"><span>${n.rotulo}</span> ${n.valor}</li>`)}</ul>` : '';
}

const nota = texto => (texto ? html`<p class="fc-hab__nota">${texto}</p>` : '');

function itemDaHabilidade(h) {
  return html`<li class="fc-hab">
    <p class="fc-hab__nome"><b>${h.nome}</b>${h.natureza ? html` <span class="fc-nat fc-nat--${h.natureza.sigla.toLowerCase()}" title="${h.natureza.explicacao}">${h.natureza.nome}</span>` : ''}</p>
    ${h.descricao ? html`<p class="fc-hab__desc">${h.descricao}</p>` : ''}
    ${chips(h.numeros)}
    ${nota(h.nota)}
    ${h.magia ? html`<p class="fc-hab__magia"><i>${h.magia.nome}${h.magia.escola ? ` (${h.magia.escola})` : ''}:</i> ${h.magia.resumo}${h.magia.fonte ? html` <a href="${h.magia.fonte}" target="_blank" rel="noopener noreferrer">SRD 3.0<span class="visually-hidden"> (${h.magia.nome}, abre em outra aba)</span></a>` : ''}</p>` : ''}
  </li>`;
}

function habilidades(m) {
  const { ataques: especiais, qualidades, classe = [], racas = [] } = m.habilidades;
  const blocos = [['Ataques especiais', especiais], ['Qualidades especiais', qualidades], ['Habilidades de classe', classe], ['Traços da raça', racas]].filter(([, l]) => l.length);
  if (!blocos.length) return html`<p class="fc-vazio">Sem habilidades especiais.</p>`;
  const naturezas = [...new Set([...especiais, ...qualidades].map(h => h.natureza?.sigla).filter(Boolean))];
  return html`${blocos.map(([titulo, itens]) => html`<h3 class="fc-sub">${titulo}</h3><ul class="fc-habs">${itens.map(itemDaHabilidade)}</ul>`)}
    ${naturezas.length ? html`<ul class="fc-legenda">${naturezas.map(n => html`<li>${LEGENDA_DAS_NATUREZAS[n]}</li>`)}</ul>` : ''}`;
}

function magias(m) {
  const mg = m.magias;
  return html`<p class="fc-magias__cab">${mg.classe}${mg.nivelConjurador != null ? ` · nível de conjurador ${mg.nivelConjurador}` : ''}${mg.atributo ? ` · ${mg.atributo}` : ''}${mg.cdBase != null ? ` · CD base ${mg.cdBase} + nível da magia` : ''}</p>
    ${mg.grupos.map(g => html`<h3 class="fc-sub">${g.nivel === 0 ? 'Truques (nível 0)' : `Magias de ${g.nivel}º nível`}</h3><ul class="fc-habs">${g.itens.map(i => html`<li class="fc-hab">
      <p class="fc-hab__nome"><b>${i.nome}</b>${i.quantidade != null ? html` <span class="fc-qtd">×${i.quantidade}</span>` : ''}${i.variante ? html` <span class="fc-esc">${i.variante}</span>` : ''}${i.escola ? html` <span class="fc-esc">${i.escola}</span>` : ''}</p>
      ${i.resumo ? html`<p class="fc-hab__desc">${i.resumo}${i.fonte ? html` <a href="${i.fonte}" target="_blank" rel="noopener noreferrer">SRD 3.0<span class="visually-hidden"> (${i.nome}, abre em outra aba)</span></a>` : ''}</p>` : ''}
      ${chips(i.numeros)}
      ${nota(i.nota)}
    </li>`)}</ul>`)}`;
}

function talentos(m) {
  if (!m.talentos.length) return html`<p class="fc-vazio">Nenhum talento.</p>`;
  return html`<ul class="fc-habs">${m.talentos.map(t => html`<li class="fc-hab">
    <p class="fc-hab__nome"><b>${t.nome}</b>${t.vezes > 1 ? html` <span class="fc-qtd">×${t.vezes}</span>` : ''}${t.parametro ? html` <span class="fc-qtd">${t.parametro}</span>` : ''}${t.origem && t.origem !== 'compêndio' && t.origem !== 'glossário' ? html` <span class="fc-esc">${t.origem}</span>` : ''}</p>
    ${t.beneficio ? html`<p class="fc-hab__desc">${t.beneficio}</p>` : ''}
    ${t.requisitos && t.requisitos !== 'Nenhum' ? html`<p class="fc-hab__numeros">Requisitos: ${t.requisitos}</p>` : ''}
  </li>`)}</ul>`;
}

function rodape(m) {
  const r = m.rodape;
  return html`${r.tatica ? html`<p class="fc-nota"><b>Como luta.</b> ${r.tatica}</p>` : ''}
    ${r.adaptacao ? html`<p class="fc-nota"><b>Adaptação.</b> ${r.adaptacao}</p>` : ''}
    ${r.fonte ? html`<p class="fc-nota fc-nota--fonte"><b>Fonte.</b> ${r.fonte.url ? html`<a href="${r.fonte.url}" target="_blank" rel="noopener noreferrer">${r.fonte.referencia}<span class="visually-hidden"> (abre em outra aba)</span></a>` : r.fonte.referencia}</p>` : ''}`;
}

/** O card inteiro. `idTitulo`: o id do <h2>, para o `aria-labelledby` do popup. */
export function cardHtml(m, { idTitulo = nextId('fc-titulo') } = {}) {
  const magiasN = m.magias ? m.magias.grupos.reduce((s, g) => s + g.itens.length, 0) : 0;
  const tokenUrl = MAPA_TOKENS_PADRAO[m.id] ? `assets/tokens/${MAPA_TOKENS_PADRAO[m.id]}` : null;
  return html`<article class="fc fc--${m.tema} fc--${m.origem}" aria-labelledby="${idTitulo}">
    <header class="fc-head">
      <span class="fc-head__glifo" aria-hidden="true">${tokenUrl ? html`<img class="fc-head__img" src="${tokenUrl}" alt="" loading="lazy" width="52" height="52">` : icon(m.icone)}</span>
      <div class="fc-head__texto">
        <p class="fc-head__sub">${m.subtitulo}</p>
        <h2 class="fc-head__nome" id="${idTitulo}">${m.nome}</h2>
        ${m.nomeOriginal && m.nomeOriginal !== m.nome ? html`<p class="fc-head__orig">${m.nomeOriginal}</p>` : ''}
        ${m.identidade ? html`<p class="fc-head__ident">${m.identidade}</p>` : ''}
      </div>
      <span class="fc-head__selo">${m.selo}</span>
    </header>
    ${m.avisoDeLuta ? html`<p class="fc-aviso">${icon('alert')}${m.avisoDeLuta}</p>` : ''}
    ${m.resumo ? html`<p class="fc-lore">${m.resumo}</p>` : ''}
    <div class="fc-colunas">
      <div class="fc-coluna">
        ${secao('Números', html`${numeros(m)}${atributos(m)}`, { ordem: 1 })}
        ${secao('Defesas', defesas(m), { ordem: 2 })}
        ${secao('Talentos', talentos(m), { aberta: m.talentos.length <= 6, contagem: m.talentos.length, ordem: 6 })}
        ${m.pericias.length ? secao('Perícias', html`<ul class="fc-pericias">${m.pericias.map(p => html`<li>${p.nome} <b>${p.total}</b></li>`)}</ul>`, { aberta: false, contagem: m.pericias.length, ordem: 7 }) : ''}
        ${m.equipamento.length ? secao('Equipamento', html`<ul class="fc-lista">${m.equipamento.map(x => html`<li>${x}</li>`)}</ul>`, { aberta: false, contagem: m.equipamento.length, ordem: 8 }) : ''}
      </div>
      <div class="fc-coluna">
        ${secao('Ataques', ataques(m), { ordem: 3 })}
        ${secao('Habilidades', habilidades(m), { ordem: 4 })}
      </div>
      ${m.magias ? html`<div class="fc-coluna fc-coluna--larga">${secao('Magias', magias(m), { contagem: magiasN, ordem: 5 })}</div>` : ''}
    </div>
    <footer class="fc-rodape">${rodape(m)}</footer>
  </article>`;
}

/** O cartão da galeria: os números que decidem a luta, o ataque principal e o resumo. */
export function cartaoCompacto(m) {
  const [pv, ca, ini] = m.numeros;
  const a = m.ataques.unico[0];
  const tokenUrl = MAPA_TOKENS_PADRAO[m.id] ? `assets/tokens/${MAPA_TOKENS_PADRAO[m.id]}` : null;
  return html`<article class="bc bc--${m.tema}" data-card="${m.id}">
    <header class="bc__head">
      <span class="bc__glifo" aria-hidden="true">${tokenUrl ? html`<img class="bc__img" src="${tokenUrl}" alt="" loading="lazy" width="38" height="38">` : icon(m.icone)}</span>
      <div class="bc__titulo">
        <h2 class="bc__nome"><button type="button" class="bc__abrir" data-abrir="${m.id}" aria-haspopup="dialog">${m.nome}</button></h2>
        <p class="bc__sub">${m.subtitulo}</p>
      </div>
      <span class="bc__selo">${m.selo}</span>
    </header>
    ${m.identidade ? html`<p class="bc__ident">${m.identidade}</p>` : ''}
    <dl class="bc__nums">
      <div><dt>PV</dt><dd>${pv.valor}</dd></div>
      <div><dt>CA</dt><dd>${ca.valor}</dd></div>
      <div><dt>Inic.</dt><dd>${ini.valor}</dd></div>
    </dl>
    ${a ? html`<p class="bc__atk"><b>${a.nome}</b> ${a.bonus} · ${a.dano}</p>` : ''}
    <p class="bc__lore">${m.resumo}</p>
  </article>`;
}

/**
 * Abre o card num popup. Dentro de outro diálogo (o seletor da Arena), ele abre por cima: Esc e o
 * botão Fechar fecham só o card, e o foco volta ao botão que o abriu. Clicar no fundo também fecha,
 * mas só se o botão do mouse foi apertado e solto no fundo (arrastar para selecionar texto e soltar
 * fora não fecha).
 * `modelo`: o modelo de `card30.js`. `aviso`: um texto que a tela mostra no topo do card (os textos
 * de apoio que não carregaram). `aoFechar`: chamado uma vez, depois de fechar.
 */
export function abrirCard({ modelo, aviso = '', aoFechar }) {
  const opener = document.activeElement;
  const dialog = document.createElement('dialog');
  const idTitulo = nextId('fc-titulo');
  dialog.className = 'dialog fc-dialog';
  dialog.setAttribute('aria-labelledby', idTitulo);
  render(dialog, html`<div class="fc-dialog__frame">
    <div class="fc-dialog__bar">
      <span class="fc-dialog__rotulo">${icon('book')}Card</span>
      <span class="fc-dialog__acoes">
        ${modelo.rodape.fichaHref ? html`<a class="btn btn--outline btn--sm" href="${location.pathname}${modelo.rodape.fichaHref}" target="_blank" rel="noopener" data-ficha-completa>${icon('scroll')}Abrir a ficha completa<span class="visually-hidden"> (abre em outra aba)</span></a>` : ''}
        <button type="button" class="icon-btn" data-fechar-card aria-label="Fechar o card">${icon('x')}</button>
      </span>
    </div>
    ${aviso ? html`<p class="fc-aviso fc-aviso--topo" role="status">${icon('alert')}${aviso}</p>` : ''}
    <div class="fc-dialog__corpo">${cardHtml(modelo, { idTitulo })}</div>
  </div>`);
  document.body.append(dialog);
  let fechado = false;
  const fechar = () => {
    if (fechado) return;
    fechado = true;
    if (dialog.open) dialog.close();
    dialog.remove();
    if (opener?.isConnected) opener.focus();
    aoFechar?.();
  };
  let apertouNoFundo = false;
  dialog.addEventListener('pointerdown', event => {
    apertouNoFundo = event.target === dialog;
  });
  dialog.addEventListener('click', event => {
    if (event.target.closest('[data-fechar-card]') || (event.target === dialog && apertouNoFundo)) fechar();
  });
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    fechar();
  });
  dialog.addEventListener('close', fechar);
  dialog.showModal();
  dialog.querySelector('[data-fechar-card]').focus();
  return { fechar, dialog };
}
