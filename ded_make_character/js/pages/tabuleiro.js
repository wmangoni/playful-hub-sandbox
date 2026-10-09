/**
 * Componente do Tabuleiro Tático (D&D 3.5) — TASK_011.
 * 
 * Renderiza o grid de combate com as miniaturas posicionadas (tamanhos 1x1 a 6x6),
 * status de PV, auras de turno e camada de efeitos visuais para cones de sopro e magias.
 */

import { html, render } from '../core/dom.js';
import { icon } from '../ui/icons.js';
import { projetarPosicoesGrid } from '../rules/tabuleiro35.js';
import { calcularCone } from '../rules/cones35.js';
import { obterUrlToken } from '../rules/tokens.js';

const TAMANHO_CELULA_PADRAO = 48; // pixels por quadrado (1,5 m)

/**
 * Analisa os eventos recentes para detectar se houve ativação de cone de sopro ou magia.
 */
function detectarAcaoCone(eventos, b) {
  if (!eventos || !eventos.length) return null;

  for (const ev of eventos) {
    const texto = (ev.texto || '').toLowerCase();
    const ehSopro = texto.includes('sopro') || (ev.tipo === 'especial' && /fogo|frio|acido|gas/.test(texto));
    const ehCone = texto.includes('cone');

    if (ehSopro || ehCone) {
      const atacante = b.get(ev.ator);
      if (!atacante) continue;

      // Extrai alcance em metros do texto (ex.: "cone de 15 m", "cone de 9 m")
      const m = /(\d+(?:,\d+)?)\s*m\b/.exec(texto);
      const alcanceMetros = m ? Number(m[1].replace(',', '.')) : 9;

      let tipoEnergia = 'fogo';
      if (/frio|glacial/.test(texto)) tipoEnergia = 'frio';
      else if (/acido/.test(texto)) tipoEnergia = 'acido';
      else if (/gas|sono|paralisia/.test(texto)) tipoEnergia = 'gas';
      else if (/eletrico|relampago/.test(texto)) tipoEnergia = 'eletricidade';

      return {
        atorUid: ev.ator,
        alcanceMetros,
        tipoEnergia,
        nomeAcao: ehSopro ? 'Sopro' : 'Cone de Magia',
      };
    }
  }
  return null;
}

