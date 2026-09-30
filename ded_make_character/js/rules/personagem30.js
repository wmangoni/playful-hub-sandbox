/**
 * Adaptador de personagem (TASK_006 §5.1, etapa E4): transforma a ficha 3.0 (`computeSheet`),
 * o equipamento e os talentos escolhidos numa ficha de combate no mesmo formato de
 * `fromCatalog`, para o motor tratar o personagem do jogador como trata os do catálogo.
 *
 * O que entra (3.0, SRD):
 * - CA: 10 + armadura + escudo (com melhoria) + Des (limitada pela armadura) + tamanho + monge
 *   (Sab e nível, só sem armadura);
 * - ataques: BBA iterativo + For (corpo a corpo) ou Des (à distância, arremesso incluído) + tamanho +
 *   melhoria + Foco em Arma, com Acuidade com Arma, duas armas (tabela 3.0), rajada do monge,
 *   Tiro Rápido e os −4 sem proficiência;
 * - dano: dado da arma + For (×1,5 com as duas mãos, ×0,5 na mão inábil; arco e funda só a For
 *   negativa; besta nenhuma) + melhoria + Especialização em Arma; Sucesso Decisivo Aprimorado
 *   dobra a margem;
 * - habilidades de classe no vocabulário do catálogo: fúria, ataque furtivo, evasão, destruir
 *   o mal, cura pelas mãos, inspirar coragem, esquiva sobrenatural;
 * - talentos que o motor lê pelo nome: Ataque Poderoso, Trespassar, Esquiva, Tiro Preciso;
 * - magias (E7): a lista curada de magias30.js, com os espaços do dia e a escolha salva em
 *   `fichas.magias`, e a falha arcana da armadura e do escudo;
 * - a ficha impressa (E8): `naFicha` traz a CA com o equipamento, o deslocamento, as penalidades e
 *   os blocos de arma, armadura e escudo, com os mesmos números da luta.
 * Funções puras, sem DOM.
 */
import { normalize as loose } from '../core/format.js';
import { T30 } from './tables30.js';
import { ARMAS, armaPorId, armaduraPorId, empunhadura, mesmaArma, normalizarEquipamento, penalidadeDoItem, pesoKg, problemasDoEquipamento, proficienciasDeTalentos, proficienteArma, proficienteArmadura, proibidoAoDruida, rotuloItem } from './equipamento30.js';
import { magiasDeCombate } from './magias30.js';

const chave = nome => loose(nome).replace(/\s+/g, ' ').replace(/\s*\(.*\)\s*$/, '');

/** Deslocamento com armadura média ou pesada (3.0: 9 m → 6 m; 6 m → 4,5 m). */
const comArmadura = m => ({ 9: 6, 6: 4.5, 12: 9 })[m] ?? Math.round((m * 2) / 3 / 1.5) * 1.5;

/** Soma que propaga o valor ausente (atributo ou tamanho sem cadastro), como a ficha. */
const soma = (...xs) => (xs.some(x => x == null) ? null : xs.reduce((s, x) => s + x, 0));

/**
 * CA com o equipamento (3.0), na leitura da ficha "TOTAL = 10 + armadura + escudo + Des + tamanho +
 * natural + diversos": armadura e escudo com a melhoria; a Des limitada pela armadura; o monge só
 * soma a CA de monge (Sab e nível) sem armadura. O que depende de um valor ausente fica null.
 * `tamanho`: o modificador de tamanho da CA (a luta usa 0 quando a raça não diz o tamanho).
 */
export function caComEquipamento(sheet, eq, { tamanho = sheet.ca.tamanho } = {}) {
  const armadura = armaduraPorId(eq?.armadura?.id);
  const escudo = armaduraPorId(eq?.escudo?.id);
  const bonusArmadura = armadura ? armadura.bonus + (eq.armadura.melhoria || 0) : 0;
  const bonusEscudo = escudo ? escudo.bonus + (eq.escudo.melhoria || 0) : 0;
  const des = sheet.ca.destreza == null ? null : Math.min(sheet.ca.destreza, armadura ? armadura.desMax : Infinity);
  // monge de armadura (3.0): perde a CA de monge (o texto 3.0 fala só em armadura; o escudo não tira)
  const diversos = sheet.classKey === 'mon' && armadura ? 0 : sheet.ca.diversos;
  const total = soma(10, bonusArmadura, bonusEscudo, des, tamanho, 0, diversos);
  return {
    base: 10,
    armadura: bonusArmadura,
    escudo: bonusEscudo,
    destreza: des,
    tamanho,
    natural: 0,
    diversos,
    total,
    toque: soma(10, des, tamanho, diversos),
    surpresa: total == null || des == null ? null : total - Math.max(0, des),
  };
}

