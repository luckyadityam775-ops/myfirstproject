/**
 * Royal Palace VIP Blackjack Game Controller
 * Fully implements official global casino blackjack rules (Vegas Strip S17, 6 decks, peek, insurance, split, double, surrender)
 */

class BlackjackGame {
    constructor() {
        this.shoe = new Shoe(6);
        this.seats = [];
        this.dealer = { cards: [], status: 'waiting' };
        this.phase = 'BETTING'; // BETTING, DEALING, INSURANCE_DECISION, PEEK_CHECK, PLAYER_TURNS, DEALER_TURN, PAYOUT, ROUND_OVER
        this.activeSeatIndex = 0;
        this.activeHandIndex = 0;
        this.selectedChip = 25;
        this.gameMode = 'solo'; // 'solo', 'local', 'online'
        this.botsEnabled = true;
        this.minBet = 10;
        this.maxBet = 2500;
        this.tableRules = {
            dealerStands17: true, // S17
            blackjackPayout: 1.5, // 3:2
            insurancePayout: 2.0, // 2:1
            doubleAnyTwoCards: true,
            splitAcesOneCard: true,
            maxSplits: 3,
            lateSurrender: true
        };

        this.mySeatIndex = 2; // Center seat by default (Seat 3)
        this.myBankroll = 2500;
        this.lastBets = [0, 0, 0, 0, 0];

        this.stats = {
            roundsPlayed: 0,
            wins: 0,
            losses: 0,
            pushes: 0,
            blackjacks: 0,
            currentStreak: 0,
            bestStreak: 0,
            netProfit: 0,
            totalWon: 0
        };

        this.botTemplates = [
            { name: 'Elena', avatar: '👩‍💼', bankroll: 3200, minBet: 25, maxBet: 100 },
            { name: 'Marcus', avatar: '🤵', bankroll: 4500, minBet: 50, maxBet: 200 },
            { name: 'Sophia', avatar: '💃', bankroll: 2600, minBet: 10, maxBet: 50 },
            { name: 'Kenji', avatar: '🧑‍💻', bankroll: 3800, minBet: 25, maxBet: 150 }
        ];

        this.multiplayer = new MultiplayerManager(this);
        this.initSeats();
        this.loadStats();
    }

    initSeats() {
        this.seats = [];
        for (let i = 0; i < 5; i++) {
            this.seats.push({
                index: i,
                occupied: false,
                player: null,
                hands: [{
                    cards: [],
                    bet: 0,
                    status: 'betting', // 'betting', 'active', 'stood', 'bust', 'blackjack', 'surrendered'
                    isDoubled: false,
                    isSplitHand: false,
                    isFromSplitAce: false,
                    hasHit: false,
                    payoutWon: 0,
                    resultText: ''
                }],
                insuranceBet: 0,
                insuranceResult: null
            });
        }

        // Set default local seat for player at center seat (Index 2)
        this.sitPlayer(2, {
            id: this.multiplayer.myPlayerId,
            name: 'Pemain 1',
            avatar: '👑',
            isLocal: true,
            isBot: false,
            bankroll: this.myBankroll
        });

        // Add AI bots to other seats if enabled
        this.updateBotsInSeats();
    }

    updateBotsInSeats() {
        if (!this.botsEnabled) {
            // Remove bots
            this.seats.forEach(seat => {
                if (seat.player && seat.player.isBot) {
                    this.vacateSeat(seat.index);
                }
            });
            return;
        }

        // Populate vacant seats with bots (seats 1 and 3 by default for balanced table)
        const botSeats = [1, 3];
        botSeats.forEach((seatIdx, idx) => {
            const seat = this.seats[seatIdx];
            if (!seat.occupied) {
                const tmpl = this.botTemplates[idx % this.botTemplates.length];
                this.sitPlayer(seatIdx, {
                    id: 'bot_' + seatIdx,
                    name: tmpl.name,
                    avatar: tmpl.avatar,
                    isLocal: false,
                    isBot: true,
                    bankroll: tmpl.bankroll
                });
            }
        });
    }

    sitPlayer(seatIdx, player) {
        if (seatIdx < 0 || seatIdx >= 5) return;
        this.seats[seatIdx].occupied = true;
        this.seats[seatIdx].player = player;
        this.seats[seatIdx].hands = [{
            cards: [],
            bet: 0,
            status: 'betting',
            isDoubled: false,
            isSplitHand: false,
            isFromSplitAce: false,
            hasHit: false,
            payoutWon: 0,
            resultText: ''
        }];
        this.seats[seatIdx].insuranceBet = 0;
        this.seats[seatIdx].insuranceResult = null;
        this.renderSeats();
    }

    vacateSeat(seatIdx) {
        if (seatIdx < 0 || seatIdx >= 5) return;
        this.seats[seatIdx].occupied = false;
        this.seats[seatIdx].player = null;
        this.seats[seatIdx].hands = [{
            cards: [],
            bet: 0,
            status: 'betting',
            isDoubled: false,
            isSplitHand: false,
            isFromSplitAce: false,
            hasHit: false,
            payoutWon: 0,
            resultText: ''
        }];
        this.seats[seatIdx].insuranceBet = 0;
        this.seats[seatIdx].insuranceResult = null;
        this.renderSeats();
    }

    // Chip handling & Betting
    selectChip(value) {
        this.selectedChip = value;
        window.soundEngine.playClick();
        this.renderChipSelector();
    }

    placeBet(seatIdx, amount = null) {
        if (this.phase !== 'BETTING') return;
        const seat = this.seats[seatIdx];
        if (!seat.occupied || !seat.player) return;

        // In online mode as client, only bet on own seat
        if (this.gameMode === 'online' && !this.multiplayer.isHost) {
            if (seat.player.id !== this.multiplayer.myPlayerId) return;
        }

        if (seat.player.bankroll <= 0 && seat.hands[0].bet === 0) {
            this.checkAndGrantZeroBalanceBonus();
            return;
        }

        const addAmount = amount || this.selectedChip;
        if (seat.player.bankroll < addAmount) {
            if (seat.player.bankroll <= 0) {
                this.checkAndGrantZeroBalanceBonus();
            } else {
                this.showToast('Saldo tidak mencukupi untuk taruhan ini!');
            }
            return;
        }

        const currentBet = seat.hands[0].bet;
        if (currentBet + addAmount > this.maxBet) {
            this.showToast(`Batas maksimal taruhan per tangan adalah $${this.maxBet}!`);
            return;
        }

        seat.player.bankroll -= addAmount;
        seat.hands[0].bet += addAmount;
        if (seat.player.isLocal && seat.player.id === this.multiplayer.myPlayerId) {
            this.myBankroll = seat.player.bankroll;
        }

        window.soundEngine.playChip();
        this.renderSeats();
        this.renderHeader();
        this.updateControlButtons();

        // Broadcast if in multiplayer
        if (this.gameMode === 'online') {
            if (this.multiplayer.isHost) {
                this.multiplayer.broadcast({
                    type: 'BET_PLACED',
                    seatIdx: seatIdx,
                    bet: seat.hands[0].bet,
                    bankroll: seat.player.bankroll
                });
            } else {
                this.multiplayer.sendToHost({
                    type: 'CLIENT_BET',
                    seatIdx: seatIdx,
                    amount: addAmount
                });
            }
        }
    }

