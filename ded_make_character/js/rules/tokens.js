/**
 * Gerenciador de Miniaturas e Tokens (TASK_011)
 * 
 * Fornece a imagem real gerada pelo Nano Banana se existir, ou um token procedural SVG de alta qualidade
 * com cores do lado (Lado A = dourado/azul heróico, Lado B = rubi/ferro sombrio) e tipografia medieval.
 */

export const CAMINHO_TOKENS = 'assets/tokens/';

/** Cores temáticas por lado para tokens e auras */
export const CORES_LADO = {
  A: {
    primaria: '#d4af37',   // Ouro medieval
    secundaria: '#1a365d', // Azul profundo
    borda: '#f6e05e',
    fundo: '#0f172a',
    texto: '#fef08a',
  },
  B: {
    primaria: '#e53e3e',   // Escarlate / Rubi
    secundaria: '#742a2a', // Carmesim escuro
    borda: '#feb2b2',
    fundo: '#1a0505',
    texto: '#fed7d7',
  },
};

/** Abreviação legível em 2 letras para o centro do token */
export function siglaCombatente(nome) {
  if (!nome) return '??';
  const partes = String(nome).trim().split(/\s+/);
  if (partes.length >= 2) {
    return (partes[0][0] + partes[1][0]).toUpperCase();
  }
  return partes[0].slice(0, 2).toUpperCase();
}

/**
 * Gera um Data URI SVG vetorial com estilo de token de mesa de RPG.
 */
export function gerarTokenProceduralSvg(c) {
  const lado = c?.lado === 'B' ? 'B' : 'A';
  const cores = CORES_LADO[lado];
  const sigla = siglaCombatente(c?.nome);
  const tamanho = c?.tamanho || 'Médio';
  const subtitulo = tamanho[0]; // M, G, E, I, C

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <defs>
      <radialGradient id="grad-${lado}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${cores.secundaria}" />
        <stop offset="85%" stop-color="${cores.fundo}" />
        <stop offset="100%" stop-color="#000000" />
      </radialGradient>
      <linearGradient id="ring-${lado}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${cores.borda}" />
        <stop offset="50%" stop-color="${cores.primaria}" />
        <stop offset="100%" stop-color="#2d3748" />
      </linearGradient>
    </defs>
    <!-- Fundo do token -->
    <circle cx="50" cy="50" r="46" fill="url(#grad-${lado})" />
    <!-- Borda externa metálica ornamentada -->
    <circle cx="50" cy="50" r="46" fill="none" stroke="url(#ring-${lado})" stroke-width="5" />
    <circle cx="50" cy="50" r="42" fill="none" stroke="${cores.primaria}" stroke-width="1.5" stroke-dasharray="4 2" opacity="0.7" />
    <circle cx="50" cy="50" r="39" fill="none" stroke="${cores.borda}" stroke-width="0.8" opacity="0.4" />
    <!-- Runas / Marcadores cardeais -->
    <circle cx="50" cy="6" r="2" fill="${cores.borda}" />
    <circle cx="50" cy="94" r="2" fill="${cores.borda}" />
    <circle cx="6" cy="50" r="2" fill="${cores.borda}" />
    <circle cx="94" cy="50" r="2" fill="${cores.borda}" />
    <!-- Texto central do Combatente -->
    <text x="50" y="55" font-family="'Cinzel', Georgia, serif" font-size="28" font-weight="bold" fill="${cores.texto}" text-anchor="middle" dominant-baseline="central" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.8))">${sigla}</text>
    <!-- Indicador de tamanho 3.5 no rodapé -->
    <rect x="38" y="74" width="24" height="13" rx="3" fill="#000000" opacity="0.8" />
    <rect x="38" y="74" width="24" height="13" rx="3" fill="none" stroke="${cores.primaria}" stroke-width="1" />
    <text x="50" y="83" font-family="sans-serif" font-size="9" font-weight="bold" fill="${cores.borda}" text-anchor="middle" dominant-baseline="central">${subtitulo}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const MAPA_TOKENS_PADRAO = {
  'carnical': 'carnical.png',
  'ogro': 'ogro.png',
  'cubo-gelatinoso': 'cubo-gelatinoso.png',
  'urso-coruja': 'urso-coruja.png',
  'troll': 'troll.png',
  'arbusto-errante': 'arbusto-errante.png',
  'medusa': 'medusa.png',
  'behir': 'behir.png',
  'gigante-do-gelo': 'gigante-do-gelo.png',
  'naga-guardia': 'naga-guardia.png',
  'elemental-do-fogo-anciao': 'elemental-do-fogo-anciao.png',
  'verme-purpura': 'verme-purpura.png',
  'golem-de-ferro': 'golem-de-ferro.png',
  'dragao-vermelho-adulto': 'dragao-vermelho-adulto.png',
  'glabrezu': 'glabrezu.png',
  'lorde-das-profundezas': 'lorde-das-profundezas.png',
  'dragao-azul-antigo': 'dragao-azul-antigo.svg',
  'balor': 'balor.svg',
  'dragao-de-prata-antigo': 'dragao-de-prata-antigo.png',
  'tarrasque': 'tarrasque.svg',
  'paladino-de-arton': 'paladino-de-arton.png',
  'guerreiro': 'guerreiro.png',
  'mago': 'mago.png',
};

export const MAPA_CLASSES_PADRAO = {
  'guerreiro': 'guerreiro.png',
  'paladino': 'paladino-de-arton.png',
  'mago': 'mago.png',
  'feiticeiro': 'mago.png',
  'clerigo': 'paladino-de-arton.png',
};

/**
 * Retorna o caminho da imagem do token ou o SVG procedural correspondente.
 */
export function obterUrlToken(c, catalogoTokens = null) {
  if (!c) return gerarTokenProceduralSvg(null);

  const id = c.ref || c.id || '';
  const tokenCadastrado = catalogoTokens?.tokens?.[id];

  if (tokenCadastrado?.arquivo) {
    return `${CAMINHO_TOKENS}${tokenCadastrado.arquivo}`;
  }

  // Se nenhum catálogo dinâmico foi passado, utiliza o mapa padrão do sistema
  if (!catalogoTokens && MAPA_TOKENS_PADRAO[id]) {
    return `${CAMINHO_TOKENS}${MAPA_TOKENS_PADRAO[id]}`;
  }

  // Verifica classe do personagem
  if (c.sheet?.classKey && catalogoTokens?.classes?.[c.sheet.classKey]) {
    return `${CAMINHO_TOKENS}${catalogoTokens.classes[c.sheet.classKey]}`;
  }
  if (!catalogoTokens && c.sheet?.classKey && MAPA_CLASSES_PADRAO[c.sheet.classKey]) {
    return `${CAMINHO_TOKENS}${MAPA_CLASSES_PADRAO[c.sheet.classKey]}`;
  }

  return gerarTokenProceduralSvg(c);
}
