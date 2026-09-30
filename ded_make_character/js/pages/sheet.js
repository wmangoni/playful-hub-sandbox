/**
 * Ficha de personagem D&D 3ª edição (3.0) em pergaminho.
 *
 * O layout segue a ficha oficial do Livro do Jogador 3.0 (2 páginas; ver
 * TASKS/TASK_003.md): placas escuras com rótulo em versalete, fórmulas em
 * caixas ("TOTAL = 10 + …"), colunas temporárias sombreadas, abas de arma,
 * perícias com checkbox de "outra classe" e, na página 2, equipamento,
 * habilidades especiais/talentos, carga, idiomas e magias. Não reproduz o
 * logotipo oficial (marca registrada): o cabeçalho é textual.
 *
 * O equipamento (TASK_006 E8) vem de `fichas.equipamento` (o escolhido na Arena) ou do kit padrão
 * da classe: preenche os blocos de arma, armadura e escudo, e entra na CA, no deslocamento, no
 * ataque e nas perícias com penalidade de armadura, com as mesmas contas da Arena
 * (`fromPersonagem().naFicha`).
 */
import { html, render } from '../core/dom.js';
import { computeSheet, signed, skillKey } from '../rules/dnd30.js';
import { fromPersonagem } from '../rules/personagem30.js';
import { buildContext, grantedFeats, validateFeats, validateSkills } from '../rules/choices30.js';
import { T30 } from '../rules/tables30.js';
import { SEXOS, TENDENCIAS, labelOf } from '../entities/options.js';
import { icon } from '../ui/icons.js';
import { breadcrumb, emptyState, loadingState } from '../ui/page.js';
import { confirmDialog } from '../ui/dialog.js';
import { toast } from '../ui/toast.js';
import { chosenFeatLabels, openChoicesDialog, ranksToKeys } from './choices.js';

const v = value => (value == null || value === '' ? '' : value);
const sg = n => (n == null ? '' : signed(n));
const range = n => Array.from({ length: n }, (_, i) => i);
const ORDINAL = ['0', '1º', '2º', '3º', '4º', '5º', '6º', '7º', '8º', '9º'];

/* Perícias com penalidade de armadura (*) e de peso (**), e as que pedem especialidade "( )", como na ficha 3.0. */
const ARMOR_PENALTY = new Set(['equilibrio', 'escalar', 'arte da fuga', 'esconder-se', 'saltar', 'furtividade', 'acrobacias', 'prestidigitacao']);
const SPECIALTY = new Set(['oficios', 'atuacao', 'profissao', 'cavalgar']);

/* ------------------------------------------------------------ primitivas */
const plate = (title, sub, cls = '') => html`<span class="sf-plate ${cls}"><b>${title}</b>${sub ? html`<small>${sub}</small>` : ''}</span>`;
const cell = (value, label, { cls = '', labelTop = false, temp = false } = {}) => html`<span class="sf-cell ${cls} ${temp ? 'is-temp' : ''} ${labelTop ? 'is-label-top' : ''}">${labelTop && label ? html`<small>${label}</small>` : ''}<span class="sf-cell__box">${v(value)}</span>${!labelTop && label ? html`<small>${label}</small>` : ''}</span>`;
const eq = sign => html`<span class="sf-sign" aria-hidden="true">${sign}</span>`;
const field = (label, value, span = 1) => html`<span class="sf-field" style="--span:${span}"><span class="sf-field__value" data-fit>${v(value)}</span><small>${label}</small></span>`;
/** Valores longos (ex.: RD "20/+1") usam corpo menor para caber na caixinha. */
const compact = value => (String(value ?? '').length > 3 ? 'is-compact' : '');
const bar = (title, cls = '') => html`<h3 class="sf-bar ${cls}" data-fit>${title}</h3>`;
const kg = n => (n == null ? '' : `${String(n).replace('.', ',')} kg`);
const metros = n => (n == null ? '' : `${String(n).replace('.', ',')} m`);

/* ------------------------------------------------------------ página 1 */
function identity(sheet, p) {
  const tend = labelOf(TENDENCIAS, p.tendencia) || p.tendencia;
  const sexo = labelOf(SEXOS, p.sexo) || p.sexo;
  const altura = p.altura != null && p.altura !== '' ? `${Number(p.altura).toFixed(2).replace('.', ',')} m` : '';
  return html`<header class="sf-head">
    <div class="sf-id">
      <div class="sf-id__row">${field('nome do personagem', p.nome, 5)}${field('jogador', '', 3)}</div>
      <div class="sf-id__row">${field('classe', sheet.identidade.classe, 3)}${field('raça', sheet.identidade.raca, 2)}${field('tendência', tend, 2)}${field('nível', sheet.nivel, 1)}${field('divindade', p.divindade, 2)}</div>
      <div class="sf-id__row">${field('tamanho', sheet.identidade.tamanho, 2)}${field('idade', p.idade, 1)}${field('sexo', sexo, 2)}${field('altura', altura, 2)}${field('peso', p.peso != null ? `${p.peso} kg` : '', 2)}${field('olhos', p.olhos, 2)}${field('cabelo', p.cabelos, 2)}${field('pele', '', 2)}</div>
    </div>
    <div class="sf-title">
      <span class="sf-title__kicker">Dungeons &amp; Dragons</span>
      <span class="sf-title__main">Ficha de Personagem</span>
      <span class="sf-title__sub">3ª Edição · Livro do Jogador</span>
    </div>
  </header>`;
}