    clearBet(seatIdx) {
        if (this.phase !== 'BETTING') return;
        const seat = this.seats[seatIdx];
        if (!seat.occupied || !seat.player) return;

        const currentBet = seat.hands[0].bet;
        if (currentBet > 0) {
            seat.player.bankroll += currentBet;
            seat.hands[0].bet = 0;
            if (seat.player.isLocal && seat.player.id === this.multiplayer.myPlayerId) {
                this.myBankroll = seat.player.bankroll;
            }
            window.soundEngine.playChip();
            this.renderSeats();
            this.renderHeader();
            this.updateControlButtons();
        }
    }

    clearAllBets() {
        if (this.phase !== 'BETTING') return;
        this.seats.forEach(seat => {
            if (seat.occupied && seat.player && (seat.player.isLocal || this.gameMode !== 'online')) {
                this.clearBet(seat.index);
            }
        });
    }

    doubleAllBets() {
        if (this.phase !== 'BETTING') return;
        this.seats.forEach(seat => {
            if (seat.occupied && seat.player && (seat.player.isLocal || this.gameMode !== 'online')) {
                const cur = seat.hands[0].bet;
                if (cur > 0 && seat.player.bankroll >= cur && cur * 2 <= this.maxBet) {
                    this.placeBet(seat.index, cur);
                }
            }
        });
    }

    rebetAll() {
        if (this.phase !== 'BETTING') return;
        this.seats.forEach(seat => {
            if (seat.occupied && seat.player && (seat.player.isLocal || this.gameMode !== 'online')) {
                const last = this.lastBets[seat.index] || 0;
                if (last > 0 && seat.hands[0].bet === 0 && seat.player.bankroll >= last) {
                    this.placeBet(seat.index, last);
                }
            }
        });
    }

    // AI Bots bet automatically
    placeBotBets() {
        this.seats.forEach(seat => {
            if (seat.occupied && seat.player && seat.player.isBot && seat.hands[0].bet === 0) {
                const tmpl = this.botTemplates.find(b => b.name === seat.player.name) || { minBet: 25, maxBet: 100 };
                // Bet sensible multiples of 5 or 25
                const bets = [25, 50, 75, 100];
                const bet = bets[Math.floor(Math.random() * bets.length)];
                if (seat.player.bankroll >= bet) {
                    seat.player.bankroll -= bet;
                    seat.hands[0].bet = bet;
                }
            }
        });
    }

    // START DEALING
    async startDeal() {
        if (this.phase !== 'BETTING') return;

        // Auto bet for bots
        this.placeBotBets();

        // Check if at least one seat has a valid bet >= minBet
        const activeSeats = this.seats.filter(s => s.occupied && s.player && s.hands[0].bet >= this.minBet);
        if (activeSeats.length === 0) {
            this.showToast(`Pasang taruhan minimal $${this.minBet} untuk memulai!`);
            return;
        }

        // Save last bets for rebet
        this.seats.forEach(seat => {
            this.lastBets[seat.index] = seat.occupied ? seat.hands[0].bet : 0;
        });

        // Check shoe reshuffle
        if (this.shoe.needsReshuffle) {
            this.showAnnouncer(window.i18n.t('reshuffle_notice'));
            await this.sleep(1200);
            this.shoe.reset();
        }

        this.phase = 'DEALING';
        this.dealer = { cards: [], status: 'active' };
        this.seats.forEach(seat => {
            if (seat.occupied && seat.hands[0].bet > 0) {
                seat.hands[0].cards = [];
                seat.hands[0].status = 'active';
                seat.hands[0].isDoubled = false;
                seat.hands[0].isSplitHand = false;
                seat.hands[0].isFromSplitAce = false;
                seat.hands[0].hasHit = false;
                seat.hands[0].payoutWon = 0;
                seat.hands[0].resultText = '';
                seat.insuranceBet = 0;
                seat.insuranceResult = null;
            } else {
                seat.hands[0].status = 'betting';
                seat.hands[0].cards = [];
            }
        });

        this.renderSeats();
        this.renderDealer();
        this.updateControlButtons();
        this.showAnnouncer(window.i18n.t('bet_time') + ' selesai. Membagikan kartu...');

        // Deal initial 2 cards to each player and dealer:
        // Round 1: 1 card to each active player, 1 card to dealer (face up)
        for (const seat of activeSeats) {
            const card = this.shoe.draw(true);
            seat.hands[0].cards.push(card);
            window.soundEngine.playCardDeal();
            this.renderSeats();
            await this.sleep(260);
        }

        // Dealer 1st card face up
        const dealerCard1 = this.shoe.draw(true);
        this.dealer.cards.push(dealerCard1);
        window.soundEngine.playCardDeal();
        this.renderDealer();
        await this.sleep(260);

        // Round 2: 2nd card to each active player
        for (const seat of activeSeats) {
            const card = this.shoe.draw(true);
            seat.hands[0].cards.push(card);
            window.soundEngine.playCardDeal();
            this.renderSeats();
            await this.sleep(260);
        }

        // Dealer 2nd card (Hole card, face down)
        const dealerHoleCard = this.shoe.draw(false);
        this.dealer.cards.push(dealerHoleCard);
        window.soundEngine.playCardDeal();
        this.renderDealer();
        await this.sleep(300);

        this.renderHeader(); // update count

        // Check for player natural Blackjacks
        for (const seat of activeSeats) {
            const evalH = BlackjackRules.evaluateHand(seat.hands[0].cards);
            if (evalH.isBlackjack) {
                seat.hands[0].status = 'blackjack';
            }
        }
        this.renderSeats();

        // Vegas Strip Dealer Peek Phase
        await this.handleDealerPeekAndInsurance(activeSeats);
    }

