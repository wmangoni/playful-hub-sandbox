/**
 * Beach Tennis Card Game (UBT) - Canonical Types Contract
 * Pure, decoupled TypeScript definitions for game rules, cards, decks, rally transitions,
 * scoring system, AI decisions, and state machines.
 *
 * NO DOM, NO REACT IMPORTS ALLOWED.
 */

// ============================================================================
// 1. PRIMITIVE ENUMS & UNION LITERALS
// ============================================================================

/**
 * The 3 distinct card colors representing different functional decks and phases.
 * - ORANGE: Serve and Return court-zone selection cards (held in hand at start of point).
 * - BLUE: Defensive cards drawn automatically from the Blue Deck when receiving attacks or serves.
 * - GREEN: Rally stroke cards (attack, neutral, recovery) played from hand during the rally.
 */
export type CardColor = 'ORANGE' | 'BLUE' | 'GREEN';

/**
 * The 19 unique card types in the 1v1 game mode.
 * - 3 Orange Serve/Return cards (zones 1, 2, 3)
 * - 4 Blue Defense cards
 * - 12 Green Rally Stroke cards (including Green Wildcard)
 */
export type OrangeCardType =
  | 'SAQUE_1'
  | 'SAQUE_2'
  | 'SAQUE_3';

export type BlueCardType =
  | 'DEF_CURTA'
  | 'DEF_NEUTRA'
  | 'DEF_LOB'
  | 'DEF_UBT_CORINGA';

export type GreenCardType =
  // Bandejas
  | 'BANDEJA_CURTA'
  | 'BANDEJA_LOB_CHUTADO'
  | 'BANDEJA_LOB'
  // Voleios
  | 'VOLEIO_PINGADA'
  | 'VOLEIO_ACELERADO'
  | 'VOLEIO_LOB'
  // Fundo (Ataque)
  | 'SMASH'
  | 'GANCHO_ATA'
  | 'VERONICA_ATA'
  // Fundo (Defesa)
  | 'GANCHO_DEF'
  | 'VERONICA_DEF'
  // Coringa Verde
  | 'GOLPE_UBT_CORINGA';

/**
 * Union of all 19 unique 1v1 card types.
 */
export type CardType = OrangeCardType | BlueCardType | GreenCardType;

/**
 * Optional 2v2 extension types for future doubles mode (zones 4 & 5).
 */
export type ExtendedOrangeCardType = OrangeCardType | 'SAQUE_4' | 'SAQUE_5';
export type ExtendedCardType = CardType | 'SAQUE_4' | 'SAQUE_5';

/**
 * Serve court zones for 1v1 (1..3) or 2v2 (1..5).
 */
export type ServeNumber = 1 | 2 | 3;
export type ExtendedServeNumber = 1 | 2 | 3 | 4 | 5;

/**
 * The 4 canonical response requirement groups defined by the Pink Sheet ("Folha Rosa").
 * Every played card on the court forces the next player to respond with one of these 4 categories:
 * - BANDEJAS: Short drop balls, forced by Def Curta, Voleio Pingada, Bandeja Curta.
 * - VOLEIOS: Mid-court/neutral balls, forced by Def Neutra, Bandeja Lob Chutado.
 * - DEFESAS: Fast offensive attacks forcing a draw from the Blue Deck (Smash, Voleio Acelerado, Gancho Ata, Veronica Ata).
 * - FUNDO: High lobs and deep balls, forced by Def Lob, Voleio Lob, Bandeja Lob, Gancho Def, Veronica Def.
 */
export type RequiredResponse = 'BANDEJAS' | 'VOLEIOS' | 'DEFESAS' | 'FUNDO';

/**
 * Alias for RequiredResponse to preserve backward compatibility across all spec documents.
 */
export type ResponseGroup = RequiredResponse;

/**
 * Player identification tokens in a 1v1 match.
 */
export type PlayerId = 'PLAYER' | 'AI';

/**
 * Artificial Intelligence difficulty tiers.
 */
export type AIDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

/**
 * Supported match length formats.
 */
export type MatchFormat = 'FAST_1_GAME' | 'SHORT_SET_4' | 'FULL_SET_6';

/**
 * High-level lifecycle phases of a match / point.
 */