/**
 * Deslocamento com a armadura (3.0): a média e a pesada levam 9 m a 6 m (e 6 m a 4,5 m); o bárbaro
 * mantém o movimento rápido (+3 m) na média; o monge de armadura perde o deslocamento de monge.
 */
export function deslocamentoComArmadura(sheet, eq) {
  const armadura = armaduraPorId(eq?.armadura?.id);
  const racial = T30.racas[sheet.raceKey]?.deslocamento ?? sheet.deslocamento ?? 9;
  const d = sheet.deslocamento ?? racial;
  if (sheet.classKey === 'mon' && armadura) return armadura.tipo !== 'leve' ? comArmadura(racial) : racial;
  if (armadura && armadura.tipo !== 'leve') return comArmadura(racial) + (sheet.classKey === 'bar' && armadura.tipo === 'média' ? 3 : 0);
  return d;
}

const sinal = n => (n < 0 ? `−${-n}` : `+${n}`);
const decisivo = c => `${c.margem < 20 ? `${c.margem}–20` : '20'}/×${c.multiplicador}`;
const metros = m => `${String(m).replace('.', ',')} m`;

const dado = (dano, bonus) => (bonus ? `${dano}${bonus > 0 ? '+' : ''}${bonus}` : dano);

/** PV sem cadastro (3.0): o máximo do dado no 1º nível, a média arredondada para cima depois, + Con (mínimo 1 por nível). */
export function pvMedios(dadoVida, nivel, modCon) {
  if (!dadoVida || !nivel) return null;
  const media = Math.ceil((dadoVida + 1) / 2);
  let pv = 0;
  for (let i = 1; i <= nivel; i++) pv += Math.max(1, (i === 1 ? dadoVida : media) + (modCon || 0));
  return pv;
}

/**
 * Ficha de combate do personagem. `sheet`: `computeSheet` já com as escolhas; `talentos`:
 * [{ nome, parametro }] escolhidos (nomes do compêndio); `equipamento`: o salvo em
 * `fichas.equipamento` (ou null, que vale o kit padrão da classe); `magias`: a escolha salva em
 * `fichas.magias` (ou null, que vale a preparação padrão).
 * Devolve `{ ficha, equipamento, erros, avisos, ctxMagias, naFicha }`; com erros, `ficha` é null
 * (não dá para lutar). `ctxMagias` é o que as magias precisam do equipamento (o diálogo de magias
 * usa). `naFicha` é o equipamento na ficha impressa: CA, deslocamento, penalidades e os blocos de
 * arma, armadura e escudo; com erros, as armas vêm sem os números de ataque.
 */