    async handleDealerPeekAndInsurance(activeSeats) {
        const dealerUpCard = this.dealer.cards[0];

        // 1. DEALER SHOWS ACE -> Offer Insurance & Even Money
        if (dealerUpCard.rank.isAce) {
            this.phase = 'INSURANCE_DECISION';
            this.showAnnouncer('Dealer menunjukkan As! Tawaran Asuransi & Even Money...');
            this.updateControlButtons();

            // Prompt insurance for human players
            await this.resolveInsuranceDecisions(activeSeats);
        }

        // 2. DEALER PEEKS FOR BLACKJACK (if upcard is Ace or 10-value)
        if (dealerUpCard.rank.isAce || dealerUpCard.rank.value === 10) {
            this.phase = 'PEEK_CHECK';
            this.showAnnouncer('Dealer mengintip Hole Card...');
            await this.sleep(700);

            // Evaluate dealer 2-card hand
            const dealerEval = BlackjackRules.evaluateHand(this.dealer.cards.map(c => ({ ...c, faceUp: true })));

            if (dealerEval.isBlackjack) {
                // DEALER HAS BLACKJACK! Reveal hole card
                this.shoe.revealCard(this.dealer.cards[1]);
                window.soundEngine.playCardFlip();
                this.dealer.status = 'blackjack';
                this.renderDealer();
                this.renderHeader();
                window.soundEngine.playBust();
                this.showAnnouncer(window.i18n.t('dealer_bj'));
                await this.sleep(1200);

                // Settle immediately
                await this.settleRound();
                return;
            } else {
                // Dealer does NOT have BJ
                this.showAnnouncer(window.i18n.t('dealer_no_bj'));
                await this.sleep(700);

                // Any player who took insurance loses it
                activeSeats.forEach(seat => {
                    if (seat.insuranceBet > 0) {
                        seat.insuranceResult = 'lost';
                    }
                });

                // Players who had natural Blackjack get paid 3:2 immediately!
                for (const seat of activeSeats) {
                    if (seat.hands[0].status === 'blackjack') {
                        this.showAnnouncer(`${seat.player.name}: ${window.i18n.t('player_blackjack')}`);
                        window.soundEngine.playBlackjack();
                        await this.sleep(800);
                    }
                }
            }
        }

        // Proceed to Player Turns
        await this.startPlayerTurns(activeSeats);
    }

    async resolveInsuranceDecisions(activeSeats) {
        for (const seat of activeSeats) {
            const hasBJ = seat.hands[0].status === 'blackjack';
            const cost = Math.floor(seat.hands[0].bet * 0.5);

            if (seat.player.isBot) {
                // Bot decision: card count logic
                if (parseFloat(this.shoe.trueCount) >= 3.0 && seat.player.bankroll >= cost) {
                    seat.player.bankroll -= cost;
                    seat.insuranceBet = cost;
                }
            } else if (seat.player.isLocal || (this.gameMode === 'online' && seat.player.id === this.multiplayer.myPlayerId)) {
                // Human decision modal
                if (hasBJ) {
                    const takeEvenMoney = await this.promptEvenMoneyDialog(seat);
                    if (takeEvenMoney) {
                        // Even money pays 1:1 immediately and hand ends
                        seat.hands[0].status = 'even_money';
                        const payout = seat.hands[0].bet * 2;
                        seat.player.bankroll += payout;
                        this.showToast(`${seat.player.name} mengambil Even Money 1:1!`);
                    }
                } else if (seat.player.bankroll >= cost) {
                    const takeIns = await this.promptInsuranceDialog(seat, cost);
                    if (takeIns) {
                        seat.player.bankroll -= cost;
                        seat.insuranceBet = cost;
                        window.soundEngine.playChip();
                        this.renderSeats();
                        this.renderHeader();
                    }
                }
            }
        }
    }

    promptInsuranceDialog(seat, cost) {
        return new Promise((resolve) => {
            const modal = document.getElementById('insurance-modal');
            const desc = document.getElementById('insurance-modal-desc');
            const yesBtn = document.getElementById('insurance-yes-btn');
            const noBtn = document.getElementById('insurance-no-btn');

            desc.textContent = `${seat.player.name}: ${window.i18n.t('insurance_desc')} ($${cost})`;
            modal.classList.add('active');

            const cleanup = (choice) => {
                modal.classList.remove('active');
                yesBtn.onclick = null;
                noBtn.onclick = null;
                resolve(choice);
            };

            yesBtn.onclick = () => cleanup(true);
            noBtn.onclick = () => cleanup(false);
        });
    }

    promptEvenMoneyDialog(seat) {
        return new Promise((resolve) => {
            const modal = document.getElementById('even-money-modal');
            const desc = document.getElementById('even-money-modal-desc');
            const yesBtn = document.getElementById('even-money-yes-btn');
            const noBtn = document.getElementById('even-money-no-btn');

            desc.textContent = `${seat.player.name}: ${window.i18n.t('even_money_desc')}`;
            modal.classList.add('active');

            const cleanup = (choice) => {
                modal.classList.remove('active');
                yesBtn.onclick = null;
                noBtn.onclick = null;
                resolve(choice);
            };

            yesBtn.onclick = () => cleanup(true);
            noBtn.onclick = () => cleanup(false);
        });
    }

    // PLAYER TURNS
    async startPlayerTurns(activeSeats) {
        this.phase = 'PLAYER_TURNS';
        this.updateControlButtons();

        for (let sIdx = 0; sIdx < this.seats.length; sIdx++) {
            const seat = this.seats[sIdx];
            if (!seat.occupied || !seat.player || seat.hands[0].bet === 0) continue;

            this.activeSeatIndex = sIdx;

            // Iterate over hands (e.g. if split, hand 0 and hand 1)
            for (let hIdx = 0; hIdx < seat.hands.length; hIdx++) {
                this.activeHandIndex = hIdx;
                const hand = seat.hands[hIdx];

                if (hand.status === 'blackjack' || hand.status === 'even_money') {
                    continue; // already finalized
                }

                hand.status = 'active';
                this.renderSeats();
                this.updateControlButtons();

                // If hand is split Aces, rule: 1 card dealt automatically and then stood!
                if (hand.isFromSplitAce) {
                    this.showAnnouncer(`${seat.player.name}: Split As selesai (1 kartu).`);
                    await this.sleep(700);
                    hand.status = 'stood';
                    this.renderSeats();
                    continue;
                }

                // If hand evaluated to 21 immediately, auto stand
                const evalHand = BlackjackRules.evaluateHand(hand.cards);
                if (evalHand.value === 21) {
                    hand.status = 'stood';
                    this.renderSeats();
                    continue;
                }

                this.showAnnouncer(`Giliran ${seat.player.name} (Tangan ${hIdx + 1})...`);

                if (seat.player.isBot) {
                    await this.executeBotTurn(seat, hand);
                } else if (seat.player.isLocal || (this.gameMode === 'online' && seat.player.id === this.multiplayer.myPlayerId)) {
                    // Wait for human player action
                    await this.waitForHumanAction(seat, hand);
                } else {
                    // Wait for network client turn
                    await this.waitForNetworkClientAction(seat, hand);
                }
            }
        }

        // All players done! Proceed to dealer
        await this.startDealerTurn();
    }

    waitForHumanAction(seat, hand) {
        return new Promise((resolve) => {
            this.currentActionResolver = resolve;
            this.updateControlButtons();
        });
    }

    waitForNetworkClientAction(seat, hand) {
        return new Promise((resolve) => {
            this.currentActionResolver = resolve;
            this.updateControlButtons();
        });
    }

