/**
 * Diálogo de magias de um personagem na Arena (TASK_006 §5.7, etapa E7). Quem prepara (mago,
 * clérigo, druida, paladino, ranger) escolhe quantas de cada magia vão em cada nível de espaço;
 * quem conhece (feiticeiro, bardo) marca as conhecidas de cada nível. Só a lista curada de
 * magias30.js. Salvo em `fichas.magias`.
 *
 * O cabeçalho e o rodapé são desenhados uma vez; a cada mudança só o corpo é redesenhado, e a
 * região `aria-live` do rodapé (que fica) anuncia a contagem nova.
 */
import { html, render } from '../core/dom.js';
import { MODO, conhecidasDoNivel, daClasse, detalheDaMagia, espacosDoDia, magiaPorId, magiasPadrao, nivelDeConjurador, nivelNaClasse, normalizarMagias } from '../rules/magias30.js';
import { confirmDialog } from '../ui/dialog.js';
import { icon } from '../ui/icons.js';

const ordinal = n => `${n}º`;
const preparadas = n => `${n} ${n === 1 ? 'preparada' : 'preparadas'}`;

/**
 * `entrada`: o personagem da Arena ({ nome, sheet, personagem, magias }). `calcular(escolha)` →
 * resultado do adaptador com essa escolha; `salvar(escolha)` grava (Promise). Devolve `{ fechar }`.
 */