export type MatchPhase =
  | 'MENU'                  // Main menu / configuration screen
  | 'POINT_PREPARATION'    // Shuffling, resetting 24 green + 8 blue decks, dealing 6 cards to hand
  | 'SERVE_SELECTION'      // Players secretly choosing orange cards (Server: 1, Receiver: 2)
  | 'SERVE_REVEAL'         // 3D card flip animation & calculation (Ace vs Defense)
  | 'RALLY_PLAYER_TURN'    // Human player must play a legal green card from hand
  | 'RALLY_AI_TURN'        // AI bot is calculating and selecting its legal move
  | 'RALLY_DEFENSE_DRAW'   // Player/AI is drawing an automatic defensive card from Blue Deck
  | 'RALLY_DIGGING'        // Player/AI has no valid card in hand and is digging (1 or 2 cards)
  | 'WILDCARD_DECLARING'   // Modal open awaiting declaration of Blue or Green wildcard
  | 'POINT_ENDED'          // Point resolved (Ace, Winner, Dig Fail); display feedback banner
  | 'MATCH_OVER';          // Match completed with final winner and stats

/**
 * Point resolution terminal reasons.
 */
export type PointEndReason =
  | 'ACE'                       // Server chose an unpicked zone
  | 'ATTACK_WINNER'             // Attack played and opponent's Blue Deck was exhausted (0 cards)
  | 'DIG_FAILED_SECOND_CARD'    // Dug 2 cards from Green Deck, neither was legal
  | 'DIG_FAILED_DECK_EMPTY'     // Green Deck had 0 cards when digging was required
  | 'FORFEIT';                  // Player quit or forfeited

// ============================================================================
// 2. CARD DEFINITIONS & INSTANCES
// ============================================================================

/**
 * Static metadata catalog definition for a card type.
 * Immutable and shared across all instances of the same card.
 */
export interface CardDefinition {
  /** Canonical unique identifier for the catalog entry (e.g., 'smash', 'def_curta', 'saque_1'). */
  id: string;

  /** Formal card type enum. */
  type: CardType;

  /** Primary card color category. */
  color: CardColor;

  /** User-facing display title in Portuguese (e.g., 'Smash', 'Bandeja Curta', 'Defesa Neutra'). */
  name: string;

  /** Explanatory description of tactical shot mechanics and rules. */
  description: string;

  /** Which response category this card forces the opponent to play (undefined for Orange cards). */
  requiredResponse?: RequiredResponse;

  /** All response categories that this card is eligible to satisfy when played from hand. */
  belongsToGroups: RequiredResponse[];

  /** Number of copies included in a player's official point deck (2 for green/blue, 1 for orange in 1v1). */
  quantityInDeck: number;

  /** Relative or absolute asset path for the clean illustration (e.g., '/assets/cards/smash.jpg'). */
  illustrationPath: string;

  /** True if this card is a wildcard (DEF_UBT_CORINGA or GOLPE_UBT_CORINGA). */
  isWildcard: boolean;

  /** True if this card is an offensive attack that forces the opponent to draw from the Blue Deck. */
  isAttack: boolean;

  /** Numerical zone identifier for Orange Serve cards (1..3). */
  serveNumber?: ServeNumber;
}

/**
 * A runtime dynamic instance of a card in play, in deck, or in hand.
 * Every card has a distinct `instanceId` to support React keys, drag-and-drop, and state tracking.
 */
export interface CardInstance {
  /** Unique runtime instance identifier (e.g., 'player_green_smash_0', 'ai_blue_def_curta_1'). */
  instanceId: string;

  /** Foreign key pointing to the static CardDefinition.id. */
  cardId: string;

  /** Reference to the full static definition. */
  definition: CardDefinition;

  /** Current owner of the card. */
  owner: PlayerId;

  /**
   * When this card is a wildcard (`isWildcard === true`) and has been declared in play,
   * this stores the specific CardType that it is masquerading as.
   */
  declaredAs?: CardType;
}

// ============================================================================
// 3. PLAYER & DECK STATES
// ============================================================================

/**
 * State of a player's deck and hands during an ongoing point.
 */
export interface PlayerState {
  /** Player identifier ('PLAYER' or 'AI'). */
  id: PlayerId;

  /** Active hand of Green cards held by the player (starts with 6 at point preparation). */
  hand: CardInstance[];