    async executeBotTurn(seat, hand) {
        while (hand.status === 'active') {
            await this.sleep(900);
            const dealerUpCard = this.dealer.cards[0];
            const advice = BlackjackRules.getStrategyRecommendation(hand, dealerUpCard);

            let action = advice ? advice.action : 'HIT';

            // Check if action is valid
            if (action === 'SPLIT' && (!BlackjackRules.canSplit(hand, seat.player.bankroll, this.tableRules.maxSplits, seat.hands.length))) {
                action = 'HIT';
            }
            if (action === 'DOUBLE' && (!BlackjackRules.canDoubleDown(hand, seat.player.bankroll))) {
                action = 'HIT';
            }
            if (action === 'SURRENDER' && (!BlackjackRules.canSurrender(hand))) {
                action = 'HIT';
            }

            if (action === 'SPLIT') {
                this.splitAction(seat.index, this.activeHandIndex);
                break; // Hand array modified, loop will re-enter
            } else if (action === 'DOUBLE') {
                this.doubleDownAction(seat.index, this.activeHandIndex);
                break;
            } else if (action === 'SURRENDER') {
                this.surrenderAction(seat.index, this.activeHandIndex);
                break;
            } else if (action === 'HIT') {
                const bust = this.hitAction(seat.index, this.activeHandIndex);
                if (bust) break;
            } else {
                // STAND
                this.standAction(seat.index, this.activeHandIndex);
                break;
            }
        }
    }

    // ACTIONS: HIT, STAND, DOUBLE, SPLIT, SURRENDER
    hitAction(seatIdx = this.activeSeatIndex, handIdx = this.activeHandIndex) {
        const seat = this.seats[seatIdx];
        const hand = seat.hands[handIdx];
        if (!hand || hand.status !== 'active') return false;

        const card = this.shoe.draw(true);
        hand.cards.push(card);
        hand.hasHit = true;
        window.soundEngine.playCardDeal();

        this.renderSeats();
        this.renderHeader(); // update counts

        const evalH = BlackjackRules.evaluateHand(hand.cards);
        if (evalH.isBust) {
            hand.status = 'bust';
            window.soundEngine.playBust();
            this.showToast(`${seat.player.name}: BUST! (${evalH.value})`);
            this.renderSeats();
            this.advanceTurn();
            return true;
        } else if (evalH.value === 21) {
            hand.status = 'stood';
            this.renderSeats();
            this.advanceTurn();
            return false;
        }

        this.updateControlButtons();
        return false;
    }

    standAction(seatIdx = this.activeSeatIndex, handIdx = this.activeHandIndex) {
        const seat = this.seats[seatIdx];
        const hand = seat.hands[handIdx];
        if (!hand || hand.status !== 'active') return;

        hand.status = 'stood';
        window.soundEngine.playClick();
        this.renderSeats();
        this.advanceTurn();
    }

    doubleDownAction(seatIdx = this.activeSeatIndex, handIdx = this.activeHandIndex) {
        const seat = this.seats[seatIdx];
        const hand = seat.hands[handIdx];
        if (!hand || hand.status !== 'active') return;
        if (!BlackjackRules.canDoubleDown(hand, seat.player.bankroll)) {
            this.showToast('Tidak dapat melakukan Double Down!');
            return;
        }

        seat.player.bankroll -= hand.bet;
        hand.bet *= 2;
        hand.isDoubled = true;
        if (seat.player.isLocal && seat.player.id === this.multiplayer.myPlayerId) {
            this.myBankroll = seat.player.bankroll;
        }

        window.soundEngine.playChip();
        const card = this.shoe.draw(true);
        hand.cards.push(card);
        window.soundEngine.playCardDeal();

        const evalH = BlackjackRules.evaluateHand(hand.cards);
        if (evalH.isBust) {
            hand.status = 'bust';
            window.soundEngine.playBust();
        } else {
            hand.status = 'stood';
        }

        this.renderSeats();
        this.renderHeader();
        this.advanceTurn();
    }

    splitAction(seatIdx = this.activeSeatIndex, handIdx = this.activeHandIndex) {
        const seat = this.seats[seatIdx];
        const hand = seat.hands[handIdx];
        if (!hand || hand.status !== 'active') return;
        if (!BlackjackRules.canSplit(hand, seat.player.bankroll, this.tableRules.maxSplits, seat.hands.length)) {
            this.showToast('Tidak dapat melakukan Split!');
            return;
        }

        const isAceSplit = hand.cards[0].rank.isAce;

        // Deduct matching bet
        seat.player.bankroll -= hand.bet;
        if (seat.player.isLocal && seat.player.id === this.multiplayer.myPlayerId) {
            this.myBankroll = seat.player.bankroll;
        }

        window.soundEngine.playChip();

        const card1 = hand.cards[0];
        const card2 = hand.cards[1];

        // First hand keeps card1
        hand.cards = [card1];
        hand.isSplitHand = true;
        hand.isFromSplitAce = isAceSplit;

        // Second hand gets card2
        const secondHand = {
            cards: [card2],
            bet: hand.bet,
            status: 'active',
            isDoubled: false,
            isSplitHand: true,
            isFromSplitAce: isAceSplit,
            hasHit: false,
            payoutWon: 0,
            resultText: ''
        };

        seat.hands.splice(handIdx + 1, 0, secondHand);

        // Deal 1 card to first hand
        const newCard1 = this.shoe.draw(true);
        hand.cards.push(newCard1);
        window.soundEngine.playCardDeal();

        // Deal 1 card to second hand
        const newCard2 = this.shoe.draw(true);
        secondHand.cards.push(newCard2);
        window.soundEngine.playCardDeal();

        this.renderSeats();
        this.renderHeader();

        // If split Aces, both hands automatically stand according to official Vegas rules!
        if (isAceSplit) {
            hand.status = 'stood';
            secondHand.status = 'stood';
            this.renderSeats();
            this.advanceTurn();
            return;
        }

        this.updateControlButtons();
    }

    surrenderAction(seatIdx = this.activeSeatIndex, handIdx = this.activeHandIndex) {
        const seat = this.seats[seatIdx];
        const hand = seat.hands[handIdx];
        if (!hand || hand.status !== 'active') return;
        if (!BlackjackRules.canSurrender(hand)) {
            this.showToast('Surrender hanya diperbolehkan pada 2 kartu awal!');
            return;
        }

        // Return 50% bet
        const returnAmount = Math.floor(hand.bet * 0.5);
        seat.player.bankroll += returnAmount;
        hand.status = 'surrendered';
        hand.resultText = window.i18n.t('player_surrendered');

        if (seat.player.isLocal && seat.player.id === this.multiplayer.myPlayerId) {
            this.myBankroll = seat.player.bankroll;
        }

        window.soundEngine.playChip();
        this.renderSeats();
        this.renderHeader();
        this.advanceTurn();
    }