function abilities(sheet) {
  return html`<section class="sf-abilities" aria-label="Atributos">
    <div class="sf-abilities__head"><span>nome da habilidade</span><span>valor da habilidade</span><span>modificador da habilidade</span><span class="is-temp-head">valor temporário</span><span class="is-temp-head">modificador temporário</span></div>
    <div class="sf-abilities__grid">
      <span class="sf-temp-panel" aria-hidden="true"></span>
      ${sheet.atributos.map(a => html`<div class="sf-ability">
        ${plate(a.abbr, a.label.toLowerCase())}
        <span class="sf-cell__box sf-score" title="${a.racial ? `valor base ${a.base ?? '—'}, ajuste racial ${sg(a.racial)}` : ''}">${v(a.total)}${a.racial ? html`<sup>${sg(a.racial)}</sup>` : ''}</span>
        <span class="sf-cell__box sf-score">${sg(a.mod)}</span>
        <span class="sf-cell__box is-temp-box"></span>
        <span class="sf-cell__box is-temp-box"></span>
      </div>`)}
    </div>
  </section>`;
}

function hpRow(sheet, eqf) {
  const deslocamento = eqf ? eqf.deslocamento : sheet.deslocamento;
  return html`<div class="sf-row sf-row--hp">
    ${plate('PV', 'pontos de vida')}
    ${cell(sheet.pv.total, 'total', { labelTop: true, cls: 'is-total' })}
    ${cell('', 'ferimentos / pv atuais', { labelTop: true, cls: 'is-wide' })}
    ${cell('', 'dano por contusão', { labelTop: true, cls: 'is-wide' })}
    ${cell(sheet.reducaoDano, 'redução de dano', { labelTop: true, cls: compact(sheet.reducaoDano) })}
    ${cell(sheet.pv.dadoVida, 'tipo de dado de vida', { labelTop: true })}
    <span class="sf-speed"><b>Deslocamento</b><span class="sf-cell__box">${deslocamento ? metros(deslocamento) : ''}</span></span>
  </div>`;
}

function acRow(sheet, eqf) {
  const ca = eqf?.ca || sheet.ca;
  return html`<div class="sf-row sf-row--ac">
    ${plate('CA', 'classe de armadura')}
    ${cell(ca.total, 'total', { cls: 'is-total' })}${eq('= 10 +')}
    ${cell(ca.armadura || '', 'bônus de armadura')}${eq('+')}
    ${cell(ca.escudo || '', 'bônus de escudo')}${eq('+')}
    ${cell(sg(ca.destreza), 'mod. de destreza')}${eq('+')}
    ${cell(ca.tamanho ? sg(ca.tamanho) : '', 'mod. de tamanho')}${eq('+')}
    ${cell(ca.natural || '', 'armadura natural')}${eq('+')}
    ${cell(ca.diversos ? sg(ca.diversos) : '', 'mod. diversos')}
    <span class="sf-row__gap"></span>
    ${cell('', 'chance de falha', { cls: 'is-extra' })}${cell(eqf?.falhaArcana ? `${eqf.falhaArcana}%` : '', 'falha de magia arcana', { cls: 'is-extra' })}${cell(eqf?.penalidadeArmadura ? sg(eqf.penalidadeArmadura) : '', 'penal. de armadura', { cls: 'is-extra' })}
    ${cell(sheet.resistenciaMagia, 'resist. à magia', { cls: 'is-extra' })}
  </div>`;
}

function initBab(sheet) {
  return html`<div class="sf-initbab">
    <div class="sf-row">
      ${plate('Iniciativa', 'modificador', 'is-wide')}
      ${cell(sg(sheet.iniciativa.total), 'total', { cls: 'is-total' })}${eq('=')}
      ${cell(sg(sheet.iniciativa.destreza), 'mod. de destreza')}${eq('+')}
      ${cell(sg(sheet.iniciativa.diversos), 'mod. diversos')}
    </div>
    <div class="sf-row">
      ${plate('Base de ataque', 'bônus', 'is-wider')}
      ${cell(sheet.bba.ataques.map(signed).join('/'), '', { cls: 'is-bab' })}
    </div>
  </div>`;
}

function saves(sheet) {
  return html`<section class="sf-saves" aria-label="Testes de resistência">
    <div class="sf-saves__head">
      <span class="sf-saves__title">Testes de resistência</span><span class="is-strong">total</span><span></span><span>resistência base</span><span></span><span>mod. de habilidade</span><span></span><span>mod. mágico</span><span></span><span>mod. diversos</span><span></span><span class="is-temp-head">mod. temporário</span>
    </div>
    <div class="sf-saves__body">
      <div class="sf-saves__rows">
        ${sheet.resistencias.map(s => html`<div class="sf-save">
          ${plate(s.label, `(${s.abilityLabel.toLowerCase()})`)}
          <span class="sf-cell__box is-total">${sg(s.total)}</span>${eq('=')}
          <span class="sf-cell__box">${sg(s.base)}</span>${eq('+')}
          <span class="sf-cell__box">${sg(s.abilityMod)}</span>${eq('+')}
          <span class="sf-cell__box"></span>${eq('+')}
          <span class="sf-cell__box">${s.misc ? sg(s.misc) : ''}</span>${eq('+')}
          <span class="sf-cell__box is-temp-box"></span>
        </div>`)}
      </div>
      <div class="sf-conditional"><small>modificadores condicionais</small>${sheet.condicionais.length ? html`<ul>${sheet.condicionais.map(c => html`<li>${c}</li>`)}</ul>` : ''}</div>
    </div>
  </section>`;
}

function attackRow(title, a, abilityLabel, labelsTop) {
  const labels = ['total', 'bônus base de ataque', abilityLabel, 'mod. de tamanho', 'mod. diversos', 'mod. temporário'];
  const values = [sg(a.total), sg(a.bba), sg(a.mod), a.tamanho ? sg(a.tamanho) : '', a.diversos ? sg(a.diversos) : '', ''];
  return html`<div class="sf-row sf-row--attack ${labelsTop ? 'is-top' : ''}">
    ${plate(title, 'bônus de ataque', 'is-wider')}
    ${values.map((val, i) => html`${i === 1 ? eq('=') : i > 1 ? eq('+') : ''}${cell(val, labels[i], { labelTop: labelsTop, cls: i < 2 ? 'is-total' : '', temp: i === 5 })}`)}
  </div>`;
}

