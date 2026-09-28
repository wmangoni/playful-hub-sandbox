/**
 * Popup de escolha de perícias e talentos (TASK_004).
 *
 * O sistema calcula, pelas regras da 3.0 (js/rules/choices30.js), quantos
 * pontos de perícia e quantas vagas de talento o personagem tem e quais
 * perícias/talentos ele pode escolher. O jogador distribui as graduações e
 * marca os talentos; o popup mostra o saldo, os requisitos que faltam e a
 * progressão das vagas por nível, e só salva escolhas válidas.
 */
import { html, render } from '../core/dom.js';
import { normalize } from '../core/format.js';
import { signed, skillKey } from '../rules/dnd30.js';
import {
  buildContext, evaluateFeat, featKey, featLabel, featParameter, fitsFighter, fitsWizard,
  grantedFeats, isMultiple, skillRules, titleCase, validateFeats, validateSkills,
} from '../rules/choices30.js';
import { T30 } from '../rules/tables30.js';
import { confirmDialog } from '../ui/dialog.js';
import { icon } from '../ui/icons.js';

const half = n => String(n).replace('.5', '½').replace(/^0½$/, '½');
const SLOT_LABEL = { geral: 'gerais', guerreiro: 'de guerreiro', mago: 'de mago' };
const PARAM_LABEL = { arma: 'Arma', pericia: 'Perícia', escola: 'Escola', magias: 'Magias' };

/** Graduações gravadas por id da perícia → chave de comparação usada pelas regras. */
export function ranksToKeys(pericias, ranksById = {}) {
  const out = {};
  for (const p of pericias) {
    const n = Number(ranksById[String(p.id)]) || 0;
    if (n) out[skillKey(p.nome)] = n;
  }
  return out;
}
const FILTERS = [
  ['elegiveis', 'Disponíveis e a confirmar'],
  ['disponivel', 'Só disponíveis'],
  ['escolhidos', 'Escolhidos'],
  ['bloqueado', 'Indisponíveis'],
  ['todos', 'Todos'],
];
const SOURCES = [
  ['todas', 'Todas as fontes'],
  ['ldj', 'Livro do Jogador 3.0'],
  ['suplementos', 'Suplementos'],
];

/**
 * Abre o popup. `computeSheet(escolhas)` devolve a ficha calculada com as escolhas.
 * Devolve { result, isDirty, dismiss }: `result` resolve com as escolhas salvas
 * ({ pericias: {id: graduações}, talentos: [{talento_id, parametro}] }) ou null;
 * `dismiss()` fecha sem salvar (ex.: a página mudou).
 */
export function openChoicesDialog(options) {
  const handle = {};
  handle.result = new Promise(resolve => mountChoices(options, resolve, handle));
  return handle;
}

