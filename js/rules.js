/**
 * Official Global Rules of Casino Blackjack Engine
 * Adheres strictly to Vegas Strip / International Casino Standards (6 Decks, S17, 3:2 BJ, Insurance, Split, Double, Surrender)
 */

const SUITS = [
    { code: 'S', symbol: '♠', name: 'Spades', color: 'black' },
    { code: 'H', symbol: '♥', name: 'Hearts', color: 'red' },
    { code: 'D', symbol: '♦', name: 'Diamonds', color: 'red' },
    { code: 'C', symbol: '♣', name: 'Clubs', color: 'black' }
];

const RANKS = [
    { code: '2', label: '2', value: 2 },
    { code: '3', label: '3', value: 3 },
    { code: '4', label: '4', value: 4 },
    { code: '5', label: '5', value: 5 },
    { code: '6', label: '6', value: 6 },
    { code: '7', label: '7', value: 7 },
    { code: '8', label: '8', value: 8 },
    { code: '9', label: '9', value: 9 },
    { code: '10', label: '10', value: 10 },
    { code: 'J', label: 'J', value: 10, isFace: true },
    { code: 'Q', label: 'Q', value: 10, isFace: true },
    { code: 'K', label: 'K', value: 10, isFace: true },
    { code: 'A', label: 'A', value: 11, isAce: true }
];

class Card {
    constructor(suit, rank, deckIndex = 0) {
        this.suit = suit;
        this.rank = rank;
        this.deckIndex = deckIndex;
        this.id = `${rank.code}${suit.code}_${deckIndex}_${Math.random().toString(36).substr(2, 6)}`;
        this.faceUp = true;
    }

    get isRed() {
        return this.suit.color === 'red';
    }

    // Hi-Lo card counting value
    get countValue() {
        if (this.rank.value >= 2 && this.rank.value <= 6) return +1;
        if (this.rank.value >= 7 && this.rank.value <= 9) return 0;
        return -1; // 10, J, Q, K, A
    }

    toJSON() {
        return {
            s: this.suit.code,
            r: this.rank.code,
            d: this.deckIndex,
            id: this.id,
            up: this.faceUp
        };
    }

    static fromJSON(data) {
        const suit = SUITS.find(s => s.code === data.s);
        const rank = RANKS.find(r => r.code === data.r);
        const card = new Card(suit, rank, data.d);
        card.id = data.id;
        card.faceUp = data.up !== false;
        return card;
    }
}

class Shoe {
    constructor(deckCount = 6) {
        this.deckCount = deckCount;
        this.cards = [];
        this.discards = [];
        this.cutCardPosition = 0;
        this.runningCount = 0;
        this.burnedCard = null;
        this.reset();
    }

    reset() {
        this.cards = [];
        this.discards = [];
        this.runningCount = 0;

        for (let d = 0; d < this.deckCount; d++) {
            for (const suit of SUITS) {
                for (const rank of RANKS) {
                    this.cards.push(new Card(suit, rank, d));
                }
            }
        }

        this.shuffle();

        // Standard casino penetration: cut card placed between 60-75 cards from bottom (~75% depth)
        const totalCards = this.cards.length;
        this.cutCardPosition = Math.floor(totalCards * 0.25); // remaining when reshuffle triggered

        // Official casino ritual: burn the first card face down
        if (this.cards.length > 0) {
            this.burnedCard = this.cards.pop();
            this.discards.push(this.burnedCard);
        }
    }

    shuffle() {
        // High quality Fisher-Yates shuffle
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    draw(faceUp = true) {
        if (this.cards.length === 0) {
            this.reset();
        }
        const card = this.cards.pop();
        card.faceUp = faceUp;

        if (faceUp) {
            this.runningCount += card.countValue;
        }

        return card;
    }

    revealCard(card) {
        if (!card.faceUp) {
            card.faceUp = true;
            this.runningCount += card.countValue;
        }
    }

    get remainingCards() {
        return this.cards.length;
    }

    get totalCards() {
        return this.deckCount * 52;
    }

    get needsReshuffle() {
        return this.cards.length <= this.cutCardPosition;
    }

    get remainingDecks() {
        return Math.max(0.5, Math.round((this.cards.length / 52) * 2) / 2);
    }

    get trueCount() {
        const decks = this.remainingDecks;
        return decks > 0 ? (this.runningCount / decks).toFixed(1) : 0;
    }
}

/**
 * Hand calculation and rules logic
 */
class BlackjackRules {
    /**
     * Calculates the point value of a hand, handling soft Aces optimally
     * @param {Card[]} cards 
     * @returns {{ value: number, isSoft: boolean, isBlackjack: boolean, isBust: boolean, is21: boolean, isPair: boolean }}
     */
    static evaluateHand(cards) {
        if (!cards || cards.length === 0) {
            return { value: 0, isSoft: false, isBlackjack: false, isBust: false, is21: false, isPair: false };
        }

        let value = 0;
        let aceCount = 0;

        for (const card of cards) {
            if (!card.faceUp) continue; // skip unrevealed cards
            if (card.rank.isAce) {
                aceCount++;
                value += 11;
            } else {
                value += card.rank.value;
            }
        }

        // Reduce Aces from 11 to 1 as needed to avoid busting
        let isSoft = false;
        while (value > 21 && aceCount > 0) {
            value -= 10;
            aceCount--;
        }

        // If at least one Ace is still counting as 11, it's a soft hand
        if (aceCount > 0 && value <= 21) {
            isSoft = true;
        }

        const isBust = value > 21;
        const is21 = value === 21;
        // Natural Blackjack: precisely 2 cards, one Ace and one 10-value card (total 21 on initial deal)
        const isBlackjack = (cards.length === 2 && value === 21 && cards.every(c => c.faceUp));

        // Check if hand can be split (first two cards have identical rank value)
        const isPair = (cards.length === 2 && cards[0].rank.value === cards[1].rank.value);

        return {
            value,
            isSoft,
            isBlackjack,
            isBust,
            is21,
            isPair
        };
    }

