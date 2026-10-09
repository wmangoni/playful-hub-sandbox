import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ESPACO_35_QUADRADOS,
  tamanhoEmQuadrados,
  calcularDimensoesGrid,
  distanciaEmQuadrados,
  projetarPosicoesGrid,
  METROS_POR_QUADRADO,
} from '../ded_make_character/js/rules/tabuleiro35.js';
import { calcularCone, detectarTemaCone, TEMAS_CONE } from '../ded_make_character/js/rules/cones35.js';
import { obterUrlToken, siglaCombatente, gerarTokenProceduralSvg } from '../ded_make_character/js/rules/tokens.js';

test('--- Tabuleiro Tático 3.5: Tamanhos das Miniaturas ---', async t => {
  await t.test('converte corretamente tamanhos da 3.5 em quadrados de grade', () => {
    assert.equal(tamanhoEmQuadrados('Médio'), 1);
    assert.equal(tamanhoEmQuadrados('Pequeno'), 1);
    assert.equal(tamanhoEmQuadrados('Miúdo'), 1);
    assert.equal(tamanhoEmQuadrados('Minúsculo'), 1);
    assert.equal(tamanhoEmQuadrados('Mínimo'), 1);
    assert.equal(tamanhoEmQuadrados('Grande'), 2);
    assert.equal(tamanhoEmQuadrados('Enorme'), 3);
    assert.equal(tamanhoEmQuadrados('Imenso'), 4);
    assert.equal(tamanhoEmQuadrados('Gargantuesco'), 4);
    assert.equal(tamanhoEmQuadrados('Colossal'), 6);
    // fallback seguro
    assert.equal(tamanhoEmQuadrados(null), 1);
    assert.equal(tamanhoEmQuadrados('Desconhecido'), 1);
  });

  await t.test('calcula dimensões adequadas do tabuleiro para 9m e 30m', () => {
    const dim9m = calcularDimensoesGrid(9, [
      { lado: 'A', tamanho: 'Médio' },
      { lado: 'B', tamanho: 'Grande' },
    ]);
    assert.ok(dim9m.cols >= 16, 'cols deve ser >= 16');
    assert.ok(dim9m.rows >= 10, 'rows deve ser >= 10');
    assert.ok(dim9m.margemA >= 2, 'margemA deve ser >= 2');

    const dim30m = calcularDimensoesGrid(30, [
      { lado: 'A', tamanho: 'Enorme' },
      { lado: 'B', tamanho: 'Colossal' },
    ]);
    assert.ok(dim30m.cols > dim9m.cols, 'tabuleiro de 30m deve ter mais colunas');
    assert.ok(dim30m.margemA >= 6, 'margem deve comportar o Colossal');
  });

  await t.test('calcula distância em quadrados considerando tamanhos 3.5', () => {
    // Duas criaturas médias adjacentes (col 2 e col 3 = 1 quadrado / 5 pés de distância)
    const p1 = { col: 2, row: 4, span: 1 };
    const p2 = { col: 3, row: 4, span: 1 };
    assert.equal(distanciaEmQuadrados(p1, p2), 1, 'adjacentes estão a 1 quadrado de distância (5 pés, alcance corpo a corpo)');

    // Uma criatura grande (2x2) ocupando col 2..3 e uma média em col 5 (distância = 2 quadrados)
    const grande = { col: 2, row: 4, span: 2 }; // ocupa col 2..3, row 4..5
    const media = { col: 5, row: 4, span: 1 };  // col 5, row 4
    // Distância x: 5 - 3 = 2 quadrados (10 pés)
    assert.equal(distanciaEmQuadrados(grande, media), 2);
  });

  await t.test('projeta posições de combate com raias e sem sobreposição Y', () => {
    const mockBattle = {
      distancia: 9,
      combatentes: [
        { uid: 'A1', nome: 'Guerreiro', lado: 'A', tamanho: 'Médio', pos: 0, pv: 20, pvMax: 20, estado: 'ativo' },
        { uid: 'A2', nome: 'Mago', lado: 'A', tamanho: 'Médio', pos: 0, pv: 12, pvMax: 12, estado: 'ativo' },
        { uid: 'B1', nome: 'Ogro', lado: 'B', tamanho: 'Grande', pos: 9, pv: 29, pvMax: 29, estado: 'ativo' },
      ],
    };

    const projecao = projetarPosicoesGrid(mockBattle);
    assert.equal(projecao.lista.length, 3);

    const a1 = projecao.posicoes.get('A1');
    const a2 = projecao.posicoes.get('A2');
    const b1 = projecao.posicoes.get('B1');

    assert.equal(a1.span, 1);
    assert.equal(a2.span, 1);
    assert.equal(b1.span, 2, 'Ogro é Grande e deve ter span 2 (2x2)');

    // A1 e A2 não devem ter a mesma linha row (raias diferentes)
    assert.notEqual(a1.row, a2.row, 'A1 e A2 devem estar em linhas separadas para não sobrepor');

    // B1 deve estar à direita de A1
    assert.ok(b1.col > a1.col, 'B1 (distância 9m) deve estar em coluna superior a A1');
  });
});