const strip = (cols, { oculta = false } = {}) => html`<span class="sf-strip" ${oculta ? html`aria-hidden="true"` : ''}>${cols.map(([label, w]) => html`<span style="--w:${w}" data-fit>${label}</span>`)}</span>`;
/**
 * Células de escrever; com `valores`, preenchidas. Cada valor leva o rótulo da faixa, escondido
 * (o leitor de tela lê "dano: 1d8+4"). A última, "propriedades especiais", quebra em até 3 linhas.
 */
const writeCells = (cols, valores = null, { prop = false } = {}) => html`<span class="sf-cells">${cols.map(([label, w], i) => {
  const valor = valores?.[i];
  if (valor == null || valor === '') return html`<span style="--w:${w}"></span>`;
  const rotulo = html`<span class="visually-hidden">${label}: </span>`;
  if (prop && i === cols.length - 1) return html`<span style="--w:${w}" class="sf-val is-prop"><span class="sf-val__txt" data-fit-lines>${rotulo}${valor}</span></span>`;
  return html`<span style="--w:${w}" class="sf-val" data-fit>${rotulo}${valor}</span>`;
})}</span>`;

/**
 * Bloco de arma, armadura ou escudo; `dados` = { nome, cima: [...], baixo: [...] } para preenchê-lo.
 * Preenchido, as faixas de rótulos saem do leitor de tela (cada valor já leva o seu).
 */
function gearBlock(tab, top, bottom, wideTab = false, dados = null) {
  const faixa = cols => strip(cols, { oculta: Boolean(dados) });
  return html`<div class="sf-gearblock ${dados ? 'is-filled' : ''}">
    <div class="sf-gearblock__top"><span class="sf-tab ${wideTab ? 'is-wide' : ''}">${tab}</span>${faixa(top)}</div>
    <div class="sf-gearblock__write"><span class="sf-gearblock__name ${wideTab ? 'is-wide' : ''}" ${dados ? 'data-fit' : ''}>${dados?.nome || ''}</span>${writeCells(top, dados?.cima)}</div>
    ${faixa(bottom)}
    ${writeCells(bottom, dados?.baixo, { prop: true })}
  </div>`;
}

const props = lista => (lista?.length ? lista.join('; ') : '');
/** "1d6-1" → "1d6−1" (o sinal de menos da ficha). */
const menos = t => (t == null ? '' : String(t).replace(/-(?=\d)/g, '−'));
const weapon = b => gearBlock('Arma', [['bônus de ataque total', 5], ['dano', 3], ['decisivo', 3]], [['alcance', 2], ['peso', 2], ['tipo', 3], ['tamanho', 2], ['propriedades especiais', 8]], false, b && {
  nome: b.nome,
  cima: [b.ataque, menos(b.dano), b.decisivo],
  baixo: [b.alcance, kg(b.peso), b.tipo, b.tamanho, props(b.propriedades)],
});
const armor = b => gearBlock('Armadura / item de proteção', [['tipo', 3], ['bônus de armadura', 3], ['bônus máx. de des', 3]], [['penalidade', 3], ['falha de magia', 3], ['deslocamento', 3], ['peso', 2], ['propriedades especiais', 6]], true, b && {
  nome: b.nome,
  cima: [b.tipo, sg(b.bonus), b.desMax == null ? '—' : sg(b.desMax)],
  baixo: [b.penalidade ? sg(b.penalidade) : '0', `${b.falhaArcana}%`, metros(b.deslocamento), kg(b.peso), props(b.propriedades)],
});
const shield = b => gearBlock('Escudo / item de proteção', [['bônus de armadura', 4], ['peso', 2], ['penalidade', 3], ['falha de magia', 3]], [['propriedades especiais', 1]], true, b && {
  nome: b.nome,
  cima: [sg(b.bonus), kg(b.peso), b.penalidade ? sg(b.penalidade) : '0', `${b.falhaArcana}%`],
  baixo: [props(b.propriedades)],
});

/** Munição como na ficha oficial: nome à esquerda e duas fileiras de 10 marcas à direita (4 × 20). */
function ammunition() {
  const entry = () => html`<div class="sf-ammo__entry"><span class="sf-ammo__name"></span><span class="sf-ammo__marks">${range(20).map(() => html`<i></i>`)}</span></div>`;
  return html`<section class="sf-ammo" aria-label="Munição"><h3 class="sf-ammo__title">Munição</h3><div class="sf-ammo__grid">${range(4).map(entry)}</div></section>`;
}

const checkLabel = classe => (classe == null ? 'perícia (classe não definida)' : classe ? 'perícia de classe' : 'perícia de outra classe');

const halfRank = n => String(n).replace('.5', '½').replace(/^0½$/, '½');