export function abrirMagias({ entrada, calcular, salvar, aoFechar }) {
  const { sheet } = entrada;
  const ck = sheet.classKey;
  const conhece = MODO[ck] === 'conhece';
  const espacos = espacosDoDia(sheet);
  const limites = conhecidasDoNivel(sheet);
  const cl = nivelDeConjurador(ck, sheet.nivel);
  const cdBase = 10 + (sheet.magias?.modificador ?? 0);
  const inicial = JSON.stringify(normalizarMagias(entrada.magias, sheet));
  let draft = JSON.parse(inicial);
  const dialog = document.createElement('dialog');
  dialog.className = 'dialog arena-picker arena-equip arena-mag';
  dialog.setAttribute('aria-labelledby', 'mag-titulo');
  document.body.append(dialog);
  const opener = document.activeElement;

  const usados = nivel => Object.values(draft.preparadas?.[nivel] || {}).reduce((s, n) => s + n, 0);
  let resultado = calcular(draft);
  /** Os números da magia neste personagem (a mecânica depende do equipamento: Arma Mágica, Armadura Arcana). */
  const mecanicaDe = m => resultado.ficha?.magias?.lista.find(s => s.id === m.id)?.mecanica || m.mecanica(cl, resultado.ctxMagias || {});

  /** Nome (texto ou <label>), números e resumo com o link do SRD. `idDet`: id dos números (aria-describedby). */
  function infoDaMagia(m, { nivelDoEspaco = null, idDet, rotulo = null }) {
    const nivel = nivelNaClasse(m, ck);
    const mec = mecanicaDe(m);
    const menor = nivelDoEspaco != null && nivel < nivelDoEspaco ? html` <span class="arena-mag__nivel">(de ${ordinal(nivel)} nível)</span>` : '';
    return html`<div class="arena-mag__info">
      <p class="arena-mag__nome">${rotulo ? html`<label for="${rotulo}">${m.nome}</label>` : m.nome}${menor}</p>
      <p class="arena-mag__det" id="${idDet}">${mec ? detalheDaMagia(mec, cdBase + nivel) : m.semEfeito}</p>
      <p class="arena-mag__resumo">${m.resumo} <a href="${m.fonte}" target="_blank" rel="noopener noreferrer" class="arena-mag__srd">SRD 3.0<span class="visually-hidden"> (${m.nome}, abre em outra aba)</span></a></p>
    </div>`;
  }

  function linhaPreparada(m, nivel) {
    const n = draft.preparadas?.[nivel]?.[m.id] || 0;
    const cheio = usados(nivel) >= espacos[nivel];
    const chave = `${nivel}-${m.id}`;
    const idDet = `mag-det-${chave}`;
    return html`<li class="arena-mag__item">
      ${infoDaMagia(m, { nivelDoEspaco: Number(nivel), idDet })}
      <span class="stepper arena-qty" role="group" aria-label="${m.nome}, espaços de ${ordinal(nivel)} nível: ${preparadas(n)}" aria-describedby="${idDet}">
        <button type="button" class="stepper__btn" data-prep="${nivel}" data-id="${m.id}" data-delta="-1" data-focus="menos-${chave}" aria-label="Preparar uma a menos: ${m.nome} (${ordinal(nivel)} nível, ${preparadas(n)})" ${n ? '' : 'disabled'}>−</button>
        <span class="arena-qty__n" aria-hidden="true">${n}</span>
        <button type="button" class="stepper__btn" data-prep="${nivel}" data-id="${m.id}" data-delta="1" data-focus="mais-${chave}" aria-label="Preparar mais uma: ${m.nome} (${ordinal(nivel)} nível, ${preparadas(n)})" ${cheio ? 'disabled' : ''}>+</button>
      </span>
    </li>`;
  }

  function nivelPreparado(nivel) {
    const L = Number(nivel);
    const doNivel = daClasse(ck, L).filter(m => nivelNaClasse(m, ck) === L);
    const menores = daClasse(ck, L - 1).sort((x, y) => nivelNaClasse(y, ck) - nivelNaClasse(x, ck) || x.nome.localeCompare(y.nome, 'pt-BR'));
    const algumMenor = menores.some(m => draft.preparadas?.[nivel]?.[m.id]);
    const u = usados(nivel);
    let vazio = '';
    if (!doNivel.length) {
      vazio = menores.length
        ? `Nenhuma magia da lista é de ${ordinal(L)} nível: dá para preparar uma de nível menor.`
        : `Nenhuma magia da lista cabe nos espaços de ${ordinal(L)} nível: eles ficam sem uso na Arena.`;
    }
    return html`<fieldset class="arena-mag__grupo">
      <legend class="arena-mag__legenda">${ordinal(L)} nível <span class="arena-mag__conta ${u === espacos[nivel] ? 'is-cheio' : ''}">${u} de ${espacos[nivel]} ${espacos[nivel] === 1 ? 'espaço' : 'espaços'}</span></legend>
      ${doNivel.length ? html`<ul class="arena-mag__lista">${doNivel.map(m => linhaPreparada(m, nivel))}</ul>` : html`<p class="arena-mag__vazio">${vazio}</p>`}
      ${menores.length ? html`<details class="arena-mag__menores" ${!doNivel.length || algumMenor ? 'open' : ''} data-menores="${nivel}">
        <summary>Magias de nível menor neste espaço</summary>
        <ul class="arena-mag__lista">${menores.map(m => linhaPreparada(m, nivel))}</ul>
      </details>` : ''}
    </fieldset>`;
  }

  function nivelConhecido(nivel) {
    const L = Number(nivel);
    const lista = daClasse(ck, L).filter(m => nivelNaClasse(m, ck) === L);
    const marcadas = draft.conhecidas.filter(id => nivelNaClasse(magiaPorId(id), ck) === L).length;
    const cheio = marcadas >= limites[nivel];
    return html`<fieldset class="arena-mag__grupo">
      <legend class="arena-mag__legenda">${ordinal(L)} nível <span class="arena-mag__conta ${cheio ? 'is-cheio' : ''}">conhece ${marcadas} de ${limites[nivel]} · ${espacos[L]} ${espacos[L] === 1 ? 'espaço' : 'espaços'} por dia</span></legend>
      ${lista.length ? html`<ul class="arena-mag__lista">${lista.map(m => {
        const marcada = draft.conhecidas.includes(m.id);
        const id = `mag-conhece-${m.id}`;
        return html`<li class="arena-mag__item arena-mag__item--caixa">
          <input type="checkbox" class="arena-mag__caixa" id="${id}" data-conhecida="${m.id}" data-focus="conhece-${m.id}" aria-describedby="mag-det-${m.id}" ${marcada ? 'checked' : ''} ${!marcada && cheio ? 'disabled' : ''}>
          ${infoDaMagia(m, { idDet: `mag-det-${m.id}`, rotulo: id })}
        </li>`;
      })}</ul>` : html`<p class="arena-mag__vazio">Nenhuma magia da lista é de ${ordinal(L)} nível.</p>`}
    </fieldset>`;
  }

  function previa() {
    const r = resultado;
    const m = r.ficha?.magias;
    const escolhidas = m?.lista.filter(s => !s.conversao) || [];
    return html`
      ${r.ficha && !m ? html`<p class="arena-equip__info">${icon('info')}<span>Com o equipamento atual, ${entrada.nome} não conjura (veja o aviso abaixo).</span></p>` : ''}
      ${m ? html`<dl class="arena-equip__nums">
        <div><dt>Nível de conjurador</dt><dd>${m.nivel_conjurador}</dd></div>
        <div><dt>CD</dt><dd>${m.cd_base} + nível da magia</dd></div>
        <div class="arena-equip__wide"><dt>Espaços por dia</dt><dd>${Object.entries(espacos).map(([n, t]) => `${ordinal(n)} ${t}`).join(' · ')}</dd></div>
      </dl>` : ''}
      ${m?.lista.some(s => s.conversao) ? html`<p class="arena-equip__info">${icon('info')}<span>Clérigo bom ou neutro: na luta, troca uma magia preparada por uma cura do mesmo nível ou menor (o espaço precisa ter uma magia preparada).</span></p>` : ''}
      ${m && !escolhidas.length ? html`<p class="arena-equip__info">${icon('info')}<span>Nenhuma magia escolhida: ${entrada.nome} luta sem magias.</span></p>` : ''}
      ${r.avisos.length ? html`<ul class="arena-equip__avisos">${r.avisos.map(a => html`<li>${icon('info')}<span>${a[0].toUpperCase()}${a.slice(1)}</span></li>`)}</ul>` : ''}`;
  }

  function corpo() {
    const lead = conhece
      ? `Marque as magias conhecidas de cada nível. ${entrada.nome} as lança com qualquer espaço do nível delas ou maior, enquanto houver espaço.`
      : `Prepare as magias de cada nível de espaço (uma magia menor também cabe num espaço maior). ${entrada.nome} lança cada preparada uma vez.`;
    const niveis = Object.keys(conhece ? limites : espacos).sort((a, b) => a - b);
    return html`
      <p class="arena-equip__lead">${lead} Fica salvo com o personagem e vale nas próximas lutas. Só as magias de combate da lista curada do Livro do Jogador 3.0; as de nível 0 e os espaços de domínio ficam de fora.</p>
      <div class="arena-equip__grid">${niveis.length ? niveis.map(n => (conhece ? nivelConhecido(n) : nivelPreparado(n))) : html`<p class="arena-mag__vazio">Ainda não há magias da lista para conhecer neste nível.</p>`}</div>
      <section class="arena-equip__preview" aria-labelledby="mag-previa-titulo">
        <h3 class="arena-equip__h3" id="mag-previa-titulo">Na luta</h3>
        <div data-slot="previa">${previa()}</div>
      </section>`;
  }

  function desenhar() {
    const quem = [sheet.identidade.classe ? `${sheet.identidade.classe} ${sheet.nivel}` : `${sheet.nivel}º nível`, sheet.identidade.raca, `nível de conjurador ${cl}`].filter(Boolean).join(' · ');
    render(dialog, html`<div class="arena-picker__frame">
      <header class="arena-picker__head arena-equip__head">
        <div class="arena-picker__title-row">
          <div>
            <h2 class="dialog__title" id="mag-titulo">Magias de ${entrada.nome}</h2>
            <p class="arena-equip__who">${quem}</p>
          </div>
          <button type="button" class="icon-btn" data-action="cancelar" aria-label="Fechar sem salvar">${icon('x')}</button>
        </div>
      </header>
      <div class="arena-picker__body" data-slot="corpo">${corpo()}</div>
      <footer class="arena-picker__foot">
        <button type="button" class="btn btn--ghost" data-action="padrao">${icon('restore')}${conhece ? 'Escolha padrão' : 'Preparação padrão'}</button>
        <span class="arena-equip__spacer"></span>
        <button type="button" class="btn btn--ghost" data-action="cancelar">Cancelar</button>
        <button type="button" class="btn btn--primary" data-action="salvar">${icon('check')}Salvar</button>
        <p class="visually-hidden" aria-live="polite" data-slot="anuncio"></p>
      </footer>
    </div>`);
  }

  /** Redesenha só o corpo, sem perder o foco, a rolagem nem os "nível menor" abertos; anuncia `texto`. */
  function atualizar(texto = '') {
    const chave = document.activeElement?.dataset?.focus;
    const reserva = chave?.startsWith('mais-') ? chave.replace('mais-', 'menos-') : chave?.startsWith('menos-') ? chave.replace('menos-', 'mais-') : null;
    const abertos = [...dialog.querySelectorAll('details[data-menores]')].filter(d => d.open).map(d => d.dataset.menores);
    const corpoEl = dialog.querySelector('[data-slot="corpo"]');
    const rolagem = corpoEl.scrollTop;
    resultado = calcular(draft);
    render(corpoEl, corpo());
    corpoEl.scrollTop = rolagem;
    for (const n of abertos) {
      const d = dialog.querySelector(`details[data-menores="${n}"]`);
      if (d) d.open = true;
    }
    dialog.querySelector('[data-slot="anuncio"]').textContent = texto;
    if (!chave) return;
    let el = dialog.querySelector(`[data-focus="${chave}"]`);
    if ((!el || el.disabled) && reserva) el = dialog.querySelector(`[data-focus="${reserva}"]`);
    el?.focus({ preventScroll: true });
  }

  let fechado = false;
  const fechar = () => {
    if (fechado) return;
    fechado = true;
    if (dialog.open) dialog.close();
    dialog.remove();
    if (aoFechar) aoFechar();
    else if (opener?.isConnected) opener.focus();
  };
  const sujo = () => JSON.stringify(draft) !== inicial;
  const cancelar = async () => {
    if (sujo()) {
      const ok = await confirmDialog({ title: 'Descartar as magias?', message: 'As mudanças neste diálogo ainda não foram salvas.', confirmLabel: 'Descartar', cancelLabel: 'Continuar editando', glyph: 'alert' });
      if (!ok) return;
    }
    fechar();
  };

  dialog.addEventListener('change', event => {
    const id = event.target.dataset?.conhecida;
    if (!id) return;
    draft.conhecidas = event.target.checked ? [...draft.conhecidas.filter(x => x !== id), id] : draft.conhecidas.filter(x => x !== id);
    draft = normalizarMagias(draft, sheet);
    const m = magiaPorId(id);
    const L = nivelNaClasse(m, ck);
    const marcadas = draft.conhecidas.filter(x => nivelNaClasse(magiaPorId(x), ck) === L).length;
    atualizar(`${m.nome} ${event.target.checked ? 'marcada' : 'desmarcada'}: conhece ${marcadas} de ${limites[L]} de ${ordinal(L)} nível.`);
  });
  dialog.addEventListener('click', async event => {
    const prep = event.target.closest('[data-prep]');
    if (prep) {
      const { prep: nivel, id, delta } = prep.dataset;
      const conta = { ...(draft.preparadas[nivel] || {}) };
      conta[id] = Math.max(0, (conta[id] || 0) + Number(delta));
      if (!conta[id]) delete conta[id];
      draft.preparadas = { ...draft.preparadas, [nivel]: conta };
      if (!Object.keys(conta).length) delete draft.preparadas[nivel];
      draft = normalizarMagias(draft, sheet);
      const n = draft.preparadas[nivel]?.[id] || 0;
      atualizar(`${magiaPorId(id).nome}: ${preparadas(n)} no ${ordinal(nivel)} nível (${usados(nivel)} de ${espacos[nivel]} espaços).`);
      return;
    }
    const acao = event.target.closest('[data-action]')?.dataset.action;
    if (acao === 'cancelar') cancelar();
    if (acao === 'padrao') {
      draft = magiasPadrao(sheet);
      atualizar(conhece ? 'Voltou à escolha padrão.' : 'Voltou à preparação padrão.');
    }
    if (acao === 'salvar') {
      const botao = event.target.closest('[data-action]');
      botao.disabled = true;
      try {
        await salvar(normalizarMagias(draft, sheet));
        fechar();
      } catch {
        botao.disabled = false;
      }
    }
  });
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    cancelar();
  });

  desenhar();
  dialog.showModal();
  dialog.querySelector('[data-prep]:not(:disabled), [data-conhecida]:not(:disabled)')?.focus();
  return { fechar, sujo };
}