  /** Green Draw Pile remaining on table (starts with 18 cards at point preparation). */
  greenDeck: CardInstance[];

  /** Blue Defense Pile positioned face-down (starts with 8 cards at point preparation). */
  blueDeck: CardInstance[];

  /** Discard pile of cards played or burned by this player during the current point. */
  discardedCards: CardInstance[];

  /** Available Orange serve/receive cards for the current point. */
  orangeCards: CardInstance[];

  /** Number of cards dug from the Green Deck during the current player turn (0, 1, or 2). */
  digAttemptsThisTurn: number;
}

// ============================================================================
// 4. SCORING SYSTEM (BEACH TENNIS ITF / CBT RULES)
// ============================================================================

/**
 * Official Beach Tennis game points sequence.
 * 0 = Love, 15, 30, 40.
 */
export type GamePoint = 0 | 15 | 30 | 40;

/**
 * Comprehensive match score snapshot.
 */
export interface ScoreState {
  /** Match configuration format. */
  matchFormat: MatchFormat;

  /** Games won by the human player in the current set. */
  playerGames: number;

  /** Games won by the AI bot in the current set. */
  aiGames: number;

  /** Current point score for the human player within the active game. */
  playerPoints: GamePoint;

  /** Current point score for the AI bot within the active game. */
  aiPoints: GamePoint;

  /**
   * True when the score reaches 40-40 (Deuce).
   * In Beach Tennis official rules, there is NO ADVANTAGE: the next point is the
   * "Ponto Decisivo" (Deciding Golden Point) and immediately awards the Game.
   */
  isDeuce: boolean;

  /**
   * True if the current point is the Deciding Golden Point (synonym/helper for isDeuce).
   */
  isNoAdPoint: boolean;

  /**
   * True when games are tied at 4-4 (in SHORT_SET_4) or 6-6 (in FULL_SET_6),
   * activating the 7-point Tie-Break.
   */
  isTieBreak: boolean;

  /** Points scored by the human player during an active Tie-Break. */
  playerTieBreakPoints: number;

  /** Points scored by the AI bot during an active Tie-Break. */
  aiTieBreakPoints: number;

  /** Player who is currently serving the active game/point. */
  currentServer: PlayerId;

  /** Player scheduled to serve the next game. */
  nextGameServer: PlayerId;

  /** Set winner, if the set has concluded. */
  setWinner: PlayerId | null;

  /** Match overall winner, if the entire match has concluded. */
  matchWinner: PlayerId | null;

  /** History of completed set scores (e.g., [{ playerGames: 6, aiGames: 4 }]). */
  completedSets: Array<{ playerGames: number; aiGames: number }>;
}

// ============================================================================
// 5. SERVE RESOLUTION & DUEL MECHANICS
// ============================================================================

/**
 * Selections made during the secret Orange card serve duel.
 */
export interface ServeDuelState {
  /** Server player. */
  server: PlayerId;

  /** Receiver player. */
  receiver: PlayerId;

  /** Secret zone selected by the server (1, 2, or 3). */
  serverPick: ServeNumber | null;

  /** Secret zones selected by the receiver (2 distinct numbers in 1..3). */
  receiverPicks: ServeNumber[];

  /** True once both players have confirmed selections. */
  isResolved: boolean;
}

/**
 * Result returned by the serve resolution algorithm.
 */
export interface ServeResult {
  /** True if the server scored an Ace (serverPick not in receiverPicks). */
  isAce: boolean;

  /** True if the receiver successfully covered the zone (serverPick in receiverPicks). */
  defenseSuccess: boolean;

  /** Player who served. */
  server: PlayerId;

  /** Player who received. */
  receiver: PlayerId;

  /** Zone chosen by server. */
  serverPick: ServeNumber;

  /** Zones chosen by receiver. */
  receiverPicks: ServeNumber[];

  /** If isAce is true, the server is the point winner. */
  winningPlayer?: PlayerId;
}

// ============================================================================
// 6. RALLY, CAVAÇÃO & DEFENSE DRAW CONTRACTS
// ============================================================================

/**
 * Detailed step in a rally's chronological history.
 */
export interface RallyStep {
  /** 1-based sequential stroke index within the point. */
  stepNumber: number;

