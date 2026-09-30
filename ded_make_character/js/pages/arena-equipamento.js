/**
 * Diálogo de equipamento de um personagem na Arena (TASK_006 §6, etapa E4): arma principal,
 * segunda arma ou escudo, armadura e arma à distância, com bônus de melhoria e material. A
 * prévia recalcula a CA e os ataques pelo adaptador a cada mudança. Salvo em
 * `fichas.equipamento`.
 */
import { html, render } from '../core/dom.js';
import { ARMADURAS, ARMAS, empunhadura, kitPadrao, problemasDoEquipamento, proficienciasDeTalentos, proficienteArma, proficienteArmadura, rotuloItem } from '../rules/equipamento30.js';
import { confirmDialog } from '../ui/dialog.js';
import { icon } from '../ui/icons.js';

const CATEGORIAS = [['simples', 'Armas simples'], ['comum', 'Armas comuns'], ['exotica', 'Armas exóticas']];
const TIPOS_ARMADURA = [['leve', 'Leves'], ['média', 'Médias'], ['pesada', 'Pesadas']];
const num = n => (n < 0 ? `−${-n}` : `+${n}`);
const critico = c => `${c.margem < 20 ? `${c.margem}–20` : '20'}/×${c.multiplicador}`;

const SLOTS = [
  { key: 'principal', rotulo: 'Arma principal', tipo: 'arma', vazio: null },
  { key: 'secundaria', rotulo: 'Segunda arma (mão inábil)', tipo: 'arma', vazio: 'Nenhuma' },
  { key: 'escudo', rotulo: 'Escudo', tipo: 'escudo', vazio: 'Nenhum' },
  { key: 'armadura', rotulo: 'Armadura', tipo: 'armadura', vazio: 'Nenhuma' },
  { key: 'distancia', rotulo: 'Arma à distância', tipo: 'arma', vazio: 'Nenhuma' },
];

/**
 * `entrada`: o personagem da Arena ({ nome, sheet, personagem, equipamento, talentos }).
 * `calcular(eq)` → resultado do adaptador; `salvar(eq)` grava (Promise). Devolve `{ fechar }`.
 */