    /**
     * Returns true if hand can double down (official rule: allowed on initial 2 cards)
     */
    static canDoubleDown(hand, playerChips) {
        return hand.cards.length === 2 && !hand.isDoubled && playerChips >= hand.bet && !hand.isFromSplitAce;
    }

    /**
     * Returns true if hand can be split
     */
    static canSplit(hand, playerChips, maxSplits = 3, currentHandCount = 1) {
        if (hand.cards.length !== 2) return false;
        if (currentHandCount >= maxSplits) return false;
        if (playerChips < hand.bet) return false;
        if (hand.isFromSplitAce) return false; // Vegas rule: no re-splitting Aces
        return hand.cards[0].rank.value === hand.cards[1].rank.value;
    }

    /**
     * Returns true if late surrender is permissible (first 2 cards before any hits)
     */
    static canSurrender(hand) {
        return hand.cards.length === 2 && !hand.isSplitHand && !hand.hasHit;
    }

    /**
     * Basic Strategy Matrix (Vegas Strip 6-deck S17)
     * Provides mathematically optimal recommendation:
     * 'H' (Hit), 'S' (Stand), 'D' (Double), 'P' (Split), 'Rh' (Surrender / Hit)
     */
    static getStrategyRecommendation(playerHand, dealerUpCard) {
        if (!playerHand || playerHand.cards.length < 2 || !dealerUpCard) return null;

        const evalResult = this.evaluateHand(playerHand.cards);
        const dealerVal = dealerUpCard.rank.value; // 2-11 (Ace = 11)
        const c1 = playerHand.cards[0];
        const c2 = playerHand.cards[1];

        // 1. Pair Splitting (initial 2 cards only)
        if (playerHand.cards.length === 2 && c1.rank.value === c2.rank.value) {
            const pairVal = c1.rank.value;
            if (c1.rank.isAce) return { action: 'SPLIT', desc: 'Always split Aces' };
            if (pairVal === 10) return { action: 'STAND', desc: 'Never split 10s (strong 20)' };
            if (pairVal === 9) {
                if ([7, 10, 11].includes(dealerVal)) return { action: 'STAND', desc: 'Stand on 9-9 vs 7, 10, Ace' };
                return { action: 'SPLIT', desc: 'Split 9-9 vs 2-6, 8, 9' };
            }
            if (pairVal === 8) return { action: 'SPLIT', desc: 'Always split 8-8 (avoid hard 16)' };
            if (pairVal === 7) {
                if (dealerVal <= 7) return { action: 'SPLIT', desc: 'Split 7-7 vs dealer 2-7' };
                return { action: 'HIT', desc: 'Hit 7-7 vs dealer 8+' };
            }
            if (pairVal === 6) {
                if (dealerVal >= 3 && dealerVal <= 6) return { action: 'SPLIT', desc: 'Split 6-6 vs dealer 3-6' };
                return { action: 'HIT', desc: 'Hit 6-6 vs other upcards' };
            }
            if (pairVal === 5) {
                if (dealerVal <= 9) return { action: 'DOUBLE', desc: 'Double down on 10 total vs dealer 2-9' };
                return { action: 'HIT', desc: 'Hit 5-5 vs dealer 10 or Ace' };
            }
            if (pairVal === 4) {
                if (dealerVal === 5 || dealerVal === 6) return { action: 'SPLIT', desc: 'Split 4-4 vs dealer 5-6' };
                return { action: 'HIT', desc: 'Hit 4-4 vs other upcards' };
            }
            if (pairVal === 2 || pairVal === 3) {
                if (dealerVal >= 4 && dealerVal <= 7) return { action: 'SPLIT', desc: 'Split 2s & 3s vs dealer 4-7' };
                return { action: 'HIT', desc: 'Hit 2s & 3s vs other upcards' };
            }
        }

        // 2. Soft Totals (Hand with usable Ace)
        if (evalResult.isSoft && playerHand.cards.length === 2) {
            const nonAceCard = playerHand.cards[0].rank.isAce ? playerHand.cards[1] : playerHand.cards[0];
            const otherVal = nonAceCard.rank.value;

            if (evalResult.value >= 20) return { action: 'STAND', desc: 'Always stand on Soft 20+' };
            if (evalResult.value === 19) {
                if (dealerVal === 6) return { action: 'DOUBLE', desc: 'Double Soft 19 vs dealer 6, else stand' };
                return { action: 'STAND', desc: 'Stand on Soft 19' };
            }
            if (evalResult.value === 18) {
                if (dealerVal >= 2 && dealerVal <= 6) return { action: 'DOUBLE', desc: 'Double Soft 18 vs dealer 2-6' };
                if (dealerVal === 7 || dealerVal === 8) return { action: 'STAND', desc: 'Stand on Soft 18 vs dealer 7-8' };
                return { action: 'HIT', desc: 'Hit Soft 18 vs dealer 9, 10, Ace' };
            }
            if (evalResult.value === 17) {
                if (dealerVal >= 3 && dealerVal <= 6) return { action: 'DOUBLE', desc: 'Double Soft 17 vs dealer 3-6' };
                return { action: 'HIT', desc: 'Hit Soft 17 vs other upcards' };
            }
            if (evalResult.value === 15 || evalResult.value === 16) {
                if (dealerVal >= 4 && dealerVal <= 6) return { action: 'DOUBLE', desc: 'Double Soft 15-16 vs dealer 4-6' };
                return { action: 'HIT', desc: 'Hit Soft 15-16' };
            }
            if (evalResult.value === 13 || evalResult.value === 14) {
                if (dealerVal === 5 || dealerVal === 6) return { action: 'DOUBLE', desc: 'Double Soft 13-14 vs dealer 5-6' };
                return { action: 'HIT', desc: 'Hit Soft 13-14' };
            }
        }

        // 3. Hard Totals
        const total = evalResult.value;
        if (total >= 17) return { action: 'STAND', desc: `Always stand on Hard ${total}` };
        if (total === 16) {
            if (playerHand.cards.length === 2 && [9, 10, 11].includes(dealerVal)) {
                return { action: 'SURRENDER', desc: 'Surrender Hard 16 vs dealer 9, 10, Ace (or Hit)' };
            }
            if (dealerVal <= 6) return { action: 'STAND', desc: 'Stand on 16 vs dealer bust cards (2-6)' };
            return { action: 'HIT', desc: 'Hit 16 vs dealer 7+' };
        }
        if (total === 15) {
            if (playerHand.cards.length === 2 && dealerVal === 10) {
                return { action: 'SURRENDER', desc: 'Surrender Hard 15 vs dealer 10 (or Hit)' };
            }
            if (dealerVal <= 6) return { action: 'STAND', desc: 'Stand on 15 vs dealer bust cards (2-6)' };
            return { action: 'HIT', desc: 'Hit 15 vs dealer 7+' };
        }
        if (total === 13 || total === 14) {
            if (dealerVal <= 6) return { action: 'STAND', desc: `Stand on Hard ${total} vs dealer 2-6` };
            return { action: 'HIT', desc: `Hit Hard ${total} vs dealer 7+` };
        }
        if (total === 12) {
            if (dealerVal >= 4 && dealerVal <= 6) return { action: 'STAND', desc: 'Stand on 12 vs dealer 4-6' };
            return { action: 'HIT', desc: 'Hit 12 vs dealer 2, 3, 7+' };
        }
        if (total === 11) {
            return { action: 'DOUBLE', desc: 'Always double on 11 (otherwise Hit)' };
        }
        if (total === 10) {
            if (dealerVal <= 9) return { action: 'DOUBLE', desc: 'Double on 10 vs dealer 2-9' };
            return { action: 'HIT', desc: 'Hit on 10 vs dealer 10 or Ace' };
        }
        if (total === 9) {
            if (dealerVal >= 3 && dealerVal <= 6) return { action: 'DOUBLE', desc: 'Double on 9 vs dealer 3-6' };
            return { action: 'HIT', desc: 'Hit on 9 vs dealer 2, 7+' };
        }
        return { action: 'HIT', desc: `Always hit on Hard ${total}` };
    }
}

// Global export for vanilla scripts
window.Card = Card;
window.Shoe = Shoe;
window.BlackjackRules = BlackjackRules;
window.SUITS = SUITS;
window.RANKS = RANKS;