  /** Player who performed this action. */
  player: PlayerId;

  /** Nature of the stroke or action. */
  actionType: 'SERVE_DEFENSE' | 'PLAY_CARD' | 'DRAW_DEFENSE' | 'DIG_ATTEMPT' | 'DECLARE_WILDCARD';

  /** Card instance that was played or drawn. */
  card: CardInstance;

  /** Declared card type if the card was a wildcard. */
  declaredAs?: CardType;

  /** Response requirement before this card was played. */
  requiredResponseBefore: RequiredResponse | null;

  /** Response requirement created for the opponent after this card was played. */
  requiredResponseAfter: RequiredResponse | null;

  /** Human-readable event description for the UI action log feed. */
  descriptionText: string;

  /** Epoch timestamp of the step. */
  timestamp: number;
}

/**
 * Active state of the ongoing ball exchange (rally).
 */
export interface RallyState {
  /** The last card placed in the center of the court. */
  lastPlayedCard: CardInstance | null;

  /**
   * If lastPlayedCard was a wildcard, this provides the effective virtual definition
   * of the declared card.
   */
  declaredCard: CardInstance | null;

  /** The response requirement currently enforced on the active player. */
  requiredResponse: RequiredResponse | null;

  /** Whose turn it is to play or respond. */
  currentTurnPlayer: PlayerId;

  /** Number of completed ball exchanges in the current point. */
  rallyLength: number;

  /** Full chronological history of strokes within the current point. */
  steps: RallyStep[];

  /** Information about a pending wildcard declaration modal, if open. */
  pendingWildcard?: {
    card: CardInstance;
    player: PlayerId;
    allowedDeclarations: CardType[];
  };
}

/**
 * Result returned by the Cavação ("digging up to 2 cards") mechanic.
 */
export interface DigResult {
  /** The card drawn from the top of the Green Deck (or null if deck was empty). */
  drawnCard: CardInstance | null;

  /** Which attempt this was (1 or 2). */
  attemptNumber: 1 | 2;

  /** Whether the drawn card legally satisfies the current requiredResponse. */
  isValid: boolean;

  /**
   * If true, the player MUST play this card immediately onto the court;
   * they are prohibited from drawing the 2nd card.
   */
  mustPlayImmediately: boolean;

  /** If true, the 1st card failed but the player is entitled to make attempt #2. */
  canDigAgain: boolean;

  /** If true, the digging player failed both attempts (or deck was empty) and loses the point. */
  pointLost: boolean;

  /** Specific diagnostic reason for the dig outcome. */
  reason: 'LEGAL_CARD_DRAWN' | 'FIRST_ATTEMPT_INVALID' | 'SECOND_ATTEMPT_INVALID' | 'GREEN_DECK_EMPTY';

  /** Updated green deck after drawing. */
  updatedGreenDeck: CardInstance[];

  /** Updated hand after drawing (if invalid, card is kept in hand). */
  updatedHand: CardInstance[];
}

/**
 * Result returned when an attack forces a draw from the Blue Defense Deck.
 */
export interface DefenseDrawResult {
  /** The card drawn from the Blue Deck (or null if deck was exhausted). */
  drawnCard: CardInstance | null;

  /**
   * If true, the Blue Deck had 0 cards remaining.
   * The defending player has no more defensive breath and the attacking player scores a WINNER.
   */
  isExhausted: boolean;

  /** If isExhausted is true, the attacking player who won the point. */
  winner?: PlayerId;

  /** Updated blue deck after drawing. */
  updatedBlueDeck: CardInstance[];
}

// ============================================================================
// 7. ARTIFICIAL INTELLIGENCE CHOICES & HEURISTICS
// ============================================================================

/**
 * AI serve selection response.
 */
export interface AIServeChoice {
  servePick: ServeNumber;
}

/**
 * AI receive selection response.
 */
export interface AIReceiveChoice {
  receivePicks: [ServeNumber, ServeNumber];
}

/**
 * AI rally stroke decision.
 */
export interface AIRallyChoice {
  action: 'PLAY_HAND' | 'PLAY_WILDCARD' | 'DIG' | 'DRAW_BLUE_DEFENSE';
  cardInstance?: CardInstance;
  declaredCardType?: CardType;
  confidence: number;
  reasoning: string;
}