function skills(sheet, eqf) {
  const { graduacaoMaxima: ranks, pontosPericia: pts } = sheet;
  const acp = eqf?.penalidadeArmadura || 0;
  // sem proficiência, a penalidade vale também "em todas as perícias que envolvem movimento,
  // inclusive Cavalgar" (SRD 3.0); as outras dessas já são as marcadas com *
  const acpCavalgar = eqf?.penalidadeNoAtaque || 0;
  const spent = sheet.pericias.reduce((sum, p) => sum + (p.graduacoes || 0) * (p.classe === false ? 2 : 1), 0);
  const half = String(ranks.cruzada).replace('.5', '½');
  const blanks = Math.max(1, 50 - sheet.pericias.length);
  const row = pericia => {
    const key = skillKey(pericia.nome);
    const armorMark = key === 'natacao' ? '**' : ARMOR_PENALTY.has(key) ? '*' : '';
    // com armadura ou escudo, a penalidade entra nos diversos das perícias marcadas com * (3.0)
    const extra = ARMOR_PENALTY.has(key) ? acp : key === 'cavalgar' ? acpCavalgar : 0;
    const p = extra ? { ...pericia, diversos: (pericia.diversos ?? 0) + extra, total: pericia.total == null ? null : pericia.total + extra } : pericia;
    return html`<li class="sf-skill">
      <span class="sf-check ${p.classe === false ? 'is-cross' : ''}" role="img" aria-label="${checkLabel(p.classe)}"></span>
      <span class="sf-skill__name"><span class="sf-skill__label" data-fit>${p.nome}${p.semTreinamento ? html`<span class="sf-untrained" title="pode ser usada sem graduações">■</span>` : ''}</span>${SPECIALTY.has(key) ? html`<span class="sf-skill__spec" aria-hidden="true">(<i></i>)</span>` : ''}</span>
      <span class="sf-skill__key">${p.atributo === 'N/A' ? '—' : p.atributo.toLowerCase()}${armorMark}</span>
      <span class="sf-skill__box is-total" title="${p.semTreinamento ? 'com zero graduações' : 'exige treinamento'}">${p.semTreinamento || p.graduacoes ? sg(p.total) : ''}</span>${eq('=')}
      <span class="sf-skill__box">${sg(p.modAtributo)}</span>${eq('+')}
      <span class="sf-skill__box">${p.graduacoes ? halfRank(p.graduacoes) : ''}</span>${eq('+')}
      <span class="sf-skill__box">${p.diversos ? sg(p.diversos) : ''}</span>
    </li>`;
  };
  const blank = () => html`<li class="sf-skill is-blank"><span class="sf-check"></span><span class="sf-skill__name"></span><span class="sf-skill__key"></span><span class="sf-skill__box"></span>${eq('=')}<span class="sf-skill__box"></span>${eq('+')}<span class="sf-skill__box"></span>${eq('+')}<span class="sf-skill__box"></span></li>`;
  return html`<section class="sf-skills" aria-label="Perícias">
    <div class="sf-skills__bar"><span class="sf-skills__title">Perícias</span><span class="sf-skills__max"><small>graduação máx.</small><span class="sf-cell__box">${ranks.classe} / ${half}</span></span></div>
    <div class="sf-skills__head">
      <span class="sf-skills__cross" aria-hidden="true"><span>outra classe</span></span>
      <span class="sf-skills__name-head">nome da perícia</span><span>habil. chave</span><span>mod. da perícia</span><span></span><span>mod. de habil.</span><span></span><span>gradu&shy;ações</span><span></span><span>mod. diversos</span>
    </div>
    <ol class="sf-skills__list">${sheet.pericias.map(row)}${range(blanks).map(blank)}</ol>
    <p class="sf-skills__note">${pts ? html`<b>${pts.total} pontos de perícia</b> até o ${sheet.nivel}º nível (${pts.first} no 1º e ${pts.perLevel} por nível seguinte)${spent ? `, ${halfRank(spent)} distribuídos` : ''}. ` : ''}Perícias marcadas com ■ podem ser usadas normalmente mesmo com zero (0) graduações. Perícias marcadas com ☒ são de outra classe. ${acp ? html`*A <i>penalidade de armadura</i> (${sg(acp)}) já está somada${acpCavalgar ? `; sem proficiência, também em Cavalgar (${sg(acpCavalgar)})` : ''}.` : html`*<i>Penalidade de armadura</i>, se houver, se aplica.`} **−1 a cada 2,5 kg de equipamento.</p>
  </section>`;
}

/** Linha de ataque com os diversos do equipamento (penalidade de armadura sem proficiência, 3.0). */
function comDiversos(a, mod, eqf) {
  const diversos = eqf?.penalidadeNoAtaque || 0;
  return { ...a, mod, diversos, total: a.total == null ? null : a.total + diversos };
}

function pageOne(sheet, p, revisar = 0, eqf = null) {
  return html`<article class="sf-page sf-page--one" aria-labelledby="sf-page-1">
    <h2 class="visually-hidden" id="sf-page-1">Ficha de personagem, página 1: atributos, combate e perícias</h2>
    ${identity(sheet, p)}
    <div class="sf-p1">
      <div class="sf-p1__abilities">${abilities(sheet)}</div>
      <div class="sf-p1__hp">${hpRow(sheet, eqf)}</div>
      <div class="sf-p1__ac">${acRow(sheet, eqf)}</div>
      <div class="sf-p1__initbab">${initBab(sheet)}</div>
      <div class="sf-p1__skills">${skills(sheet, eqf)}</div>
      <div class="sf-p1__left">
        ${saves(sheet)}
        <section class="sf-attacks" aria-label="Bônus de ataque">
          ${attackRow('Corpo a corpo', comDiversos(sheet.corpoACorpo, sheet.corpoACorpo.forca, eqf), 'mod. de força', true)}
          ${attackRow('À distância', comDiversos(sheet.distancia, sheet.distancia.destreza, eqf), 'mod. de destreza', false)}
        </section>
        <section class="sf-weapons" aria-label="Armas e proteção">${range(3).map(i => weapon(eqf?.armas[i]))}${armor(eqf?.armadura)}${shield(eqf?.escudo)}</section>
        ${ammunition()}
      </div>
    </div>
    <footer class="sf-foot">${revisar ? html`<strong class="sf-foot__warn">⚠ Talentos e perícias a revisar: as escolhas salvas não valem mais para este nível ou atributos.</strong> ` : ''}Ficha de ${p.nome} · gerada pelo D&amp;D Make Character segundo as regras da 3ª edição · pode ser impressa para uso pessoal</footer>
  </article>`;
}

/* ------------------------------------------------------------ página 2 */
const listPt = items => (items.length > 1 ? `${items.slice(0, -1).join(', ')} e ${items.at(-1)}` : items[0] || '');

/** "armas simples e comuns; armaduras leve e média; escudos" a partir dos talentos de proficiência concedidos. */
function proficiencyText(granted, classKey) {
  const has = nome => granted.some(g => g.proficiencia && !g.parametro && skillKey(g.nome) === skillKey(nome));
  const armas = [has('Usar Arma Simples') && 'simples', has('Usar Arma Comum') && 'comuns'].filter(Boolean);
  const armaduras = ['leve', 'média', 'pesada'].filter(tipo => has(`Usar Armadura (${tipo})`));
  return [
    armas.length ? `armas ${listPt(armas)}` : null,
    T30.armasClasse[classKey] || null,
    // a proficiência racial (ex.: elfo) só aparece se a classe ainda não usa todas as armas comuns
    ...(armas.includes('comuns') ? [] : granted.filter(g => g.proficiencia && g.parametro).map(g => `armas comuns: ${g.parametro}`)),
    armaduras.length ? `armaduras ${listPt(armaduras)}` : null,
    has('Usar Escudo') ? 'escudos' : null,
  ].filter(Boolean);
}