export function criarComponenteTabuleiro({ container, onAbrirCard, catalogoTokens = null }) {
  let coneAtivo = null;
  let timerCone = null;

  function desenhar(b, eventosRecentes = []) {
    if (!b || !container) return;

    // Detecta disparo de sopro/cone nos eventos desta ação
    const acaoCone = detectarAcaoCone(eventosRecentes, b);
    const { dimensoes, posicoes, lista } = projetarPosicoesGrid(b);
    const { cols, rows } = dimensoes;
    const cellSize = TAMANHO_CELULA_PADRAO;

    const gridWidth = cols * cellSize;
    const gridHeight = rows * cellSize;

    if (acaoCone) {
      const atacantePos = posicoes.get(acaoCone.atorUid);
      if (atacantePos) {
        // Encontra o inimigo mais próximo como alvo referencial
        const inimigos = lista.filter(c => c.lado !== atacantePos.lado && c.estado !== 'morto');
        const alvoPos = inimigos[0] || null;

        coneAtivo = calcularCone({
          atacantePos,
          alvoPos,
          alcanceMetros: acaoCone.alcanceMetros,
          gridDims: { cols, rows },
          combatentes: lista,
          tipoEnergia: acaoCone.tipoEnergia,
          nomeAcao: acaoCone.nomeAcao,
        });

        if (timerCone) clearTimeout(timerCone);
        timerCone = setTimeout(() => {
          coneAtivo = null;
          desenhar(b, []); // redesenha sem o overlay do cone após a animação
        }, 3000);
      }
    }

    const turnoAtualUid = b.ordem ? b.ordem[b.turno] : null;

    render(container, html`
      <section class="card arena-tabuleiro-card" aria-label="Tabuleiro Tático de Combate">
        <header class="arena-tabuleiro__header">
          <h3 class="arena-tabuleiro__title">
            ${icon('grid')}
            <span>Tabuleiro Tático · D&amp;D 3.5</span>
          </h3>
          <div class="arena-tabuleiro__legend">
            <span class="arena-tabuleiro__legend-item">
              <span class="arena-tabuleiro__dot arena-tabuleiro__dot--a"></span> Lado A
            </span>
            <span class="arena-tabuleiro__legend-item">
              <span class="arena-tabuleiro__dot arena-tabuleiro__dot--b"></span> Lado B
            </span>
            <span>· 1 quadrado = 1,5 m (5 pés)</span>
          </div>
        </header>

        <div class="arena-tabuleiro__scroll" tabindex="0" aria-label="Grade de batalha rolável">
          <div 
            class="arena-tabuleiro__grid" 
            style="width: ${gridWidth}px; height: ${gridHeight}px; --cell-size: ${cellSize}px;"
          >
            <!-- Células Atingidas por Cones (AoE Highlight) -->
            ${coneAtivo?.celulasAfetadas ? coneAtivo.celulasAfetadas.map(cell => html`
              <div 
                class="arena-tabuleiro__cell-highlight arena-tabuleiro__cell-highlight--${coneAtivo.tipoTema}"
                style="left: ${cell.col * cellSize}px; top: ${cell.row * cellSize}px; width: ${cellSize}px; height: ${cellSize}px;"
                aria-hidden="true"
              ></div>
            `) : ''}

            <!-- Miniaturas (Tokens) das Criaturas -->
            ${lista.map(c => {
              const pvPct = Math.max(0, Math.min(100, Math.round((c.pv / c.pvMax) * 100)));
              const pvClasse = pvPct > 50 ? 'high' : pvPct > 25 ? 'mid' : 'low';
              const ehTurno = c.uid === turnoAtualUid && !b.fim;
              const tokenUrl = obterUrlToken(c, catalogoTokens);

              const left = c.col * cellSize;
              const top = c.row * cellSize;
              const size = c.span * cellSize;

              return html`
                <button
                  type="button"
                  class="arena-token arena-token--${c.lado.toLowerCase()} ${ehTurno ? 'is-active' : ''} is-${c.estado}"
                  style="left: ${left}px; top: ${top}px; width: ${size}px; height: ${size}px;"
                  data-token="${c.uid}"
                  data-ref="${c.ref}"
                  aria-label="Ver ficha de ${c.nome} (PV ${c.pv}/${c.pvMax})"
                  title="${c.nome} (Tamanho: ${c.tamanho}, PV: ${c.pv}/${c.pvMax})"
                >
                  <span class="arena-token__label">${c.nome}</span>
                  <div class="arena-token__body">
                    <img 
                      class="arena-token__img" 
                      src="${tokenUrl}" 
                      alt="${c.nome}" 
                      loading="lazy"
                    />
                  </div>
                  <div class="arena-token__pv-bar" aria-hidden="true">
                    <div 
                      class="arena-token__pv-fill arena-token__pv-fill--${pvClasse}" 
                      style="width: ${pvPct}%;"
                    ></div>
                  </div>
                </button>
              `;
            })}

            <!-- Overlay de VFX para Cones (Vetor SVG) -->
            ${coneAtivo ? html`
              <svg 
                class="arena-tabuleiro__vfx-layer" 
                viewBox="0 0 ${gridWidth} ${gridHeight}" 
                preserveAspectRatio="none"
              >
                <defs>
                  <radialGradient id="grad-cone-${coneAtivo.tipoTema}" cx="20%" cy="50%" r="80%">
                    <stop offset="0%" stop-color="${coneAtivo.tema.corCentro}" />
                    <stop offset="70%" stop-color="${coneAtivo.tema.corPrincipal}" />
                    <stop offset="100%" stop-color="transparent" />
                  </radialGradient>
                </defs>
                <polygon 
                  class="arena-cone-polygon"
                  points="${coneAtivo.poligono.map(p => `${p.x * cellSize},${p.y * cellSize}`).join(' ')}"
                  fill="url(#grad-cone-${coneAtivo.tipoTema})"
                  stroke="${coneAtivo.tema.corBorda}"
                  stroke-width="2"
                  filter="drop-shadow(0 0 10px ${coneAtivo.tema.glow})"
                />
              </svg>
            ` : ''}
          </div>
        </div>
      </section>
    `);

    // Eventos de clique nas miniaturas para abrir o card
    const botoes = container.querySelectorAll('[data-token]');
    botoes.forEach(btn => {
      btn.addEventListener('click', () => {
        const ref = btn.dataset.ref;
        if (ref && onAbrirCard) {
          onAbrirCard(ref);
        }
      });
    });
  }

  function destruir() {
    if (timerCone) clearTimeout(timerCone);
    render(container, '');
  }

  return { desenhar, destruir };
}
