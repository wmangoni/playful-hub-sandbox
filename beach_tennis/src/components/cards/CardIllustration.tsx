import React, { useState } from 'react';
import type { CardDefinition, CardInstance, CardType, CardColor } from '../../engine/types';

export interface CardIllustrationProps {
  card?: CardDefinition | CardInstance;
  cardType?: CardType;
  color?: CardColor;
  isAttack?: boolean;
  isWildcard?: boolean;
  serveNumber?: number;
  className?: string;
  forceVector?: boolean;
}

/**
 * Procedural SVG Beach Tennis Illustration System
 * Implements 100% clean Beach Tennis artwork for all 19 cards.
 * Zero RPG stats, mana costs, defense/attack values, stars or frames.
 */
export const CardIllustration: React.FC<CardIllustrationProps> = ({
  card,
  cardType,
  color,
  isAttack,
  isWildcard,
  serveNumber,
  className = '',
  forceVector = true, // Default to procedural SVG for guaranteed R5 compliance
}) => {
  const [imgError, setImgError] = useState(false);

  // Extract properties from card object or direct props
  const def: Partial<CardDefinition> = card
    ? 'definition' in card
      ? card.definition
      : card
    : {};

  const effectiveType: CardType = cardType || def.type || 'SAQUE_1';
  const effectiveColor: CardColor = color || def.color || 'GREEN';
  const effectiveIsAttack: boolean = isAttack !== undefined ? isAttack : Boolean(def.isAttack);
  const effectiveIsWildcard: boolean = isWildcard !== undefined ? isWildcard : Boolean(def.isWildcard);
  const effectiveServeNumber: number | undefined = serveNumber !== undefined ? serveNumber : def.serveNumber;
  const illustrationPath: string | undefined = def.illustrationPath;

  // If forceVector is false and an illustration path is specified and not errored
  if (!forceVector && !imgError && illustrationPath) {
    const baseUrl = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL || '/';
    const resolvedSrc =
      illustrationPath.startsWith('/') && baseUrl !== '/'
        ? `${baseUrl.replace(/\/$/, '')}${illustrationPath}`
        : illustrationPath;
    return (
      <img
        src={resolvedSrc}
        alt={def.name || effectiveType}
        className={`w-full h-full object-cover rounded ${className}`}
        loading="lazy"
        onError={() => setImgError(true)}
      />
    );
  }

  // Pure Procedural Vector SVG Rendering (100% R5 Compliant)
  return (
    <ProceduralCardSVG
      type={effectiveType}
      color={effectiveColor}
      isAttack={effectiveIsAttack}
      isWildcard={effectiveIsWildcard}
      serveNumber={effectiveServeNumber}
      className={className}
    />
  );
};

export default CardIllustration;

// ============================================================================
// Procedural SVG Renderer for Beach Tennis
// ============================================================================

interface ProceduralSVGProps {
  type: CardType;
  color: CardColor;
  isAttack: boolean;
  isWildcard: boolean;
  serveNumber?: number;
  className?: string;
}