function specialAbilities(sheet, feats) {
  const t = sheet.talentos;
  const livres = feats.livres;
  const proficiencias = proficiencyText(feats.concedidos, sheet.classKey);
  const daClasse = feats.concedidos.filter(g => !g.proficiencia).map(g => `${g.nome}${g.nota ? ` (${g.nota})` : ''}`);
  const entries = [
    ...(feats.escolhidos.length
      ? [...feats.escolhidos.map(l => `Talento: ${l}`), livres > 0 ? `Talentos: +${livres} à escolha` : null]
      : [`Talentos: ${t.general} à escolha${t.bonus ? ` + ${t.bonus} ${t.bonusLabel}` : ''}`]),
    daClasse.length ? `Talentos concedidos: ${daClasse.join(', ')}` : null,
    proficiencias.length ? `Proficiências: ${proficiencias.join('; ')}` : null,
    ...sheet.notasTalentos,
    ...sheet.sinergias,
    ...sheet.habilidadesClasse,
    ...sheet.tracosRaciais,
    ...sheet.condicionaisCombate,
    sheet.aumentosAtributo ? `Aumentos de atributo: ${sheet.aumentosAtributo} (+1 no 4º, 8º, 12º, 16º e 20º nível)` : null,
  ].filter(Boolean);
  // Pauta contínua: linhas reais atrás do texto (bordas nítidas em qualquer escala); cada entrada
  // ocupa quantas pautas precisar, com recuo pendente para marcar onde ela continua.
  return html`<section class="sf-block sf-feats">
    ${bar('Habilidades especiais / Talentos', 'is-compact')}
    <div class="sf-ruled">
      <span class="sf-ruled__lines" aria-hidden="true">${range(64).map(() => html`<i></i>`)}</span>
      <ul class="sf-ruled__text">${entries.map(e => html`<li>${e}</li>`)}</ul>
    </div>
  </section>`;
}

function load(sheet) {
  const c = sheet.carga;
  const kg = n => (n == null ? '' : `${n} kg`);
  return html`<section class="sf-load" aria-label="Capacidade de carga">
    <div class="sf-load__row">${cell(c ? kg(c.leve) : '', 'carga leve')}${cell(c ? kg(c.media) : '', 'carga média')}${cell(c ? kg(c.pesada) : '', 'carga pesada')}</div>
    <div class="sf-load__row">${cell(c ? kg(c.acimaCabeca) : '', 'erguer acima da cabeça')}${cell(c ? kg(c.doChao) : '', 'erguer do chão')}${cell(c ? kg(c.empurrar) : '', 'empurrar ou arrastar')}</div>
    <div class="sf-load__row sf-load__notes"><small>igual à carga máx.</small><small>2 × carga máx.</small><small>5 × carga máx.</small></div>
  </section>`;
}

function languages(sheet) {
  const intMod = sheet.atributos.find(a => a.key === 'int')?.mod;
  const speak = sheet.pericias.find(p => skillKey(p.nome) === 'falar idioma');
  const cost = speak && speak.classe != null ? (speak.classe ? 1 : 2) : null;
  const idiomas = sheet.idiomas;
  const lines = range(8).map(i => idiomas?.automaticos[i] ?? '');
  return html`<section class="sf-block">
    ${bar('Idiomas')}
    <p class="sf-print-note">Idiomas iniciais = Comum + idiomas raciais + bônus de Int (${intMod == null ? '—' : Math.max(0, intMod)})${idiomas ? html`<br>Adicionais possíveis: ${idiomas.adicionais}` : ''}<br>Cada idioma adicional (Falar Idioma) = ${cost ?? '___'} ${cost === 1 ? 'ponto' : 'pontos'} de perícia</p>
    <ol class="sf-written">${lines.map(l => html`<li>${l}</li>`)}</ol>
  </section>`;
}

function spells(sheet) {
  const sp = sheet.magias;
  const perLevelLines = [6, 8, 7, 7, 7, 6, 5, 4, 3, 2];
  const later = sheet.classKey && T30.magiasPorDia[sheet.classKey];
  return html`<section class="sf-block sf-spells">
    ${bar('Magias')}
    <div class="sf-spells__lists">
      ${perLevelLines.map((n, lvl) => html`<div class="sf-spells__level"><small>${ORDINAL[lvl]}:</small><ol class="sf-written is-tight">${range(n).map(() => html`<li></li>`)}</ol></div>`)}
    </div>
    <div class="sf-spells__dc">${plate('CD de magia', '')}${cell(sp ? sg(sp.modificador) : '', 'mod. da cd')}</div>
    <table class="sf-spell-table">
      <thead><tr><th>cd do teste</th><th class="is-level">nível</th><th>magias por dia</th><th>magias adicionais</th></tr></thead>
      <tbody>
        ${range(10).map(lvl => {
          const l = sp?.niveis[lvl];
          const castable = l && l.base != null;
          return html`<tr>
            <td><span class="sf-cell__box">${castable ? v(l.cd) : ''}</span></td>
            <th class="is-level">${ORDINAL[lvl]}</th>
            <td><span class="sf-cell__box">${castable ? (l.bloqueado ? '—' : `${l.base}${l.dominio ? '+1' : ''}`) : ''}</span></td>
            <td>${lvl === 0 ? html`<span class="sf-zero">0</span>` : html`<span class="sf-cell__box">${castable && l.bonus ? l.bonus : ''}</span>`}</td>
          </tr>`;
        })}
      </tbody>
    </table>
    <div class="sf-known"><b>nº de magias conhecidas</b>
      <span class="sf-known__grid">${range(10).map(lvl => html`<span><small>${ORDINAL[lvl]}</small><i>${sp?.conhecidas ? v(sp.niveis[lvl].conhecidas) : ''}</i></span>`)}</span>
    </div>
    <p class="sf-print-note">${sp ? `Atributo de conjuração: ${sp.atributo}${sheet.classKey === 'cle' ? ' · +1 = magia de domínio' : ''}.` : later ? 'Conjura magias a partir do 4º nível.' : sheet.classKey ? 'Esta classe não conjura magias.' : 'Consulte a descrição da classe para magias.'}</p>
  </section>`;
}

