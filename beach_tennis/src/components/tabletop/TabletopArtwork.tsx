import React from 'react';
import { motion } from 'framer-motion';

/**
 * Matchstick-style tally counter inspired by classic tabletop card scoreboards.
 * Renders up to 3 square boxes (5 matchsticks per box = up to 15 points/games).
 */
export const MatchstickTally: React.FC<{
  count: number;
  boxes?: number;
  className?: string;
}> = ({ count, boxes = 3, className = '' }) => {
  const safeCount = Math.max(0, count);

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`} aria-hidden="true">
      {Array.from({ length: boxes }).map((_, boxIdx) => {
        const boxFill = Math.max(0, Math.min(5, safeCount - boxIdx * 5));
        const activeColor = '#e6c587';
        const dimColor = '#4a3a2a';

        return (
          <svg
            key={boxIdx}
            width="22"
            height="22"
            viewBox="0 0 24 24"
            className="overflow-visible"
          >
            {/* 1: Left vertical matchstick */}
            <line
              x1="4"
              y1="4"
              x2="4"
              y2="20"
              stroke={boxFill >= 1 ? activeColor : dimColor}
              strokeWidth={boxFill >= 1 ? 2.2 : 1.5}
              strokeLinecap="round"
            />
            <circle cx="4" cy="4" r="1.7" fill={boxFill >= 1 ? '#d97742' : dimColor} />

            {/* 2: Top horizontal matchstick */}
            <line
              x1="4"
              y1="4"
              x2="20"
              y2="4"
              stroke={boxFill >= 2 ? activeColor : dimColor}
              strokeWidth={boxFill >= 2 ? 2.2 : 1.5}
              strokeLinecap="round"
            />
            <circle cx="20" cy="4" r="1.7" fill={boxFill >= 2 ? '#d97742' : dimColor} />

            {/* 3: Right vertical matchstick */}
            <line
              x1="20"
              y1="4"
              x2="20"
              y2="20"
              stroke={boxFill >= 3 ? activeColor : dimColor}
              strokeWidth={boxFill >= 3 ? 2.2 : 1.5}
              strokeLinecap="round"
            />
            <circle cx="20" cy="20" r="1.7" fill={boxFill >= 3 ? '#d97742' : dimColor} />

            {/* 4: Bottom horizontal matchstick */}
            <line
              x1="4"
              y1="20"
              x2="20"
              y2="20"
              stroke={boxFill >= 4 ? activeColor : dimColor}
              strokeWidth={boxFill >= 4 ? 2.2 : 1.5}
              strokeLinecap="round"
            />
            <circle cx="4" cy="20" r="1.7" fill={boxFill >= 4 ? '#d97742' : dimColor} />

            {/* 5: Diagonal matchstick */}
            <line
              x1="5"
              y1="5"
              x2="19"
              y2="19"
              stroke={boxFill >= 5 ? activeColor : dimColor}
              strokeWidth={boxFill >= 5 ? 2.1 : 1.2}
              strokeLinecap="round"
            />
          </svg>
        );
      })}
    </div>
  );
};

/**
 * Porcelain coffee cup on saucer with spoon, resting on the top-left wooden table corner.
 */
export const CoffeeCupProp: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 140 110"
    className={`pointer-events-none select-none drop-shadow-[0_10px_14px_rgba(0,0,0,0.65)] ${className}`}
    aria-hidden="true"
  >
    <defs>
      <radialGradient id="saucerGrad" cx="42%" cy="38%" r="60%">
        <stop offset="0%" stopColor="#fdfaf3" />
        <stop offset="65%" stopColor="#dfd5c3" />
        <stop offset="100%" stopColor="#9c8e7a" />
      </radialGradient>
      <linearGradient id="cupBodyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#cfc4b2" />
        <stop offset="30%" stopColor="#fbf8f1" />
        <stop offset="72%" stopColor="#e4dac8" />
        <stop offset="100%" stopColor="#9c8f7d" />
      </linearGradient>
      <radialGradient id="coffeeLiquid" cx="45%" cy="45%" r="55%">
        <stop offset="0%" stopColor="#3a1f10" />
        <stop offset="65%" stopColor="#1e0e06" />
        <stop offset="100%" stopColor="#0f0703" />
      </radialGradient>
      <linearGradient id="spoonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6c6965" />
        <stop offset="50%" stopColor="#2f2c2a" />
        <stop offset="100%" stopColor="#171514" />
      </linearGradient>
    </defs>

    {/* Contact shadow on wood/felt */}
    <ellipse cx="68" cy="76" rx="54" ry="26" fill="rgba(0,0,0,0.48)" />

    {/* Porcelain saucer */}
    <ellipse cx="68" cy="70" rx="52" ry="24" fill="url(#saucerGrad)" stroke="#c7baa4" strokeWidth="1.2" />
    <ellipse cx="68" cy="69" rx="34" ry="14" fill="none" stroke="rgba(120,104,84,0.35)" strokeWidth="1.4" />

    {/* Cup handle (left side) */}
    <path
      d="M 38 40 C 20 38, 20 62, 41 61"
      fill="none"
      stroke="#e2d8c7"
      strokeWidth="6.5"
      strokeLinecap="round"
    />
    <path
      d="M 38 40 C 22 39, 22 60, 40 59"
      fill="none"
      stroke="#ffffff"
      strokeWidth="1.8"
      strokeLinecap="round"
      opacity="0.7"
    />

    {/* Cup body */}
    <path
      d="M 36 30 L 40 62 C 42 73, 94 73, 96 62 L 100 30 Z"
      fill="url(#cupBodyGrad)"
      stroke="#b9ac97"
      strokeWidth="1"
    />

    {/* Cup rim */}
    <ellipse cx="68" cy="30" rx="32" ry="13.5" fill="#f7f2e7" stroke="#c7bca8" strokeWidth="1.2" />
    {/* Espresso liquid */}
    <ellipse cx="68" cy="31" rx="26.5" ry="10.2" fill="url(#coffeeLiquid)" />
    {/* Crema highlight */}
    <path
      d="M 46 31 C 52 24, 82 24, 90 30"
      fill="none"
      stroke="#7a4c28"
      strokeWidth="2.2"
      opacity="0.65"
    />
    <ellipse cx="59" cy="29" rx="7" ry="2.2" fill="rgba(255,240,210,0.22)" />

    {/* Small espresso spoon on right side of saucer */}
    <path
      d="M 98 58 L 83 78"
      stroke="url(#spoonGrad)"
      strokeWidth="3.2"
      strokeLinecap="round"
    />
    <ellipse
      cx="81"
      cy="80"
      rx="7.5"
      ry="4.2"
      transform="rotate(-38 81 80)"
      fill="url(#spoonGrad)"
    />
  </svg>
);

/**
 * Ornate golden eye medallion on the top-right corner of the felt table.
 */
export const GoldenEyeMedallion: React.FC<{
  onClick?: () => void;
  title?: string;
  className?: string;
}> = ({ onClick, title = 'Consultar Folha Rosa (Regras)', className = '' }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-label={title}
    className={`group w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-95 ${className}`}
  >
    <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-[0_6px_10px_rgba(0,0,0,0.75)]">
      <defs>
        <radialGradient id="coinGold" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#634f26" />
          <stop offset="65%" stopColor="#2e2412" />
          <stop offset="100%" stopColor="#161108" />
        </radialGradient>
        <linearGradient id="rimGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f3d48c" />
          <stop offset="50%" stopColor="#b58d46" />
          <stop offset="100%" stopColor="#6d5121" />
        </linearGradient>
      </defs>
      {/* Top teardrop crown */}
      <path d="M32 3 L39 14 L25 14 Z" fill="url(#rimGold)" />
      {/* Coin disc */}
      <circle cx="32" cy="34" r="24" fill="url(#coinGold)" stroke="url(#rimGold)" strokeWidth="2.8" />
      <circle cx="32" cy="34" r="19.5" fill="none" stroke="#c9a466" strokeWidth="1" opacity="0.55" />
      {/* Stylized Eye */}
      <path
        d="M 16 34 C 21 24, 43 24, 48 34 C 43 44, 21 44, 16 34 Z"
        fill="none"
        stroke="#e8c87d"
        strokeWidth="2.4"
      />
      <circle cx="32" cy="34" r="6" fill="#e8c87d" />
      <circle cx="32" cy="34" r="2.7" fill="#1a140a" />
      <circle cx="30" cy="32" r="1.2" fill="#fff7df" />
    </svg>
  </button>
);

/**
 * Painterly opponent torso (flush with top edge, soft shallow-DOF), natural forearms
 * coming from outside the card fan, fanned UBT cards, and slender anatomically curved
 * hands resting on the top wooden rail while gripping only the lower outer card corners.
 */
export const OpponentHandsAndCards: React.FC<{
  cardCount: number;
  isThinking?: boolean;
  className?: string;
}> = ({ cardCount, isThinking = false, className = '' }) => {
  const visibleCards = Math.max(0, Math.min(cardCount, 7));

  return (
    <div
      className={`relative flex items-end justify-center pointer-events-none select-none w-[360px] sm:w-[480px] h-[112px] sm:h-[144px] ${className}`}
      aria-hidden="true"
    >
      {/* Layer 1: Soft shallow-DOF opponent shoulders/blouse flush with top HUD & curving forearms */}
      <svg
        viewBox="0 0 520 156"
        className="w-full h-full absolute inset-0 overflow-visible"
      >
        <defs>
          <filter id="oppTorsoBlur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4.5" />
          </filter>
          <filter id="oppArmBlur" x="-15%" y="-15%" width="130%" height="130%">
            <feGaussianBlur stdDeviation="1.4" />
          </filter>
          <linearGradient id="mauveBlouse" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#7a535e" />
            <stop offset="48%" stopColor="#5e3a46" />
            <stop offset="100%" stopColor="#321c24" />
          </linearGradient>
          <linearGradient id="armGradL" x1="10%" y1="0%" x2="88%" y2="100%">
            <stop offset="0%" stopColor="#e6b08a" />
            <stop offset="42%" stopColor="#d4936a" />
            <stop offset="82%" stopColor="#b2704b" />
            <stop offset="100%" stopColor="#874d2e" />
          </linearGradient>
          <linearGradient id="armGradR" x1="90%" y1="0%" x2="12%" y2="100%">
            <stop offset="0%" stopColor="#e6b08a" />
            <stop offset="42%" stopColor="#d08f66" />
            <stop offset="82%" stopColor="#ad6b47" />
            <stop offset="100%" stopColor="#82492b" />
          </linearGradient>
          <linearGradient id="armShade" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffe2c8" stopOpacity="0.34" />
            <stop offset="55%" stopColor="#d4926a" stopOpacity="0" />
            <stop offset="100%" stopColor="#4f2612" stopOpacity="0.45" />
          </linearGradient>
        </defs>

        {/* Blurred torso & relaxed sleeves anchored flush to the top edge (y=-14) */}
        <g filter="url(#oppTorsoBlur)">
          <path
            d="M 52 -14 L 468 -14 C 458 46, 430 88, 396 104 C 344 122, 176 122, 124 104 C 90 88, 62 46, 52 -14 Z"
            fill="url(#mauveBlouse)"
            opacity="0.92"
          />
          {/* Soft fabric fold shadows across chest & waist */}
          <path
            d="M 135 -10 Q 175 48 215 96"
            stroke="#361c25"
            strokeWidth="18"
            fill="none"
            opacity="0.42"
          />
          <path
            d="M 385 -10 Q 345 48 305 96"
            stroke="#361c25"
            strokeWidth="18"
            fill="none"
            opacity="0.42"
          />
          <ellipse cx="260" cy="40" rx="115" ry="42" fill="#8b626d" opacity="0.22" />
        </g>

        {/* Bare forearms emerging gracefully from sleeves on the outside & reaching the table rim */}
        <g filter="url(#oppArmBlur)">
          {/* Left arm (viewer's left) coming from upper-left sleeve down to lower-left wrist */}
          <path
            d="M 102 -8 C 106 32, 114 72, 124 102 C 130 120, 146 132, 174 134 C 190 135, 198 124, 194 112 C 176 106, 164 88, 158 58 C 152 32, 150 6, 148 -8 Z"
            fill="url(#armGradL)"
          />
          <path
            d="M 102 -8 C 106 32, 114 72, 124 102 C 130 120, 146 132, 174 134 C 190 135, 198 124, 194 112 C 176 106, 164 88, 158 58 C 152 32, 150 6, 148 -8 Z"
            fill="url(#armShade)"
          />
          {/* Left sleeve cuff soft edge */}
          <path
            d="M 90 -8 C 94 18, 102 36, 112 46 C 128 50, 146 44, 158 32 C 156 16, 154 2, 152 -8 Z"
            fill="#694550"
            opacity="0.88"
          />

          {/* Right arm (viewer's right) coming from upper-right sleeve down to lower-right wrist */}
          <path
            d="M 418 -8 C 414 32, 406 72, 396 102 C 390 120, 374 132, 346 134 C 330 135, 322 124, 326 112 C 344 106, 356 88, 362 58 C 368 32, 370 6, 372 -8 Z"
            fill="url(#armGradR)"
          />
          <path
            d="M 418 -8 C 414 32, 406 72, 396 102 C 390 120, 374 132, 346 134 C 330 135, 322 124, 326 112 C 344 106, 356 88, 362 58 C 368 32, 370 6, 372 -8 Z"
            fill="url(#armShade)"
          />
          {/* Right sleeve cuff soft edge */}
          <path
            d="M 430 -8 C 426 18, 418 36, 408 46 C 392 50, 374 44, 362 32 C 364 16, 366 2, 368 -8 Z"
            fill="#694550"
            opacity="0.88"
          />
        </g>
      </svg>

      {/* Layer 2: Fanned Face-Down UBT Cards — held cleanly ABOVE the wrists so UBT logos are clear */}
      <div className="relative z-10 mb-5 sm:mb-6 flex items-end justify-center -space-x-5 sm:-space-x-6">
        {Array.from({ length: visibleCards }).map((_, i) => {
          const mid = (visibleCards - 1) / 2;
          const offset = i - mid;
          const rotate = offset * 8.2;
          const translateY = Math.abs(offset) * 3.2;
          return (
            <motion.div
              key={i}
              animate={
                isThinking
                  ? { y: [translateY, translateY - 4, translateY], rotate }
                  : { y: translateY, rotate }
              }
              transition={
                isThinking
                  ? { duration: 1.15, repeat: Infinity, delay: i * 0.08 }
                  : { type: 'spring', stiffness: 260, damping: 20 }
              }
              className="w-12 h-[72px] sm:w-[62px] sm:h-[92px] rounded-[7px] border border-neutral-300/80 bg-gradient-to-br from-[#23262b] via-[#0e0f11] to-[#1d2024] shadow-[0_10px_18px_rgba(0,0,0,0.88)] flex flex-col items-center justify-center relative overflow-hidden"
            >
              <div className="absolute inset-0.5 rounded-[5px] border border-lime-400/20" />
              <div className="text-[11px] sm:text-sm font-black tracking-tight text-white leading-none -mt-1.5">
                UBT
              </div>
              <div className="w-7 sm:w-9 h-[2px] bg-gradient-to-r from-transparent via-lime-400 to-transparent mt-0.5" />
              <span className="text-[5px] sm:text-[6px] uppercase tracking-widest text-neutral-400 mt-0.5">
                Beach Tennis
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Layer 3: Slender painterly hands resting on the top oak edge & holding only the lower corners */}
      <svg
        viewBox="0 0 520 90"
        className="w-full h-[66px] sm:h-[84px] absolute -bottom-2 sm:-bottom-2.5 left-0 z-20 overflow-visible"
      >
        <defs>
          <radialGradient id="skinPalmL" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#f5c9a7" />
            <stop offset="52%" stopColor="#da9a72" />
            <stop offset="100%" stopColor="#995b3b" />
          </radialGradient>
          <radialGradient id="skinPalmR" cx="65%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#f2c4a1" />
            <stop offset="52%" stopColor="#d5946d" />
            <stop offset="100%" stopColor="#935737" />
          </radialGradient>
          <linearGradient id="slenderFinger" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fad7bb" />
            <stop offset="45%" stopColor="#df9f76" />
            <stop offset="88%" stopColor="#b5714c" />
            <stop offset="100%" stopColor="#8c4f30" />
          </linearGradient>
          <filter id="tableHandShadow" x="-15%" y="-15%" width="130%" height="150%">
            <feDropShadow dx="0" dy="6" stdDeviation="4.5" floodColor="#000000" floodOpacity="0.62" />
          </filter>
          <filter id="softCreaseBlur" x="-15%" y="-15%" width="130%" height="130%">
            <feGaussianBlur stdDeviation="0.9" />
          </filter>
        </defs>

        {/* === LEFT HAND (Viewer's left — grips lower-left card corner, rests on top oak rail) === */}
        <g filter="url(#tableHandShadow)">
          {/* Soft ambient shadow cast by hand onto lower-left cards */}
          <ellipse cx="182" cy="54" rx="46" ry="20" fill="rgba(0,0,0,0.38)" />

          {/* Smooth curved wrist-to-hand heel resting on the wooden rim */}
          <path
            d="M 134 26 C 126 42, 134 68, 166 77 C 188 83, 212 78, 224 67 C 218 56, 198 48, 174 44 C 162 40, 152 32, 146 22 Z"
            fill="url(#skinPalmL)"
          />

          {/* Pinky resting along bottom edge */}
          <path
            d="M 164 65 C 180 73, 204 75, 222 69 C 228 66, 228 60, 221 59 C 204 61, 184 59, 168 55 Z"
            fill="url(#slenderFinger)"
          />

          {/* Ring finger curving gently upward-right */}
          <path
            d="M 156 56 C 174 63, 202 65, 225 58 C 232 55, 232 48, 224 48 C 204 51, 178 49, 160 44 Z"
            fill="url(#slenderFinger)"
          />

          {/* Middle finger — graceful taper wrapping the bottom-left face of the fan */}
          <path
            d="M 148 46 C 168 53, 200 54, 226 46 C 233 43, 232 36, 224 36 C 201 40, 172 38, 152 33 Z"
            fill="url(#slenderFinger)"
          />

          {/* Index / thumb pinch subtly holding the outer-left card rim */}
          <path
            d="M 140 34 C 156 41, 186 42, 212 35 C 219 32, 218 25, 210 25 C 186 29, 162 27, 146 22 Z"
            fill="url(#slenderFinger)"
          />

          {/* Soft painterly shading grooves between fingers (blurred for organic feel) */}
          <g filter="url(#softCreaseBlur)" stroke="#7a4022" strokeWidth="1.6" fill="none" opacity="0.52" strokeLinecap="round">
            <path d="M 160 41 C 178 44, 198 44, 216 39" />
            <path d="M 164 52 C 184 55, 206 55, 224 50" />
            <path d="M 170 62 C 188 66, 206 66, 221 62" />
          </g>

          {/* Warm sunlit knuckle highlights */}
          <g filter="url(#softCreaseBlur)" stroke="#ffe9d6" strokeWidth="2.2" fill="none" opacity="0.38" strokeLinecap="round">
            <path d="M 152 30 C 168 33, 188 33, 204 30" />
            <path d="M 160 41 C 178 44, 198 44, 216 41" />
          </g>
        </g>

        {/* === RIGHT HAND (Viewer's right — grips lower-right card corner, natural slight asymmetry) === */}
        <g filter="url(#tableHandShadow)">
          {/* Soft ambient shadow cast onto lower-right cards */}
          <ellipse cx="338" cy="56" rx="46" ry="20" fill="rgba(0,0,0,0.38)" />

          {/* Smooth curved wrist-to-hand heel resting on the wooden rim */}
          <path
            d="M 386 28 C 394 44, 386 70, 354 79 C 332 85, 308 80, 296 69 C 302 58, 322 50, 346 46 C 358 42, 368 34, 374 24 Z"
            fill="url(#skinPalmR)"
          />

          {/* Lower finger resting along bottom oak edge */}
          <path
            d="M 356 67 C 340 75, 316 77, 298 71 C 292 68, 292 62, 299 61 C 316 63, 336 61, 352 57 Z"
            fill="url(#slenderFinger)"
          />

          {/* Ring finger curving upward-left */}
          <path
            d="M 364 58 C 346 65, 318 67, 295 60 C 288 57, 288 50, 296 50 C 316 53, 342 51, 360 46 Z"
            fill="url(#slenderFinger)"
          />

          {/* Middle finger wrapping lower-right card edge */}
          <path
            d="M 372 48 C 352 55, 320 56, 294 48 C 287 45, 288 38, 296 38 C 319 42, 348 40, 368 35 Z"
            fill="url(#slenderFinger)"
          />

          {/* Upper index/thumb pinch gripping outer-right card edge */}
          <path
            d="M 380 37 C 364 44, 334 45, 308 38 C 301 35, 302 28, 310 28 C 334 32, 358 30, 374 25 Z"
            fill="url(#slenderFinger)"
          />

          {/* Soft painterly shading grooves between fingers */}
          <g filter="url(#softCreaseBlur)" stroke="#7a4022" strokeWidth="1.6" fill="none" opacity="0.52" strokeLinecap="round">
            <path d="M 360 44 C 342 47, 322 47, 304 42" />
            <path d="M 356 54 C 336 57, 314 57, 296 52" />
            <path d="M 350 64 C 332 68, 314 68, 299 64" />
          </g>

          {/* Warm sunlit knuckle highlights */}
          <g filter="url(#softCreaseBlur)" stroke="#ffe9d6" strokeWidth="2.2" fill="none" opacity="0.38" strokeLinecap="round">
            <path d="M 368 33 C 352 36, 332 36, 316 33" />
            <path d="M 360 44 C 342 47, 322 47, 304 44" />
          </g>
        </g>
      </svg>
    </div>
  );
};

/**
 * First-person close-up of the player's hand & naturally angled thumb gripping the
 * bottom center of the fanned cards, inspired by the tabletop reference.
 */
export const PlayerHandThumbOverlay: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 320 130"
    className={`pointer-events-none select-none overflow-visible ${className}`}
    aria-hidden="true"
  >
    <defs>
      <radialGradient id="thumbMainSkin" cx="38%" cy="32%" r="72%">
        <stop offset="0%" stopColor="#f8caa5" />
        <stop offset="48%" stopColor="#e2a176" />
        <stop offset="85%" stopColor="#bc774d" />
        <stop offset="100%" stopColor="#945634" />
      </radialGradient>
      <radialGradient id="palmBaseSkin" cx="50%" cy="24%" r="78%">
        <stop offset="0%" stopColor="#ecb085" />
        <stop offset="60%" stopColor="#c78358" />
        <stop offset="100%" stopColor="#894e2e" />
      </radialGradient>
      <linearGradient id="thumbNailSkin" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fce4d3" />
        <stop offset="58%" stopColor="#eab99b" />
        <stop offset="100%" stopColor="#cf906f" />
      </linearGradient>
      <filter id="thumbDrop" x="-15%" y="-15%" width="130%" height="130%">
        <feDropShadow dx="-2" dy="-3" stdDeviation="5" floodColor="#000000" floodOpacity="0.58" />
      </filter>
    </defs>

    <g filter="url(#thumbDrop)">
      {/* Broad lower hand / palm & curled fingers peeking along bottom edge */}
      <path
        d="M 46 132 C 52 98, 76 74, 108 68 L 212 68 C 246 74, 268 98, 274 132 Z"
        fill="url(#palmBaseSkin)"
      />
      {/* Soft shading on left/right side of palm heel */}
      <ellipse cx="92" cy="96" rx="34" ry="24" fill="#c78156" opacity="0.65" />
      <ellipse cx="228" cy="98" rx="34" ry="24" fill="#b9744a" opacity="0.65" />

      {/* Natural slightly-tilted right thumb gripping the bottom-center of the card fan */}
      <g transform="rotate(-8 160 90)">
        {/* Thumb silhouette */}
        <path
          d="M 118 134 C 115 98, 118 58, 128 28 C 138 6, 178 6, 190 28 C 202 52, 206 96, 198 134 Z"
          fill="url(#thumbMainSkin)"
        />
        {/* Soft highlight down sunlit left ridge of thumb */}
        <path
          d="M 134 32 C 128 58, 128 86, 132 112"
          stroke="#ffe4cc"
          strokeWidth="7"
          strokeLinecap="round"
          fill="none"
          opacity="0.22"
        />
        {/* Realistic sculpted thumbnail */}
        <path
          d="M 139 27 C 141 13, 175 13, 179 27 C 181 40, 176 52, 159 53 C 142 52, 137 40, 139 27 Z"
          fill="url(#thumbNailSkin)"
        />
        {/* Subtle nail edge & cuticle shadow */}
        <path
          d="M 140 34 C 141 47, 150 53, 159 53 C 169 53, 178 47, 179 34"
          stroke="#b97856"
          strokeWidth="1.4"
          fill="none"
          opacity="0.6"
        />
        {/* Pale lunula + soft nail reflection */}
        <path
          d="M 148 46 Q 159 41 170 46"
          stroke="#fff1e6"
          strokeWidth="2.4"
          fill="none"
          opacity="0.58"
          strokeLinecap="round"
        />
        <ellipse cx="151" cy="26" rx="5" ry="8" fill="rgba(255,255,255,0.24)" />

        {/* Soft knuckle skin creases */}
        <path
          d="M 134 70 Q 159 64 184 70"
          stroke="#9b5c3a"
          strokeWidth="1.8"
          fill="none"
          opacity="0.45"
          strokeLinecap="round"
        />
        <path
          d="M 139 79 Q 159 74 179 79"
          stroke="#9b5c3a"
          strokeWidth="1.3"
          fill="none"
          opacity="0.32"
          strokeLinecap="round"
        />
      </g>
    </g>
  </svg>
);