export function fromPersonagem({ personagem, sheet, talentos = [], equipamento = null, magias = null }) {
  const erros = [];
  const avisos = [];
  const L = sheet.nivel;
  const ck = sheet.classKey;
  const tamanho = sheet.identidade.tamanho || 'Médio';
  const eq = normalizarEquipamento(equipamento, ck, tamanho);
  const mods = Object.fromEntries(sheet.atributos.map(a => [a.key, a.mod]));
  const atributos = Object.fromEntries(sheet.atributos.map(a => [a.key, a.total]));

  if (sheet.atributos.some(a => a.total == null)) erros.push('faltam atributos cadastrados');
  if (sheet.bba.valor == null) erros.push('sem classe (não há BBA nem resistências)');
  if (sheet.resistencias.some(r => r.total == null)) erros.push('sem as resistências (classe ou atributos ausentes)');
  if (sheet.nivelForaDaFaixa) avisos.push(`nível ${sheet.nivelCadastrado ?? '—'} fora de 1 a 20: a luta usa o ${L}º`);
  if (!ck && sheet.identidade.classe) avisos.push(`${sheet.identidade.classe} não é classe básica do Livro do Jogador: luta com o BBA e as resistências do compêndio, sem as habilidades da classe`);

  const escolhidos = talentos.map(t => ({ key: chave(t.nome), parametro: t.parametro || '' }));
  // talentos que a classe concede (3.0): o ranger usa duas armas como se tivesse os dois talentos
  const armadura = armaduraPorId(eq.armadura?.id);
  const escudo = armaduraPorId(eq.escudo?.id);
  const armaduraLeve = !armadura || armadura.tipo === 'leve';
  const tem = key => escolhidos.some(t => t.key === key)
    || (ck === 'ran' && armaduraLeve && ['ambidestria', 'combater com duas armas'].includes(key));
  const temCom = (key, arma) => escolhidos.some(t => t.key === key && mesmaArma(t.parametro, arma));
  const extras = proficienciasDeTalentos(talentos);

  const problemas = problemasDoEquipamento(eq, { classKey: ck, raceKey: sheet.raceKey, tamanho, extras });
  erros.push(...problemas.erros);
  avisos.push(...problemas.avisos);

  // ---- a ficha impressa (E8): a CA, o deslocamento, as penalidades e os blocos, mesmo que o
  // personagem não possa lutar (os ataques das armas ficam em branco sem atributos ou com erro)
  const principal = armaPorId(eq.principal?.id) || ARMAS[0];
  const secundaria = armaPorId(eq.secundaria?.id);
  const distancia = armaPorId(eq.distancia?.id);
  const proficienteEm = a => proficienteArmadura(a, { classKey: ck, extras });
  const penalidadeTotal = [[armadura, eq.armadura], [escudo, eq.escudo]].filter(([a]) => a).reduce((s, [a, x]) => s + penalidadeDoItem(a, x), 0);
  // sem proficiência com armadura ou escudo: a penalidade de armadura vale no ataque (3.0)
  const penalidadeArmadura = [[armadura, eq.armadura], [escudo, eq.escudo]].filter(([a]) => a && !proficienteEm(a)).reduce((s, [a, x]) => s + penalidadeDoItem(a, x), 0);
  const falhaArcana = (armadura?.falhaArcana || 0) + (escudo?.falhaArcana || 0);
  const naFicha = {
    ca: caComEquipamento(sheet, eq),
    deslocamento: sheet.deslocamento == null ? null : deslocamentoComArmadura(sheet, eq),
    penalidadeArmadura: penalidadeTotal,
    penalidadeNoAtaque: penalidadeArmadura,
    falhaArcana,
    armas: [['principal', principal], ['secundaria', secundaria], ['distancia', distancia]].map(([slot, arma]) => (arma ? blocoDeArma(slot, arma) : null)),
    armadura: armadura ? blocoDeProtecao(armadura, eq.armadura) : null,
    escudo: escudo ? blocoDeProtecao(escudo, eq.escudo) : null,
    // o que impede o equipamento (arma de duas mãos com escudo…): sem isso, os ataques ficam em branco
    errosDoEquipamento: problemas.erros,
  };

  /** O que a arma é, sem os números de quem a usa (esses vêm depois, se ele pode lutar). */
  function blocoDeArma(slot, arma) {
    const x = eq[slot];
    const aDistancia = slot === 'distancia';
    const arremesso = aDistancia && arma.uso === 'corpo a corpo';
    const incremento = aDistancia ? (arremesso ? arma.arremesso_m : arma.incremento_m) : null;
    const grip = empunhadura(arma, tamanho);
    const margem = temCom('sucesso decisivo aprimorado', arma) ? 21 - 2 * (21 - arma.critico.margem) : arma.critico.margem;
    let dano = arma.dano;
    if (arma.desarmado && ck === 'mon') dano = (tamanho === 'Pequeno' ? T30.monge.danoDesarmadoPequeno : T30.monge.danoDesarmado)[L - 1];
    else if (arma.desarmado && tamanho === 'Pequeno') dano = '1d2';
    const propriedades = [];
    if (slot === 'secundaria') propriedades.push('mão inábil');
    // arma de uma mão sem escudo nem segunda arma vai com as duas mãos (For ×1,5), como na luta
    const comAsDuas = !aDistancia && grip === 'uma mão' && slot === 'principal' && !escudo && !secundaria;
    if (!aDistancia && !arma.desarmado && grip !== 'grande demais') propriedades.push(comAsDuas ? 'uma mão, com as duas (For ×1,5)' : grip === 'duas mãos' ? 'duas mãos (For ×1,5)' : grip);
    if (!aDistancia && arma.alcance_m) propriedades.push(`haste: alcance ${metros(arma.alcance_m)}`);
    if (arremesso) propriedades.push('arremessada');
    if (!proficienteArma(arma, { classKey: ck, raceKey: sheet.raceKey, tamanho, extras, duasMaos: grip === 'duas mãos' || comAsDuas })) propriedades.push('sem proficiência (−4)');
    return {
      slot,
      nome: arma.desarmado ? (ck === 'mon' ? 'Desarmado (monge)' : 'Desarmado') : `${rotuloItem(x) || arma.nome}${arremesso ? ' (arremesso)' : ''}`,
      ataque: null,
      dano,
      decisivo: decisivo({ margem, multiplicador: arma.critico.multiplicador }),
      // "alcance" da ficha 3.0: o incremento de distância; corpo a corpo, só a arma de haste
      alcance: aDistancia ? metros(incremento) : arma.alcance_m ? metros(arma.alcance_m) : '—',
      peso: pesoKg(arma, tamanho),
      // arma de dois tipos é dos dois (SRD 3.0: "B and P"): só quem é imune aos dois ignora o dano
      tipo: arma.tipo_dano.join(' e '),
      tamanho: arma.tamanho || '—',
      propriedades,
    };
  }

  /** Armadura ou escudo: bônus (com a melhoria), Des máxima, penalidade (1 menor se mágica), falha arcana, peso. */
  function blocoDeProtecao(base, x) {
    const propriedades = [];
    const penalidade = penalidadeDoItem(base, x);
    if (!proficienteEm(base)) propriedades.push(penalidade < 0 ? `sem proficiência (${sinal(penalidade)} no ataque)` : 'sem proficiência');
    if (x?.melhoria && base.penalidade < 0) propriedades.push('obra-prima (penalidade 1 menor)');
    if (ck === 'dru' && base.metal) propriedades.push('metal: o druida não conjura');
    if (ck === 'mon' && base.tipo !== 'escudo') propriedades.push('monge: perde CA e deslocamento');
    return {
      nome: rotuloItem(x) || base.nome,
      tipo: base.tipo,
      bonus: base.bonus + (x?.melhoria || 0),
      desMax: base.desMax,
      penalidade,
      falhaArcana: base.falhaArcana,
      deslocamento: base.tipo === 'escudo' || sheet.deslocamento == null ? null : deslocamentoComArmadura(sheet, eq),
      peso: pesoKg(base, tamanho),
      propriedades,
    };
  }

  if (erros.length) return { ficha: null, equipamento: eq, erros, avisos, naFicha };

  const tamanhoAtaque = sheet.corpoACorpo.tamanho ?? 0;
  const bba = sheet.bba.valor;

  // ---- CA (a mesma conta da ficha impressa)
  // monge de armadura (3.0): perde a CA de monge, o deslocamento e os ataques desarmados extras
  // (o texto 3.0 fala só em armadura: com escudo, que ele não sabe usar, vale só a penalidade)
  const mongeLivre = ck === 'mon' && !armadura;
  const bonusArmadura = armadura ? armadura.bonus + (eq.armadura.melhoria || 0) : 0;
  const { total: caTotal, toque: caToque, surpresa: caSurpresa } = caComEquipamento(sheet, eq, { tamanho: sheet.ca.tamanho ?? 0 });
  const ca = { total: caTotal, toque: caToque, surpresa: caSurpresa };

  // ---- ataques
  const monk = ck === 'mon';
  const rajada = mongeLivre;
  // a arma de monge (kama, nunchaku, siangham) só usa a coluna própria se for leve para ele (3.0)
  const desarmadoDeMonge = arma => monk && (arma.desarmado || (arma.monge && empunhadura(arma, tamanho) === 'leve'));

  function golpe(x, arma, { mao = 'principal', bonusIterativo = bba, distancia = false, penalidade = 0 } = {}) {
    const grip = empunhadura(arma, tamanho);
    const arremesso = distancia && arma.uso === 'corpo a corpo';
    const aDistancia = distancia || arma.uso === 'distancia';
    // arma de uma mão com a outra mão livre (sem escudo nem segunda arma) vai com as duas (3.0)
    const duasMaos = !aDistancia && !arma.desarmado && (grip === 'duas mãos' || (grip === 'uma mão' && mao === 'principal' && !escudo && !secundaria));
    // Acuidade com Arma (3.0): arma leve, rapieira usada com uma mão ou corrente com cravos
    // (portador Médio ou maior); a penalidade do escudo vale no ataque
    const cabeAcuidade = grip === 'leve' || (arma.id === 'rapieira' && grip === 'uma mão') || (arma.id === 'corrente-com-cravos' && tamanho !== 'Pequeno');
    const acuidade = !aDistancia && temCom('acuidade com arma', arma) && cabeAcuidade && mods.des > mods.for;
    const penalidadeEscudo = acuidade && escudo ? penalidadeDoItem(escudo, eq.escudo) : 0;
    const melhoria = x?.melhoria || 0;
    const foco = temCom('foco em arma', arma) ? 1 : 0;
    const semProficiencia = proficienteArma(arma, { classKey: ck, raceKey: sheet.raceKey, tamanho, extras, duasMaos }) ? 0 : -4;
    const atributoAtaque = aDistancia || acuidade ? mods.des : mods.for;
    const bonus = bonusIterativo + atributoAtaque + tamanhoAtaque + melhoria + foco + semProficiencia + penalidadeArmadura + penalidadeEscudo + penalidade;
    // quanto da For entra no dano (para o motor recalcular com a For de agora: fúria, dano de atributo)
    const forMult = arma.projetil ? 0 : aDistancia ? 1 : mao === 'inabil' ? 0.5 : duasMaos ? 1.5 : 1;
    // For no dano: ×1,5 com as duas mãos, ×0,5 na mão inábil (só o bônus; a penalidade vale inteira)
    let forca = 0;
    if (arma.projetil) forca = /^(arco|funda)/.test(arma.id) ? Math.min(0, mods.for) : 0;
    else if (mods.for < 0) forca = mods.for;
    else if (arremesso || arma.uso === 'distancia') forca = mods.for;
    else if (mao === 'inabil') forca = Math.floor(mods.for / 2);
    else if (duasMaos) forca = Math.floor(mods.for * 1.5);
    else forca = mods.for;
    const especializacao = temCom('especializacao em arma', arma) ? 2 : 0;
    const margemBase = arma.critico.margem;
    const margem = temCom('sucesso decisivo aprimorado', arma) ? 21 - 2 * (21 - margemBase) : margemBase;
    let danoBase = arma.dano;
    if (arma.desarmado && monk) danoBase = (tamanho === 'Pequeno' ? T30.monge.danoDesarmadoPequeno : T30.monge.danoDesarmado)[L - 1];
    else if (arma.desarmado && tamanho === 'Pequeno') danoBase = '1d2';
    const ki = monk && arma.desarmado && L >= 10 ? (L >= 16 ? 3 : L >= 13 ? 2 : 1) : 0;
    const incremento = aDistancia ? (arremesso ? arma.arremesso_m : arma.incremento_m) : null;
    const nome = `${arma.nome}${melhoria ? ` +${melhoria}` : ''}${x?.material ? ` de ${x.material}` : ''}${arremesso ? ' arremessada' : ''}${mao === 'inabil' ? ' (mão inábil)' : ''}`;
    const ataque = {
      nome,
      // a arma e a mão (Arma Mágica encanta só a da mão principal)
      arma_id: arma.id,
      mao: distancia ? 'distancia' : mao,
      tipo: aDistancia ? 'distancia' : 'corpo a corpo',
      bonus,
      dano: dado(danoBase, forca + melhoria + (aDistancia ? 0 : especializacao)),
      critico: { margem, multiplicador: arma.critico.multiplicador },
      tipo_dano: [...arma.tipo_dano],
      natural: false,
      secundario: false,
      alcance_m: aDistancia ? incremento * (arma.projetil ? 10 : 5) : arma.alcance_m || 1.5,
      incremento_m: incremento,
      magico: melhoria ? `+${melhoria}` : ki ? `+${ki}` : null,
      material: x?.material || null,
      dano_extra: [],
      efeitos: [],
      // campos do adaptador que o motor lê: atributo do ataque e peso da For no dano
      atributo_ataque: aDistancia || acuidade ? 'des' : 'for',
      for_mult: forMult,
      for_negativa: /^(arco|funda)/.test(arma.id) || !arma.projetil,
    };
    // Tiro Certeiro (+1 no ataque e no dano) e Especialização à distância (+2 no dano) só até 9 m
    const certeiro = aDistancia && tem('tiro certeiro');
    if (certeiro || (aDistancia && especializacao)) ataque.ate_9m = { ataque: certeiro ? 1 : 0, dano: (certeiro ? 1 : 0) + (aDistancia ? especializacao : 0), rotulo: certeiro ? 'Tiro Certeiro' : 'Especialização em Arma' };
    return ataque;
  }

  const iterativos = desarmadoDeMonge(principal) && mongeLivre ? T30.monge.ataqueDesarmado[L - 1] : sheet.bba.ataques;
  const ataqueTotal = [];
  const ataques = [];
  if (secundaria) {
    // duas armas (3.0): −6/−10; mão inábil leve −4/−8; Ambidestria tira 4 da inábil; o talento tira 2 das duas
    const leve = empunhadura(secundaria, tamanho) === 'leve';
    let pPrincipal = leve ? -4 : -6;
    let pInabil = leve ? -8 : -10;
    if (tem('ambidestria')) pInabil += 4;
    if (tem('combater com duas armas')) { pPrincipal += 2; pInabil += 2; }
    for (const it of iterativos) ataqueTotal.push(golpe(eq.principal, principal, { bonusIterativo: it, penalidade: pPrincipal }));
    ataqueTotal.push(golpe(eq.secundaria, secundaria, { mao: 'inabil', bonusIterativo: iterativos[0], penalidade: pInabil }));
    if (tem('combater com duas armas aprimorado')) ataqueTotal.push(golpe(eq.secundaria, secundaria, { mao: 'inabil', bonusIterativo: iterativos[0], penalidade: pInabil - 5 }));
  } else {
    const extra = rajada && desarmadoDeMonge(principal) ? -2 : 0; // rajada de golpes (3.0: −2 em todos)
    if (extra) ataqueTotal.push(golpe(eq.principal, principal, { bonusIterativo: iterativos[0], penalidade: extra }));
    for (const it of iterativos) ataqueTotal.push(golpe(eq.principal, principal, { bonusIterativo: it, penalidade: extra }));
  }
  ataques.push(golpe(eq.principal, principal, { bonusIterativo: iterativos[0] }));

  let ataqueTotalDistancia = null;
  let sequenciaDistancia = null;
  if (distancia) {
    const x = eq.distancia;
    const unico = golpe(x, distancia, { distancia: true });
    ataques.push(unico);
    // a besta recarrega (3.0: ação de movimento ou rodada inteira): um disparo por rodada; arma de
    // arremesso também, sem Saque Rápido (sacar a próxima é ação de movimento). A funda não recarrega
    // na 3.0 (a recarga dela é da 3.5)
    const recarrega = /^besta/.test(distancia.id) || (!distancia.projetil && !tem('saque rapido'));
    const seq = recarrega ? [bba] : sheet.bba.ataques;
    sequenciaDistancia = { recarrega, bonus: seq.map(it => golpe(x, distancia, { distancia: true, bonusIterativo: it }).bonus) };
    const rapido = tem('tiro rapido') && !recarrega ? -2 : 0;
    ataqueTotalDistancia = [
      ...(rapido ? [golpe(x, distancia, { distancia: true, bonusIterativo: sheet.bba.ataques[0], penalidade: rapido })] : []),
      ...seq.map(it => golpe(x, distancia, { distancia: true, bonusIterativo: it, penalidade: rapido })),
    ];
  }
  if (principal.desarmado && !monk) avisos.push('desarmado: o soco (1d3) deveria causar dano por contusão, mas o simulador o trata como dano normal');

  // ---- os números das armas na ficha impressa: ataque total (sem duas armas nem rajada, que vão
  // nas propriedades), dano e decisivo com quem a usa
  const serie = lista => lista.map(sinal).join('/');
  const [bP, bS, bD] = naFicha.armas;
  const unicoP = ataques[0];
  Object.assign(bP, { ataque: serie(iterativos.map(it => golpe(eq.principal, principal, { bonusIterativo: it }).bonus)), dano: unicoP.dano, decisivo: decisivo(unicoP.critico) });
  if (unicoP.atributo_ataque === 'des') bP.propriedades.push('Acuidade com Arma');
  if (temCom('foco em arma', principal)) bP.propriedades.push('Foco em Arma');
  if (temCom('especializacao em arma', principal)) bP.propriedades.push('Especialização em Arma');
  if (rajada && desarmadoDeMonge(principal)) bP.propriedades.push(`rajada de golpes: ${serie(ataqueTotal.map(a => a.bonus))}`);
  if (monk && principal.desarmado && unicoP.magico) bP.propriedades.push(`golpe ki (${unicoP.magico})`);
  if (bS) {
    const inabeis = ataqueTotal.filter(a => a.mao === 'inabil');
    Object.assign(bS, { ataque: serie(inabeis.map(a => a.bonus)), dano: inabeis[0].dano, decisivo: decisivo(inabeis[0].critico) });
    bP.propriedades.push(`com duas armas: ${serie(ataqueTotal.filter(a => a.mao === 'principal').map(a => a.bonus))}`);
  }
  if (bD) {
    const unicoD = ataques.find(a => a.mao === 'distancia');
    Object.assign(bD, { ataque: serie(sequenciaDistancia.bonus), dano: unicoD.dano, decisivo: decisivo(unicoD.critico) });
    if (sequenciaDistancia.recarrega) bD.propriedades.push(/^besta/.test(distancia.id) ? 'recarga: um disparo por rodada' : 'sem Saque Rápido: um por rodada');
    if (ataqueTotalDistancia.length > sequenciaDistancia.bonus.length) bD.propriedades.push(`Tiro Rápido: ${serie(ataqueTotalDistancia.map(a => a.bonus))}`);
    if (unicoD.ate_9m) bD.propriedades.push(`até 9 m: ${[unicoD.ate_9m.ataque ? `+${unicoD.ate_9m.ataque} ataque` : null, `+${unicoD.ate_9m.dano} dano`].filter(Boolean).join(', ')}`);
  }
  if (distancia && /^besta-pesada/.test(distancia.id)) avisos.push('besta pesada: na 3.0 recarregar leva uma rodada inteira; o simulador dispara toda rodada');

  // ---- habilidades de classe (vocabulário do catálogo)
  const especiais = [];
  const esp = (id, nome, natureza, mecanica, grupo = 'qualidade') => especiais.push({ id, nome, natureza, descricao: '', mecanica, grupo });
  const conFuria = mods.con + (L >= 15 ? 3 : 2);
  if (ck === 'bar') {
    const usos = L >= 20 ? 6 : 1 + Math.floor(L / 4);
    esp('furia', L >= 15 ? 'Fúria maior' : 'Fúria', 'Ext', { efeito: 'furia', usos: `${usos}/dia`, for: L >= 15 ? 6 : 4, con: L >= 15 ? 6 : 4, von: L >= 15 ? 3 : 2, ca: -2, duracao_rodadas: Math.max(1, 3 + conFuria), maior: L >= 15, ...(L >= 20 ? { sem_fadiga: true } : {}) }, 'ataque');
  }
  if (ck === 'lad') esp('ataque-furtivo', `Ataque furtivo +${Math.ceil(L / 2)}d6`, 'Ext', { efeito: 'ataque-furtivo', dano: `${Math.ceil(L / 2)}d6` }, 'ataque');
  if ((ck === 'lad' && L >= 2) || ck === 'mon') esp('evasao', ck === 'mon' && L >= 9 ? 'Evasão aprimorada' : 'Evasão', 'Ext', { efeito: 'evasao', aprimorada: ck === 'mon' && L >= 9 });
  if (ck === 'pal') {
    if (L >= 2) esp('destruir-o-mal', 'Destruir o mal', 'Sob', { efeito: 'destruir', usos: '1/dia', bonus_ataque: Math.max(0, mods.car), bonus_dano: L, alvo: 'maligno' }, 'ataque');
    if (mods.car > 0) esp('cura-pelas-maos', 'Cura pelas mãos', 'SM', { efeito: 'cura-pelas-maos', pv_por_dia: mods.car * L });
  }
  if (ck === 'bad') {
    const atuacao = sheet.pericias.find(p => loose(p.nome) === 'atuacao')?.graduacoes || 0;
    if (atuacao >= 3) esp('musica-de-bardo', 'Música de bardo: inspirar coragem', 'Sob', { efeito: 'inspirar-coragem', usos: `${L}/dia`, bonus_ataque: 1, bonus_dano: 1, bonus_contra_medo: 2 }, 'ataque');
    else avisos.push('inspirar coragem pede 3 graduações em Atuação: sem elas, o bardo não canta');
  }
  // habilidades de combate que o simulador não cobre: aparecem como "não simulado" no registro
  const naoSimuladas = {
    cle: ['Expulsar mortos-vivos'],
    dru: [...(L >= 5 ? ['Forma selvagem'] : []), 'Companheiro animal'],
    mon: ['Ataque atordoante'],
    ran: ['Inimigo predileto'],
    pal: L >= 3 ? ['Expulsar mortos-vivos'] : [],
  }[ck] || [];
  naoSimuladas.forEach((nome, i) => esp(`nao-simulado-${i}`, nome, 'Ext', null, 'ataque'));

  // ---- magias (E7): a lista curada, com os espaços do dia; o druida de metal ou com arma
  // proibida não conjura (3.0; o aviso vem de problemasDoEquipamento)
  const semMagia = ck === 'dru' && proibidoAoDruida(eq);
  // o que as magias precisam saber do equipamento (Armadura Arcana, Arma Mágica, falha arcana)
  const ctxMagias = {
    bonusArmadura,
    armaPrincipal: { id: principal.id, nome: rotuloItem(eq.principal) || principal.nome, desarmado: Boolean(principal.desarmado), melhoria: eq.principal?.melhoria || 0 },
    falhaArcana,
  };
  const conjuracao = semMagia ? { magias: null, especiais: [], avisos: [] } : magiasDeCombate({ sheet, escolha: magias, tendencia: personagem.tendencia, ctx: ctxMagias });
  especiais.push(...conjuracao.especiais);
  avisos.push(...conjuracao.avisos);

  // ---- defesas e o resto
  const rd = sheet.reducaoDano ? { valor: Number(sheet.reducaoDano.split('/')[0]), exceto: sheet.reducaoDano.split('/')[1] } : null;
  const imunidades = [];
  if (['elfo', 'meio-elfo'].includes(sheet.raceKey)) imunidades.push('sono');
  if ((ck === 'dru' && L >= 9) || (ck === 'mon' && L >= 11)) imunidades.push('veneno');
  if (ck === 'pal' && L >= 2) imunidades.push('medo'); // aura de coragem: imune a medo (3.0)

  const deslocamento = deslocamentoComArmadura(sheet, eq);

  const pvCadastrado = Number(personagem.pvs);
  let pvMax = Number.isFinite(pvCadastrado) && pvCadastrado > 0 ? pvCadastrado : null;
  if (pvMax == null) {
    pvMax = pvMedios(Number(String(sheet.pv.dadoVida || '').replace('d', '')) || null, L, mods.con);
    if (pvMax == null) return { ficha: null, equipamento: eq, erros: ['sem PV cadastrados e sem dado de vida para calcular'], avisos, naFicha };
    avisos.push(`PV não cadastrados: a luta usa ${pvMax}, a média por nível`);
  }
  const grapple = { 'Pequeno': -4, 'Médio': 0, 'Grande': 4 }[tamanho] ?? 0;

  const ficha = {
    origem: 'personagem',
    ref: `p:${personagem.id}`,
    categoria: 'personagem',
    nome: personagem.nome,
    tipo: 'Humanoide',
    subtipos: [],
    tamanho,
    tendencia: personagem.tendencia || 'N',
    raca: sheet.identidade.raca,
    nd: L,
    nivel: L,
    dv: L,
    pvMax,
    iniciativa: sheet.iniciativa.total,
    deslocamento: { terrestre: deslocamento, voo: null, voo_manobrabilidade: null, natacao: null, escalada: null, escavacao: null },
    espaco: 1.5,
    alcance: 1.5,
    ca,
    bba,
    agarrar: bba + mods.for + grapple,
    ataques,
    ataqueTotal,
    ataqueTotalDistancia,
    especiais,
    magias: conjuracao.magias,
    rd,
    rm: sheet.resistenciaMagia,
    resistEnergia: {},
    imunidades,
    imuneFortitude: false,
    vulnerabilidades: [],
    regeneracao: null,
    curaAcelerada: null,
    resistencias: Object.fromEntries(sheet.resistencias.map(r => [r.key, r.total])),
    atributos,
    talentos: escolhidos.map(t => t.key),
    tatica: '',
    armaduraLeve,
    esquivaSobrenatural: (ck === 'bar' && L >= 2) || (ck === 'lad' && L >= 3),
  };
  return { ficha, equipamento: eq, erros, avisos, ctxMagias, naFicha };
}
