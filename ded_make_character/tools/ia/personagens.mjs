/**
 * Personagens montados fora do navegador pelas regras do app (TASK_009 §5.1), pelo mesmo caminho
 * dos personagens do jogador na Arena: `computeSheet` → `fromPersonagem`, com as tabelas de
 * `data/*.json`. As ferramentas da IA usam isto para o registro de referência (E1) e para os
 * personagens sintéticos (E3).
 */
import { readFileSync } from 'node:fs';
import { computeSheet } from '../../js/rules/dnd30.js';
import { fromPersonagem } from '../../js/rules/personagem30.js';

const tabela = nome => JSON.parse(readFileSync(new URL(`../../data/${nome}.json`, import.meta.url), 'utf8')).rows;
const [RACES, CLASSES_DB, BBA, PERICIAS] = ['races', 'classes', 'bba', 'pericias'].map(tabela);

/** Ids do compêndio (`data/classes.json` e `data/races.json`). */
export const CLASSES = { barbaro: 1, bardo: 2, clerigo: 3, druida: 4, guerreiro: 5, monge: 6, paladino: 7, ranger: 8, ladino: 9, feiticeiro: 10, mago: 11 };
export const RACAS = { humano: 1, anao: 2, elfo: 3, gnomo: 4, 'meio-elfo': 5, 'meio-orc': 6, halfling: 7 };

/** Ordem dos atributos por classe: o primeiro recebe o maior valor. */
const PRIORIDADE = {
  barbaro: ['for', 'con', 'des', 'sab', 'car', 'int'],
  bardo: ['car', 'des', 'con', 'int', 'for', 'sab'],
  clerigo: ['sab', 'con', 'for', 'car', 'des', 'int'],
  druida: ['sab', 'con', 'des', 'int', 'for', 'car'],
  guerreiro: ['for', 'con', 'des', 'sab', 'int', 'car'],
  monge: ['sab', 'des', 'for', 'con', 'int', 'car'],
  paladino: ['for', 'car', 'con', 'sab', 'des', 'int'],
  ranger: ['des', 'for', 'con', 'sab', 'int', 'car'],
  ladino: ['des', 'int', 'con', 'for', 'car', 'sab'],
  feiticeiro: ['car', 'des', 'con', 'int', 'sab', 'for'],
  mago: ['int', 'des', 'con', 'sab', 'car', 'for'],
};

/** Tendência que a classe permite (3.0): paladino LB, monge leal, druida neutro, bárbaro e bardo não leais. */
const TENDENCIA = { barbaro: 'CN', bardo: 'CB', clerigo: 'NB', druida: 'N', guerreiro: 'LN', monge: 'LN', paladino: 'LB', ranger: 'NB', ladino: 'CN', feiticeiro: 'CN', mago: 'NB' };

/** Os atributos na ordem de prioridade da classe a partir de uma lista de valores (padrão: 16 14 14 12 10 8). */
export function atributosDaClasse(classe, valores = [16, 14, 14, 12, 10, 8]) {
  const ordem = PRIORIDADE[classe];
  if (!ordem) throw new Error(`classe desconhecida: ${classe}`);
  return Object.fromEntries(ordem.map((attr, i) => [attr, valores[i]]));
}

/**
 * Monta um personagem. `talentos`: [{ nome, parametro }] do compêndio; `ranks`: { chave da
 * perícia: graduações }; `equipamento` e `magias` nulos valem o kit e a preparação padrão; `pvs`
 * nulo vale a média por nível (como um personagem sem PV cadastrados).
 * Devolve `{ ficha, sheet, erros, avisos }` (`ficha` nula se o personagem não pode lutar).
 */
export function montarPersonagem({ classe, raca = 'humano', nivel = 1, atributos = null, tendencia = null, talentos = [], ranks = {}, equipamento = null, magias = null, nome = null, id = 9000, pvs = null }) {
  if (!CLASSES[classe]) throw new Error(`classe desconhecida: ${classe}`);
  if (!RACAS[raca]) throw new Error(`raça desconhecida: ${raca}`);
  const personagem = {
    id,
    nome: nome || `${classe} ${nivel}`,
    race_id: RACAS[raca],
    classe_id: CLASSES[classe],
    jogador_id: null,
    tendencia: tendencia || TENDENCIA[classe],
    divindade: null,
    nivel,
    ...(atributos || atributosDaClasse(classe)),
    iniciativa: 0,
    pvs,
  };
  const sheet = computeSheet(personagem, {
    race: RACES.find(r => r.id === personagem.race_id),
    classe: CLASSES_DB.find(c => c.id === personagem.classe_id),
    bbaRows: BBA,
    pericias: PERICIAS,
    escolhas: { ranks, talentos },
  });
  const r = fromPersonagem({ personagem, sheet, talentos, equipamento, magias });
  return { ficha: r.ficha, sheet, erros: r.erros, avisos: r.avisos };
}
