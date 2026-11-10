/**
 * Empirical Adversarial Challenger Test Suite — Milestone M3
 * Target: src/components/cards/CardIllustration.tsx
 * File: tests/unit/challenger_m3_illustration.test.tsx
 *
 * Objectives:
 * 1. Iterate over all 19 card types in CARDS_CATALOG and render CardIllustration.
 * 2. Assert that rendered SVG markup contains zero text elements matching forbidden RPG patterns:
 *    - /power/i
 *    - /level/i
 *    - /mana/i
 *    - /\d+\s*stars/i
 *    - /\+?\d+\s*pontos/i
 *    - additional adversarial patterns: /poder/i, /atk/i, /hp/i, /mp/i, /yugioh/i, etc.
 * 3. Inspect every <text> node across the entire illustration system:
 *    - Only SAQUE_1, SAQUE_2, SAQUE_3 may contain zone indicators ("Z1", "Z2", "Z3").
 *    - All other 16 card types must contain strictly 0 <text> elements.
 * 4. Stress-test edge cases: empty cards, corrupted cardType, unknown types, forceVector fallbacks.
 */

import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { CARDS_CATALOG } from '../../src/engine/cardsCatalog';
import type { CardType } from '../../src/engine/types';
import { CardIllustration, ProceduralCardSVG } from '../../src/components/cards/CardIllustration';

function stripSsrComments(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, '');
}

describe('Challenger M3: CardIllustration Adversarial Stress Suite', () => {
  const allCardTypes = Object.keys(CARDS_CATALOG) as CardType[];

  // ==========================================================================
  // Objective 1 & 2: Catalog Exhaustiveness & Strict Forbidden RPG Patterns
  // ==========================================================================
  describe('Objective 1 & 2: Full Catalog Scan for Zero Forbidden RPG Patterns', () => {
    it('verifies that CARDS_CATALOG contains exactly 19 unique 1v1 cards', () => {
      expect(allCardTypes).toHaveLength(19);
    });

    const forbiddenPatterns: Array<{ name: string; regex: RegExp }> = [
      { name: 'Power pattern', regex: /power/i },
      { name: 'Level pattern', regex: /level/i },
      { name: 'Mana pattern', regex: /mana/i },
      { name: 'Stars pattern', regex: /\d+\s*stars/i },
      { name: 'Pontos pattern', regex: /\+?\d+\s*pontos/i },
      { name: 'Poder pattern', regex: /poder/i },
      { name: 'RPG stats pattern', regex: /\b(atk|hp|mp|xp|defesa\s*power)\b/i },
      { name: 'Yu-Gi-Oh reference', regex: /yugioh|yu-gi-oh/i },
    ];

    allCardTypes.forEach((cardType) => {
      describe(`Card: ${cardType}`, () => {
        const def = CARDS_CATALOG[cardType];
        const rawSvg = renderToString(<CardIllustration card={def} forceVector={true} />);
        const svg = stripSsrComments(rawSvg);

        it('renders valid SVG structure with standard viewBox', () => {
          expect(svg).toContain('<svg');
          expect(svg).toContain('viewBox="0 0 300 400"');
          expect(svg).toContain('</svg>');
        });

        forbiddenPatterns.forEach(({ name, regex }) => {
          it(`contains strictly zero matches for ${name} (${regex})`, () => {
            expect(svg).not.toMatch(regex);
          });
        });

        it('renders cleanly when passed via cardType and color direct props', () => {
          const directSvg = stripSsrComments(
            renderToString(
              <CardIllustration
                cardType={cardType}
                color={def.color}
                isAttack={def.isAttack}
                isWildcard={def.isWildcard}
                serveNumber={def.serveNumber}
                forceVector={true}
              />
            )
          );

          forbiddenPatterns.forEach(({ name: patternName, regex }) => {
            expect(directSvg, `Direct props for ${cardType} matched forbidden pattern ${patternName}`).not.toMatch(regex);
          });
        });
      });
    });
  });

  // ==========================================================================
  // Objective 3: Exhaustive <text> Tag Inspection
  // ==========================================================================
  describe('Objective 3: Deep SVG <text> Tag Inspection', () => {
    it('restricts <text> tags strictly to Serve zone indicators ("Z1", "Z2", "Z3") only', () => {
      allCardTypes.forEach((cardType) => {
        const def = CARDS_CATALOG[cardType];
        const svg = stripSsrComments(renderToString(<CardIllustration card={def} forceVector={true} />));

        // Extract all <text ...>content</text> tags
        const textTagRegex = /<text\b[^>]*>([\s\S]*?)<\/text>/gi;
        const matches: string[] = [];
        let match: RegExpExecArray | null;
        while ((match = textTagRegex.exec(svg)) !== null) {
          if (match[1]) {
            matches.push(match[1].trim());
          }
        }

        if (cardType === 'SAQUE_1') {
          expect(matches).toEqual(['Z1']);
        } else if (cardType === 'SAQUE_2') {
          expect(matches).toEqual(['Z2']);
        } else if (cardType === 'SAQUE_3') {
          expect(matches).toEqual(['Z3']);
        } else {
          // All other 16 card types MUST NOT have any text elements in the art
          expect(matches).toEqual([]);
        }
      });
    });
  });

  // ==========================================================================
  // Objective 4: Adverse Props & Edge Case Fuzzing
  // ==========================================================================
  describe('Objective 4: Adverse Props & Edge Cases', () => {
    it('renders fallback SVG safely when empty card object or no props are passed', () => {
      expect(() => {
        const html = renderToString(<CardIllustration />);
        expect(html).toContain('<svg');
        expect(html).toContain('</svg>');
      }).not.toThrow();

      expect(() => {
        const html = renderToString(<CardIllustration card={{} as any} />);
        expect(html).toContain('<svg');
      }).not.toThrow();
    });

    it('renders fallback safely when unknown cardType is passed to ProceduralCardSVG', () => {
      expect(() => {
        const html = renderToString(
          <ProceduralCardSVG
            type={'UNKNOWN_CARD_TYPE' as any}
            color={'GREEN'}
            isAttack={false}
            isWildcard={false}
          />
        );
        expect(html).toContain('<svg');
        expect(html).toContain('viewBox="0 0 300 400"');
      }).not.toThrow();
    });

    it('handles image error fallback safely when forceVector is false', () => {
      const mockCardWithMissingImg = {
        ...CARDS_CATALOG.SMASH,
        illustrationPath: '/non-existent-image-path.jpg',
      };

      const html = renderToString(
        <CardIllustration card={mockCardWithMissingImg} forceVector={false} />
      );

      // In SSR without simulated error event, renders img element with proper alt text
      expect(html).toContain('<img');
      expect(html).toContain('alt="Smash"');
    });
  });
});