const applied = sheet => [...sheet.divergencias, ...sheet.divergenciasRaca];

function pageTwo(sheet, feats) {
  const xp = sheet.xp;
  return html`<article class="sf-page sf-page--two" aria-labelledby="sf-page-2">
    <h2 class="visually-hidden" id="sf-page-2">Ficha de personagem, página 2: equipamento, habilidades especiais e magias</h2>
    <div class="sf-p2">
      <div class="sf-p2__col">
        <div class="sf-id__row">${field('campanha', '', 1)}</div>
        <div class="sf-xp"><span class="sf-cell__box">${xp.atual.toLocaleString('pt-BR')}</span><small>pontos de experiência · ${xp.proximo == null ? 'nível máximo do Livro do Jogador (20º)' : `próximo nível (${sheet.nivel + 1}º) em ${xp.proximo.toLocaleString('pt-BR')}`}</small></div>
        <section class="sf-block sf-gear">
          ${bar('Equipamento')}
          <div class="sf-gear__head"><span>item</span><span>peso</span><span>item</span><span>peso</span></div>
          <ol class="sf-gear__rows">${range(31).map(() => html`<li><i></i><i></i><i></i><i></i></li>`)}</ol>
          <div class="sf-gear__total"><b>peso total carregado</b><span class="sf-cell__box"></span></div>
        </section>
        <section class="sf-block sf-money">
          ${bar('Dinheiro')}
          <div class="sf-money__box">${['pc', 'pp', 'po', 'pl'].map(c => html`<span>${c} —</span>`)}</div>
        </section>
      </div>
      <div class="sf-p2__col">
        ${specialAbilities(sheet, feats)}
        ${load(sheet)}
        ${languages(sheet)}
      </div>
      <div class="sf-p2__col">${spells(sheet)}</div>
    </div>
    <footer class="sf-foot">${applied(sheet).length ? `Regras 3.0 aplicadas: ${applied(sheet).join('; ')}. ` : ''}Atributos cadastrados tratados como valores base; ajustes raciais já aplicados.</footer>
  </article>`;
}

/** Textos que não cabem na caixa são reduzidos (até 72%) antes de recorrer às reticências. */
function fitTexts(scope) {
  for (const el of scope.querySelectorAll('[data-fit]')) {
    el.style.fontSize = '';
    if (el.scrollWidth <= el.clientWidth + 0.5) continue;
    const base = parseFloat(getComputedStyle(el).fontSize);
    const ratio = Math.max(0.72, (el.clientWidth / el.scrollWidth) * 0.98);
    el.style.fontSize = `${(base * ratio).toFixed(2)}px`;
  }
  // Propriedades dos blocos de equipamento: até 3 linhas; se ainda passar, a letra encolhe (até 72%)
  for (const el of scope.querySelectorAll('[data-fit-lines]')) {
    el.style.fontSize = '';
    const base = parseFloat(getComputedStyle(el).fontSize);
    for (let f = base; el.scrollHeight > el.clientHeight + 0.5 && f > base * 0.72; f -= 0.25) el.style.fontSize = `${f.toFixed(2)}px`;
  }
  // Rede de segurança: se as habilidades especiais (ou a coluna delas) não couberem, a pauta
  // encolhe até 13px; abaixo disso, a letra também diminui (pauta até 11px).
  for (const box of scope.querySelectorAll('.sf-ruled')) {
    box.style.removeProperty('--pauta');
    box.classList.remove('is-dense');
    const list = box.querySelector('.sf-ruled__text');
    const col = box.closest('.sf-p2__col');
    const overflows = () => list.scrollHeight > box.clientHeight + 1 || (col && col.scrollHeight > col.clientHeight + 1);
    for (let pauta = 16; overflows() && pauta >= 11; pauta--) {
      box.style.setProperty('--pauta', `${pauta}px`);
      box.classList.toggle('is-dense', pauta <= 12);
    }
  }
}