    advanceTurn() {
        if (this.currentActionResolver) {
            const res = this.currentActionResolver;
            this.currentActionResolver = null;
            res();
        }
    }

    // DEALER'S TURN
    async startDealerTurn() {
        this.phase = 'DEALER_TURN';
        this.updateControlButtons();

        // Check if any player hands are still active (not busted and not surrendered)
        const hasLiveHands = this.seats.some(s => s.occupied && s.hands.some(h => h.status === 'stood' || h.status === 'blackjack'));

        // Reveal dealer hole card
        this.shoe.revealCard(this.dealer.cards[1]);
        window.soundEngine.playCardFlip();
        this.renderDealer();
        this.renderHeader();

        if (!hasLiveHands) {
            this.showAnnouncer('Semua pemain Bust / Menyerah.');
            await this.sleep(1000);
            await this.settleRound();
            return;
        }

        this.showAnnouncer(window.i18n.t('dealer_turn'));
        await this.sleep(900);

        // Dealer draws cards while total < 17 (Dealer stands on all 17s under S17)
        let dealerEval = BlackjackRules.evaluateHand(this.dealer.cards);
        while (dealerEval.value < 17) {
            const card = this.shoe.draw(true);
            this.dealer.cards.push(card);
            window.soundEngine.playCardDeal();
            this.renderDealer();
            this.renderHeader();
            await this.sleep(800);
            dealerEval = BlackjackRules.evaluateHand(this.dealer.cards);
        }

        if (dealerEval.isBust) {
            this.dealer.status = 'bust';
            this.showAnnouncer(window.i18n.t('dealer_busts'));
            window.soundEngine.playWin();
        } else {
            this.dealer.status = 'stood';
            this.showAnnouncer(`${window.i18n.t('dealer_stands')} ${dealerEval.value}.`);
        }
        this.renderDealer();
        await this.sleep(1200);

        await this.settleRound();
    }

    // SETTLE ROUND & PAYOUTS
    async settleRound() {
        this.phase = 'PAYOUT';
        const dealerEval = BlackjackRules.evaluateHand(this.dealer.cards);
        const dealerBJ = dealerEval.isBlackjack;
        const dealerBust = dealerEval.isBust;
        const dealerTotal = dealerEval.value;

        let totalMyRoundWin = 0;
        let anyPlayerWon = false;

        for (const seat of this.seats) {
            if (!seat.occupied || !seat.player || seat.hands[0].bet === 0) continue;

            // 1. Insurance payout
            if (seat.insuranceBet > 0) {
                if (dealerBJ) {
                    const insWin = seat.insuranceBet * 3; // 2:1 payout + return bet
                    seat.player.bankroll += insWin;
                    seat.insuranceResult = 'won';
                    if (seat.player.isLocal && seat.player.id === this.multiplayer.myPlayerId) {
                        totalMyRoundWin += insWin;
                    }
                } else {
                    seat.insuranceResult = 'lost';
                }
            }

            // 2. Main hands payout
            for (const hand of seat.hands) {
                if (hand.status === 'surrendered') {
                    // Hand already yielded 50% refund
                    continue;
                }

                if (hand.status === 'even_money') {
                    // Already paid 1:1
                    continue;
                }

                const playerEval = BlackjackRules.evaluateHand(hand.cards);

                if (hand.status === 'bust' || playerEval.isBust) {
                    hand.resultText = window.i18n.t('player_bust');
                    hand.payoutWon = -hand.bet;
                    if (seat.player.isLocal && seat.player.id === this.multiplayer.myPlayerId) {
                        this.stats.losses++;
                        this.stats.currentStreak = 0;
                        this.stats.netProfit -= hand.bet;
                    }
                } else if (hand.status === 'blackjack' || playerEval.isBlackjack) {
                    if (dealerBJ) {
                        // Push
                        seat.player.bankroll += hand.bet;
                        hand.resultText = window.i18n.t('player_push');
                        hand.payoutWon = 0;
                        if (seat.player.isLocal && seat.player.id === this.multiplayer.myPlayerId) {
                            this.stats.pushes++;
                        }
                    } else {
                        // Blackjack pays 3:2
                        const winProfit = Math.floor(hand.bet * 1.5);
                        const totalPayout = hand.bet + winProfit;
                        seat.player.bankroll += totalPayout;
                        hand.resultText = `${window.i18n.t('player_blackjack')} (+$${winProfit})`;
                        hand.payoutWon = winProfit;
                        anyPlayerWon = true;

                        if (seat.player.isLocal && seat.player.id === this.multiplayer.myPlayerId) {
                            this.stats.wins++;
                            this.stats.blackjacks++;
                            this.stats.currentStreak++;
                            this.stats.bestStreak = Math.max(this.stats.bestStreak, this.stats.currentStreak);
                            this.stats.totalWon += winProfit;
                            this.stats.netProfit += winProfit;
                            totalMyRoundWin += totalPayout;
                        }
                    }
                } else {
                    // Normal hand comparison
                    if (dealerBust) {
                        // Dealer bust -> 1:1 win
                        const totalPayout = hand.bet * 2;
                        seat.player.bankroll += totalPayout;
                        hand.resultText = `${window.i18n.t('player_win')} (+$${hand.bet})`;
                        hand.payoutWon = hand.bet;
                        anyPlayerWon = true;

                        if (seat.player.isLocal && seat.player.id === this.multiplayer.myPlayerId) {
                            this.stats.wins++;
                            this.stats.currentStreak++;
                            this.stats.bestStreak = Math.max(this.stats.bestStreak, this.stats.currentStreak);
                            this.stats.totalWon += hand.bet;
                            this.stats.netProfit += hand.bet;
                            totalMyRoundWin += totalPayout;
                        }
                    } else if (playerEval.value > dealerTotal) {
                        // Win 1:1
                        const totalPayout = hand.bet * 2;
                        seat.player.bankroll += totalPayout;
                        hand.resultText = `${window.i18n.t('player_win')} (+$${hand.bet})`;
                        hand.payoutWon = hand.bet;
                        anyPlayerWon = true;

                        if (seat.player.isLocal && seat.player.id === this.multiplayer.myPlayerId) {
                            this.stats.wins++;
                            this.stats.currentStreak++;
                            this.stats.bestStreak = Math.max(this.stats.bestStreak, this.stats.currentStreak);
                            this.stats.totalWon += hand.bet;
                            this.stats.netProfit += hand.bet;
                            totalMyRoundWin += totalPayout;
                        }
                    } else if (playerEval.value === dealerTotal) {
                        // Push
                        seat.player.bankroll += hand.bet;
                        hand.resultText = window.i18n.t('player_push');
                        hand.payoutWon = 0;

                        if (seat.player.isLocal && seat.player.id === this.multiplayer.myPlayerId) {
                            this.stats.pushes++;
                        }
                    } else {
                        // Loss
                        hand.resultText = window.i18n.t('player_loss');
                        hand.payoutWon = -hand.bet;

                        if (seat.player.isLocal && seat.player.id === this.multiplayer.myPlayerId) {
                            this.stats.losses++;
                            this.stats.currentStreak = 0;
                            this.stats.netProfit -= hand.bet;
                        }
                    }
                }
            }

            if (seat.player.isLocal && seat.player.id === this.multiplayer.myPlayerId) {
                this.myBankroll = seat.player.bankroll;
            }
        }

        if (totalMyRoundWin > 0) {
            window.soundEngine.playWin();
            this.showToast(`Kemenangan Anda: +$${totalMyRoundWin}!`);
        } else if (anyPlayerWon) {
            window.soundEngine.playWin();
        }

        this.stats.roundsPlayed++;
        this.saveStats();
        this.renderSeats();
        this.renderHeader();

        // Round complete, check for zero-balance emergency bonus
        this.checkAndGrantZeroBalanceBonus();

        // Transition to Betting phase
        this.phase = 'ROUND_OVER';
        this.updateControlButtons();
        await this.sleep(2500);

        this.resetForNewRound();
    }