export const ProceduralCardSVG: React.FC<ProceduralSVGProps> = ({
  type,
  color,
  isAttack,
  isWildcard,
  serveNumber,
  className = '',
}) => {
  // Lighting and sky gradient determined by card category
  const skyTheme = isWildcard
    ? { from: '#d97706', mid: '#f59e0b', to: '#fef08a', sun: '#ffffff', sand: '#f59e0b' }
    : color === 'ORANGE'
    ? { from: '#c2410c', mid: '#ea580c', to: '#fde047', sun: '#ffffff', sand: '#d97706' }
    : color === 'BLUE'
    ? { from: '#0369a1', mid: '#0ea5e9', to: '#bae6fd', sun: '#ffffff', sand: '#e2b170' }
    : isAttack
    ? { from: '#15803d', mid: '#059669', to: '#fef08a', sun: '#fef08a', sand: '#c28e5c' }
    : { from: '#047857', mid: '#10b981', to: '#a7f3d0', sun: '#ffffff', sand: '#d4a373' };

  const idSuffix = `${type}_${Math.random().toString(36).substring(2, 7)}`;
  const silhouette = '#0f172a';

  return (
    <svg
      viewBox="0 0 300 400"
      className={`w-full h-full select-none ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Sky Gradient */}
        <linearGradient id={`sky-${idSuffix}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={skyTheme.from} />
          <stop offset="50%" stopColor={skyTheme.mid} />
          <stop offset="100%" stopColor={skyTheme.to} />
        </linearGradient>

        {/* Sand Gradient */}
        <linearGradient id={`sand-${idSuffix}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="35%" stopColor={skyTheme.sand} />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>

        {/* Soft Glow */}
        <filter id={`glow-${idSuffix}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        {/* Intense Ball Aura */}
        <filter id={`ball-glow-${idSuffix}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* 1. Tropical Sky */}
      <rect width="300" height="400" fill={`url(#sky-${idSuffix})`} />

      {/* 2. Radiant Sun */}
      <circle
        cx="235"
        cy="65"
        r="28"
        fill={skyTheme.sun}
        opacity="0.95"
        filter={`url(#glow-${idSuffix})`}
      />
      <circle
        cx="235"
        cy="65"
        r="44"
        fill="#fef08a"
        opacity="0.25"
        filter={`url(#glow-${idSuffix})`}
      />

      {/* 3. Ocean Horizon & Waves */}
      <path
        d="M0,190 Q75,185 150,190 T300,190 L300,225 L0,225 Z"
        fill="#0284c7"
        opacity="0.65"
      />
      <path
        d="M0,198 Q75,194 150,198 T300,198"
        stroke="#ffffff"
        strokeWidth="1.5"
        fill="none"
        opacity="0.6"
      />

      {/* 4. Golden Sand Court */}
      <path
        d="M0,215 Q80,210 180,220 T300,218 L300,400 L0,400 Z"
        fill={`url(#sand-${idSuffix})`}
      />
      <path
        d="M0,225 Q100,230 200,224 T300,227"
        stroke="#f59e0b"
        strokeWidth="1"
        fill="none"
        opacity="0.5"
      />

      {/* 5. Beach Tennis Net (Height 1.70m) */}
      <line x1="12" y1="195" x2="12" y2="280" stroke="#334155" strokeWidth="3.5" />
      <line x1="288" y1="195" x2="288" y2="280" stroke="#334155" strokeWidth="3.5" />
      {/* Net fabric */}
      <path d="M12,202 L288,202 L288,252 L12,252 Z" fill="#ffffff" opacity="0.18" />
      <line x1="12" y1="202" x2="288" y2="202" stroke="#ffffff" strokeWidth="3" />
      {/* Mesh lines */}
      <path
        d="M12,214 H288 M12,226 H288 M12,238 H288"
        stroke="#ffffff"
        strokeWidth="0.5"
        opacity="0.4"
      />
      <path
        d="M40,202 V252 M85,202 V252 M130,202 V252 M175,202 V252 M220,202 V252 M265,202 V252"
        stroke="#ffffff"
        strokeWidth="0.5"
        opacity="0.4"
      />

      {/* 6. Dynamic Card-Specific Athletic Movement & Ball Trajectory */}
      {renderShotAction(type, silhouette, isAttack, isWildcard, serveNumber, idSuffix)}
    </svg>
  );
};

// ============================================================================
// Specialized Action Rendering for All 19 Cards
// ============================================================================

function renderShotAction(
  type: CardType,
  silhouette: string,
  _isAttack: boolean,
  isWildcard: boolean,
  serveNumber: number | undefined,
  idSuffix: string
): React.ReactNode {
  // --------------------------------------------------------------------------
  // WILDCARDS: GOLPE_UBT_CORINGA & DEF_UBT_CORINGA
  // --------------------------------------------------------------------------
  if (isWildcard || type === 'GOLPE_UBT_CORINGA' || type === 'DEF_UBT_CORINGA') {
    const isDefCoringa = type === 'DEF_UBT_CORINGA';
    return (
      <g>
        {/* Radiant Solar Background Aura */}
        <circle cx="150" cy="175" r="54" fill="#f59e0b" opacity="0.25" filter={`url(#glow-${idSuffix})`} />
        <circle cx="150" cy="175" r="42" fill="#eab308" stroke="#ffffff" strokeWidth="3.5" />
        <circle cx="150" cy="175" r="32" fill="#fef08a" />

        {/* Multi-directional Dynamic Orbit Rings */}
        <ellipse
          cx="150"
          cy="175"
          rx="72"
          ry="28"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2.5"
          strokeDasharray="6 4"
          transform="rotate(-25 150 175)"
        />
        <ellipse
          cx="150"
          cy="175"
          rx="72"
          ry="28"
          fill="none"
          stroke={isDefCoringa ? '#0ea5e9' : '#10b981'}
          strokeWidth="2.5"
          strokeDasharray="6 4"
          transform="rotate(25 150 175)"
        />

        {/* Mascot / Emblem */}
        <circle cx="150" cy="175" r="18" fill="#ccff00" stroke="#f97316" strokeWidth="2.5" />
        {/* Sunglasses */}
        <path d="M138,172 Q144,170 150,172 Q156,170 162,172 L160,178 Q155,182 150,178 Q145,182 140,178 Z" fill="#0f172a" />
        <line x1="135" y1="172" x2="165" y2="172" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
        {/* Smile */}
        <path d="M144,183 Q150,187 156,183" stroke="#f97316" strokeWidth="2" fill="none" strokeLinecap="round" />

        {/* Paddle held by mascot */}
        <ellipse cx="182" cy="160" rx="9" ry="14" transform="rotate(35 182 160)" fill="#f97316" stroke="#ffffff" strokeWidth="2" />
        <line x1="174" y1="172" x2="164" y2="182" stroke="#0f172a" strokeWidth="3.5" strokeLinecap="round" />

        {/* Triple Tactical Trajectory Fan */}
        <path d="M150,157 Q140,95 70,110" stroke="#facc15" strokeWidth="3" strokeDasharray="5 3" fill="none" />
        <path d="M150,157 Q150,85 150,70" stroke="#facc15" strokeWidth="3" strokeDasharray="5 3" fill="none" />
        <path d="M150,157 Q160,95 230,110" stroke="#facc15" strokeWidth="3" strokeDasharray="5 3" fill="none" />

        {/* Sparkling Stars */}
        <circle cx="70" cy="110" r="5" fill="#ffffff" filter={`url(#glow-${idSuffix})`} />
        <circle cx="150" cy="70" r="5" fill="#ffffff" filter={`url(#glow-${idSuffix})`} />
        <circle cx="230" cy="110" r="5" fill="#ffffff" filter={`url(#glow-${idSuffix})`} />
      </g>
    );
  }

  // --------------------------------------------------------------------------
  // ORANGE SERVE CARDS (SAQUE_1, SAQUE_2, SAQUE_3)
  // --------------------------------------------------------------------------
  if (type.startsWith('SAQUE_')) {
    const zone = serveNumber || (type === 'SAQUE_1' ? 1 : type === 'SAQUE_2' ? 2 : 3);
    const targetX = zone === 1 ? 65 : zone === 2 ? 150 : 235;

    return (
      <g>
        {/* Baseline Server Athlete */}
        <circle cx="150" cy="245" r="9" fill={silhouette} />
        {/* Body and legs */}
        <path
          d="M148,254 L152,285 L140,325 M152,285 L162,325"
          stroke={silhouette}
          strokeWidth="5.5"
          strokeLinecap="round"
          fill="none"
        />
        {/* Overhead serving arm */}
        <path
          d="M150,260 L138,238 L134,222"
          stroke={silhouette}
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        {/* Paddle struck at top */}
        <ellipse
          cx="132"
          cy="212"
          rx="9" ry="14"
          transform="rotate(-15 132 212)"
          stroke="#f97316"
          strokeWidth="3"
          fill={silhouette}
        />

        {/* Directed Trajectory Arc to Selected Zone */}
        <path
          d={`M132,208 Q140,125 ${targetX},170`}
          stroke="#facc15"
          strokeWidth="3.5"
          strokeDasharray="6 3"
          fill="none"
        />

        {/* Target Zone Marker */}
        <ellipse cx={targetX} cy="172" rx="22" ry="9" fill="#f97316" opacity="0.4" />
        <ellipse cx={targetX} cy="172" rx="14" ry="5" fill="#ffffff" opacity="0.6" />
        <text
          x={targetX}
          y={176}
          fontSize="12"
          fontWeight="900"
          fill="#ffffff"
          textAnchor="middle"
        >
          Z{zone}
        </text>

        {/* Fluorescent Ball in Flight */}
        <circle cx="132" cy="208" r="7.5" fill="#ccff00" stroke="#f97316" strokeWidth="2" />
      </g>
    );
  }

  // --------------------------------------------------------------------------
  // BLUE DEFENSE CARDS (DEF_CURTA, DEF_NEUTRA, DEF_LOB)
  // --------------------------------------------------------------------------
  if (type === 'DEF_CURTA') {
    return (
      <g>
        {/* Low crouched defender cushioning at the net */}
        <circle cx="110" cy="255" r="9" fill={silhouette} />
        <path
          d="M108,264 L102,290 L85,320 M102,290 L120,320"
          stroke={silhouette}
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M110,270 L135,260 L152,246"
          stroke={silhouette}
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        <ellipse cx="156" cy="242" rx="9" ry="14" transform="rotate(30 156 242)" fill={silhouette} stroke="#0284c7" strokeWidth="2.5" />

        {/* Soft cushioned drop arc barely clearing the net */}
        <path
          d="M160,238 Q180,188 220,230"
          stroke="#38bdf8"
          strokeWidth="3"
          strokeDasharray="4 2"
          fill="none"
        />
        <circle cx="160" cy="238" r="7" fill="#ccff00" stroke="#0284c7" strokeWidth="2" />
        <ellipse cx="220" cy="232" rx="10" ry="4" fill="#38bdf8" opacity="0.5" />
      </g>
    );
  }

  if (type === 'DEF_NEUTRA') {
    return (
      <g>
        {/* Midcourt stable block stance */}
        <circle cx="135" cy="240" r="9" fill={silhouette} />
        <path
          d="M133,249 L132,280 L115,315 M132,280 L150,315"
          stroke={silhouette}
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M135,255 L160,245 L175,230"
          stroke={silhouette}
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        <ellipse cx="180" cy="225" rx="10" ry="14" fill={silhouette} stroke="#0284c7" strokeWidth="2.5" />

        {/* Firm chest-high trajectory returning deep to midcourt */}
        <path
          d="M185,225 Q210,160 255,175"
          stroke="#38bdf8"
          strokeWidth="3.5"
          strokeDasharray="5 3"
          fill="none"
        />
        <circle cx="185" cy="225" r="7" fill="#ccff00" stroke="#0284c7" strokeWidth="2" />
      </g>
    );
  }

  if (type === 'DEF_LOB') {
    return (
      <g>
        {/* Horizontal diving dig in sand */}
        <circle cx="215" cy="280" r="9" fill={silhouette} />
        <path
          d="M210,283 L150,296 L118,300"
          stroke={silhouette}
          strokeWidth="7"
          strokeLinecap="round"
          fill="none"
        />
        <path d="M150,296 L96,302" stroke={silhouette} strokeWidth="5" strokeLinecap="round" fill="none" />
        <ellipse cx="86" cy="302" rx="9" ry="14" transform="rotate(-30 86 302)" fill={silhouette} stroke="#0284c7" strokeWidth="2.5" />

        {/* Giant high parabolic balloon lob arc into deep sky */}
        <path
          d="M86,295 Q130,45 240,120"
          stroke="#facc15"
          strokeWidth="4"
          strokeDasharray="6 3"
          fill="none"
        />
        <circle cx="86" cy="295" r="7.5" fill="#ccff00" stroke="#0284c7" strokeWidth="2" />
        {/* Sand spray particles */}
        <circle cx="140" cy="305" r="2.5" fill="#fde047" />
        <circle cx="160" cy="308" r="3" fill="#fde047" />
        <circle cx="120" cy="302" r="2" fill="#fde047" />
      </g>
    );
  }

  // --------------------------------------------------------------------------
  // BANDEJAS (BANDEJA_CURTA, BANDEJA_LOB_CHUTADO, BANDEJA_LOB)
  // --------------------------------------------------------------------------
  if (type === 'BANDEJA_CURTA') {
    return (
      <g>
        {/* Overhead gentle slice technique */}
        <circle cx="125" cy="180" r="9.5" fill={silhouette} />
        <path
          d="M123,190 L120,230 L105,275 M120,230 L138,275"
          stroke={silhouette}
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M125,200 L145,175 L158,155"
          stroke={silhouette}
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        <ellipse cx="164" cy="148" rx="10" ry="14" transform="rotate(25 164 148)" fill={silhouette} stroke="#10b981" strokeWidth="2.5" />

        {/* Gentle dropping curve right into short court */}
        <path
          d="M168,144 Q205,115 245,190"
          stroke="#facc15"
          strokeWidth="3"
          strokeDasharray="5 3"
          fill="none"
        />
        <circle cx="168" cy="144" r="7" fill="#ccff00" stroke="#10b981" strokeWidth="2" />
      </g>
    );
  }

  if (type === 'BANDEJA_LOB_CHUTADO') {
    return (
      <g>
        {/* Aggressive fast overhead slice */}
        <circle cx="120" cy="180" r="9.5" fill={silhouette} />
        <path
          d="M118,190 L115,230 L98,275 M115,230 L135,275"
          stroke={silhouette}
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M120,200 L146,170 L160,150"
          stroke={silhouette}
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        <ellipse cx="166" cy="142" rx="10" ry="14" transform="rotate(40 166 142)" fill={silhouette} stroke="#10b981" strokeWidth="2.5" />

        {/* Fast skimming trajectory bullet flat over net */}
        <path
          d="M170,140 Q215,145 270,165"
          stroke="#facc15"
          strokeWidth="3.5"
          strokeDasharray="6 2"
          fill="none"
        />
        <circle cx="170" cy="140" r="7" fill="#ccff00" stroke="#f97316" strokeWidth="2" />
      </g>
    );
  }

  if (type === 'BANDEJA_LOB') {
    return (
      <g>
        {/* Deep parabolic lifting bandeja */}
        <circle cx="120" cy="185" r="9.5" fill={silhouette} />
        <path
          d="M118,195 L115,235 L100,280 M115,235 L135,280"
          stroke={silhouette}
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M120,205 L144,180 L156,155"
          stroke={silhouette}
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        <ellipse cx="160" cy="146" rx="10" ry="14" transform="rotate(15 160 146)" fill={silhouette} stroke="#10b981" strokeWidth="2.5" />

        {/* Deep lob arc soaring high towards baseline */}
        <path
          d="M164,142 Q195,60 255,140"
          stroke="#facc15"
          strokeWidth="3.5"
          strokeDasharray="6 3"
          fill="none"
        />
        <circle cx="164" cy="142" r="7" fill="#ccff00" stroke="#10b981" strokeWidth="2" />
      </g>
    );
  }

  // --------------------------------------------------------------------------
  // VOLEIOS (VOLEIO_PINGADA, VOLEIO_ACELERADO, VOLEIO_LOB)
  // --------------------------------------------------------------------------
  if (type === 'VOLEIO_PINGADA') {
    return (
      <g>
        {/* Subtle drop volley cushion at net tape */}
        <circle cx="115" cy="225" r="9" fill={silhouette} />
        <path
          d="M113,234 L110,265 L95,300 M110,265 L128,300"
          stroke={silhouette}
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M115,240 L140,225 L158,212"
          stroke={silhouette}
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        <ellipse cx="164" cy="208" rx="9" ry="13" transform="rotate(20 164 208)" fill={silhouette} stroke="#10b981" strokeWidth="2.5" />

        {/* Micro-cushion arc dying into sand */}
        <path
          d="M168,206 Q185,185 208,222"
          stroke="#facc15"
          strokeWidth="3"
          strokeDasharray="4 2"
          fill="none"
        />
        <circle cx="168" cy="206" r="7" fill="#ccff00" stroke="#10b981" strokeWidth="2" />
        <ellipse cx="208" cy="224" rx="8" ry="3" fill="#fde047" opacity="0.6" />
      </g>
    );
  }

  if (type === 'VOLEIO_ACELERADO') {
    return (
      <g>
        {/* Aggressive drive volley lunge (Ataque!) */}
        <circle cx="95" cy="220" r="9.5" fill={silhouette} />
        <path
          d="M93,230 L85,260 L60,295 M85,260 L125,285"
          stroke={silhouette}
          strokeWidth="6.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M95,235 L128,215 L145,200"
          stroke={silhouette}
          strokeWidth="5.5"
          strokeLinecap="round"
          fill="none"
        />
        <ellipse cx="152" cy="194" rx="10" ry="14" transform="rotate(45 152 194)" fill={silhouette} stroke="#ef4444" strokeWidth="3" />

        {/* Laser straight drive velocity streak */}
        <path
          d="M156,190 L268,205"
          stroke="#ef4444"
          strokeWidth="4"
          strokeDasharray="8 3"
        />
        <circle cx="156" cy="190" r="8" fill="#ccff00" stroke="#ef4444" strokeWidth="2" />
        {/* Speed blur lines */}
        <line x1="168" y1="184" x2="200" y2="186" stroke="#fca5a5" strokeWidth="2" />
        <line x1="172" y1="196" x2="210" y2="198" stroke="#fca5a5" strokeWidth="2" />
      </g>
    );
  }

  if (type === 'VOLEIO_LOB') {
    return (
      <g>
        {/* Touch lob volley over net */}
        <circle cx="115" cy="230" r="9" fill={silhouette} />
        <path
          d="M113,239 L110,270 L95,305 M110,270 L128,305"
          stroke={silhouette}
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M115,245 L138,228 L152,210"
          stroke={silhouette}
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        <ellipse cx="156" cy="204" rx="9" ry="14" fill={silhouette} stroke="#10b981" strokeWidth="2.5" />

        {/* High arching lob over the opponent */}
        <path
          d="M160,200 Q190,80 250,135"
          stroke="#facc15"
          strokeWidth="3.5"
          strokeDasharray="6 3"
          fill="none"
        />
        <circle cx="160" cy="200" r="7" fill="#ccff00" stroke="#10b981" strokeWidth="2" />
      </g>
    );
  }

  // --------------------------------------------------------------------------
  // SMASH & ATTACKS (SMASH, GANCHO_ATA, VERONICA_ATA)
  // --------------------------------------------------------------------------
  if (type === 'SMASH') {
    return (
      <g>
        {/* Vertical leap explosive spike downward */}
        <circle cx="102" cy="130" r="10" fill={silhouette} />
        <path d="M100,140 Q88,168 97,198 L110,194 Q106,166 108,140 Z" fill={silhouette} />
        <path d="M106,145 L126,114 L134,96" stroke={silhouette} strokeWidth="6.5" strokeLinecap="round" fill="none" />
        <ellipse cx="139" cy="88" rx="10" ry="15" transform="rotate(35 139 88)" fill={silhouette} stroke="#ef4444" strokeWidth="3" />
        {/* Floating bent legs */}
        <path d="M97,198 L84,222 L72,234 M106,196 L114,224 L128,242" stroke={silhouette} strokeWidth="6" strokeLinecap="round" fill="none" />

        {/* Violent Downward Spike Trajectory */}
        <path d="M142,88 L225,275" stroke="#ef4444" strokeWidth="4.5" strokeDasharray="8 3" />
        <circle cx="142" cy="90" r="8.5" fill="#ccff00" stroke="#ef4444" strokeWidth="2.5" />
        {/* Sand Explosion Crater */}
        <ellipse cx="225" cy="276" rx="18" ry="6" fill="#fef08a" opacity="0.9" />
        <circle cx="215" cy="270" r="3" fill="#fde047" />
        <circle cx="235" cy="268" r="3" fill="#fde047" />
      </g>
    );
  }

  if (type === 'GANCHO_ATA') {
    return (
      <g>
        {/* Horizontal leap hook smash */}
        <circle cx="110" cy="140" r="10" fill={silhouette} />
        <path d="M108,150 L115,185 L95,215 M115,185 L135,215" stroke={silhouette} strokeWidth="6" strokeLinecap="round" fill="none" />
        {/* Hook arm curved over head */}
        <path d="M110,155 Q135,120 150,110" stroke={silhouette} strokeWidth="6" strokeLinecap="round" fill="none" />
        <ellipse cx="156" cy="106" rx="10" ry="14" transform="rotate(60 156 106)" fill={silhouette} stroke="#ef4444" strokeWidth="3" />

        {/* Whipping crosscourt trajectory */}
        <path d="M162,106 Q200,140 250,220" stroke="#ef4444" strokeWidth="4" strokeDasharray="7 3" fill="none" />
        <circle cx="162" cy="106" r="8" fill="#ccff00" stroke="#ef4444" strokeWidth="2" />
        <ellipse cx="250" cy="222" rx="14" ry="5" fill="#fef08a" opacity="0.8" />
      </g>
    );
  }

  if (type === 'VERONICA_ATA') {
    return (
      <g>
        {/* Acrobatic reverse backhand overhead aerial turn */}
        <circle cx="130" cy="135" r="10" fill={silhouette} />
        {/* Body twisted away from net */}
        <path d="M128,145 L135,185 L115,225 M135,185 L155,220" stroke={silhouette} strokeWidth="6" strokeLinecap="round" fill="none" />
        {/* Arm reaching behind head */}
        <path d="M128,150 Q105,125 110,100" stroke={silhouette} strokeWidth="6" strokeLinecap="round" fill="none" />
        <ellipse cx="112" cy="92" rx="10" ry="15" transform="rotate(-30 112 92)" fill={silhouette} stroke="#ef4444" strokeWidth="3" />

        {/* Reverse angle steep winner trajectory */}
        <path d="M116,92 L230,235" stroke="#ef4444" strokeWidth="4" strokeDasharray="8 3" />
        <circle cx="116" cy="94" r="8" fill="#ccff00" stroke="#ef4444" strokeWidth="2.5" />
        <ellipse cx="230" cy="236" rx="16" ry="5" fill="#fef08a" opacity="0.85" />
      </g>
    );
  }

  // --------------------------------------------------------------------------
  // FUNDO DEFESAS (GANCHO_DEF, VERONICA_DEF)
  // --------------------------------------------------------------------------
  if (type === 'GANCHO_DEF') {
    return (
      <g>
        {/* Full backward stretch defensive hook recovery on baseline */}
        <circle cx="140" cy="250" r="9.5" fill={silhouette} />
        <path d="M138,260 L132,295 L115,335 M132,295 L150,335" stroke={silhouette} strokeWidth="6" strokeLinecap="round" fill="none" />
        <path d="M140,265 Q115,230 105,200" stroke={silhouette} strokeWidth="5.5" strokeLinecap="round" fill="none" />
        <ellipse cx="102" cy="192" rx="9" ry="14" transform="rotate(-20 102 192)" fill={silhouette} stroke="#8b5cf6" strokeWidth="2.5" />

        {/* High safety rainbow arc into sky to reset point */}
        <path d="M102,188 Q140,55 240,140" stroke="#facc15" strokeWidth="3.5" strokeDasharray="6 3" fill="none" />
        <circle cx="102" cy="188" r="7" fill="#ccff00" stroke="#8b5cf6" strokeWidth="2" />
      </g>
    );
  }

  if (type === 'VERONICA_DEF') {
    return (
      <g>
        {/* Backpedaling acrobatic defensive overhead reach behind head */}
        <circle cx="150" cy="245" r="9.5" fill={silhouette} />
        <path d="M148,255 L152,290 L135,330 M152,290 L168,330" stroke={silhouette} strokeWidth="6" strokeLinecap="round" fill="none" />
        <path d="M148,260 Q125,230 128,198" stroke={silhouette} strokeWidth="5.5" strokeLinecap="round" fill="none" />
        <ellipse cx="128" cy="190" rx="9" ry="14" transform="rotate(-15 128 190)" fill={silhouette} stroke="#8b5cf6" strokeWidth="2.5" />

        {/* Lofty defensive recovery ball soaring back into play */}
        <path d="M130,186 Q165,65 245,150" stroke="#facc15" strokeWidth="3.5" strokeDasharray="6 3" fill="none" />
        <circle cx="130" cy="186" r="7" fill="#ccff00" stroke="#8b5cf6" strokeWidth="2" />
      </g>
    );
  }

  // General Fallback
  return (
    <g>
      <circle cx="120" cy="200" r="9.5" fill={silhouette} />
      <path d="M118,210 L115,245 L100,285 M115,245 L135,285" stroke={silhouette} strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M120,215 L145,190 L158,170" stroke={silhouette} strokeWidth="5" strokeLinecap="round" fill="none" />
      <ellipse cx="162" cy="162" rx="10" ry="14" fill={silhouette} stroke="#10b981" strokeWidth="2.5" />
      <path d="M166,158 Q200,100 250,180" stroke="#facc15" strokeWidth="3" strokeDasharray="5 3" fill="none" />
      <circle cx="166" cy="158" r="7" fill="#ccff00" stroke="#f97316" strokeWidth="1.5" />
    </g>
  );
}
