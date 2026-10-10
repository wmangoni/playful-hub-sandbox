/**
 * Arena (TASK_006 §4, etapa E5): monta a luta com o catálogo de combate e a mostra passo a
 * passo, com a ordem de iniciativa e o registro das rolagens.
 *
 * A montagem fica na URL (#/arena?a=ogro*2,p:1&b=troll&semente=…): recarregar ou compartilhar o
 * link repete a mesma luta. Os personagens do jogador ("p:<id>", etapa E4) vêm do store, passam
 * pelo adaptador (`personagem30.js`) e têm o equipamento salvo em `fichas.equipamento` e as
 * magias (etapa E7, lista curada) em `fichas.magias`. A
 * simulação em lote (etapa E6) roda a mesma luta 100 ou 1.000 vezes em fatias de ~12 ms, para não
 * travar a tela, e mostra quem costuma vencer.
 */
import { html, render } from '../core/dom.js';
import { normalize, plural } from '../core/format.js';
import { createBattle, criarLote, fromCatalog, gap, nextRound, nextTurn, podeLutar, rules, runBattle } from '../rules/combat30.js';
import { montarCardCatalogo, montarCardPersonagem } from '../rules/card30.js';
import { grantedFeats } from '../rules/choices30.js';
import { computeSheet } from '../rules/dnd30.js';
import { dificuldade, ndRotulo, neTexto, nivelDeEncontro } from '../rules/encontro30.js';
import { rotuloItem } from '../rules/equipamento30.js';
import { MODO, espacosDoDia, normalizarMagias, resumoDasMagias, temMagiasDaLista } from '../rules/magias30.js';
import { fromPersonagem } from '../rules/personagem30.js';
import { icon } from '../ui/icons.js';
import { emptyState, loadingState, pageHead } from '../ui/page.js';
import { toast } from '../ui/toast.js';
import { abrirEquipamento } from './arena-equipamento.js';
import { carregarRedes, politicasDaArena } from './arena-ia.js';
import { AVISO_SEM_GLOSSARIO, FAIXAS_DE_ND as FAIXAS, carregarCatalogo, contextoDoCard, rotuloFaixa } from './card-dados.js';
import { abrirCard } from './ficha-card.js';
import { perfilDe } from '../rules/ia30.js';
import { abrirMagias } from './arena-magias.js';
import {
  LIMITES, adicionar, distanciaValida, ehPersonagem, escreverMontagem, lerMontagem, maximoDe, mudarQuantidade, novaSemente, rodadasValidas, sementeValida, totalDoLado,
} from './arena-setup.js';
import { ranksToKeys } from './choices.js';
import { criarComponenteTabuleiro } from './tabuleiro.js';

const LADOS = ['A', 'B'];

const metros = m => `${m.toLocaleString('pt-BR')} m`;

const SLOTS_EQUIPAMENTO = ['principal', 'secundaria', 'escudo', 'armadura', 'distancia'];
const textoDoEquipamento = eq => SLOTS_EQUIPAMENTO.map(k => rotuloItem(eq[k])).filter(Boolean).join(' · ') || 'Desarmado';
/** "Mísseis Mágicos ×2, Escudo Arcano…" ou por que não conjura (druida de metal). */
function textoDasMagias(e) {
  if (!e.conjura) return 'Nenhuma magia da lista curada cabe nos espaços deste nível';
  if (e.ficha && !e.ficha.magias) return 'Sem magias com este equipamento';
  const resumo = resumoDasMagias(e.magias, e.sheet.classKey);
  const cura = e.ficha?.magias?.lista.some(s => s.conversao) ? ' · troca por curas' : '';
  return resumo ? `${resumo}${cura}` : `Nenhuma magia escolhida${cura}`;
}

/** "Gigante grande" (monstro), "Paladino 20 · Humano meio-celestial" (Holy Avenger) ou "Guerreiro 4 · Humano" (seu personagem). */
function descricao(e) {
  if (e.categoria === 'monstro') return `${e.tipo} ${e.tamanho.toLowerCase()}`;
  if (e.categoria === 'personagem') return [e.sheet.identidade.classe ? `${e.sheet.identidade.classe} ${e.nd}` : `${e.nd}º nível, sem classe`, e.sheet.identidade.raca || 'sem raça'].join(' · ');
  const partes = [e.classes.map(c => `${c.classe} ${c.nivel}`).join(' / '), e.raca].filter(Boolean);
  // criatura de Holy Avenger sem classe nem raça (Helena): tipo e tamanho, como os monstros
  return partes.length ? partes.join(' · ') : `${e.tipo} ${e.tamanho.toLowerCase()}`;
}

/** A CA "agora" é a que o motor usaria contra um golpe corpo a corpo comum (reforços, surpresa, condições). */
const GOLPE_COMUM = { tipo: 'corpo a corpo' };

const ESTADOS = { morrendo: 'morrendo', estavel: 'estável', incapacitado: 'incapacitado', inconsciente: 'inconsciente', morto: 'morto', fugiu: 'fugiu' };

function cabecalho() {
  return pageHead({
    eyebrow: 'Aventura · regras 3.0',
    eyebrowIcon: 'swords',
    title: 'Arena',
    lead: 'Ponha seus personagens, monstros do Livro dos Monstros 3.0 e heróis de Holy Avenger para lutar e acompanhe cada rolagem. A mesma semente repete a mesma luta.',
  });
}