export async function renderSheet({ root, store, id, query = new URLSearchParams(), router = null }) {
  render(root, html`${loadingState(4)}`);
  let personagem;
  let races;
  let classes;
  let bba;
  let pericias;
  let talentos;
  let fichas;
  try {
    [personagem, races, classes, bba, pericias, talentos, fichas] = await Promise.all([
      store.get('personagens', id),
      store.all('races'),
      store.all('classes'),
      store.all('bba'),
      store.all('pericias'),
      store.all('talentos'),
      store.all('fichas'),
    ]);
  } catch (err) {
    render(root, html`<section class="card">${emptyState({ glyph: 'alert', title: 'Não foi possível carregar os dados', text: err.message, asPageTitle: true })}</section>`);
    return undefined;
  }
  if (!root.isConnected) return undefined;
  if (!personagem) {
    render(root, html`
      ${breadcrumb([{ label: 'Início', href: '#/' }, { label: 'Personagens', href: '#/personagens' }, { label: 'Ficha' }])}
      <section class="card">${emptyState({
        glyph: 'scroll',
        title: 'Personagem não encontrado',
        text: html`Não existe personagem com o id <strong>#${id}</strong>.`,
        action: html`<a class="btn btn--outline" href="#/personagens">${icon('arrow-left')}Voltar para Personagens</a>`,
        asPageTitle: true,
      })}</section>`);
    document.title = 'Personagem não encontrado · D&D Make Character';
    return undefined;
  }

  const race = races.find(r => String(r.id) === String(personagem.race_id)) || null;
  const classe = classes.find(c => String(c.id) === String(personagem.classe_id)) || null;
  let ficha = fichas.find(f => String(f.personagem_id) === String(personagem.id)) || null;
  let escolhas = { pericias: ficha?.pericias || {}, talentos: ficha?.talentos || [] };
  let byId = new Map(talentos.map(f => [String(f.id), f]));
  // Cópia local de Talentos anterior à TASK_004: não tem os 74 talentos do Livro do Jogador 3.0.
  const ldjMissing = async () => !talentos.some(f => /Livro do Jogador 3\.0/.test(f.fonte || '')) && (await store.info('talentos')).outdated;
  let catalogoDesatualizado = await ldjMissing();
  const nomesDeTalentos = choice => choice.talentos.map(t => ({ nome: byId.get(String(t.talento_id))?.nome || '', parametro: t.parametro })).filter(t => t.nome);
  // Ficha calculada com as escolhas (graduações por id da perícia, talentos por id do compêndio).
  const sheetFor = choice => computeSheet(personagem, {
    race,
    classe,
    bbaRows: bba,
    pericias,
    escolhas: {
      ranks: ranksToKeys(pericias, choice.pericias),
      talentos: nomesDeTalentos(choice),
    },
  });
  document.title = `Ficha de ${personagem.nome} · D&D Make Character`;
  let eco = false;
  let sheetEl = null;

  /** Confere as escolhas salvas com o personagem atual (nível, atributos e compêndio podem ter mudado). */
  function checkChoices(sheet) {
    const ranks = ranksToKeys(pericias, escolhas.pericias);
    const ctx = buildContext({ sheet, personagem, classe, bbaRows: bba, catalog: talentos, chosen: escolhas.talentos, ranks });
    const featCheck = validateFeats(ctx, sheet.raceKey === 'humano');
    const erros = [...validateSkills(sheet, ranks).erros, ...featCheck.erros];
    const removidos = escolhas.talentos.filter(t => !byId.has(String(t.talento_id))).length
      + Object.entries(escolhas.pericias).filter(([idPericia, n]) => Number(n) && !pericias.some(p => String(p.id) === idPericia)).length;
    // talentos na ordem das vagas: nível e tipo de vaga (os sem vaga válida vão para o fim)
    const porVaga = featCheck.vagas.filter(v => v.talento).map(v => `${v.talento} · ${v.nivel}º${v.tipo === 'geral' ? '' : ` (adicional de ${v.tipo})`}`);
    const semVaga = chosenFeatLabels(talentos, escolhas.talentos);
    for (const v of featCheck.vagas) {
      const i = semVaga.indexOf(v.talento);
      if (v.talento && i >= 0) semVaga.splice(i, 1);
    }
    return { erros, removidos, lista: [...porVaga, ...semVaga.map(l => `${l} · sem vaga válida`)], livres: featCheck.vagas.filter(v => !v.talento).length };
  }

  function draw() {
    const sheet = sheetFor(escolhas);
    const check = checkChoices(sheet);
    // o equipamento escolhido na Arena (ou o kit da classe), com as contas da Arena
    const noEquip = fromPersonagem({ personagem, sheet, talentos: nomesDeTalentos(escolhas), equipamento: ficha?.equipamento ?? null });
    const eqf = sheet.classKey || ficha?.equipamento ? noEquip.naFicha : null;
    const errosDoEquip = eqf?.errosDoEquipamento || [];
    const feats = {
      escolhidos: check.lista,
      livres: check.livres,
      concedidos: grantedFeats(sheet.nivel, sheet.classKey, sheet.raceKey),
    };
    const problemas = check.erros.length;
    const notes = [
      'Os atributos cadastrados são tratados como valores base: a ficha aplica os ajustes da raça.',
      sheet.nivelForaDaFaixa ? `O nível cadastrado (${Number.isFinite(sheet.nivelCadastrado) ? sheet.nivelCadastrado : 'vazio'}) está fora da faixa do Livro do Jogador (1º a 20º): a ficha foi calculada para o ${sheet.nivel}º nível.` : null,
      sheet.divergencias.length ? `Pelas regras da 3.0, ${classe?.nome}: ${sheet.divergencias.join('; ')}.` : null,
      sheet.divergenciasRaca.length ? `Pelas regras da 3.0, ${race?.nome}: ${sheet.divergenciasRaca.join('; ')}.` : null,
      !race || !classe ? `${!race && !classe ? 'Raça e classe ausentes' : !race ? 'Raça ausente' : 'Classe ausente'}: os valores que dependem ${!race && !classe ? 'delas' : 'dela'} ficaram em branco.` : null,
      sheet.atributos.some(a => a.total == null) ? 'Há atributos sem valor: os totais que dependem deles ficaram em branco.' : null,
      !ficha ? 'Talentos e perícias ainda não foram escolhidos: use "Talentos e perícias" para distribuir as graduações e marcar os talentos.' : null,
      problemas ? html`<strong class="sheet-toolbar__warn">As escolhas salvas não valem mais para este personagem</strong> (${problemas === 1 ? '1 problema' : `${problemas} problemas`}: ${check.erros.slice(0, 2).join(' ')}${problemas > 2 ? ' …' : ''}). Abra "Talentos e perícias" para corrigir.` : null,
      check.removidos ? `${check.removidos === 1 ? '1 escolha salva não existe' : `${check.removidos} escolhas salvas não existem`} mais no compêndio (talento ou perícia removidos) e ${check.removidos === 1 ? 'foi ignorada' : 'foram ignoradas'}.` : null,
      catalogoDesatualizado ? 'Sua cópia local de Talentos é anterior aos 74 talentos do Livro do Jogador 3.0: restaure os Talentos originais (pelo popup "Talentos e perícias") para escolhê-los.' : null,
      eqf && !ficha?.equipamento ? html`Equipamento: o kit padrão da classe. Para trocar, use "Equipamento" na <a href="#/arena?a=p:${personagem.id}">Arena</a>.` : null,
      errosDoEquip.length ? html`<strong class="sheet-toolbar__warn">O equipamento salvo tem um problema</strong> (${errosDoEquip.join(' ')}): os ataques das armas ficaram em branco. Corrija em "Equipamento" na <a href="#/arena?a=p:${personagem.id}">Arena</a>.` : null,
    ].filter(Boolean);

    render(root, html`
      <div class="sheet-toolbar no-print">
        ${breadcrumb([{ label: 'Início', href: '#/' }, { label: 'Personagens', href: '#/personagens' }, { label: `Ficha de ${personagem.nome}` }])}
        <div class="sheet-toolbar__bar">
          <h1 class="sheet-toolbar__title" tabindex="-1" data-page-title>Ficha de ${personagem.nome}</h1>
          <div class="sheet-toolbar__actions">
            <label class="sheet-toolbar__eco"><input type="checkbox" data-action="eco" ${eco ? 'checked' : ''}> Economizar tinta</label>
            <a class="btn btn--ghost" href="#/personagens/${personagem.id}/editar">${icon('pencil')}Editar personagem</a>
            <a class="btn btn--ghost" href="#/arena?a=p:${personagem.id}">${icon('arena')}Levar à arena</a>
            <button type="button" class="btn btn--outline ${problemas ? 'is-alert' : ''}" data-action="choices">${icon(problemas ? 'alert' : 'sparkles')}Talentos e perícias</button>
            <button type="button" class="btn btn--primary" data-action="print">${icon('scroll')}Imprimir / salvar PDF</button>
          </div>
        </div>
        <ul class="sheet-toolbar__notes">${notes.map(n => html`<li>${n}</li>`)}</ul>
      </div>
      <div class="sheet ${eco ? 'is-eco' : ''}" data-sheet>
        ${pageOne(sheet, personagem, problemas, eqf)}
        ${pageTwo(sheet, feats)}
      </div>`);
    sheetEl = root.querySelector('[data-sheet]');
    fit();
    fitTexts(sheetEl);
    document.fonts?.ready.then(() => { if (sheetEl.isConnected) fitTexts(sheetEl); });
  }

  /** Restaura a tabela Talentos original (com os do Livro do Jogador 3.0) e recarrega o catálogo. */
  async function restoreCatalog() {
    const ok = await confirmDialog({
      title: 'Restaurar os Talentos originais?',
      message: 'A lista volta à original, com os 74 talentos do Livro do Jogador 3.0. As alterações feitas na tabela Talentos (talentos criados, editados ou excluídos) serão descartadas.',
      confirmLabel: 'Restaurar Talentos',
      tone: 'gold',
      glyph: 'restore',
    });
    if (!ok) return false;
    store.restore('talentos');
    talentos = await store.all('talentos');
    byId = new Map(talentos.map(f => [String(f.id), f]));
    catalogoDesatualizado = await ldjMissing();
    toast({ type: 'info', title: 'Talentos originais restaurados', message: 'Os 74 talentos do Livro do Jogador 3.0 estão disponíveis.' });
    return true;
  }

  let popup = null;
  async function choose(initial = escolhas, aba = 'pericias') {
    if (popup) return;
    popup = openChoicesDialog({ personagem, classe, bbaRows: bba, pericias, catalog: talentos, initial, saved: escolhas, computeSheet: sheetFor, catalogoDesatualizado, aba });
    // Sair da página com escolhas não salvas pede confirmação (mesma guarda dos formulários).
    router?.setGuard(() => (popup?.isDirty() ? confirmDialog({
      title: 'Descartar as escolhas?',
      message: 'As graduações e os talentos marcados ainda não foram salvos.',
      confirmLabel: 'Descartar',
      cancelLabel: 'Continuar escolhendo',
      glyph: 'alert',
    }) : true));
    const result = await popup.result;
    popup = null;
    router?.clearGuard();
    if (!result || !root.isConnected) return;
    if (result.acao === 'restaurar-talentos') {
      // o rascunho do popup volta intacto depois da restauração (ou se o jogador desistir)
      if (await restoreCatalog()) draw();
      if (root.isConnected) choose(result.rascunho, result.aba);
      return;
    }
    const row = { personagem_id: personagem.id, pericias: result.pericias, talentos: result.talentos, atualizado_em: new Date().toISOString() };
    try {
      ficha = ficha ? await store.update('fichas', ficha.id, row) : await store.insert('fichas', row);
      escolhas = { pericias: ficha.pericias, talentos: ficha.talentos };
      toast({ type: 'success', title: 'Escolhas salvas', message: `Talentos e perícias de ${personagem.nome}` });
    } catch (err) {
      toast({ type: 'error', title: 'Não foi possível salvar as escolhas', message: err.message });
      return;
    }
    if (root.isConnected) draw();
  }

  // A ficha tem largura fixa de A4; em telas estreitas é reduzida (zoom) em vez de rolar.
  const fit = () => sheetEl?.style.setProperty('--sheet-zoom', Math.min(1, root.clientWidth / 794).toFixed(3));
  root.addEventListener('click', event => {
    if (event.target.closest('[data-action="print"]')) window.print();
    if (event.target.closest('[data-action="choices"]')) choose();
  });
  // Versão econômica: sem o fundo de pergaminho (tela e impressão), mantendo placas e moldura.
  root.addEventListener('change', event => {
    if (event.target.matches('[data-action="eco"]')) {
      eco = event.target.checked;
      sheetEl.classList.toggle('is-eco', eco);
    }
  });
  draw();
  window.addEventListener('resize', fit);

  // "Salvar e gerar ficha" chega com ?escolher=1: abre o popup de talentos e perícias.
  if (query.get('escolher') === '1') {
    router?.replaceQuery({});
    choose();
  }
  return () => {
    window.removeEventListener('resize', fit);
    popup?.dismiss();
  };
}