test('--- Cones de Ataque e Sopros (D&D 3.5) ---', async t => {
  await t.test('detecta temas visuais corretamente', () => {
    assert.equal(detectarTemaCone('fogo', 'Sopro de Dragão'), 'fogo');
    assert.equal(detectarTemaCone('frio', 'Cone de Frio'), 'frio');
    assert.equal(detectarTemaCone('acido', 'Sopro Ácido'), 'acido');
    assert.equal(detectarTemaCone('gas', 'Gás do Golem'), 'gas');
    assert.equal(detectarTemaCone(null, 'Relâmpago'), 'eletricidade');
  });

  await t.test('calcula geometria do cone de 9m e identifica alvos atingidos', () => {
    const dragao = { uid: 'B1', nome: 'Dragão Vermelho', lado: 'B', col: 12, row: 4, span: 3 };
    const guerreiro = { uid: 'A1', nome: 'Guerreiro', lado: 'A', col: 8, row: 5, span: 1 };
    const arqueiroLonge = { uid: 'A2', nome: 'Arqueiro', lado: 'A', col: 2, row: 1, span: 1 };

    const cone = calcularCone({
      atacantePos: dragao,
      alvoPos: guerreiro,
      alcanceMetros: 9, // 6 quadrados
      gridDims: { cols: 20, rows: 12 },
      combatentes: [dragao, guerreiro, arqueiroLonge],
      tipoEnergia: 'fogo',
      nomeAcao: 'Sopro',
    });

    assert.equal(cone.tipoTema, 'fogo');
    assert.ok(cone.celulasAfetadas.length > 0, 'deve conter células afetadas');
    assert.ok(cone.combatentesAtingidos.some(c => c.uid === 'A1'), 'Guerreiro deve estar na área do sopro');
    assert.ok(!cone.combatentesAtingidos.some(c => c.uid === 'A2'), 'Arqueiro fora de alcance não deve ser atingido');
    assert.ok(!cone.combatentesAtingidos.some(c => c.uid === 'B1'), 'O próprio dragão não é atingido pelo seu cone');
  });
});

test('--- Tokens e Miniaturas ---', async t => {
  await t.test('gera sigla legível para o token', () => {
    assert.equal(siglaCombatente('Dragão Vermelho Adulto'), 'DV');
    assert.equal(siglaCombatente('Troll'), 'TR');
    assert.equal(siglaCombatente('Ogro'), 'OG');
  });

  await t.test('gera SVG procedural quando não há imagem estática', () => {
    const svgDataUri = gerarTokenProceduralSvg({ nome: 'Monstro Desconhecido', lado: 'B', tamanho: 'Grande' });
    assert.ok(svgDataUri.startsWith('data:image/svg+xml'), 'deve ser um Data URI SVG');
    assert.ok(decodeURIComponent(svgDataUri).includes('MD'), 'deve conter a sigla');
  });

  await t.test('retorna imagem cadastrada do catálogo quando presente', () => {
    const mockCatalogo = {
      tokens: {
        'troll': { arquivo: 'troll.png' },
      },
    };
    const url = obterUrlToken({ ref: 'troll' }, mockCatalogo);
    assert.equal(url, 'assets/tokens/troll.png');
  });
});