    resetForNewRound() {
        this.phase = 'BETTING';
        this.dealer = { cards: [], status: 'waiting' };
        this.seats.forEach(seat => {
            seat.hands = [{
                cards: [],
                bet: 0,
                status: 'betting',
                isDoubled: false,
                isSplitHand: false,
                isFromSplitAce: false,
                hasHit: false,
                payoutWon: 0,
                resultText: ''
            }];
            seat.insuranceBet = 0;
            seat.insuranceResult = null;
        });

        // Grant free $100 bonus ONLY for player whose balance is 0
        this.checkAndGrantZeroBalanceBonus();

        this.renderDealer();
        this.renderSeats();
        this.renderHeader();
        this.updateControlButtons();
        this.showAnnouncer(window.i18n.t('place_bets'));
    }

    checkAndGrantZeroBalanceBonus() {
        let grantedToMe = false;
        this.seats.forEach(seat => {
            if (seat.occupied && seat.player) {
                // Strictly only for player whose balance is 0
                if (seat.player.bankroll <= 0 && seat.hands.every(h => h.bet === 0)) {
                    seat.player.bankroll = 100;
                    if (seat.player.isLocal && seat.player.id === this.multiplayer.myPlayerId) {
                        this.myBankroll = 100;
                        grantedToMe = true;
                    } else if (!seat.player.isBot) {
                        this.showToast(`🎁 ${seat.player.name} kehabisan saldo dan menerima bantuan kasino $100!`);
                    }
                }
            }
        });

        if (grantedToMe) {
            window.soundEngine.playWin();
            this.showToast("🎁 Saldo Anda $0! Kasino memberikan saldo darurat gratis $100!");
            this.renderHeader();
            this.renderSeats();
        }
    }

    // UI RENDERING HELPERS
    renderHeader() {
        const bankrollEl = document.getElementById('user-bankroll-val');
        if (bankrollEl) bankrollEl.textContent = `$${this.myBankroll.toLocaleString()}`;

        const runningCountEl = document.getElementById('running-count-val');
        if (runningCountEl) runningCountEl.textContent = this.shoe.runningCount > 0 ? `+${this.shoe.runningCount}` : this.shoe.runningCount;

        const trueCountEl = document.getElementById('true-count-val');
        if (trueCountEl) trueCountEl.textContent = this.shoe.trueCount;

        const shoeCardsEl = document.getElementById('shoe-remaining-val');
        if (shoeCardsEl) shoeCardsEl.textContent = `${this.shoe.remainingCards} / ${this.shoe.totalCards}`;
    }

    renderDealer() {
        const dealerCardsContainer = document.getElementById('dealer-cards');
        const dealerScoreBadge = document.getElementById('dealer-score');
        if (!dealerCardsContainer) return;

        dealerCardsContainer.innerHTML = '';
        this.dealer.cards.forEach((card, idx) => {
            const cardEl = this.createCardElement(card, idx);
            dealerCardsContainer.appendChild(cardEl);
        });

        if (this.dealer.cards.length === 0) {
            if (dealerScoreBadge) dealerScoreBadge.textContent = '0';
        } else {
            const evalD = BlackjackRules.evaluateHand(this.dealer.cards);
            if (dealerScoreBadge) {
                if (evalD.isBlackjack) {
                    dealerScoreBadge.textContent = 'BJ (21)';
                } else if (evalD.isBust) {
                    dealerScoreBadge.textContent = `${evalD.value} (BUST)`;
                } else if (evalD.isSoft) {
                    dealerScoreBadge.textContent = `Soft ${evalD.value}`;
                } else {
                    dealerScoreBadge.textContent = `${evalD.value}`;
                }
            }
        }
    }

    renderSeats() {
        for (let i = 0; i < 5; i++) {
            const seat = this.seats[i];
            const seatEl = document.getElementById(`table-seat-${i}`);
            if (!seatEl) continue;

            const isTurn = (this.phase === 'PLAYER_TURNS' && this.activeSeatIndex === i);
            seatEl.classList.toggle('active-turn', isTurn);
            seatEl.classList.toggle('occupied', seat.occupied);

            if (!seat.occupied) {
                seatEl.innerHTML = `
                    <div class="vacant-seat-box" onclick="window.game.handleVacantSeatClick(${i})">
                        <span class="sit-icon">🪑</span>
                        <span class="sit-text">${window.i18n.t('sit_here')}</span>
                    </div>
                `;
                continue;
            }

            // Build Occupied Seat
            const player = seat.player;
            let handsHtml = '';

            seat.hands.forEach((hand, hIdx) => {
                const isHandTurn = (isTurn && this.activeHandIndex === hIdx);
                const evalH = BlackjackRules.evaluateHand(hand.cards);
                let scoreText = '';
                if (hand.cards.length > 0) {
                    if (hand.status === 'blackjack' || evalH.isBlackjack) scoreText = 'BLACKJACK 21!';
                    else if (hand.status === 'bust' || evalH.isBust) scoreText = `BUST (${evalH.value})`;
                    else if (evalH.isSoft) scoreText = `Soft ${evalH.value}`;
                    else scoreText = `${evalH.value}`;
                }

                let handCardsHtml = '';
                hand.cards.forEach((card, cIdx) => {
                    handCardsHtml += this.createCardElement(card, cIdx).outerHTML;
                });

                handsHtml += `
                    <div class="seat-hand ${isHandTurn ? 'active-hand' : ''}">
                        <div class="hand-score-tag ${evalH.isBust ? 'bust' : ''} ${evalH.isBlackjack ? 'bj' : ''}">
                            ${scoreText || (hand.bet > 0 ? `$${hand.bet}` : '')}
                        </div>
                        <div class="cards-fan">${handCardsHtml}</div>
                        ${hand.resultText ? `<div class="hand-result-badge ${hand.payoutWon > 0 ? 'win' : (hand.payoutWon < 0 ? 'lose' : 'push')}">${hand.resultText}</div>` : ''}
                    </div>
                `;
            });

            // Betting spot
            const mainBet = seat.hands[0].bet;
            const chipsHtml = this.renderChipStack(mainBet);

            seatEl.innerHTML = `
                <div class="player-tag">
                    <span class="avatar">${player.avatar}</span>
                    <span class="name">${player.name}</span>
                    <span class="bankroll">$${player.bankroll.toLocaleString()}</span>
                </div>
                <div class="seat-hands-wrapper">
                    ${handsHtml}
                </div>
                <div class="betting-circle" onclick="window.game.placeBet(${i})" title="Klik untuk pasang taruhan">
                    <div class="bet-label">${mainBet > 0 ? `$${mainBet}` : '$10 - $2,500'}</div>
                    <div class="chip-stack-container">${chipsHtml}</div>
                    ${seat.insuranceBet > 0 ? `<div class="insurance-badge">INS: $${seat.insuranceBet}</div>` : ''}
                </div>
            `;
        }
    }