/**
 * Historical pattern tracker used by Hard AI to predict player tendencies.
 */
export interface AIHistoryTracker {
  /** Frequency of player's serve zone choices (1..3). */
  playerServeFrequency: Record<ServeNumber, number>;

  /** Frequency of player's receive zone choices (1..3). */
  playerReceiveFrequency: Record<ServeNumber, number>;

  /** Total times player discarded or played each response group in current point. */
  playerDiscardedGroupsInPoint: Record<RequiredResponse, number>;

  /** Number of consecutive points server has picked the same zone. */
  consecutiveSameServeCount: number;
}

// ============================================================================
// 8. DISCRIMINATED ENGINE ACTIONS (REDUCER / STORE PAYLOADS)
// ============================================================================

export type MatchAction =
  | { type: 'START_MATCH'; payload: { format: MatchFormat; difficulty: AIDifficulty } }
  | { type: 'START_NEW_POINT' }
  | { type: 'SELECT_SERVE_ZONE'; payload: { player: PlayerId; pick: ServeNumber } }
  | { type: 'SELECT_RECEIVE_ZONES'; payload: { player: PlayerId; picks: [ServeNumber, ServeNumber] } }
  | { type: 'CONFIRM_SERVE_DUEL' }
  | { type: 'PLAY_CARD_FROM_HAND'; payload: { player: PlayerId; instanceId: string; declaredAs?: CardType } }
  | { type: 'DECLARE_WILDCARD'; payload: { player: PlayerId; instanceId: string; declaredType: CardType } }
  | { type: 'TRIGGER_BLUE_DEFENSE'; payload: { defender: PlayerId } }
  | { type: 'EXECUTE_DIG_ATTEMPT'; payload: { player: PlayerId } }
  | { type: 'RESOLVE_POINT_END'; payload: { winner: PlayerId; reason: PointEndReason } }
  | { type: 'RESTART_MATCH' };

// ============================================================================
// 9. DOMAIN EVENT PAYLOADS (AUDIO, ANIMATION, UI FEEDBACK)
// ============================================================================

export type DomainEvent =
  | { type: 'EVENT_BALL_HIT'; payload: { cardType: CardType; isAttack: boolean } }
  | { type: 'EVENT_SAND_BOUNCE' }
  | { type: 'EVENT_ACE'; payload: { server: PlayerId; zone: ServeNumber } }
  | { type: 'EVENT_DEFENSE_DRAWN'; payload: { defender: PlayerId; cardType: CardType } }
  | { type: 'EVENT_DIG_SUCCESS'; payload: { player: PlayerId; cardType: CardType; attempt: 1 | 2 } }
  | { type: 'EVENT_DIG_FAILED'; payload: { player: PlayerId; attempt: 1 | 2 } }
  | { type: 'EVENT_POINT_SCORED'; payload: { winner: PlayerId; reason: PointEndReason; newScore: ScoreState } }
  | { type: 'EVENT_GAME_WON'; payload: { winner: PlayerId; newGamesCount: number } }
  | { type: 'EVENT_SET_WON'; payload: { winner: PlayerId } }
  | { type: 'EVENT_MATCH_WON'; payload: { winner: PlayerId } };

// ============================================================================
// 10. ROOT SERIALIZABLE MATCH STATE
// ============================================================================

/**
 * Top-level immutable state snapshot representing an entire match.
 * 100% JSON-serializable.
 */
export interface MatchState {
  /** Global match phase. */
  phase: MatchPhase;

  /** Active scoring state. */
  score: ScoreState;

  /** State of human player. */
  player: PlayerState;

  /** State of AI bot player. */
  ai: PlayerState;

  /** Active rally state. */
  rally: RallyState;

  /** Active serve duel state. */
  serveDuel: ServeDuelState;

  /** AI pattern tracker. */
  aiTracker: AIHistoryTracker;

  /** Audio toggle state. */
  soundEnabled: boolean;

  /** Last recorded domain event for triggering animations/sound in UI. */
  lastEvent: DomainEvent | null;

  /** Log of textual announcements displayed in the match feed. */
  actionLog: string[];
}

/**
 * Injectable Random Number Generator signature for 100% deterministic unit tests.
 */
export type RNG = () => number;