function mountChoices({ personagem, classe, bbaRows, pericias, catalog, initial, saved = initial, computeSheet, catalogoDesatualizado = false, aba = 'pericias' }, resolve, handle) {
  const state = {
    tab: aba,
    ranks: { ...(initial?.pericias || {}) }, // id da perícia → graduações
    talentos: (initial?.talentos || []).map(t => ({ ...t })),
    soClasse: false,
    busca: '',
    filtro: 'elegiveis',
    fonte: 'todas',
    abertos: new Set(), // talentos com os detalhes abertos (sobrevive aos redesenhos)
  };
  // comparado com o que está salvo: um rascunho reaberto (depois de restaurar Talentos) já conta como alteração
  const snapshot = JSON.stringify({ r: { ...(saved?.pericias || {}) }, t: (saved?.talentos || []).map(t => ({ ...t })) });
  const skillById = new Map(pericias.map(p => [String(p.id), p]));
  const catalogById = new Map(catalog.map(f => [String(f.id), f]));
  const sorted = [...catalog].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  const dialog = document.createElement('dialog');
  dialog.className = 'dialog choices';
  dialog.setAttribute('aria-labelledby', 'choices-title');
  document.body.append(dialog);
  const opener = document.activeElement;

  const ranksByKey = () => ranksToKeys(pericias, state.ranks);
  let last = null; // última análise: a busca redesenha só a lista com ela
  let searchTimer = null;

  function analyze() {
    const escolhas = { pericias: state.ranks, talentos: state.talentos };
    const sheet = computeSheet(escolhas);
    const ranks = ranksByKey();
    const ctx = buildContext({ sheet, personagem, classe, bbaRows, catalog, chosen: state.talentos, ranks });
    const isHuman = sheet.raceKey === 'humano';
    return { sheet, ctx, skills: validateSkills(sheet, ranks), feats: validateFeats(ctx, isHuman), rules: skillRules(sheet), granted: grantedFeats(sheet.nivel, sheet.classKey, sheet.raceKey) };
  }

  function header(a) {
    const { sheet, skills, feats } = a;
    const vagas = feats.vagas.length;
    const livres = feats.restantes.geral + feats.restantes.guerreiro + feats.restantes.mago;
    const who = [sheet.identidade.classe ? `${sheet.identidade.classe} ${sheet.nivel}º nível` : `${sheet.nivel}º nível`, sheet.identidade.raca].filter(Boolean).join(' · ');
    return html`<header class="choices__head">
      <div class="choices__title-row">
        <div>
          <h2 class="dialog__title" id="choices-title">Talentos e perícias</h2>
          <p class="choices__who">${personagem.nome} · ${who}</p>
        </div>
        <button type="button" class="icon-btn" data-action="cancel" aria-label="Fechar sem salvar">${icon('x')}</button>
      </div>
      <p class="choices__lead">O sistema calcula, pelas regras da 3ª edição (3.0), quantos pontos de perícia e quantos talentos você pode escolher e quais estão ao seu alcance.</p>
      <div class="choices__tabs" role="tablist" aria-label="Escolhas">
        <button type="button" role="tab" id="tab-pericias" aria-controls="panel-pericias" aria-selected="${state.tab === 'pericias'}" tabindex="${state.tab === 'pericias' ? 0 : -1}" data-tab="pericias">
          ${icon('scroll')}Perícias <span class="choices__badge ${skills.restantes < 0 ? 'is-bad' : ''}">${skills.total == null ? '—' : `${half(skills.restantes)} de ${skills.total} pontos`}</span>
        </button>
        <button type="button" role="tab" id="tab-talentos" aria-controls="panel-talentos" aria-selected="${state.tab === 'talentos'}" tabindex="${state.tab === 'talentos' ? 0 : -1}" data-tab="talentos">
          ${icon('sparkles')}Talentos <span class="choices__badge">${livres} de ${vagas} vagas livres</span>
        </button>
      </div>
    </header>`;
  }

  function skillsPanel(a) {
    const { sheet, skills, rules } = a;
    const pts = sheet.pontosPericia;
    const byName = new Map(sheet.pericias.map(p => [p.nome, p]));
    const rows = rules.filter(r => !state.soClasse || r.classe !== false);
    if (!pts) {
      return html`<div class="choices__empty">${icon('alert')}<p>Os pontos de perícia só podem ser calculados para as 11 classes básicas do Livro do Jogador. Para ${sheet.identidade.classe || 'personagens sem classe'}, anote as graduações à mão na ficha.</p></div>`;
    }
    return html`
      <div class="choices__summary">
        <p><strong>${pts.total} pontos de perícia</strong> até o ${sheet.nivel}º nível (${pts.first} no 1º e ${pts.perLevel} por nível seguinte). Gastos: <strong>${half(skills.gastos)}</strong> · restam <strong class="${skills.restantes < 0 ? 'is-bad' : ''}">${half(skills.restantes)}</strong>.</p>
        <p class="choices__hint">Perícia de classe: 1 ponto por graduação, até ${sheet.graduacaoMaxima.classe}. De outra classe: 2 pontos por graduação (meia graduação por ponto), até ${half(sheet.graduacaoMaxima.cruzada)}. Perícias exclusivas só podem ser compradas pelas classes que as têm.</p>
        <label class="choices__check"><input type="checkbox" data-action="so-classe" ${state.soClasse ? 'checked' : ''}> Mostrar só perícias de classe</label>
      </div>
      <div class="choices__table-wrap">
        <table class="choices__table">
          <caption class="visually-hidden">Graduações por perícia</caption>
          <thead><tr><th scope="col">Perícia</th><th scope="col">Habilidade</th><th scope="col">Tipo</th><th scope="col">Máx.</th><th scope="col">Graduações</th><th scope="col">Total</th></tr></thead>
          <tbody>
            ${rows.map(r => {
              const p = pericias.find(x => x.nome === r.nome);
              const id = String(p?.id);
              const n = Number(state.ranks[id]) || 0;
              const s = byName.get(r.nome);
              const tipo = r.bloqueada ? 'exclusiva de outras classes' : r.classe === false ? 'outra classe · 2 pts' : r.classe ? 'de classe' : '—';
              return html`<tr class="${r.bloqueada ? 'is-locked' : ''} ${n ? 'is-set' : ''}">
                <th scope="row">${r.nome}${s?.semTreinamento ? html`<span class="choices__untrained" title="pode ser usada sem graduações">■</span>` : ''}</th>
                <td>${s?.atributo === 'N/A' ? '—' : s?.atributo}</td>
                <td><span class="choices__tag ${r.classe === false ? 'is-cross' : r.classe ? 'is-class' : ''} ${r.bloqueada ? 'is-locked' : ''}">${tipo}</span></td>
                <td class="choices__max"><span class="choices__max-label">máx. </span>${half(r.max)}</td>
                <td>
                  <span class="stepper">
                    <button type="button" class="stepper__btn" data-step="-1" data-skill="${id}" data-focus="dec-${id}" data-focus-fallback="skill-${id}" aria-label="Diminuir ${r.nome}" ${n <= 0 ? 'disabled' : ''}>−</button>
                    <input class="stepper__input" type="number" inputmode="decimal" min="0" max="${r.max}" step="${r.passo}" value="${n}" data-skill="${id}" data-focus="skill-${id}" aria-label="Graduações em ${r.nome}" ${r.bloqueada ? 'disabled' : ''}>
                    <button type="button" class="stepper__btn" data-step="1" data-skill="${id}" data-focus="inc-${id}" data-focus-fallback="skill-${id}" aria-label="Aumentar ${r.nome}" ${n >= r.max || r.bloqueada ? 'disabled' : ''}>+</button>
                  </span>
                </td>
                <td class="choices__total">${s?.total == null ? '—' : signed(s.total)}</td>
              </tr>`;
            })}
          </tbody>
        </table>
      </div>`;
  }

  function featRow(feat, a) {
    const ev = evaluateFeat(feat, a.ctx);
    const id = String(feat.id);
    const chosenList = state.talentos.map((t, i) => ({ ...t, i })).filter(t => String(t.talento_id) === id);
    const chosen = chosenList.length > 0;
    const param = featParameter(feat);
    const granted = a.granted.find(g => g.key === featKey(feat.nome) && !g.parametro);
    const badges = [
      a.sheet.classKey === 'gue' && fitsFighter(feat) && 'adicional de guerreiro',
      a.sheet.classKey === 'mag' && fitsWizard(feat) && 'adicional de mago',
      /metamagico/.test(normalize(feat.tipo)) && 'metamágico',
      /criacao de item/.test(normalize(feat.tipo)) && 'criação de item',
      /epico/.test(normalize(feat.tipo)) && 'épico',
      /livro do jogador 3\.0/.test(normalize(feat.fonte)) ? 'Livro do Jogador 3.0' : 'suplemento',
    ].filter(Boolean);
    const status = granted ? html`<span class="feat__status is-granted">${icon('check')}concedido pela ${granted.origem}</span>`
      : ev.status === 'bloqueado' ? html`<span class="feat__status is-blocked">falta: ${ev.falta.join(', ')}</span>`
      : ev.status === 'confirmar' ? html`<span class="feat__status is-confirm">${icon('alert')}confira: ${ev.confirmar.join(', ')}</span>`
      : html`<span class="feat__status is-ok">disponível${ev.nivel > 1 ? ` a partir do ${ev.nivel}º nível` : ''}</span>`;
    const disabled = !chosen && (ev.status === 'bloqueado' || Boolean(granted));
    return html`<li class="feat ${chosen ? 'is-chosen' : ''} is-${granted ? 'granted' : ev.status}">
      <div class="feat__main">
        <label class="feat__pick">
          <input type="checkbox" data-feat="${id}" data-focus="feat-${id}" ${chosen ? 'checked' : ''} ${disabled ? 'disabled' : ''} aria-describedby="feat-st-${id}">
          <span class="feat__name">${titleCase(feat.nome)}</span>
        </label>
        <span class="feat__badges">${badges.map(b => html`<span class="choices__tag">${b}</span>`)}</span>
      </div>
      <details class="feat__details" data-details="${id}" ${state.abertos.has(id) ? 'open' : ''}>
        <summary data-focus="det-${id}"><span class="feat__line" id="feat-st-${id}">${status}</span><span class="feat__more">detalhes</span></summary>
        <dl>
          <dt>Requisitos</dt><dd>${feat.requisitos || 'Nenhum'}</dd>
          <dt>Benefício</dt><dd>${feat.beneficio || '—'}</dd>
          ${feat.normal ? html`<dt>Normal</dt><dd>${feat.normal}</dd>` : ''}
          ${feat.fonte ? html`<dt>Fonte</dt><dd>${feat.fonte}</dd>` : ''}
        </dl>
      </details>
      ${chosen && param ? html`<div class="feat__params">${chosenList.map(c => paramInput(feat, param, c, a))}${isMultiple(feat) ? html`<button type="button" class="btn btn--ghost btn--sm" data-add-again="${id}" data-focus="again-${id}">${icon('plus')}Escolher de novo</button>` : ''}</div>` : ''}
      ${chosen && !param && isMultiple(feat) ? html`<div class="feat__params"><span class="feat__count">${chosenList.length}×</span><button type="button" class="btn btn--ghost btn--sm" data-add-again="${id}" data-focus="again-${id}">${icon('plus')}Escolher de novo</button>${chosenList.length > 1 ? html`<button type="button" class="btn btn--ghost btn--sm" data-remove-one="${chosenList.at(-1).i}" data-focus="remove-${id}" data-focus-fallback="again-${id}">Remover um</button>` : ''}</div>` : ''}
    </li>`;
  }

  function paramInput(feat, param, c, a) {
    const label = PARAM_LABEL[param];
    const value = c.parametro || '';
    const control = param === 'pericia'
      ? html`<select data-param="${c.i}" data-focus="param-${c.i}" aria-label="${label} de ${titleCase(feat.nome)}">
          <option value="" ${value ? '' : 'selected'}>Escolha…</option>
          ${a.sheet.pericias.map(p => html`<option value="${p.nome}" ${p.nome === value ? 'selected' : ''}>${p.nome}</option>`)}
        </select>`
      : html`<input type="text" maxlength="60" value="${value}" placeholder="${param === 'arma' ? 'ex.: espada longa' : param === 'escola' ? 'ex.: evocação' : 'ex.: bola de fogo, invisibilidade'}" data-param="${c.i}" data-focus="param-${c.i}" aria-label="${label} de ${titleCase(feat.nome)}">`;
    return html`<span class="feat__param"><span>${label}:</span>${control}${isMultiple(feat) ? html`<button type="button" class="icon-btn icon-btn--sm" data-remove-one="${c.i}" data-focus="remove-${c.i}" data-focus-fallback="again-${feat.id}" aria-label="Remover esta escolha">${icon('x')}</button>` : ''}</span>`;
  }

  function filteredFeats(a) {
    const q = normalize(state.busca);
    return sorted.filter(f => {
      if (q && !normalize(f.nome).includes(q)) return false;
      const ldj = /livro do jogador 3\.0/.test(normalize(f.fonte));
      if (state.fonte === 'ldj' && !ldj) return false;
      if (state.fonte === 'suplementos' && ldj) return false;
      const chosen = state.talentos.some(t => String(t.talento_id) === String(f.id));
      if (state.filtro === 'escolhidos') return chosen;
      if (state.filtro === 'todos' || chosen) return true;
      // concedido pela classe/raça conta como disponível, mesmo sem cumprir os requisitos
      const granted = a.granted.some(g => g.key === featKey(f.nome) && !g.parametro);
      const st = granted ? 'disponivel' : evaluateFeat(f, a.ctx).status;
      if (state.filtro === 'elegiveis') return st !== 'bloqueado';
      return st === state.filtro;
    });
  }

  const featList = (list, a) => html`<p class="choices__count" aria-live="polite">${list.length} ${list.length === 1 ? 'talento' : 'talentos'}</p>
    <ul class="feats">${list.map(f => featRow(f, a))}</ul>`;

  function featsPanel(a) {
    const { feats, granted, sheet } = a;
    const groups = ['geral', 'guerreiro', 'mago'].map(tipo => ({ tipo, vagas: feats.vagas.filter(v => v.tipo === tipo) })).filter(g => g.vagas.length);
    const byLevel = new Map();
    for (const v of feats.vagas) byLevel.set(v.nivel, [...(byLevel.get(v.nivel) || []), v]);
    const list = filteredFeats(a);
    const proficiencies = granted.filter(g => g.proficiencia).map(g => `${g.nome}${g.parametro ? ` (${g.parametro})` : ''}`);
    const others = granted.filter(g => !g.proficiencia).map(g => `${g.nome} (${g.nivel}º nível${g.nota ? `, ${g.nota}` : ''})`);
    return html`
      ${catalogoDesatualizado ? html`<div class="notice choices__notice" role="status">${icon('alert')}<div><p><strong>Sua cópia local de Talentos é anterior aos 74 talentos do Livro do Jogador 3.0</strong>, por isso eles não aparecem aqui. Restaurar os Talentos originais traz a lista completa, mas descarta as alterações feitas nessa tabela. Suas escolhas deste popup são mantidas.</p><button type="button" class="btn btn--outline btn--sm" data-action="restore-catalog">${icon('restore')}Restaurar Talentos originais</button></div></div>` : ''}
      <div class="choices__summary">
        <p>${groups.map(g => html`<span class="choices__slot"><strong>${g.vagas.filter(v => !v.talento).length} de ${g.vagas.length}</strong> vagas ${SLOT_LABEL[g.tipo]} livres</span>`)}</p>
        <p class="choices__hint">Gerais: 1 no 1º nível e mais 1 a cada 3 níveis${sheet.raceKey === 'humano' ? ', +1 por ser humano' : ''}.${sheet.classKey === 'gue' ? ' Guerreiro: 1 no 1º nível e mais 1 a cada nível par, só com talentos marcados "adicional de guerreiro".' : ''}${sheet.classKey === 'mag' ? ' Mago: 1 a cada 5 níveis, só metamágicos, de criação de item ou Dominar Magia.' : ''} Cada talento ocupa uma vaga de um nível em que os requisitos já eram atendidos.</p>
        <ol class="choices__levels" aria-label="Vagas por nível">
          ${[...byLevel.entries()].map(([nivel, vs]) => html`<li><span class="choices__level">${nivel}º</span>${vs.map(v => html`<span class="choices__vaga is-${v.tipo} ${v.talento ? 'is-filled' : ''}" title="vaga ${v.tipo === 'geral' ? 'geral' : `de ${v.tipo}`}${v.humano ? ' (humano)' : ''}">${v.talento ? html`${v.talento}${v.tipo !== 'geral' ? html`<small> · ${v.tipo}</small>` : ''}` : v.tipo === 'geral' ? 'livre' : `livre · ${v.tipo}`}</span>`)}</li>`)}
        </ol>
        ${groups.length > 1 ? html`<p class="choices__legend"><span class="choices__vaga is-geral">vaga geral</span><span class="choices__vaga is-${groups[1].tipo}">vaga ${SLOT_LABEL[groups[1].tipo]}</span></p>` : ''}
        ${proficiencies.length || others.length ? html`<p class="choices__granted"><strong>Concedidos</strong> (não ocupam vaga): ${[...others, ...proficiencies].join('; ')}.</p>` : ''}
      </div>
      <div class="choices__filters">
        <label class="choices__search">${icon('search')}<span class="visually-hidden">Buscar talento</span><input type="search" placeholder="Buscar talento…" value="${state.busca}" data-action="busca" data-focus="busca"></label>
        <label><span class="visually-hidden">Filtrar por situação</span><select data-action="filtro" data-focus="filtro">${FILTERS.map(([v, l]) => html`<option value="${v}" ${state.filtro === v ? 'selected' : ''}>${l}</option>`)}</select></label>
        <label><span class="visually-hidden">Filtrar por fonte</span><select data-action="fonte" data-focus="fonte">${SOURCES.map(([v, l]) => html`<option value="${v}" ${state.fonte === v ? 'selected' : ''}>${l}</option>`)}</select></label>
      </div>
      <div data-slot="feat-list">${featList(list, a)}</div>`;
  }

  function footer(a) {
    const erros = [...a.skills.erros, ...a.feats.erros];
    const avisos = a.feats.avisos;
    return html`<footer class="choices__foot">
      <div class="choices__status" aria-live="polite">
        ${erros.length ? html`<p class="is-bad">${icon('alert')}${erros.length === 1 ? 'Corrija antes de salvar:' : `Corrija ${erros.length} problemas antes de salvar:`}</p><ul>${erros.slice(0, 6).map(e => html`<li>${e}</li>`)}</ul>` : ''}
        ${!erros.length && avisos.length ? html`<p class="is-warn">${icon('alert')}Pode salvar, mas confira com o Mestre:</p><ul>${avisos.slice(0, 4).map(e => html`<li>${e}</li>`)}</ul>` : ''}
        ${!erros.length && !avisos.length ? html`<p class="is-ok">${icon('check')}Escolhas válidas pelas regras da 3.0.</p>` : ''}
      </div>
      <div class="choices__actions">
        <button type="button" class="btn btn--ghost" data-action="cancel">Cancelar</button>
        <button type="button" class="btn btn--primary" data-action="save" ${erros.length ? 'disabled' : ''}>${icon('check')}Salvar escolhas</button>
      </div>
    </footer>`;
  }

  function draw() {
    const focusKey = document.activeElement?.dataset?.focus;
    const fallbackKey = document.activeElement?.dataset?.focusFallback;
    const caret = document.activeElement?.selectionStart;
    const scroller = dialog.querySelector('.choices__body');
    const scrollTop = scroller?.scrollTop ?? 0;
    const a = analyze();
    last = a;
    render(dialog, html`<div class="choices__frame">
      ${header(a)}
      <div class="choices__body">
        <section role="tabpanel" id="panel-pericias" aria-labelledby="tab-pericias" ${state.tab === 'pericias' ? '' : 'hidden'}>${state.tab === 'pericias' ? skillsPanel(a) : ''}</section>
        <section role="tabpanel" id="panel-talentos" aria-labelledby="tab-talentos" ${state.tab === 'talentos' ? '' : 'hidden'}>${state.tab === 'talentos' ? featsPanel(a) : ''}</section>
      </div>
      ${footer(a)}
    </div>`);
    const body = dialog.querySelector('.choices__body');
    if (body) body.scrollTop = scrollTop;
    if (focusKey) {
      // o mesmo controle depois do redesenho; se sumiu ou ficou desativado, o controle equivalente
      let el = dialog.querySelector(`[data-focus="${focusKey}"]`);
      if ((!el || el.disabled) && fallbackKey) el = dialog.querySelector(`[data-focus="${fallbackKey}"]`);
      if (!el && focusKey.startsWith('remove-')) el = dialog.querySelector('[data-feat]:checked');
      if (el) {
        el.focus({ preventScroll: true });
        if (caret != null && typeof el.setSelectionRange === 'function' && el.type !== 'number') el.setSelectionRange(caret, caret);
      }
    }
  }

  const dirty = () => JSON.stringify({ r: state.ranks, t: state.talentos }) !== snapshot;
  let settled = false;
  const finish = value => {
    if (settled) return;
    settled = true;
    if (dialog.open) dialog.close();
    dialog.remove();
    if (opener && opener.isConnected) opener.focus();
    resolve(value);
  };
  const cancel = async () => {
    if (dirty()) {
      const ok = await confirmDialog({ title: 'Descartar as escolhas?', message: 'As graduações e os talentos marcados neste popup ainda não foram salvos.', confirmLabel: 'Descartar', cancelLabel: 'Continuar escolhendo', glyph: 'alert' });
      if (!ok) return;
    }
    finish(null);
  };
  const setRank = (id, value) => {
    const rules = analyze().rules;
    const p = skillById.get(String(id));
    const r = rules.find(x => x.nome === p?.nome);
    if (!r) return;
    let n = Math.round(Number(value) / r.passo) * r.passo;
    if (!Number.isFinite(n) || n < 0) n = 0;
    n = Math.min(n, r.max);
    if (n) state.ranks[id] = n;
    else delete state.ranks[id];
    draw();
  };

  dialog.addEventListener('click', event => {
    const t = event.target;
    if (t === dialog) return; // clique no fundo não fecha (evita perder escolhas)
    const tab = t.closest('[data-tab]');
    if (tab) {
      state.tab = tab.dataset.tab;
      draw();
      dialog.querySelector(`[data-tab="${state.tab}"]`)?.focus();
      return;
    }
    const step = t.closest('[data-step]');
    if (step) {
      const id = step.dataset.skill;
      const r = analyze().rules.find(x => x.nome === skillById.get(id)?.nome);
      setRank(id, (Number(state.ranks[id]) || 0) + Number(step.dataset.step) * (r?.passo || 1));
      return;
    }
    const again = t.closest('[data-add-again]');
    if (again) {
      state.talentos.push({ talento_id: Number(again.dataset.addAgain), parametro: '' });
      draw();
      return;
    }
    const removeOne = t.closest('[data-remove-one]');
    if (removeOne) {
      state.talentos.splice(Number(removeOne.dataset.removeOne), 1);
      draw();
      return;
    }
    const action = t.closest('[data-action]')?.dataset.action;
    if (action === 'cancel') cancel();
    if (action === 'restore-catalog') finish({ acao: 'restaurar-talentos', aba: state.tab, rascunho: { pericias: { ...state.ranks }, talentos: state.talentos.map(x => ({ ...x })) } });
    if (action === 'save') {
      const a = analyze();
      if (a.skills.erros.length || a.feats.erros.length) return;
      finish({ pericias: { ...state.ranks }, talentos: state.talentos.map(t => ({ talento_id: Number(t.talento_id), parametro: String(t.parametro || '').trim() || null })) });
    }
  });
  dialog.addEventListener('change', event => {
    const t = event.target;
    if (t.dataset.skill) setRank(t.dataset.skill, t.value);
    else if (t.dataset.feat) {
      const id = Number(t.dataset.feat);
      if (t.checked) state.talentos.push({ talento_id: id, parametro: '' });
      else state.talentos = state.talentos.filter(x => Number(x.talento_id) !== id);
      draw();
    } else if (t.dataset.param != null) {
      state.talentos[Number(t.dataset.param)].parametro = t.value;
      draw();
    } else if (t.dataset.action === 'so-classe') {
      state.soClasse = t.checked;
      draw();
    } else if (t.dataset.action === 'filtro' || t.dataset.action === 'fonte') {
      state[t.dataset.action] = t.value;
      draw();
    }
  });
  dialog.addEventListener('input', event => {
    const t = event.target;
    if (t.dataset.action === 'busca') {
      state.busca = t.value;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        const slot = dialog.querySelector('[data-slot="feat-list"]');
        if (slot && last) render(slot, featList(filteredFeats(last), last));
      }, 150);
    } else if (t.dataset.param != null && t.tagName === 'INPUT') {
      state.talentos[Number(t.dataset.param)].parametro = t.value;
    }
  });
  dialog.addEventListener('keydown', event => {
    // setas, Home e End navegam entre as abas (padrão ARIA de tablist)
    const tab = event.target.closest?.('[role="tab"]');
    if (tab && ['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      state.tab = event.key === 'Home' ? 'pericias' : event.key === 'End' ? 'talentos' : state.tab === 'pericias' ? 'talentos' : 'pericias';
      draw();
      dialog.querySelector(`[data-tab="${state.tab}"]`)?.focus();
    }
  });
  // "toggle" não borbulha: captura para lembrar quais detalhes ficaram abertos
  dialog.addEventListener('toggle', event => {
    const id = event.target.dataset?.details;
    if (!id) return;
    if (event.target.open) state.abertos.add(id);
    else state.abertos.delete(id);
  }, true);
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    cancel();
  });

  handle.isDirty = dirty;
  handle.dismiss = () => finish(null);
  draw();
  dialog.showModal();
  dialog.querySelector('[aria-selected="true"]')?.focus();
}

/** Rótulos dos talentos escolhidos, na ordem em que foram escolhidos. */
export function chosenFeatLabels(catalog, talentos) {
  const byId = new Map(catalog.map(f => [String(f.id), f]));
  return talentos.map(t => byId.get(String(t.talento_id))).map((f, i) => (f ? featLabel(f, talentos[i].parametro) : null)).filter(Boolean);
}