export function abrirEquipamento({ entrada, calcular, salvar, aoFechar }) {
  const { sheet } = entrada;
  const ck = sheet.classKey;
  const tamanho = sheet.identidade.tamanho || 'Médio';
  const raceKey = sheet.raceKey;
  const extras = proficienciasDeTalentos(entrada.talentos || []);
  const inicial = JSON.stringify(entrada.equipamento);
  let draft = JSON.parse(inicial);
  const dialog = document.createElement('dialog');
  dialog.className = 'dialog arena-picker arena-equip';
  dialog.setAttribute('aria-labelledby', 'equip-titulo');
  document.body.append(dialog);
  const opener = document.activeElement;

  /** Notas da opção, num parêntese só: "(arremesso, leve, sem proficiência)". */
  const nota = (arma, slot) => {
    const grip = empunhadura(arma, tamanho);
    const partes = [];
    if (slot === 'distancia' && arma.uso === 'corpo a corpo') partes.push('arremesso');
    // arco e besta são sempre de duas mãos: a nota só ajuda nas armas corpo a corpo
    if (slot !== 'distancia' && arma.uso === 'corpo a corpo' && grip === 'duas mãos') partes.push('duas mãos');
    if (slot !== 'distancia' && arma.uso === 'corpo a corpo' && grip === 'leve' && !arma.desarmado) partes.push('leve');
    const proficiente = proficienteArma(arma, { classKey: ck, raceKey, tamanho, extras });
    if (!proficiente && slot === 'principal' && proficienteArma(arma, { classKey: ck, raceKey, tamanho, extras, duasMaos: true })) partes.push('comum com as duas mãos');
    else if (!proficiente) partes.push('sem proficiência');
    return partes.length ? ` (${partes.join(', ')})` : '';
  };

  function opcoesArma(slot) {
    const serve = a => (slot === 'distancia' ? a.uso === 'distancia' || a.arremesso_m : a.uso === 'corpo a corpo' && !(slot === 'secundaria' && a.desarmado));
    const atual = draft[slot]?.id || '';
    return CATEGORIAS.map(([cat, rotulo]) => {
      const lista = ARMAS.filter(a => a.categoria === cat && serve(a));
      if (!lista.length) return '';
      return html`<optgroup label="${rotulo}">${lista.map(a => {
        const grande = empunhadura(a, tamanho) === 'grande demais';
        return html`<option value="${a.id}" ${a.id === atual ? 'selected' : ''} ${grande ? 'disabled' : ''}>${a.nome}${grande ? ' (grande demais)' : nota(a, slot)}</option>`;
      })}</optgroup>`;
    });
  }

  function opcoesArmadura(slot) {
    const atual = draft[slot]?.id || '';
    const lista = t => ARMADURAS.filter(a => a.tipo === t);
    const rot = a => `${a.nome} (+${a.bonus}${a.desMax != null ? `, Des máx. ${num(a.desMax)}` : ''}${proficienteArmadura(a, { classKey: ck, extras }) ? '' : ', sem proficiência'})`;
    if (slot === 'escudo') return lista('escudo').map(a => html`<option value="${a.id}" ${a.id === atual ? 'selected' : ''}>${rot(a)}</option>`);
    return TIPOS_ARMADURA.map(([t, rotulo]) => html`<optgroup label="${rotulo}">${lista(t).map(a => html`<option value="${a.id}" ${a.id === atual ? 'selected' : ''}>${rot(a)}</option>`)}</optgroup>`);
  }

  function linha(s) {
    const x = draft[s.key];
    const id = `equip-${s.key}`;
    return html`<div class="field arena-equip__slot">
      <label class="field__label" for="${id}">${s.rotulo}</label>
      <div class="arena-equip__row">
        <select class="select arena-equip__item" id="${id}" data-item="${s.key}">
          ${s.vazio ? html`<option value="" ${x ? '' : 'selected'}>${s.vazio}</option>` : ''}
          ${s.tipo === 'arma' ? opcoesArma(s.key) : opcoesArmadura(s.key)}
        </select>
        <select class="select arena-equip__plus" data-melhoria="${s.key}" aria-label="Bônus de melhoria: ${s.rotulo.toLowerCase()}" ${x && !(s.key === 'principal' && x.id === 'desarmado') ? '' : 'disabled'}>
          ${[0, 1, 2, 3, 4, 5].map(n => html`<option value="${n}" ${(x?.melhoria || 0) === n ? 'selected' : ''}>${n ? `+${n}` : 'comum'}</option>`)}
        </select>
        ${s.tipo === 'arma' ? html`<select class="select arena-equip__material" data-material="${s.key}" aria-label="Material: ${s.rotulo.toLowerCase()}" ${x && x.id !== 'desarmado' ? '' : 'disabled'}>
          <option value="" ${x?.material ? '' : 'selected'}>aço</option>
          <option value="prata" ${x?.material === 'prata' ? 'selected' : ''}>prata</option>
        </select>` : ''}
      </div>
    </div>`;
  }

  /** Só os erros do equipamento bloqueiam o Salvar (os do personagem, como faltar a classe, não). */
  const errosDoEquipamento = () => problemasDoEquipamento(draft, { classKey: ck, raceKey, tamanho, extras }).erros;

  function previa() {
    const r = calcular(draft);
    const f = r.ficha;
    const doEquipamento = errosDoEquipamento();
    const doPersonagem = r.erros.filter(e => !doEquipamento.includes(e));
    const ataque = a => `${a.nome} ${num(a.bonus)} (${a.dano}, ${critico(a.critico)})`;
    return html`
      ${doEquipamento.length ? html`<ul class="arena-equip__erros" role="alert">${doEquipamento.map(e => html`<li>${icon('alert')}<span>${e}</span></li>`)}</ul>` : ''}
      ${doPersonagem.length ? html`<p class="arena-equip__info">${icon('info')}<span>${entrada.nome} ainda não pode lutar (${doPersonagem.join('; ')}). O equipamento pode ser salvo mesmo assim.</span></p>` : ''}
      ${f ? html`<dl class="arena-equip__nums">
        <div><dt>CA</dt><dd>${f.ca.total} <small>(toque ${f.ca.toque}, surpresa ${f.ca.surpresa})</small></dd></div>
        <div><dt>Deslocamento</dt><dd>${f.deslocamento.terrestre.toLocaleString('pt-BR')} m</dd></div>
        <div class="arena-equip__wide"><dt>Ataque</dt><dd>${ataque(f.ataques[0])}</dd></div>
        <div class="arena-equip__wide"><dt>Ataque total</dt><dd>${f.ataqueTotal.map(a => num(a.bonus)).join('/')}${f.ataqueTotal.some(a => /inábil/.test(a.nome)) ? ' (com a mão inábil)' : ''}</dd></div>
        ${f.ataqueTotalDistancia ? html`<div class="arena-equip__wide"><dt>À distância</dt><dd>${ataque(f.ataqueTotalDistancia[0])}${f.ataqueTotalDistancia.length > 1 ? ` · ${f.ataqueTotalDistancia.map(a => num(a.bonus)).join('/')}` : ''}</dd></div>` : ''}
      </dl>` : ''}
      ${r.avisos.length ? html`<ul class="arena-equip__avisos">${r.avisos.map(a => html`<li>${icon('info')}<span>${a[0].toUpperCase()}${a.slice(1)}</span></li>`)}</ul>` : ''}`;
  }

  function desenhar() {
    const bloqueia = errosDoEquipamento().length > 0;
    const quem = [sheet.identidade.classe ? `${sheet.identidade.classe} ${sheet.nivel}` : `${sheet.nivel}º nível`, sheet.identidade.raca, tamanho].filter(Boolean).join(' · ');
    render(dialog, html`<div class="arena-picker__frame">
      <header class="arena-picker__head arena-equip__head">
        <div class="arena-picker__title-row">
          <div>
            <h2 class="dialog__title" id="equip-titulo">Equipamento de ${entrada.nome}</h2>
            <p class="arena-equip__who">${quem}</p>
          </div>
          <button type="button" class="icon-btn" data-action="cancelar" aria-label="Fechar sem salvar">${icon('x')}</button>
        </div>
      </header>
      <div class="arena-picker__body">
        <p class="arena-equip__lead">Fica salvo com o personagem e vale nas próximas lutas. Kit padrão da classe: ${['principal', 'secundaria', 'escudo', 'armadura', 'distancia'].map(k => rotuloItem(kitPadrao(ck, tamanho)[k])).filter(Boolean).join(', ')}.</p>
        <div class="arena-equip__grid">${SLOTS.map(linha)}</div>
        <section class="arena-equip__preview" aria-labelledby="equip-previa-titulo">
          <h3 class="arena-equip__h3" id="equip-previa-titulo">Na luta</h3>
          <div data-slot="previa" aria-live="polite">${previa()}</div>
        </section>
      </div>
      <footer class="arena-picker__foot">
        <button type="button" class="btn btn--ghost" data-action="kit">${icon('restore')}Kit padrão</button>
        <span class="arena-equip__spacer"></span>
        <button type="button" class="btn btn--ghost" data-action="cancelar">Cancelar</button>
        <button type="button" class="btn btn--primary" data-action="salvar" ${bloqueia ? html`disabled aria-describedby="equip-previa-titulo"` : ''}>${icon('check')}Salvar</button>
      </footer>
    </div>`);
  }

  function atualizar() {
    // redesenha os campos (opções dependem do resto) sem perder o foco
    const foco = document.activeElement?.dataset;
    const chaveFoco = foco && (foco.item ? `[data-item="${foco.item}"]` : foco.melhoria ? `[data-melhoria="${foco.melhoria}"]` : foco.material ? `[data-material="${foco.material}"]` : null);
    const rolagem = dialog.querySelector('.arena-picker__body')?.scrollTop ?? 0;
    desenhar();
    dialog.querySelector('.arena-picker__body').scrollTop = rolagem;
    if (chaveFoco) dialog.querySelector(chaveFoco)?.focus();
  }

  let fechado = false;
  const fechar = () => {
    if (fechado) return;
    fechado = true;
    if (dialog.open) dialog.close();
    dialog.remove();
    // quem abriu decide para onde vai o foco (o botão pode ter sido redesenhado)
    if (aoFechar) aoFechar();
    else if (opener?.isConnected) opener.focus();
  };
  const sujo = () => JSON.stringify(draft) !== inicial;
  const cancelar = async () => {
    if (sujo()) {
      const ok = await confirmDialog({ title: 'Descartar o equipamento?', message: 'As mudanças neste diálogo ainda não foram salvas.', confirmLabel: 'Descartar', cancelLabel: 'Continuar editando', glyph: 'alert' });
      if (!ok) return;
    }
    fechar();
  };

  dialog.addEventListener('change', event => {
    const t = event.target;
    const d = t.dataset;
    if (d.item) {
      draft[d.item] = t.value ? { id: t.value, melhoria: draft[d.item]?.id === t.value ? draft[d.item].melhoria : 0, material: null } : null;
      if (d.item === 'principal' && t.value === 'desarmado') draft.principal = { id: 'desarmado', melhoria: 0, material: null };
    } else if (d.melhoria && draft[d.melhoria]) draft[d.melhoria].melhoria = Number(t.value);
    else if (d.material && draft[d.material]) draft[d.material].material = t.value || null;
    else return;
    atualizar();
  });
  dialog.addEventListener('click', async event => {
    const acao = event.target.closest('[data-action]')?.dataset.action;
    if (acao === 'cancelar') cancelar();
    if (acao === 'kit') {
      draft = kitPadrao(ck, tamanho);
      atualizar();
    }
    if (acao === 'salvar') {
      const botao = event.target.closest('[data-action]');
      botao.disabled = true;
      try {
        await salvar(draft);
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
  dialog.querySelector('[data-item="principal"]')?.focus();
  return { fechar, sujo };
}
