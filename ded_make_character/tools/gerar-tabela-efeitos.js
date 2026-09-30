/**
 * Reescreve a tabela de efeitos de tools/catalogo-combate.md a partir de EFEITOS (tools/validar-catalogo.js).
 * Uso: node ded_make_character/tools/gerar-tabela-efeitos.js  (rode depois de mudar EFEITOS; o teste do catálogo confere)
 */
const fs = require('fs');
const path = require('path');
const R = path.join(__dirname, '..') + path.sep;
const { EFEITOS } = require(R + 'tools/validar-catalogo.js');
const notas = {
  sopro: 'área `cone` \\| `linha` \\| `cubo` \\| `raio`; `recarga` `"1d4"` ou inteiro; `veneno` = `{ inicial, secundario }`',
  'agarrar-aprimorado': '`tamanho_max` padrão: uma categoria menor que o monstro',
  engolfar: '`paralisia` = `{ resistencia, cd, duracao }` (toque paralisante do cubo)',
  bote: 'ataque total ao fim de uma investida',
  veneno: '`inicial`/`secundario` = `{ "atributo": "for", "dano": "1d6" }` ou `{ "condicao": "morto" }`',
  'presenca-aterradora': '`quando: "ao-atacar"`; `raio_m: null` = todos os inimigos da luta',
  'condicao-ao-acertar': 'condição com teste a cada acerto (ex.: medo da pancada do balor)',
  petrificacao: '`quando: "olhar"` ou `gatilho`',
  magia: '`efeitos_por_dv` = `[{ "dv_max": 7, "condicao": "paralisado", "duracao": "…" }]`, cumulativos (vale toda entrada cujo `dv_max` o alvo atende; sem `dv_max`, vale para todos); `dano_por_tendencia` = `{ "eixo": "etico", "L": "total", "N": "metade", "C": "nenhum" }` (com ele, a condição restrita vai em `condicao_afeta`); `ataque` = tipo de ataque (ex.: `toque a distancia`); `continuo` = `{ "dano": "2d4", "tipo": "ácido", "rodadas": 3 }` (dano sem teste no início dos próximos turnos do alvo: Flecha Ácida); `persistente: true` (Esfera Flamejante: queima de novo a cada turno do conjurador, pela `duracao`); `repete: true` (Produzir Chamas: arremessa de novo, sem gastar a magia, pela `duracao`); `limite_dv` = dado de DV afetados, os de menos DV primeiro (Sono: `"2d4"`); `tipo_bonus` = tipo do `bonus` (`moral`…): do mesmo tipo, vale o maior',
  aura: '`dano_atributo` = `{ atributo, dano }`',
  queimar: 'quem pega fogo; `ao_ser_atingido`: quem acerta o monstro com arma natural também pode pegar fogo',
  'ataque-furtivo': 'vale quando o alvo perde a Des na CA; nunca contra imunes a crítico; à distância só até 9 m',
  evasao: 'só com armadura leve ou sem armadura',
  destruir: '`alvo`: `maligno` \\| `bom` \\| `leal` \\| `caótico` \\| `qualquer`',
  camuflagem: 'chance de o ataque errar (ex.: deslocamento 50)',
  'falha-de-magia': 'chance de a magia falhar; `aplica_a` = ids dos especiais afetados (sem ele, vale para todas as magias)',
  vorpal: '`quando`: `critico-confirmado` \\| `natural-20`',
  'explosao-ao-morrer': '`quando: "ao-morrer"`',
  'imunidade-magia': '`excecoes` = `[{ "tipo_energia": "eletricidade", "efeito": "lento 3 rodadas" }]` ou `[{ "magia": "de deuses maiores" }]`',
  'refletir-magia': '`afeta` = array (ex.: `["raios", "linhas", "cones", "Mísseis Mágicos"]`)',
  outro: 'livre, **não simulado**',
};
const cod = k => '`' + k + '`';
const linhas = Object.entries(EFEITOS).map(([ef, r]) => {
  const obr = r.obrigatorios.map(k => `**${cod(k)}**`).join(', ') || '—';
  const alg = r.algum ? r.algum.map(g => g.map(cod).join(' + ')).join(' ou ') : '';
  const opc = r.opcionais.map(cod).join(', ');
  return `| ${cod(ef)} | ${obr} | ${alg || '—'} | ${opc || '—'} | ${notas[ef] || ''} |`;
});
const tabela = [
  '### Vocabulário de `mecanica.efeito` ✔',
  '',
  'Esta tabela é gerada por `tools/gerar-tabela-efeitos.js` a partir de `EFEITOS` em `tools/validar-catalogo.js`, que é a fonte única (o teste do catálogo confere que as duas batem). Qualquer campo fora das três colunas é erro ✔, exceto `nota` (texto livre, aceita em todos) e o efeito `outro`, que é livre.',
  '',
  '| efeito | obrigatórios | pelo menos um de | opcionais | observações |',
  '|---|---|---|---|---|',
  ...linhas,
].join('\n');
const P = R + 'tools/catalogo-combate.md';
let s = fs.readFileSync(P, 'utf8');
const ini = s.indexOf('### Vocabulário de `mecanica.efeito`');
const fim = s.indexOf('Exemplo, o gás do golem');
if (ini < 0 || fim < 0) throw new Error('marcadores');
s = s.slice(0, ini) + tabela + '\n\n' + s.slice(fim);
fs.writeFileSync(P, s);
console.log('ok', linhas.length, 'efeitos');