    createCardElement(card, index = 0) {
        const div = document.createElement('div');
        div.className = `playing-card ${card.isRed ? 'red' : 'black'} ${!card.faceUp ? 'face-down' : ''}`;
        div.style.animationDelay = `${index * 80}ms`;

        if (!card.faceUp) {
            div.innerHTML = `<div class="card-back-pattern"></div>`;
            return div;
        }

        div.innerHTML = `
            <div class="card-corner top-left">
                <span class="rank">${card.rank.label}</span>
                <span class="suit">${card.suit.symbol}</span>
            </div>
            <div class="card-center">
                <span class="main-suit">${card.suit.symbol}</span>
            </div>
            <div class="card-corner bottom-right">
                <span class="rank">${card.rank.label}</span>
                <span class="suit">${card.suit.symbol}</span>
            </div>
        `;
        return div;
    }

    renderChipStack(amount) {
        if (!amount || amount <= 0) return '';
        // Calculate chip denominations: 1000, 500, 100, 25, 5, 1
        const denoms = [1000, 500, 100, 25, 5, 1];
        let rem = amount;
        let chips = [];
        for (const d of denoms) {
            const count = Math.floor(rem / d);
            for (let i = 0; i < count; i++) {
                chips.push(d);
                if (chips.length >= 8) break; // visually cap stack height
            }
            rem %= d;
            if (chips.length >= 8) break;
        }

        let html = '';
        chips.slice(0, 6).forEach((val, idx) => {
            html += `<div class="poker-chip chip-${val}" style="bottom: ${idx * 4}px; z-index: ${idx}">$${val}</div>`;
        });
        return html;
    }

    renderChipSelector() {
        const chipBtns = document.querySelectorAll('.chip-selector-btn');
        chipBtns.forEach(btn => {
            const val = parseInt(btn.dataset.value);
            btn.classList.toggle('selected', val === this.selectedChip);
        });
    }

    updateControlButtons() {
        const dealBtn = document.getElementById('deal-btn');
        const clearBtn = document.getElementById('clear-bet-btn');
        const doubleBetBtn = document.getElementById('double-bet-btn');
        const rebetBtn = document.getElementById('rebet-btn');

        const hitBtn = document.getElementById('hit-btn');
        const standBtn = document.getElementById('stand-btn');
        const doubleDownBtn = document.getElementById('double-down-btn');
        const splitBtn = document.getElementById('split-btn');
        const surrenderBtn = document.getElementById('surrender-btn');

        const bettingControls = document.getElementById('betting-controls-rack');
        const actionControls = document.getElementById('action-controls-rack');

        if (this.phase === 'BETTING') {
            if (bettingControls) bettingControls.style.display = 'flex';
            if (actionControls) actionControls.style.display = 'none';

            const hasBets = this.seats.some(s => s.occupied && s.hands[0].bet >= this.minBet);
            if (dealBtn) dealBtn.disabled = !hasBets;
            if (clearBtn) clearBtn.disabled = !this.seats.some(s => s.occupied && s.hands[0].bet > 0);
            if (doubleBetBtn) doubleBetBtn.disabled = !this.seats.some(s => s.occupied && s.hands[0].bet > 0);
            if (rebetBtn) rebetBtn.disabled = !this.lastBets.some(b => b > 0);
        } else if (this.phase === 'PLAYER_TURNS') {
            if (bettingControls) bettingControls.style.display = 'none';
            if (actionControls) actionControls.style.display = 'flex';

            const activeSeat = this.seats[this.activeSeatIndex];
            const isMyTurn = (activeSeat && activeSeat.player && (activeSeat.player.isLocal || (this.gameMode === 'online' && activeSeat.player.id === this.multiplayer.myPlayerId)));

            if (!isMyTurn || !activeSeat) {
                // Disable all for spectator or bot turn
                if (hitBtn) hitBtn.disabled = true;
                if (standBtn) standBtn.disabled = true;
                if (doubleDownBtn) doubleDownBtn.disabled = true;
                if (splitBtn) splitBtn.disabled = true;
                if (surrenderBtn) surrenderBtn.disabled = true;
            } else {
                const hand = activeSeat.hands[this.activeHandIndex];
                if (hitBtn) hitBtn.disabled = false;
                if (standBtn) standBtn.disabled = false;
                if (doubleDownBtn) doubleDownBtn.disabled = !BlackjackRules.canDoubleDown(hand, activeSeat.player.bankroll);
                if (splitBtn) splitBtn.disabled = !BlackjackRules.canSplit(hand, activeSeat.player.bankroll, this.tableRules.maxSplits, activeSeat.hands.length);
                if (surrenderBtn) surrenderBtn.disabled = !BlackjackRules.canSurrender(hand);
            }
        } else {
            // Dealing / Settling / Peeking
            if (bettingControls) bettingControls.style.display = 'flex';
            if (actionControls) actionControls.style.display = 'none';
            if (dealBtn) dealBtn.disabled = true;
            if (clearBtn) clearBtn.disabled = true;
            if (doubleBetBtn) doubleBetBtn.disabled = true;
            if (rebetBtn) rebetBtn.disabled = true;
        }
    }

    handleVacantSeatClick(seatIdx) {
        if (this.phase !== 'BETTING') {
            this.showToast('Tunggu babak selesai untuk mengambil kursi!');
            return;
        }

        // Sit local player or prompt
        this.sitPlayer(seatIdx, {
            id: 'local_' + seatIdx,
            name: `Pemain ${seatIdx + 1}`,
            avatar: ['🎩', '👑', '💎', '🎲', '⚜️'][seatIdx],
            isLocal: true,
            isBot: false,
            bankroll: 2500
        });
        window.soundEngine.playClick();
    }

    showAnnouncer(msg) {
        const el = document.getElementById('table-announcer');
        if (el) {
            el.textContent = msg;
            el.classList.remove('pulse');
            void el.offsetWidth; // retrigger css animation
            el.classList.add('pulse');
        }
    }