export async function renderArena({ root, router, query, store }) {
  render(root, html`${cabecalho()}${loadingState(4)}`);
  let cat;
  try {
    cat = await carregarCatalogo();
  } catch {
    if (!root.isConnected) return undefined;
    render(root, html`${cabecalho()}<section class="card">${emptyState({
      glyph: 'alert',
      title: 'Não foi possível carregar o catálogo',
      text: 'Os monstros e os heróis da arena não chegaram. Verifique a conexão e tente de novo.',
      action: html`<button type="button" class="btn btn--primary" data-action="recarregar">${icon('restore')}Tentar de novo</button>`,
    })}</section>`);
    root.querySelector('[data-action="recarregar"]').addEventListener('click', () => router.reload());
    return undefined;
  }
  // seus personagens, calculados como na ficha (sem eles, a arena segue só com o catálogo)
  let dados = null;
  try {
    const tabelas = ['personagens', 'races', 'classes', 'bba', 'pericias', 'talentos', 'fichas'];
    const lidas = await Promise.all(tabelas.map(t => store.all(t)));
    dados = Object.fromEntries(tabelas.map((t, i) => [t, lidas[i]]));
  } catch {
    dados = null;
  }
  if (!root.isConnected) return undefined;

  const entradas = [...cat.monstros, ...cat.holy_avenger];
  const porId = new Map(entradas.map(e => [e.id, e]));
  const talentoPorId = new Map((dados?.talentos || []).map(t => [String(t.id), t]));
  function entradaDePersonagem(p) {
    const race = dados.races.find(r => String(r.id) === String(p.race_id)) || null;
    const classe = dados.classes.find(c => String(c.id) === String(p.classe_id)) || null;
    const salva = dados.fichas.find(f => String(f.personagem_id) === String(p.id)) || null;
    const talentos = (salva?.talentos || []).map(t => ({ nome: talentoPorId.get(String(t.talento_id))?.nome || '', parametro: t.parametro })).filter(t => t.nome);
    const sheet = computeSheet(p, { race, classe, bbaRows: dados.bba, pericias: dados.pericias, escolhas: { ranks: ranksToKeys(dados.pericias, salva?.pericias || {}), talentos } });
    const calcular = (eq, mg = salva?.magias ?? null) => fromPersonagem({ personagem: p, sheet, talentos, equipamento: eq, magias: mg });
    const r = calcular(salva?.equipamento || null);
    // conjurador com espaços neste nível (o paladino e o ranger só a partir do 4º) e com alguma
    // magia da lista que caiba neles (o ranger do 4º ao 7º tem espaços, mas nada a escolher)
    const temEspacos = Boolean(MODO[sheet.classKey] && Object.keys(espacosDoDia(sheet)).length);
    const conjura = temEspacos && temMagiasDaLista(sheet);
    return {
      id: `p:${p.id}`, categoria: 'personagem', nome: p.nome, nd: sheet.nivel, sheet, personagem: p, salva, calcular, talentos,
      ficha: r.ficha, equipamento: r.equipamento, erros: r.erros, avisos: r.avisos, pv: r.ficha?.pvMax ?? '—', ca: { total: r.ficha?.ca.total ?? '—' },
      temEspacos, conjura, magias: conjura ? normalizarMagias(salva?.magias ?? null, sheet) : null,
    };
  }
  const personagens = (dados?.personagens || []).map(entradaDePersonagem).sort((x, y) => x.nome.localeCompare(y.nome, 'pt-BR'));
  for (const e of personagens) porId.set(e.id, e);
  const montagem = lerMontagem(query, id => porId.has(id));
  const state = {
    fase: 'montagem',
    A: montagem.A,
    B: montagem.B,
    distancia: montagem.distancia,
    limite: montagem.limite,
    semente: montagem.semente || novaSemente(),
    ia: montagem.ia, // { A, B }: 'classica' ou 'rede' (TASK_009)
    redes: null, // as redes da IA treinada, carregadas sob demanda
    ignorados: montagem.ignorados,
    ignoradosPersonagens: montagem.ignoradosRefs.filter(ehPersonagem).length,
    excedentes: montagem.excedentes,
    recarregarDepois: false, // o app adiou um recarregamento (dados mudaram com a luta ou um diálogo aberto)
    lote: null, // simulação em lote: { lote, rodando, cancelada, assinatura, resultado, timer }
    b: null,
    mostrados: 0, // eventos do registro já desenhados
    ultimo: null, // uid de quem agiu por último
  };
  let seletor = null;
  let editando = null; // o diálogo de equipamento ou o de magias de um personagem
  let cardAberto = null; // o popup do card de um combatente (TASK_010)
  let tabuleiroComponente = null; // o tabuleiro tático de combate (TASK_011)
  let catalogoTokens = null;
  try {
    const resTokens = await fetch('data/tokens.json');
    if (resTokens.ok) catalogoTokens = await resTokens.json();
  } catch {
    catalogoTokens = null;
  }

  // o cabeçalho e a região de avisos ficam; só a fase (montagem ou luta) é redesenhada
  render(root, html`${cabecalho()}<div data-slot="fase"></div><p class="visually-hidden" aria-live="polite" data-slot="avisos"></p>`);
  const fase = () => root.querySelector('[data-slot="fase"]');
  const avisar = texto => {
    root.querySelector('[data-slot="avisos"]').textContent = texto;
  };

  /** Grava a montagem na URL; devolve true se isso cancelou um lote em andamento. */
  const salvarNaUrl = () => {
    router.replaceQuery(escreverMontagem(state));
    return conferirLote('a montagem mudou');
  };
  salvarNaUrl();

  // ------------------------------------------------------------------------------------------
  // IA treinada (TASK_009 §8): as redes só são baixadas quando algum lado as usa

  const usaRede = () => LADOS.some(l => state.ia[l] === 'rede');
  /** Garante as redes antes de uma luta ou de um lote; sem elas, a luta segue com a clássica e avisa. */
  async function garantirRedes({ lote = false } = {}) {
    if (!usaRede() || state.redes) return;
    try {
      state.redes = await carregarRedes();
    } catch (err) {
      console.warn('IA treinada indisponível', err);
      toast({ type: 'warning', title: 'IA treinada indisponível', message: `Não deu para carregar a rede: ${lote ? 'as lutas usam' : 'a luta usa'} a IA clássica.` });
    }
  }
  if (usaRede()) carregarRedes().then(r => (state.redes = r), () => {});
  /**
   * "A: treinada · B: clássica", para a barra da luta e o lote. A treinada só decide por quem tem
   * magias ou poderes: um lado sem ninguém assim fica "treinada (sem efeito)".
   */
  const ladoAge = l => state[l].some(x => perfilDe(fichaDe(x.ref)) === 'recursos');
  const textoDaIa = ia => LADOS.map(l => `${l}: ${ia[l] === 'rede' ? (ladoAge(l) ? 'treinada' : 'treinada (sem efeito)') : 'clássica'}`).join(' · ');

  const fichas = new Map();
  const fichaDe = ref => {
    if (ehPersonagem(ref)) return porId.get(ref).ficha; // sempre com o equipamento atual
    if (!fichas.has(ref)) fichas.set(ref, fromCatalog(porId.get(ref)));
    return fichas.get(ref);
  };
  // quem não pode lutar (personagem sem classe, equipamento com erro) não conta para a dica
  const ndDoLado = lado => nivelDeEncontro(state[lado].filter(x => !porId.get(x.ref).erros?.length).flatMap(x => Array(x.qtd).fill(porId.get(x.ref).nd)));

  /** O botão de ícone que abre o card do combatente; fica ao lado do nome, nunca dentro dele. */
  const botaoDoCard = (ref, nome, foco = null) => html`<button type="button" class="card-btn" data-card="${ref}" ${foco ? html`data-focus="${foco}"` : ''} aria-label="Ver o card de ${nome}" aria-haspopup="dialog">${icon('card')}</button>`;

  /** Redesenha preservando o foco no controle equivalente (data-focus). */
  function comFoco(desenhar) {
    const chave = document.activeElement?.dataset?.focus;
    const reserva = document.activeElement?.dataset?.focusFallback;
    desenhar();
    if (!chave) return;
    let el = root.querySelector(`[data-focus="${chave}"]`);
    if ((!el || el.disabled) && reserva) el = root.querySelector(`[data-focus="${reserva}"]`);
    el?.focus({ preventScroll: true });
  }

  // ------------------------------------------------------------------------------------------
  // montagem

  function itemDoLado(lado, x) {
    const e = porId.get(x.ref);
    const cheio = totalDoLado(state[lado]) >= LIMITES.porLado;
    const chave = `${lado}-${x.ref}`;
    if (e.categoria === 'personagem') {
      return html`<li class="arena-roster__item arena-roster__item--pc">
        <div class="arena-roster__info">
          <div class="arena-nome-linha"><p class="arena-roster__name">${e.nome}</p>${botaoDoCard(x.ref, e.nome, `card-${chave}`)}</div>
          <p class="arena-roster__meta">${descricao(e)} · PV ${e.pv} · CA ${e.ca.total}</p>
          <p class="arena-roster__equip">${textoDoEquipamento(e.equipamento)}</p>
          ${e.temEspacos ? html`<p class="arena-roster__equip arena-roster__magias">${icon('sparkles')}<span>${textoDasMagias(e)}</span></p>` : ''}
          ${e.erros.length ? html`<p class="arena-roster__erro">${icon('alert')}<span>Não pode lutar: ${e.erros.join('; ')}.</span></p>` : ''}
          ${e.avisos.length ? html`<ul class="arena-roster__avisos">${e.avisos.map(a => html`<li>${a[0].toUpperCase()}${a.slice(1)}</li>`)}</ul>` : ''}
        </div>
        <button type="button" class="btn btn--outline btn--sm" data-action="equipamento" data-lado="${lado}" data-ref="${x.ref}" data-focus="equip-${chave}" aria-label="Equipamento de ${e.nome}">${icon('shield')}Equipamento</button>
        ${e.conjura ? html`<button type="button" class="btn btn--outline btn--sm" data-action="magias" data-lado="${lado}" data-ref="${x.ref}" data-focus="magias-${chave}" aria-label="Magias de ${e.nome}">${icon('sparkles')}Magias</button>` : ''}
        <button type="button" class="icon-btn icon-btn--danger" data-remover data-lado="${lado}" data-ref="${x.ref}" data-focus="remover-${chave}" data-focus-fallback="adicionar-${lado}" aria-label="Tirar ${e.nome} do lado ${lado}">${icon('trash')}</button>
      </li>`;
    }
    return html`<li class="arena-roster__item">
      <div class="arena-roster__info">
        <div class="arena-nome-linha"><p class="arena-roster__name">${e.nome}</p>${botaoDoCard(x.ref, e.nome, `card-${chave}`)}</div>
        <p class="arena-roster__meta">ND ${ndRotulo(e.nd)} · ${descricao(e)} · PV ${e.pv} · CA ${e.ca.total}</p>
      </div>
      <span class="stepper arena-qty" role="group" aria-label="Quantidade de ${e.nome}">
        <button type="button" class="stepper__btn" data-qtd="-1" data-lado="${lado}" data-ref="${x.ref}" data-focus="menos-${chave}" data-focus-fallback="${x.qtd === 1 ? `adicionar-${lado}` : `mais-${chave}`}" aria-label="Um ${e.nome} a menos no lado ${lado}">−</button>
        <span class="arena-qty__n">${x.qtd}</span>
        <button type="button" class="stepper__btn" data-qtd="1" data-lado="${lado}" data-ref="${x.ref}" data-focus="mais-${chave}" data-focus-fallback="menos-${chave}" aria-label="Mais um ${e.nome} no lado ${lado}" ${cheio ? 'disabled' : ''}>+</button>
      </span>
      <button type="button" class="icon-btn icon-btn--danger" data-remover data-lado="${lado}" data-ref="${x.ref}" data-focus="remover-${chave}" data-focus-fallback="adicionar-${lado}" aria-label="Tirar ${e.nome} do lado ${lado}">${icon('trash')}</button>
    </li>`;
  }

  function cartaoDoLado(lado) {
    const lista = state[lado];
    const total = totalDoLado(lista);
    const cheio = total >= LIMITES.porLado;
    return html`<section class="card arena-side arena-side--${lado.toLowerCase()}" aria-labelledby="lado-${lado}-titulo">
      <header class="arena-side__head">
        <h2 class="arena-side__title" id="lado-${lado}-titulo" tabindex="-1"><span class="arena-tag arena-tag--${lado.toLowerCase()}" aria-hidden="true">${lado}</span>Lado ${lado}</h2>
        <p class="arena-side__meta">${plural(total, 'combatente', 'combatentes')} de ${LIMITES.porLado} · ND do grupo ${neTexto(ndDoLado(lado))}</p>
      </header>
      ${lista.length
        ? html`<ul class="arena-roster">${lista.map(x => itemDoLado(lado, x))}</ul>`
        : html`<p class="arena-side__empty">Nenhum combatente ainda.</p>`}
      <div class="arena-side__foot">
        <button type="button" class="btn btn--outline btn--block" data-action="adicionar" data-lado="${lado}" data-focus="adicionar-${lado}" ${cheio ? 'disabled' : ''}>${icon('plus')}${cheio ? 'Lado cheio' : 'Adicionar combatente'}</button>
      </div>
    </section>`;
  }

  function dicaDeDificuldade() {
    const neA = ndDoLado('A');
    const neB = ndDoLado('B');
    const d = dificuldade(neA, neB);
    if (!d) return html`<p class="arena-difficulty">${icon('info')}<span>Com um combatente de cada lado, aparece aqui uma dica de dificuldade pelo nível de encontro da 3.0.</span></p>`;
    return html`<p class="arena-difficulty is-${d.nivel}">${icon('info')}<span>Para o lado A, a luta parece <strong>${d.rotulo}</strong> (ND do grupo ${neTexto(neA)} contra ${neTexto(neB)}). É só uma orientação pelo nível de encontro da 3.0: quem decide são os dados.</span></p>`;
  }

  /** Se dá para começar a luta e rodar o lote e, se não, por quê. */
  function situacao() {
    const bloqueados = [...new Set([...state.A, ...state.B].map(x => porId.get(x.ref)).filter(e => e.erros?.length))];
    const montado = Boolean(state.A.length && state.B.length && !bloqueados.length);
    const rodando = Boolean(state.lote?.rodando);
    const motivo = !state.A.length || !state.B.length
      ? 'Ponha pelo menos um combatente em cada lado.'
      : bloqueados.length
        ? `${bloqueados.map(e => e.nome).join(', ')} não ${bloqueados.length === 1 ? 'pode' : 'podem'} lutar: veja o aviso no lado.`
        : 'A simulação em lote está rodando: espere terminar ou cancele.';
    return { montado, rodando, pronto: montado && !rodando, motivo };
  }

  function inicioHtml({ pronto, motivo }) {
    return html`<button type="button" class="btn btn--primary" data-action="comecar" data-focus="comecar" ${pronto ? '' : html`disabled aria-describedby="arena-start-dica"`}>${icon('swords')}Começar a luta</button>
      ${pronto ? '' : html`<p class="arena-start__hint" id="arena-start-dica">${motivo}</p>`}`;
  }

  function desenharMontagem() {
    const sit = situacao();
    const doCatalogo = state.ignorados - state.ignoradosPersonagens;
    const avisosDoLink = [
      doCatalogo === 1 && 'Um combatente do link não existe mais no catálogo e ficou de fora.',
      doCatalogo > 1 && `${doCatalogo} combatentes do link não existem mais no catálogo e ficaram de fora.`,
      state.ignoradosPersonagens === 1 && 'Um personagem do link não existe neste navegador e ficou de fora.',
      state.ignoradosPersonagens > 1 && `${state.ignoradosPersonagens} personagens do link não existem neste navegador e ficaram de fora.`,
      state.excedentes > 0 && `O link pedia ${plural(state.excedentes, 'combatente', 'combatentes')} além do máximo de ${LIMITES.porLado} por lado, que ${state.excedentes === 1 ? 'ficou' : 'ficaram'} de fora.`,
    ].filter(Boolean);
    render(fase(), html`
      ${avisosDoLink.length ? html`<div class="notice" role="status">${icon('alert')}<p>${avisosDoLink.join(' ')}</p></div>` : ''}
      <div class="arena-sides">
        ${cartaoDoLado('A')}
        <span class="arena-versus" aria-hidden="true">×</span>
        ${cartaoDoLado('B')}
      </div>
      <section class="card card--pad arena-options" aria-labelledby="arena-opcoes">
        <h2 class="arena-h2" id="arena-opcoes">Opções da luta</h2>
        <div class="arena-options__grid">
          <div class="field">
            <label class="field__label" for="arena-distancia">Distância inicial (m)</label>
            <input class="input" id="arena-distancia" type="number" inputmode="decimal" min="${LIMITES.distancia.min}" max="${LIMITES.distancia.max}" step="1.5" value="${state.distancia}" data-opt="distancia" aria-describedby="arena-distancia-dica">
            <p class="field__hint" id="arena-distancia-dica">Os lados começam a esta distância e se aproximam pelo deslocamento (1,5 m = um quadrado).</p>
          </div>
          <div class="field">
            <label class="field__label" for="arena-limite">Limite de rodadas</label>
            <input class="input" id="arena-limite" type="number" inputmode="numeric" min="${LIMITES.rodadas.min}" max="${LIMITES.rodadas.max}" step="1" value="${state.limite}" data-opt="limite" aria-describedby="arena-limite-dica">
            <p class="field__hint" id="arena-limite-dica">Passando dele, a luta termina empatada.</p>
          </div>
          <div class="field">
            <label class="field__label" for="arena-semente">Semente</label>
            <div class="arena-seed">
              <input class="input" id="arena-semente" type="text" maxlength="${LIMITES.semente}" autocomplete="off" spellcheck="false" value="${state.semente}" data-opt="semente" aria-describedby="arena-semente-dica">
              <button type="button" class="btn btn--outline" data-action="nova-semente" data-focus="nova-semente">${icon('d20')}Sortear</button>
            </div>
            <p class="field__hint" id="arena-semente-dica">Qualquer texto ou número. A mesma semente repete a mesma luta.</p>
          </div>
          <div class="field" role="group" aria-labelledby="arena-ia-rotulo" aria-describedby="arena-ia-dica">
            <span class="field__label" id="arena-ia-rotulo">IA de cada lado</span>
            <div class="arena-ia">
              ${LADOS.map(l => html`<label class="arena-ia__lado"><span class="arena-tag arena-tag--${l.toLowerCase()}" aria-hidden="true">${l}</span>
                <select class="select" data-opt="ia${l}" data-focus="ia-${l}" aria-label="IA do lado ${l}">
                  <option value="classica" ${state.ia[l] === 'rede' ? '' : 'selected'}>Clássica</option>
                  <option value="rede" ${state.ia[l] === 'rede' ? 'selected' : ''}>Treinada (experimental)</option>
                </select></label>`)}
            </div>
            <p class="field__hint" id="arena-ia-dica">A treinada é uma rede neural que aprendeu em lutas simuladas e decide por quem tem magias ou poderes. Experimental: vence mais em média, mas perde em alguns confrontos.</p>
          </div>
        </div>
        ${dicaDeDificuldade()}
        <div class="arena-start">${inicioHtml(sit)}</div>
      </section>
      ${secaoDoLote(sit)}`);
  }

  // ------------------------------------------------------------------------------------------
  // simulação em lote (E6)

  /**
   * A montagem que o lote simulou, sem a semente (o lote guarda as dele, que aparecem no resultado)
   * e com o equipamento e as magias dos personagens do jogador (mudá-los muda a luta).
   */
  const assinatura = () => JSON.stringify({
    ...escreverMontagem(state),
    semente: null,
    equipamento: [...state.A, ...state.B].filter(x => ehPersonagem(x.ref)).map(x => {
      const e = porId.get(x.ref);
      const eq = e?.equipamento;
      return [x.ref, SLOTS_EQUIPAMENTO.map(k => (eq?.[k] ? [eq[k].id, eq[k].melhoria || 0, eq[k].material || null] : null)), JSON.stringify(e?.magias ?? null)];
    }),
  });
  const pct = x => `${(x * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
  const inteiro = n => n.toLocaleString('pt-BR');

  function secaoDoLote({ montado, rodando }) {
    return html`<section class="card card--pad arena-lote" aria-labelledby="arena-lote-titulo">
      <h2 class="arena-h2" id="arena-lote-titulo">Simulação em lote</h2>
      <p class="arena-lote__lead">Roda a mesma luta muitas vezes, sem desenhar o registro, com sementes seguidas a partir da semente acima (uma semente de texto vira um número). Mostra quem costuma vencer.</p>
      <div class="arena-lote__acoes">
        ${[100, 1000].map(n => html`<button type="button" class="btn btn--outline" data-action="lote" data-vezes="${n}" data-focus="lote-${n}" ${montado && !rodando ? '' : 'disabled'} ${montado ? '' : html`aria-describedby="arena-start-dica"`}>${icon('fast-forward')}Simular ${inteiro(n)} vezes</button>`)}
      </div>
      <div data-slot="lote" data-chave="${chaveDoLote()}">${corpoDoLote()}</div>
    </section>`;
  }

  function corpoDoLote() {
    const l = state.lote;
    if (!l) return '';
    if (l.rodando) {
      const { feitas: f, vezes: n } = l.lote;
      return html`<div class="arena-lote__progresso">
        <div class="arena-lote__trilho" role="progressbar" aria-label="Lutas simuladas" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${f}" aria-valuetext="${inteiro(f)} de ${inteiro(n)} lutas" data-slot="lote-barra"><span class="arena-lote__preenchido" style="width: ${((f / n) * 100).toFixed(1)}%"></span></div>
        <p class="arena-lote__contagem" data-slot="lote-contagem">${inteiro(f)} de ${inteiro(n)} lutas…</p>
        <button type="button" class="btn btn--ghost btn--sm" data-action="lote-cancelar" data-focus="lote-cancelar">${icon('x')}Cancelar a simulação</button>
      </div>`;
    }
    const r = l.resultado;
    if (!r) return html`<p class="arena-lote__nota">Cancelada antes da primeira luta.</p>`;
    const antiga = l.assinatura !== assinatura();
    const quedas = r.combatentes.map(c => ({ ...c, n: r.quedas[c.uid] || 0 })).sort((x, y) => y.n - x.n);
    const fatia = (cls, v) => (v > 0 ? html`<span class="arena-lote__fatia ${cls}" style="width: ${(v * 100).toFixed(2)}%"></span>` : '');
    const pv = ['A', 'B'].filter(x => r.pvRestante[x] != null).map(x => `lado ${x}: ${pct(r.pvRestante[x])}`).join(' · ') || '—';
    const exemplos = [['A', 'Ver uma vitória do lado A'], ['B', 'Ver uma vitória do lado B'], ['empate', 'Ver um empate']].filter(([k]) => r.exemplos[k] != null);
    return html`<div class="arena-lote__res">
      <h3 class="arena-lote__h3" id="arena-lote-res" tabindex="-1">${l.cancelada ? `Parcial: ${inteiro(r.vezes)} de ${inteiro(r.pedidas)} lutas` : plural(r.vezes, 'luta', 'lutas')}</h3>
      <p class="arena-lote__sub">${textoDasSementes(l)}</p>
      ${l.ia.A === 'rede' || l.ia.B === 'rede' ? html`<p class="arena-lote__sub">IA ${textoDaIa(l.ia)}.</p>` : ''}
      ${antiga ? html`<p class="arena-lote__aviso">${icon('info')}<span>A montagem mudou depois desta simulação: os números são da montagem anterior.</span></p>` : ''}
      <div class="arena-lote__barra" role="img" aria-label="Lado A vence ${pct(r.vitoriasA)}, lado B vence ${pct(r.vitoriasB)}, empates ${pct(r.empates)}">${fatia('is-a', r.vitoriasA)}${fatia('is-b', r.vitoriasB)}${fatia('is-empate', r.empates)}</div>
      <dl class="arena-lote__nums">
        <div class="is-a"><dt>Lado A vence</dt><dd>${pct(r.vitoriasA)}</dd></div>
        <div class="is-b"><dt>Lado B vence</dt><dd>${pct(r.vitoriasB)}</dd></div>
        <div><dt>Empates</dt><dd>${pct(r.empates)}</dd></div>
        <div><dt>Rodadas, em média</dt><dd>${r.mediaRodadas.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</dd></div>
        <div class="arena-lote__largo"><dt>PV que sobram ao vencedor, em média</dt><dd>${pv}</dd></div>
      </dl>
      <h4 class="arena-lote__h4">Quem caiu</h4>
      <ul class="arena-lote__quedas">${quedas.map(c => html`<li>
        <span class="arena-tag arena-tag--${c.lado.toLowerCase()}" aria-hidden="true">${c.lado}</span>
        <span class="arena-lote__quem"><span class="visually-hidden">Lado ${c.lado}: </span>${c.nome}</span>${botaoDoCard(l.refs[c.uid], c.nome)}
        <span class="arena-lote__qn">${pct(c.n / r.vezes)} das lutas</span>
      </li>`)}</ul>
      ${exemplos.length && !antiga ? html`<div class="arena-lote__ver">${exemplos.map(([k, rotulo]) => html`<button type="button" class="btn btn--ghost btn--sm" data-action="ver-semente" data-semente="${r.exemplos[k]}" data-resultado="${k}">${icon('play')}${rotulo}</button>`)}</div>` : ''}
    </div>`;
  }

  function atualizarProgresso() {
    const barra = root.querySelector('[data-slot="lote-barra"]');
    if (!barra || !state.lote) return;
    const { feitas: f, vezes: n } = state.lote.lote;
    barra.setAttribute('aria-valuenow', String(f));
    barra.setAttribute('aria-valuetext', `${inteiro(f)} de ${inteiro(n)} lutas`);
    barra.firstElementChild.style.width = `${((f / n) * 100).toFixed(1)}%`;
    root.querySelector('[data-slot="lote-contagem"]').textContent = `${inteiro(f)} de ${inteiro(n)} lutas…`;
  }

  /** Roda em fatias de ~12 ms com setTimeout (o requestIdleCallback não existe no Safari). */
  function iniciarLote(vezes) {
    const lado = l => state[l].flatMap(x => Array.from({ length: x.qtd }, () => fichaDe(x.ref)));
    const politicas = politicasDaArena(state.ia, state.redes);
    const lote = criarLote({ ladoA: lado('A'), ladoB: lado('B'), distancia: state.distancia, limiteRodadas: state.limite, politicas }, { vezes, semente: state.semente });
    // a IA que valeu de fato (sem as redes, a clássica nos dois lados)
    const ia = { A: politicas?.A ? 'rede' : 'classica', B: politicas?.B ? 'rede' : 'classica' };
    const refs = Object.fromEntries(LADOS.flatMap(lado => state[lado].flatMap(x => Array(x.qtd).fill(x.ref)).map((ref, i) => [`${lado}${i + 1}`, ref])));
    state.lote = { lote, rodando: true, cancelada: null, assinatura: assinatura(), semente: state.semente, ia, refs, resultado: null, timer: null };
    atualizarLote();
    root.querySelector('[data-action="lote-cancelar"]')?.focus();
    avisar(`Simulando ${inteiro(vezes)} lutas.`);
    const fatia = () => {
      const l = state.lote;
      if (!l || l.lote !== lote || !l.rodando) return;
      const inicio = performance.now();
      try {
        do lote.rodar(1);
        while (lote.feitas < vezes && performance.now() - inicio < 12);
      } catch (err) {
        console.error(err);
        l.rodando = false;
        l.cancelada = 'interrompida por um erro';
        l.resultado = lote.feitas ? lote.resultado() : null;
        const focoNoLote = Boolean(root.querySelector('[data-slot="lote"]')?.contains(document.activeElement));
        atualizarLote();
        if (focoNoLote) root.querySelector(`[data-action="lote"][data-vezes="${vezes}"]`)?.focus();
        avisar('A simulação em lote parou por um erro.');
        toast({ type: 'error', title: 'A simulação em lote parou', message: err.message });
        return;
      }
      if (lote.feitas < vezes) {
        atualizarProgresso();
        l.timer = setTimeout(fatia, 0);
        return;
      }
      l.rodando = false;
      l.resultado = lote.resultado();
      // o foco só vai para o resultado se estava no lote (no "Cancelar"): quem está digitando segue
      const ativo = document.activeElement;
      const focoNoLote = !ativo || ativo === document.body || Boolean(root.querySelector('[data-slot="lote"]')?.contains(ativo));
      atualizarLote();
      if (focoNoLote) root.querySelector('#arena-lote-res')?.focus();
      const r = l.resultado;
      avisar(`Simulação terminada: lado A vence ${pct(r.vitoriasA)}, lado B vence ${pct(r.vitoriasB)}, empates ${pct(r.empates)}.`);
    };
    state.lote.timer = setTimeout(fatia, 0);
  }

  function cancelarLote(motivo = 'cancelada') {
    const l = state.lote;
    if (!l?.rodando) return;
    clearTimeout(l.timer);
    l.rodando = false;
    l.cancelada = motivo;
    l.resultado = l.lote.feitas ? l.lote.resultado() : null;
  }

  /** "Sementes 580669 a 580768 · cancelada… (a partir da semente “x”; …)". */
  function textoDasSementes(l) {
    const r = l.resultado;
    const faixa = r.sementes[1] >= r.sementes[0] ? `Sementes ${r.sementes[0]} a ${r.sementes[1]}` : `${inteiro(r.vezes)} sementes a partir de ${r.sementes[0]}`;
    const nota = l.semente !== state.semente ? ` (a partir da semente “${l.semente}”; a da montagem mudou depois)` : '';
    return `${faixa}${l.cancelada ? ` · ${l.cancelada}` : ''}${nota}.`;
  }

  /** O que a seção do lote mostra, fora o progresso e a nota da semente (que mudam no lugar). */
  const chaveDoLote = () => {
    const l = state.lote;
    return l ? JSON.stringify([l.rodando, l.cancelada, Boolean(l.resultado), l.resultado?.vezes, l.assinatura !== assinatura()]) : '';
  };

  /**
   * Atualiza a seção do lote e os botões que dependem dele. Nada que possa estar recebendo um
   * clique é trocado sem necessidade: o `change` de um campo chega no `mousedown` do botão (no
   * blur), e trocar o botão ali faria o clique se perder. Por isso "Começar", "Simular" e a dica
   * mudam no lugar, e o resultado só é redesenhado quando o que ele mostra muda.
   */
  function atualizarLote() {
    const slot = root.querySelector('[data-slot="lote"]');
    if (!slot) return;
    const chave = chaveDoLote();
    if (slot.dataset.chave !== chave) {
      // se o foco estava num botão do resultado que sai (um "Ver…"), ele vai para o título do resultado
      const focoDentro = slot.contains(document.activeElement);
      render(slot, corpoDoLote());
      slot.dataset.chave = chave;
      if (focoDentro) root.querySelector('#arena-lote-res')?.focus();
    } else if (state.lote?.resultado) {
      const sub = slot.querySelector('.arena-lote__sub');
      if (sub) sub.textContent = textoDasSementes(state.lote);
    }
    const sit = situacao();
    for (const b of root.querySelectorAll('[data-action="lote"]')) {
      b.disabled = !sit.montado || sit.rodando;
      if (sit.montado) b.removeAttribute('aria-describedby');
      else b.setAttribute('aria-describedby', 'arena-start-dica');
    }
    const comecar = root.querySelector('[data-action="comecar"]');
    if (comecar) {
      comecar.disabled = !sit.pronto;
      if (sit.pronto) comecar.removeAttribute('aria-describedby');
      else comecar.setAttribute('aria-describedby', 'arena-start-dica');
    }
    let dica = root.querySelector('#arena-start-dica');
    if (sit.pronto) dica?.remove();
    else {
      if (!dica) {
        dica = document.createElement('p');
        dica.className = 'arena-start__hint';
        dica.id = 'arena-start-dica';
        root.querySelector('.arena-start')?.append(dica);
      }
      dica.textContent = sit.motivo;
    }
  }

  /**
   * A montagem (ou o equipamento) mudou. Com o lote rodando, cancela e avisa (devolve true); com um
   * resultado na tela, redesenha a seção do lote, que marca o resultado como de uma montagem
   * anterior e tira os "Ver…" (sem tocar nos campos da montagem).
   */
  function conferirLote(motivo) {
    const l = state.lote;
    if (!l) return false;
    if (!l.rodando) {
      if (l.resultado) atualizarLote();
      return false;
    }
    if (l.assinatura === assinatura()) return false;
    const focoNoLote = Boolean(root.querySelector('[data-slot="lote"]')?.contains(document.activeElement));
    cancelarLote(`cancelada: ${motivo}`);
    atualizarLote();
    if (focoNoLote) root.querySelector(`[data-action="lote"][data-vezes="${l.lote.vezes}"]`)?.focus();
    avisar(`Simulação em lote cancelada: ${motivo}.`);
    return true;
  }

  // ------------------------------------------------------------------------------------------
  // seletor de combatentes (diálogo)

  function abrirSeletor(lado) {
    const s = { aba: 'monstros', busca: '', nd: 'todos' };
    const dialog = document.createElement('dialog');
    dialog.className = 'dialog arena-picker';
    dialog.setAttribute('aria-labelledby', 'arena-picker-titulo');
    document.body.append(dialog);
    const ABAS = [
      { key: 'monstros', label: 'Monstros', icone: 'flame' },
      { key: 'holy', label: 'Holy Avenger', icone: 'shield' },
      { key: 'meus', label: 'Meus personagens', icone: 'hero' },
    ];
    const qtdNoLado = id => state[lado].find(x => x.ref === id)?.qtd || 0;
    const cheio = () => totalDoLado(state[lado]) >= LIMITES.porLado;
    const podeAdicionar = e => !cheio() && qtdNoLado(e.id) < maximoDe(e.id) && !e.erros?.length;

    function filtrados() {
      const base = s.aba === 'monstros' ? cat.monstros : s.aba === 'holy' ? cat.holy_avenger : personagens;
      const termo = normalize(s.busca);
      const [min, max] = FAIXAS[s.nd];
      return base
        .filter(e => e.nd >= min && e.nd <= max)
        .filter(e => !termo || normalize(`${e.nome} ${descricao(e)}`).includes(termo))
        .sort((x, y) => x.nd - y.nd || x.nome.localeCompare(y.nome, 'pt-BR'));
    }

    function contagem(id) {
      const n = qtdNoLado(id);
      return n ? `${n} no lado ${lado}` : '';
    }

    function lista() {
      if (s.aba === 'meus' && !dados) return html`<div class="arena-picker__empty">${icon('alert')}<p>Não foi possível ler seus personagens neste navegador.</p></div>`;
      if (s.aba === 'meus' && !personagens.length) {
        return html`<div class="arena-picker__empty">${icon('hero')}<p>Você ainda não tem personagens. <a href="#/personagens/novo">Crie um em Personagens</a> e volte para pô-lo na arena.</p></div>`;
      }
      const itens = filtrados();
      if (!itens.length) return html`<div class="arena-picker__empty">${icon('search')}<p>Nenhum combatente com esses filtros.</p></div>`;
      return html`<ul class="arena-picker__list">${itens.map(e => html`<li class="arena-pick">
        <div class="arena-pick__info">
          <div class="arena-nome-linha"><p class="arena-pick__name">${e.nome}</p>${botaoDoCard(e.id, e.nome)}</div>
          <p class="arena-pick__meta"><span class="badge badge--neutral">${e.categoria === 'personagem' ? `Nível ${e.nd}` : `ND ${ndRotulo(e.nd)}`}</span><span>${descricao(e)}</span><span>PV ${e.pv} · CA ${e.ca.total}</span></p>
          ${e.categoria === 'personagem'
            ? html`<p class="arena-pick__lore">${textoDoEquipamento(e.equipamento)}</p>${e.erros.length ? html`<p class="arena-pick__erro">${icon('alert')}Não pode lutar: ${e.erros.join('; ')}.</p>` : ''}`
            : html`<p class="arena-pick__lore">${e.resumo}</p>`}
        </div>
        <div class="arena-pick__side">
          <span class="arena-pick__count" data-contagem="${e.id}">${contagem(e.id)}</span>
          <button type="button" class="btn btn--outline btn--sm" data-add="${e.id}" aria-label="Adicionar ${e.nome} ao lado ${lado}" ${podeAdicionar(e) ? '' : 'disabled'}>${icon('plus')}Adicionar</button>
        </div>
      </li>`)}</ul>`;
    }

    function desenhar() {
      render(dialog, html`<div class="arena-picker__frame">
        <header class="arena-picker__head">
          <div class="arena-picker__title-row">
            <h2 class="dialog__title" id="arena-picker-titulo">Adicionar ao lado ${lado}</h2>
            <button type="button" class="icon-btn" data-action="fechar" aria-label="Fechar">${icon('x')}</button>
          </div>
          <div class="arena-picker__tabs" role="tablist" aria-label="Origem dos combatentes">
            ${ABAS.map(a => html`<button type="button" role="tab" id="aba-${a.key}" aria-controls="painel-combatentes" aria-selected="${String(s.aba === a.key)}" tabindex="${s.aba === a.key ? 0 : -1}" data-aba="${a.key}">${icon(a.icone)}${a.label}</button>`)}
          </div>
        </header>
        <section class="arena-picker__body" role="tabpanel" id="painel-combatentes" aria-labelledby="aba-${s.aba}">
          ${html`<div class="arena-picker__filters">
            <div class="search">
              <label class="visually-hidden" for="arena-busca">Buscar combatente</label>
              <div class="search__field">${icon('search')}<input class="search__input" id="arena-busca" type="search" placeholder="Buscar por nome, tipo ou classe…" value="${s.busca}" autocomplete="off" data-busca></div>
            </div>
            <label class="visually-hidden" for="arena-nd">Faixa de ND</label>
            <select class="select arena-picker__nd" id="arena-nd" data-nd>
              ${Object.keys(FAIXAS).map(k => html`<option value="${k}" ${s.nd === k ? 'selected' : ''}>${rotuloFaixa(k)}</option>`)}
            </select>
          </div>`}
          <div data-slot="lista">${lista()}</div>
        </section>
        <footer class="arena-picker__foot">
          <p class="arena-picker__status" aria-live="polite" data-slot="status">${plural(totalDoLado(state[lado]), 'combatente', 'combatentes')} no lado ${lado} (máximo ${LIMITES.porLado}).</p>
          <button type="button" class="btn btn--primary" data-action="fechar">${icon('check')}Concluir</button>
        </footer>
      </div>`);
    }

    const redesenharLista = () => render(dialog.querySelector('[data-slot="lista"]'), lista());
    let fechado = false;
    const fechar = () => {
      if (fechado) return;
      fechado = true;
      if (dialog.open) dialog.close();
      dialog.remove();
      seletor = null;
      if (recarregarSePendente()) return;
      // de volta ao "Adicionar" deste lado; se ele está desabilitado (lado cheio), ao do outro lado,
      // a "Começar" ou, em último caso, ao título do lado
      const outro = lado === 'A' ? 'B' : 'A';
      const volta = [`[data-action="adicionar"][data-lado="${lado}"]`, `[data-action="adicionar"][data-lado="${outro}"]`, '[data-action="comecar"]']
        .map(sel => root.querySelector(`${sel}:not([disabled])`))
        .find(Boolean) || root.querySelector(`#lado-${lado}-titulo`);
      volta?.focus();
    };
    const trocarAba = aba => {
      s.aba = aba;
      desenhar();
      dialog.querySelector(`[data-aba="${aba}"]`)?.focus();
    };

    dialog.addEventListener('click', event => {
      const t = event.target;
      const aba = t.closest('[data-aba]');
      if (aba) return trocarAba(aba.dataset.aba);
      const cardBtn = t.closest('[data-card]');
      if (cardBtn) return abrirCardDe(cardBtn.dataset.card);
      const add = t.closest('[data-add]');
      if (add) {
        const id = add.dataset.add;
        if (!adicionar(state[lado], id)) return undefined;
        salvarNaUrl();
        desenharMontagem();
        const e = porId.get(id);
        dialog.querySelector(`[data-contagem="${id}"]`).textContent = contagem(id);
        for (const b of dialog.querySelectorAll('[data-add]')) b.disabled = !podeAdicionar(porId.get(b.dataset.add));
        dialog.querySelector('[data-slot="status"]').textContent = `${e.nome} entrou no lado ${lado}. ${plural(totalDoLado(state[lado]), 'combatente', 'combatentes')} no lado (máximo ${LIMITES.porLado}).`;
        if (add.disabled) dialog.querySelector('[data-action="fechar"].btn')?.focus();
        return undefined;
      }
      if (t.closest('[data-action="fechar"]')) fechar();
      return undefined;
    });
    dialog.addEventListener('input', event => {
      if (!event.target.matches('[data-busca]')) return;
      s.busca = event.target.value;
      redesenharLista();
    });
    dialog.addEventListener('change', event => {
      if (!event.target.matches('[data-nd]')) return;
      s.nd = event.target.value;
      redesenharLista();
    });
    dialog.addEventListener('keydown', event => {
      // setas, Home e End navegam entre as abas (padrão ARIA de tablist)
      if (!event.target.closest?.('[role="tab"]') || !['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const i = ABAS.findIndex(a => a.key === s.aba);
      const j = event.key === 'Home' ? 0 : event.key === 'End' ? ABAS.length - 1 : (i + (event.key === 'ArrowRight' ? 1 : ABAS.length - 1)) % ABAS.length;
      trocarAba(ABAS[j].key);
    });
    dialog.addEventListener('cancel', event => {
      event.preventDefault();
      fechar();
    });
    dialog.addEventListener('click', event => {
      if (event.target === dialog) fechar(); // clique no fundo
    });

    desenhar();
    dialog.showModal();
    dialog.querySelector('[data-busca]')?.focus();
    return { fechar };
  }

  // ------------------------------------------------------------------------------------------
  // luta

  function iniciarLuta(ia = state.ia) {
    const lado = l => state[l].flatMap(x => Array.from({ length: x.qtd }, () => fichaDe(x.ref)));
    const politicas = politicasDaArena(ia, state.redes, { registrar: true });
    state.b = createBattle({ ladoA: lado('A'), ladoB: lado('B'), semente: state.semente, distancia: state.distancia, limiteRodadas: state.limite, politicas });
    state.iaDaLuta = { A: politicas?.A ? 'rede' : 'classica', B: politicas?.B ? 'rede' : 'classica' };
    state.mostrados = 0;
    state.ultimo = null;
  }

  /** Quem age no próximo turno (pula quem já morreu, como o motor faz). */
  function proximo(b) {
    if (b.fim) return null;
    const n = b.ordem.length;
    const inicio = b.rodada === 0 || b.turno >= n - 1 ? 0 : b.turno + 1;
    for (let k = 0; k < n; k++) {
      const c = b.get(b.ordem[(inicio + k) % n]);
      if (c.estado !== 'morto') return c;
    }
    return null;
  }

  function condicoes(b, c) {
    const nome = uid => b.get(uid)?.nome || '?';
    const out = [];
    if (c.engolidoPor) out.push(['ember', `dentro de ${nome(c.engolidoPor)}`]);
    if (c.engolfadoPor) out.push(['ember', `engolfado por ${nome(c.engolfadoPor)}`]);
    if (c.agarradoPor) out.push(['ember', `agarrado por ${nome(c.agarradoPor)}`]);
    if (c.agarrando) out.push(['neutral', `agarra ${nome(c.agarrando)}`]);
    if (c.queimando) out.push(['ember', 'em chamas']);
    if (c.fugindo && c.estado !== 'morto') out.push(['ember', 'fugindo']);
    for (const k of Object.keys(c.cond)) out.push(['arcane', k]);
    for (const bf of c.buffs) out.push([/penalidade/.test(bf.rotulo || '') ? 'ember' : 'verdant', bf.rotulo || bf.nome]);
    if (c.pvTemp > 0) out.push(['verdant', `+${c.pvTemp} PV temporários`]);
    if (c.niveisNegativos) out.push(['ember', plural(c.niveisNegativos, 'nível negativo', 'níveis negativos')]);
    if (c.imagens > 0) out.push(['azure', plural(c.imagens, 'imagem espelhada', 'imagens espelhadas')]);
    return out;
  }

  function lutador(b, c, { vez, seguinte }) {
    const estado = c.estado; // quem foge aparece com a condição "fugindo"
    const morto = estado === 'morto';
    const fora = !podeLutar(c) || c.fugindo;
    const pct = Math.max(0, Math.min(1, c.pv / c.pvMax)) * 100;
    const contusao = Math.max(0, Math.min(c.contusao, Math.max(0, c.pv))) / c.pvMax * 100;
    const inimigos = b.combatentes.filter(x => x.lado !== c.lado && podeLutar(x) && !x.engolidoPor && !x.engolfadoPor);
    const maisPerto = !fora && !c.engolidoPor && inimigos.length ? inimigos.reduce((m, x) => (gap(c, x) < gap(c, m) ? x : m)) : null;
    const chips = morto ? [] : condicoes(b, c);
    const tom = pct > 50 ? 'ok' : pct > 25 ? 'meio' : 'baixo';
    // CA contra quem o agarra ou contra o inimigo mais perto: o agarrado mantém a Des contra quem o
    // segura, e a Esquiva só vale contra o alvo dela
    const caAgora = rules.caContra(b, c, c.agarradoPor ? b.get(c.agarradoPor) : maisPerto, GOLPE_COMUM);
    const ca = caAgora === c.ca.total ? `CA ${caAgora}` : `CA ${caAgora} (base ${c.ca.total})`;
    const distancia = maisPerto && (gap(c, maisPerto) === 0 ? 'colado no inimigo' : `${metros(gap(c, maisPerto))} do inimigo mais perto`);
    const pv = `PV ${c.pv < 0 ? `−${-c.pv}` : c.pv}/${c.pvMax}${c.contusao ? ` (${c.contusao} de contusão)` : ''}`;
    const meta = (morto ? [pv] : [pv, ca, distancia]).filter(Boolean).join(' · ');
    return html`<li class="arena-fighter arena-fighter--${c.lado.toLowerCase()} ${vez ? 'is-turn' : ''} ${fora ? 'is-down' : ''}" ${vez ? html`aria-current="true"` : ''}>
      <span class="arena-tag arena-tag--${c.lado.toLowerCase()}" aria-hidden="true">${c.lado}</span>
      <div class="arena-fighter__main">
        <div class="arena-nome-linha"><p class="arena-fighter__name"><span class="visually-hidden">Lado ${c.lado}: </span>${c.nome}${ESTADOS[estado] ? html` <span class="arena-fighter__state is-${estado}">${ESTADOS[estado]}</span>` : ''}${seguinte ? html` <span class="arena-fighter__next">a seguir</span>` : ''}</p>${botaoDoCard(c.ref, c.nome)}</div>
        <div class="arena-hp arena-hp--${tom}" aria-hidden="true"><span class="arena-hp__fill" style="width: ${pct.toFixed(1)}%"></span>${contusao ? html`<span class="arena-hp__sub" style="width: ${contusao.toFixed(1)}%"></span>` : ''}</div>
        <p class="arena-fighter__meta">${meta}</p>
        ${chips.length ? html`<ul class="chip-list arena-fighter__chips" aria-label="Condições">${chips.map(([cor, texto]) => html`<li class="badge badge--${cor}">${texto}</li>`)}</ul>` : ''}
      </div>
    </li>`;
  }

  function itemDoRegistro(b, ev) {
    if (ev.tipo === 'rodada') return html`<li class="arena-log__round"><span>${ev.texto}</span></li>`;
    const lado = ev.ator ? b.get(ev.ator)?.lado : null;
    return html`<li class="arena-log__item is-${ev.tipo}" ${lado ? html`data-lado="${lado}"` : ''}>${ev.texto}</li>`;
  }

  function resultado(b) {
    const fim = b.fim;
    const nomes = lado => fim.combatentes.filter(c => c.lado === lado).map(c => c.nome).join(', ');
    const titulo = fim.vencedor ? `Vence o lado ${fim.vencedor}` : 'Empate';
    const motivo = fim.vencedor ? `${nomes(fim.vencedor)}, em ${plural(fim.rodadas, 'rodada', 'rodadas')}` : `${fim.motivo[0].toUpperCase()}${fim.motivo.slice(1)}`;
    const semente = /^\d+$/.test(state.semente) ? state.semente : `“${state.semente}”`;
    return html`<section class="card card--pad arena-result ${fim.vencedor ? `arena-result--${fim.vencedor.toLowerCase()}` : 'arena-result--empate'}" aria-labelledby="arena-resultado">
      <div class="arena-result__head">
        <span class="arena-result__icon" aria-hidden="true">${icon(fim.vencedor ? 'trophy' : 'shield')}</span>
        <div>
          <h2 class="arena-h2" id="arena-resultado">${titulo}</h2>
          <p class="arena-result__lead">${motivo}. Semente ${semente}.</p>
        </div>
      </div>
      <ul class="arena-result__grid">
        ${fim.combatentes.map(c => {
          const estado = ESTADOS[c.estado] || 'de pé';
          return html`<li class="arena-stat arena-stat--${c.lado.toLowerCase()}">
            <div class="arena-nome-linha"><p class="arena-stat__name"><span class="arena-tag arena-tag--${c.lado.toLowerCase()}" aria-hidden="true">${c.lado}</span><span class="visually-hidden">Lado ${c.lado}: </span>${c.nome}</p>${botaoDoCard(b.get(c.uid).ref, c.nome)}</div>
            <p class="arena-stat__state">${estado} · PV ${c.pv < 0 ? `−${-c.pv}` : c.pv}/${c.pvMax}${c.contusao ? ` (${c.contusao} de contusão)` : ''}</p>
            <dl class="arena-stat__nums">
              <div><dt>Dano causado</dt><dd>${c.danoCausado}</dd></div>
              <div><dt>Dano recebido</dt><dd>${c.danoRecebido}</dd></div>
              <div><dt>Caiu na rodada</dt><dd>${c.caiuNaRodada ?? '—'}</dd></div>
              <div><dt>Abates</dt><dd>${c.abates}</dd></div>
            </dl>
          </li>`;
        })}
      </ul>
    </section>`;
  }

  function desenharLuta() {
    render(fase(), html`
      <section class="card arena-bar" aria-label="Controles da luta">
        <div class="arena-bar__status">
          <p class="arena-bar__round" data-slot="situacao"></p>
          <p class="arena-bar__seed">Semente <code data-slot="semente">${state.semente}</code>
            <button type="button" class="icon-btn" data-action="copiar-semente" aria-label="Copiar a semente">${icon('copy')}</button></p>
          <p class="arena-bar__info">Começa a ${metros(state.distancia)} · até ${plural(state.limite, 'rodada', 'rodadas')}${state.iaDaLuta.A === 'rede' || state.iaDaLuta.B === 'rede' ? ` · IA ${textoDaIa(state.iaDaLuta)}` : ''}</p>
        </div>
        <div class="arena-bar__controls">
          <button type="button" class="btn btn--primary" data-action="acao" data-focus="acao" data-focus-fallback="recomecar">${icon('step-forward')}Próxima ação</button>
          <button type="button" class="btn btn--outline" data-action="rodada" data-focus="rodada" data-focus-fallback="recomecar">${icon('skip-forward')}Próxima rodada</button>
          <button type="button" class="btn btn--outline" data-action="fim" data-focus="fim" data-focus-fallback="recomecar">${icon('fast-forward')}Até o fim</button>
          <button type="button" class="btn btn--ghost" data-action="recomecar" data-focus="recomecar">${icon('restore')}Recomeçar</button>
          <button type="button" class="btn btn--ghost" data-action="nova-luta" data-focus="nova-luta">${icon('d20')}Nova semente</button>
          <button type="button" class="btn btn--ghost" data-action="montagem" data-focus="montagem">${icon('arrow-left')}Voltar à montagem</button>
        </div>
      </section>
      <div data-slot="resultado"></div>
      <div class="arena-fight">
        <div class="arena-fight__left">
          <div data-slot="tabuleiro"></div>
          <section class="card arena-order" aria-labelledby="arena-ordem">
            <h2 class="arena-h2" id="arena-ordem">Ordem de iniciativa</h2>
            <ol class="arena-order__list" data-slot="ordem"></ol>
          </section>
        </div>
        <div class="arena-fight__right">
          <section class="card arena-log-card" aria-labelledby="arena-registro">
            <h2 class="arena-h2" id="arena-registro">Registro</h2>
            <ol class="arena-log" data-slot="registro" tabindex="0" aria-labelledby="arena-registro"></ol>
          </section>
        </div>
      </div>`);
    const slotTabuleiro = root.querySelector('[data-slot="tabuleiro"]');
    if (slotTabuleiro) {
      tabuleiroComponente = criarComponenteTabuleiro({
        container: slotTabuleiro,
        onAbrirCard: abrirCardDe,
        catalogoTokens,
      });
    }
    atualizar([]);
  }

  /** Atualiza a tela depois de um passo; `novos` são os eventos do passo (para o anúncio). */
  function atualizar(novos) {
    const b = state.b;
    tabuleiroComponente?.desenhar(b, novos);
    const slot = nome => root.querySelector(`[data-slot="${nome}"]`);
    const seguinte = proximo(b);
    slot('situacao').textContent = b.fim
      ? `Fim da luta · ${plural(b.fim.rodadas, 'rodada', 'rodadas')}`
      : b.rodada === 0
        ? `Pronto para começar · o primeiro a agir é ${seguinte?.nome}`
        : `Rodada ${b.rodada} · a seguir: ${seguinte?.nome}`;
    render(slot('ordem'), b.ordem.map(uid => lutador(b, b.get(uid), { vez: uid === state.ultimo, seguinte: seguinte && uid === seguinte.uid })));
    const registro = slot('registro');
    const noFim = registro.scrollHeight - registro.scrollTop - registro.clientHeight < 48;
    if (state.mostrados === 0) render(registro, '');
    registro.insertAdjacentHTML('beforeend', html`${b.eventos.slice(state.mostrados).map(ev => itemDoRegistro(b, ev))}`.value);
    state.mostrados = b.eventos.length;
    if (noFim || novos.length > 40) registro.scrollTop = registro.scrollHeight;
    for (const acao of ['acao', 'rodada', 'fim']) root.querySelector(`[data-action="${acao}"]`).disabled = Boolean(b.fim);
    const res = slot('resultado');
    if (b.fim && !res.firstElementChild) render(res, resultado(b));
    if (!b.fim && res.firstElementChild) render(res, '');
    const falas = novos.filter(ev => ev.tipo !== 'rodada' && ev.tipo !== 'ia').map(ev => ev.texto);
    if (b.fim) avisar(b.eventos.at(-1).texto);
    else if (falas.length) avisar(falas.slice(-3).join(' '));
  }

  function passo(tipo) {
    const b = state.b;
    if (b.fim) return;
    const inicio = b.eventos.length;
    if (tipo === 'acao') {
      // avança até alguém fazer algo: o turno de quem já morreu não registra nada
      for (let guarda = 0; !b.fim && guarda < 500; guarda++) {
        const evs = nextTurn(b);
        if (evs.some(ev => ev.tipo !== 'rodada')) break;
      }
    } else if (tipo === 'rodada') nextRound(b);
    else runBattle(b);
    state.ultimo = b.fim && tipo === 'fim' ? null : b.ordem[b.turno];
    comFoco(() => atualizar(b.eventos.slice(inicio)));
  }

  function recomecar({ novaSementeAntes = false } = {}) {
    if (novaSementeAntes) {
      state.semente = novaSemente();
      salvarNaUrl();
      root.querySelector('[data-slot="semente"]').textContent = state.semente;
    }
    iniciarLuta();
    atualizar([]);
    root.querySelector('[data-action="acao"]').focus();
  }

  async function copiarSemente() {
    try {
      await navigator.clipboard.writeText(state.semente);
      toast({ type: 'success', title: 'Semente copiada', message: `Use “${state.semente}” para repetir esta luta.` });
    } catch {
      toast({ type: 'info', title: 'Não deu para copiar', message: `Anote a semente: ${state.semente}.` });
    }
  }

  /**
   * Abre o card do combatente (TASK_010): o do catálogo ou o do seu personagem como ele luta agora
   * (equipamento e magias salvos). O popup é anexado ao body, por cima do seletor se ele estiver aberto.
   */
  async function abrirCardDe(ref) {
    const e = porId.get(ref);
    if (!e || cardAberto) return;
    const origem = document.activeElement;
    const ctx = await contextoDoCard(store);
    if (saindo || cardAberto) return;
    const modelo = ehPersonagem(ref)
      ? montarCardPersonagem(e, { ...ctx, concedidos: grantedFeats(e.sheet.nivel, e.sheet.classKey, e.sheet.raceKey) })
      : montarCardCatalogo(e, ctx);
    cardAberto = abrirCard({
      modelo,
      aviso: ctx.semGlossario ? AVISO_SEM_GLOSSARIO : '',
      aoFechar: () => {
        cardAberto = null;
        if (recarregarSePendente()) return;
        // o botão pode ter sido redesenhado enquanto o card estava aberto
        if (!origem?.isConnected) root.querySelector(`[data-card="${ref}"]`)?.focus();
      },
    });
  }

  /** Recarrega a página se o app adiou um recarregamento e a Arena já está livre. */
  let saindo = false; // a rota está mudando: fechar os diálogos não deve recarregar a página
  function recarregarSePendente() {
    if (saindo || !state.recarregarDepois || cleanup.ocupada()) return false;
    state.recarregarDepois = false;
    router.reload();
    return true;
  }

  const TEXTOS_DA_FICHA = {
    equipamento: { naoSalvo: 'Equipamento não salvo', salvo: 'Equipamento salvo', falhou: 'Não foi possível salvar o equipamento', mudou: 'o equipamento mudou', resumo: e => textoDoEquipamento(e.equipamento) },
    magias: { naoSalvo: 'Magias não salvas', salvo: 'Magias salvas', falhou: 'Não foi possível salvar as magias', mudou: 'as magias mudaram', resumo: textoDasMagias },
  };

  /**
   * Grava o equipamento (`fichas.equipamento`) ou as magias (`fichas.magias`) do personagem (merge:
   * o resto da ficha fica). Relê o store antes: se o personagem foi excluído ou trocado (outra aba,
   * "Restaurar tudo"), não grava, para não deixar uma ficha que outro personagem herdaria pelo mesmo id.
   */
  async function salvarNaFicha(e, campo, valor) {
    const t = TEXTOS_DA_FICHA[campo];
    const linha = { [campo]: valor, atualizado_em: new Date().toISOString() };
    try {
      const [agora, fichasAgora] = await Promise.all([store.get('personagens', e.personagem.id), store.all('fichas')]);
      const mesmo = agora && ['nome', 'classe_id', 'race_id', 'nivel'].every(k => String(agora[k]) === String(e.personagem[k]));
      if (!mesmo) {
        state.recarregarDepois = true;
        toast({ type: 'error', title: t.naoSalvo, message: `${e.nome} mudou ou não existe mais neste navegador. A Arena recarregou com os dados atuais.` });
        editando?.fechar(); // ao fechar, a recarga pendente acontece
        return;
      }
      const existente = fichasAgora.find(f => String(f.personagem_id) === String(e.personagem.id));
      const salva = existente ? await store.update('fichas', existente.id, linha) : await store.insert('fichas', { personagem_id: e.personagem.id, pericias: {}, talentos: [], ...linha });
      dados.fichas = [...fichasAgora.filter(f => f.id !== salva.id), salva];
      const nova = entradaDePersonagem(e.personagem);
      porId.set(nova.id, nova);
      personagens.splice(personagens.findIndex(x => x.id === nova.id), 1, nova);
      conferirLote(t.mudou);
      desenharMontagem();
      toast({ type: 'success', title: t.salvo, message: `${nova.nome}: ${t.resumo(nova)}.` });
    } catch (err) {
      toast({ type: 'error', title: t.falhou, message: err.message });
      throw err;
    }
  }

  // ------------------------------------------------------------------------------------------
  // eventos

  root.addEventListener('click', async event => {
    const t = event.target;
    const qtd = t.closest('[data-qtd]');
    if (qtd) {
      const lista = state[qtd.dataset.lado];
      const x = lista.find(y => y.ref === qtd.dataset.ref);
      if (!x) return;
      mudarQuantidade(lista, x.ref, x.qtd + Number(qtd.dataset.qtd));
      const cancelou = salvarNaUrl();
      comFoco(desenharMontagem);
      const n = lista.find(y => y.ref === x.ref)?.qtd || 0;
      avisar(`${porId.get(x.ref).nome}: ${n} no lado ${qtd.dataset.lado}.${cancelou ? ' A simulação em lote foi cancelada.' : ''}`);
      return;
    }
    const remover = t.closest('[data-remover]');
    if (remover) {
      mudarQuantidade(state[remover.dataset.lado], remover.dataset.ref, 0);
      const cancelou = salvarNaUrl();
      comFoco(desenharMontagem);
      avisar(`${porId.get(remover.dataset.ref).nome} saiu do lado ${remover.dataset.lado}.${cancelou ? ' A simulação em lote foi cancelada.' : ''}`);
      return;
    }
    const cardBtn = t.closest('[data-card]');
    if (cardBtn) {
      abrirCardDe(cardBtn.dataset.card);
      return;
    }
    const acao = t.closest('[data-action]')?.dataset.action;
    if (acao === 'adicionar') seletor = abrirSeletor(t.closest('[data-lado]').dataset.lado);
    else if (acao === 'equipamento' || acao === 'magias') {
      const botao = t.closest('[data-action]');
      const e = porId.get(botao.dataset.ref);
      const foco = botao.dataset.focus;
      const aoFechar = () => {
        editando = null;
        if (recarregarSePendente()) return;
        root.querySelector(`[data-focus="${foco}"]`)?.focus();
      };
      editando = acao === 'equipamento'
        ? abrirEquipamento({ entrada: e, calcular: e.calcular, salvar: eq => salvarNaFicha(e, 'equipamento', eq), aoFechar })
        : abrirMagias({ entrada: e, calcular: mg => e.calcular(e.equipamento, mg), salvar: mg => salvarNaFicha(e, 'magias', mg), aoFechar });
    }
    else if (acao === 'lote') {
      confirmarCampos();
      const vezes = Number(t.closest('[data-vezes]').dataset.vezes);
      if (state.lote?.rodando || !state.A.length || !state.B.length) return;
      await garantirRedes({ lote: true });
      if (state.lote?.rodando || state.fase !== 'montagem' || !situacao().pronto) return;
      iniciarLote(vezes);
    } else if (acao === 'lote-cancelar') {
      const vezes = state.lote?.lote.vezes;
      cancelarLote();
      atualizarLote();
      root.querySelector(`[data-action="lote"][data-vezes="${vezes}"]`)?.focus();
      avisar('Simulação cancelada.');
    } else if (acao === 'ver-semente') {
      // assiste a uma luta do lote: a semente dela vira a da montagem
      const botao = t.closest('[data-semente]');
      confirmarCampos();
      if (state.lote?.assinatura !== assinatura()) {
        atualizarLote();
        avisar('A montagem mudou depois da simulação: esta luta não daria o mesmo resultado.');
        root.querySelector('#arena-lote-res')?.focus();
        return;
      }
      state.semente = botao.dataset.semente;
      salvarNaUrl();
      // a IA que valeu no lote (sem as redes, a clássica), para a luta ser a mesma; as redes, se
      // valeram, já estão carregadas
      iniciarLuta(state.lote.ia);
      state.fase = 'luta';
      desenharLuta();
      root.querySelector('[data-action="acao"]').focus();
      const esperado = { A: 'vence o lado A', B: 'vence o lado B', empate: 'termina empatada' }[botao.dataset.resultado];
      avisar(`Luta da semente ${state.semente}: no lote, ela ${esperado}.`);
    }
    else if (acao === 'nova-semente') {
      state.semente = novaSemente();
      salvarNaUrl();
      root.querySelector('#arena-semente').value = state.semente;
    } else if (acao === 'comecar') {
      confirmarCampos();
      if (!state.A.length || !state.B.length || state.lote?.rodando) return;
      await garantirRedes();
      if (state.fase !== 'montagem' || !situacao().pronto) return;
      iniciarLuta();
      state.fase = 'luta';
      desenharLuta();
      root.querySelector('[data-action="acao"]').focus();
    } else if (['acao', 'rodada', 'fim'].includes(acao)) passo(acao);
    else if (acao === 'recomecar') recomecar();
    else if (acao === 'nova-luta') recomecar({ novaSementeAntes: true });
    else if (acao === 'copiar-semente') copiarSemente();
    else if (acao === 'montagem') {
      tabuleiroComponente?.destruir();
      tabuleiroComponente = null;
      state.fase = 'montagem';
      state.b = null;
      if (recarregarSePendente()) return;
      desenharMontagem();
      root.querySelector('[data-action="comecar"]')?.focus();
    }
  });

  /**
   * Vale o que está escrito nas opções mesmo que o campo ainda não tenha perdido o foco (o
   * "change" só vem no blur; um clique por teclado ou por script não tira o foco do campo).
   */
  function confirmarCampos() {
    const campo = id => root.querySelector(id);
    const semente = campo('#arena-semente') && sementeValida(campo('#arena-semente').value);
    const distancia = campo('#arena-distancia') && distanciaValida(campo('#arena-distancia').value);
    const limite = campo('#arena-limite') && rodadasValidas(campo('#arena-limite').value);
    const novo = { semente: semente || state.semente, distancia: distancia ?? state.distancia, limite: limite ?? state.limite };
    if (novo.semente === state.semente && novo.distancia === state.distancia && novo.limite === state.limite) return;
    Object.assign(state, novo);
    salvarNaUrl();
  }

  root.addEventListener('change', event => {
    const opt = event.target.dataset?.opt;
    if (!opt) return;
    if (opt === 'iaA' || opt === 'iaB') {
      state.ia = { ...state.ia, [opt.slice(2)]: event.target.value === 'rede' ? 'rede' : 'classica' };
      if (usaRede() && !state.redes) carregarRedes().then(r => (state.redes = r), () => {});
      salvarNaUrl();
      return;
    }
    if (opt === 'distancia') state.distancia = distanciaValida(event.target.value);
    if (opt === 'limite') state.limite = rodadasValidas(event.target.value);
    // a semente vale ao sair do campo (o "change" vem antes do clique em "Começar"); vazia, fica a anterior
    if (opt === 'semente') state.semente = sementeValida(event.target.value) || state.semente;
    event.target.value = state[opt];
    salvarNaUrl();
  });

  desenharMontagem();
  function cleanup() {
    saindo = true;
    cancelarLote();
    seletor?.fechar();
    editando?.fechar();
    cardAberto?.fechar();
    tabuleiroComponente?.destruir();
    tabuleiroComponente = null;
  }
  // o app não recarrega a Arena (evento de outra aba, "Restaurar tudo") com luta ou diálogo aberto:
  // marca a recarga (`adiar`), que acontece ao voltar à montagem ou ao fechar o diálogo
  cleanup.ocupada = () => state.fase === 'luta' || Boolean(seletor) || Boolean(editando) || Boolean(cardAberto);
  // o lote não segura a recarga (os dados dele ficariam velhos): ela o cancela, e o app avisa
  cleanup.loteRodando = () => Boolean(state.lote?.rodando);
  cleanup.adiar = () => {
    state.recarregarDepois = true;
  };
  cleanup.avisoAdiado = 'A Arena se atualiza quando você voltar à montagem ou fechar o diálogo.';
  return cleanup;
}