    showToast(msg) {
        const toast = document.getElementById('casino-toast');
        if (toast) {
            toast.textContent = msg;
            toast.classList.add('show');
            clearTimeout(this.toastTimeout);
            this.toastTimeout = setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }
    }

    refillBankroll() {
        if (this.myBankroll <= 0) {
            this.myBankroll = 100;
            this.seats.forEach(seat => {
                if (seat.occupied && seat.player && seat.player.isLocal && seat.player.id === this.multiplayer.myPlayerId) {
                    seat.player.bankroll = 100;
                }
            });
            window.soundEngine.playChipStack();
            this.renderHeader();
            this.renderSeats();
            this.saveStats();
            this.showToast("🎁 Saldo Anda $0! Saldo darurat gratis $100 berhasil diberikan!");
        } else {
            this.showToast(`⚠️ Saldo gratis $100 hanya diberikan jika saldo Anda $0! (Saldo saat ini: $${this.myBankroll.toLocaleString()})`);
        }
    }

    // MULTIPLAYER HANDLERS
    setGameMode(mode) {
        this.gameMode = mode;
        const badge = document.getElementById('current-mode-badge');
        if (badge) {
            if (mode === 'solo') badge.textContent = window.i18n.t('mode_solo');
            else if (mode === 'local') badge.textContent = window.i18n.t('mode_local');
            else if (mode === 'online') badge.textContent = this.multiplayer.isHost ? window.i18n.t('mode_online_host') : window.i18n.t('mode_online_client');
        }
    }

    onRoomCreated(code) {
        this.setGameMode('online');
        const codeDisplay = document.getElementById('display-room-code');
        if (codeDisplay) codeDisplay.textContent = code;
        const modal = document.getElementById('room-created-box');
        if (modal) modal.style.display = 'block';
        this.showToast(`Ruangan ${code} berhasil dibuat! Bagikan kodenya.`);
    }

    onJoinedRoom(code) {
        this.setGameMode('online');
        this.showToast(`Berhasil bergabung ke ruangan ${code}!`);
        const modal = document.getElementById('multiplayer-modal');
        if (modal) modal.classList.remove('active');
    }

    onPlayerConnected(peerId) {
        this.showToast(`Pemain baru bergabung ke meja!`);
    }

    onPlayerDisconnected(peerId) {
        this.showToast(`Seorang pemain keluar dari meja.`);
    }

    onDisconnectedFromHost() {
        this.setGameMode('solo');
    }

    serializeStateForSync() {
        return {
            phase: this.phase,
            dealer: {
                cards: this.dealer.cards.map(c => c.toJSON()),
                status: this.dealer.status
            },
            seats: this.seats.map(s => ({
                index: s.index,
                occupied: s.occupied,
                player: s.player,
                hands: s.hands.map(h => ({
                    cards: h.cards.map(c => c.toJSON()),
                    bet: h.bet,
                    status: h.status,
                    isDoubled: h.isDoubled,
                    isSplitHand: h.isSplitHand,
                    isFromSplitAce: h.isFromSplitAce,
                    resultText: h.resultText,
                    payoutWon: h.payoutWon
                })),
                insuranceBet: s.insuranceBet,
                insuranceResult: s.insuranceResult
            })),
            activeSeatIndex: this.activeSeatIndex,
            activeHandIndex: this.activeHandIndex
        };
    }

    handleNetworkMessage(msg, fromSource) {
        if (!msg) return;

        if (msg.type === 'FULL_STATE_SYNC') {
            const st = msg.state;
            this.phase = st.phase;
            this.activeSeatIndex = st.activeSeatIndex;
            this.activeHandIndex = st.activeHandIndex;
            this.dealer.status = st.dealer.status;
            this.dealer.cards = st.dealer.cards.map(cd => Card.fromJSON(cd));

            st.seats.forEach((s, idx) => {
                this.seats[idx].occupied = s.occupied;
                this.seats[idx].player = s.player;
                this.seats[idx].insuranceBet = s.insuranceBet;
                this.seats[idx].insuranceResult = s.insuranceResult;
                this.seats[idx].hands = s.hands.map(h => ({
                    ...h,
                    cards: h.cards.map(cd => Card.fromJSON(cd))
                }));
            });

            this.renderDealer();
            this.renderSeats();
            this.renderHeader();
            this.updateControlButtons();
        } else if (msg.type === 'CHAT_MESSAGE') {
            this.appendChatMessage(msg.senderName, msg.text, msg.senderAvatar);
        }
    }

    sendChatMessage(text) {
        if (!text || text.trim() === '') return;
        const msg = {
            type: 'CHAT_MESSAGE',
            senderName: this.multiplayer.myName,
            senderAvatar: this.multiplayer.myAvatar,
            text: text.trim()
        };
        this.appendChatMessage(msg.senderName, msg.text, msg.senderAvatar);
        this.multiplayer.broadcast(msg);
    }

    appendChatMessage(name, text, avatar = '👤') {
        const chatBox = document.getElementById('chat-messages-container');
        if (!chatBox) return;

        const row = document.createElement('div');
        row.className = 'chat-bubble';
        row.innerHTML = `<span class="chat-sender">${avatar} ${name}:</span> <span class="chat-content">${this.escapeHtml(text)}</span>`;
        chatBox.appendChild(row);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // STRATEGY ADVISOR HINT
    showStrategyHint() {
        if (this.phase !== 'PLAYER_TURNS') {
            this.showToast('Saran strategi aktif saat giliran Anda berlangsung.');
            return;
        }

        const activeSeat = this.seats[this.activeSeatIndex];
        if (!activeSeat || !activeSeat.hands[this.activeHandIndex]) return;

        const hand = activeSeat.hands[this.activeHandIndex];
        const dealerUp = this.dealer.cards[0];
        const advice = BlackjackRules.getStrategyRecommendation(hand, dealerUp);

        if (advice) {
            this.showToast(`💡 Rekomendasi Strategi Dasar: ${advice.action} - ${advice.desc}`);
        }
    }

    // STATS STORAGE
    saveStats() {
        try {
            localStorage.setItem('royal_blackjack_stats', JSON.stringify(this.stats));
            localStorage.setItem('royal_blackjack_bankroll', this.myBankroll.toString());
        } catch (e) {}
    }

    loadStats() {
        try {
            const saved = localStorage.getItem('royal_blackjack_stats');
            if (saved) this.stats = { ...this.stats, ...JSON.parse(saved) };
            const savedBankroll = localStorage.getItem('royal_blackjack_bankroll');
            if (savedBankroll) this.myBankroll = parseInt(savedBankroll, 10) || 2500;
        } catch (e) {}
    }

    sleep(ms) {
        return new Promise(res => setTimeout(res, ms));
    }
}

window.BlackjackGame = BlackjackGame;
