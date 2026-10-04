/**
 * Internationalization (i18n) for Indonesian & English
 */

const TRANSLATIONS = {
    id: {
        title: "Royal Palace Blackjack VIP",
        subtitle: "Multiplayer Kasino Resmi Standar Global",
        table_rules: "Blackjack Bayar 3:2 • Dealer Stand di 17 • Asuransi 2:1",
        shoe_info: "Shoe 6 Dek • Cut Card ~75%",
        min_max: "Batas Meja: $10 - $2,500",
        running_count: "Hitungan Kartu (Hi-Lo)",
        true_count: "True Count",
        bankroll: "Saldo Anda",
        refill: "+ ATM Isi Saldo",
        refilled_msg: "Saldo ditambahkan +$2,500!",
        sit_here: "+ Duduk Di Sini",
        seat_occupied: "Terisi",
        dealer: "DEALER",
        dealer_stands_17: "Dealer harus stand pada 17",
        place_bets: "Silakan pasang taruhan Anda...",
        bet_time: "Waktu Taruhan",
        deal: "BAGIKAN (DEAL)",
        clear_bet: "Hapus",
        double_bet: "2x Taruhan",
        rebet: "Ulangi Taruhan",
        hit: "TAMBAH (HIT)",
        stand: "CUKUP (STAND)",
        double_down: "LIPAT TARUHAN (DOUBLE)",
        split: "PISAH KARTU (SPLIT)",
        surrender: "MENYERAH (SURRENDER)",
        insurance_title: "Tawaran Asuransi",
        insurance_desc: "Dealer menunjukkan As (Ace). Mau pasang asuransi sebesar 50% taruhan?",
        insurance_yes: "Ya, Pasang Asuransi",
        insurance_no: "Tidak, Lewati",
        even_money_title: "Tawaran Even Money",
        even_money_desc: "Anda memiliki Blackjack! Ambil bayaran pasti 1:1 sekarang atau ambil risiko seri jika Dealer juga BJ?",
        even_money_yes: "Ambil 1:1 (Even Money)",
        even_money_no: "Mainkan (Peluang 3:2)",
        dealer_bj: "Dealer memiliki Blackjack!",
        dealer_no_bj: "Dealer tidak memiliki Blackjack.",
        dealer_turn: "Giliran Dealer...",
        dealer_busts: "Dealer BUST! Semua pemain aktif menang!",
        dealer_stands: "Dealer Stand dengan nilai",
        player_blackjack: "BLACKJACK ALAMI! Bayar 3:2!",
        player_bust: "BUST! Melebihi 21.",
        player_win: "MENANG!",
        player_loss: "KALAH",
        player_push: "SERI (PUSH) - Taruhan Kembali",
        player_surrendered: "Menyerah (Kembali 50% taruhan)",
        insurance_won: "Asuransi Menang (Bayar 2:1)!",
        insurance_lost: "Asuransi Kalah",
        reshuffle_notice: "Cut Card tercapai! Dealer mengocok ulang 6 dek kartu...",
        strategy_hint: "Saran Strategi",
        strategy_btn: "💡 Saran Strategi",
        rules_btn: "📖 Aturan Resmi",
        multiplayer_btn: "👥 Multiplayer",
        stats_btn: "📊 Statistik",
        sound_on: "🔊 Suara",
        sound_off: "🔇 Mute",
        room_code: "Kode Ruangan",
        copy_code: "Salin Kode",
        code_copied: "Kode disalin ke clipboard!",
        create_room: "Buat Meja Baru (Host)",
        join_room: "Gabung Meja (Join)",
        enter_code: "Masukkan kode 6 digit...",
        room_created: "Meja dibuat! Bagikan kode kepada teman:",
        connected_players: "Pemain di Meja",
        chat_placeholder: "Kirim pesan ke meja...",
        send: "Kirim",
        mode_solo: "Mode: Solo / Multi-Hand",
        mode_local: "Mode: Multi-Pemain Lokal",
        mode_online_host: "Mode: Online (Host Meja)",
        mode_online_client: "Mode: Online (Tamu Meja)",
        bot_toggle: "Isi Kursi Kosong dengan AI Bot",
        local_seats_count: "Jumlah Kursi Dimainkan",
        hands_played: "Putaran Dimainkan",
        win_rate: "Persentase Menang",
        total_won: "Total Kemenangan",
        net_profit: "Keuntungan Bersih",
        streak: "Kemenangan Beruntun Terbaik",
        close: "Tutup",
        rules_header: "Aturan Global Resmi Kasino (Vegas Strip S17)",
        rules_desc_1: "Permainan menggunakan Shoe 6-Dek standar internasional (312 kartu) yang dikocok acak dengan cut card pada kedalaman ~75%. Kartu pertama setelah pengocokan dibakar (burn card).",
        rules_desc_2: "Nilai Kartu: Angka 2-10 sesuai nominal; J, Q, K bernilai 10; As (Ace) bernilai 1 atau 11 (Soft/Hard Hand) sesuai kondisi terbaik tanpa melewati 21.",
        rules_desc_3: "Blackjack Alami: Mendapat kartu As dan kartu bernilai 10 pada 2 kartu pertama, membayar 3:2 (150% keuntungan). Mengalahkan semua kombinasi kartu dealer kecuali dealer juga memiliki Blackjack (Seri/Push).",
        rules_desc_4: "Aturan Intip Dealer (Vegas Peek): Jika kartu terbuka dealer adalah As atau kartu bernilai 10, dealer memeriksa kartu tertutupnya (Hole Card). Jika dealer memiliki Blackjack, babak langsung selesai.",
        rules_desc_5: "Pilihan Aksi Pemain:",
        rules_desc_5_hit: "Hit: Menambah 1 kartu. Pemain boleh hit berulang kali hingga merasa cukup atau BUST (lewat 21).",
        rules_desc_5_stand: "Stand: Mengakhiri giliran dan mempertahankan nilai kartu saat ini.",
        rules_desc_5_double: "Double Down: Menggandakan taruhan awal, menerima tepat SATU kartu tambahan, lalu otomatis Stand.",
        rules_desc_5_split: "Split: Jika 2 kartu awal bernilai sama (misal 8-8 atau K-Q), pemain dapat memisahkannya menjadi 2 tangan terpisah dengan menambah taruhan setara. As yang di-split hanya menerima 1 kartu dan tidak dapat di-split ulang.",
        rules_desc_5_surrender: "Late Surrender: Menyerahkan kartu awal sebelum melakukan aksi apa pun, menarik kembali 50% taruhan dan mengorbankan 50% sisanya.",
        rules_desc_6: "Asuransi & Even Money: Jika kartu terbuka dealer adalah As, pemain dapat memasang Asuransi (50% dari taruhan utama). Jika dealer mendapatkan Blackjack, Asuransi membayar 2:1. Jika pemain memiliki Blackjack saat dealer memegang As, pemain dapat memilih Even Money (bayaran pasti 1:1).",
        rules_desc_7: "Aturan Dealer: Dealer selalu membuka kartu kedua setelah semua pemain selesai. Dealer WAJIB menambah kartu pada nilai 16 ke bawah, dan WAJIB Stand pada nilai 17 ke atas (termasuk Soft 17)."
    },
    en: {
        title: "Royal Palace Blackjack VIP",
        subtitle: "Official Global Casino Rules Multiplayer",
        table_rules: "Blackjack Pays 3:2 • Dealer Stands on 17 • Insurance 2:1",
        shoe_info: "6-Deck Shoe • Cut Card ~75%",
        min_max: "Table Limits: $10 - $2,500",
        running_count: "Card Count (Hi-Lo)",
        true_count: "True Count",
        bankroll: "Your Bankroll",
        refill: "+ ATM Refill",
        refilled_msg: "Bankroll refilled +$2,500!",
        sit_here: "+ Sit Here",
        seat_occupied: "Occupied",
        dealer: "DEALER",
        dealer_stands_17: "Dealer must stand on 17",
        place_bets: "Please place your bets...",
        bet_time: "Betting Phase",
        deal: "DEAL CARDS",
        clear_bet: "Clear",
        double_bet: "2x Bet",
        rebet: "Rebet",
        hit: "HIT",
        stand: "STAND",
        double_down: "DOUBLE DOWN",
        split: "SPLIT",
        surrender: "SURRENDER",
        insurance_title: "Insurance Offer",
        insurance_desc: "Dealer shows an Ace. Would you like to buy insurance for 50% of your bet?",
        insurance_yes: "Yes, Buy Insurance",
        insurance_no: "No, Pass",
        even_money_title: "Even Money Offer",
        even_money_desc: "You have Blackjack! Take guaranteed 1:1 payout now or risk a push if Dealer also has BJ?",
        even_money_yes: "Take 1:1 (Even Money)",
        even_money_no: "Play for 3:2",
        dealer_bj: "Dealer has Blackjack!",
        dealer_no_bj: "Dealer does not have Blackjack.",
        dealer_turn: "Dealer's Turn...",
        dealer_busts: "Dealer BUSTS! All active hands win!",
        dealer_stands: "Dealer Stands on",
        player_blackjack: "NATURAL BLACKJACK! Pays 3:2!",
        player_bust: "BUST! Exceeded 21.",
        player_win: "WINNER!",
        player_loss: "HOUSE WINS",
        player_push: "PUSH - Bet Returned",
        player_surrendered: "Surrendered (50% bet returned)",
        insurance_won: "Insurance Won (Pays 2:1)!",
        insurance_lost: "Insurance Lost",
        reshuffle_notice: "Cut Card reached! Dealer is reshuffling 6 decks...",
        strategy_hint: "Strategy Advisor",
        strategy_btn: "💡 Strategy Advisor",
        rules_btn: "📖 Official Rules",
        multiplayer_btn: "👥 Multiplayer",
        stats_btn: "📊 Statistics",
        sound_on: "🔊 Sound",
        sound_off: "🔇 Mute",
        room_code: "Room Code",
        copy_code: "Copy Code",
        code_copied: "Code copied to clipboard!",
        create_room: "Create Table (Host)",
        join_room: "Join Table (Player)",
        enter_code: "Enter 6-digit code...",
        room_created: "Table created! Share code with your friends:",
        connected_players: "Players at Table",
        chat_placeholder: "Send message to table...",
        send: "Send",
        mode_solo: "Mode: Solo / Multi-Hand",
        mode_local: "Mode: Local Multi-Player",
        mode_online_host: "Mode: Online (Table Host)",
        mode_online_client: "Mode: Online (Guest Player)",
        bot_toggle: "Fill Empty Seats with AI Bots",
        local_seats_count: "Active Seats Count",
        hands_played: "Rounds Played",
        win_rate: "Win Rate",
        total_won: "Total Won",
        net_profit: "Net Profit",
        streak: "Best Winning Streak",
        close: "Close",
        rules_header: "Official Global Casino Rules (Vegas Strip S17)",
        rules_desc_1: "The game uses a standard 6-deck shoe (312 cards) with Fisher-Yates casino shuffle and a plastic cut card placed at ~75% penetration. The top card is burned face down after shuffle.",
        rules_desc_2: "Card Values: 2 through 10 have face value; J, Q, K are worth 10; Aces count as either 1 or 11 (Soft/Hard Hand) depending on which gives the player the highest total without exceeding 21.",
        rules_desc_3: "Natural Blackjack: An Ace and a 10-point card on the initial 2-card deal pays 3:2 (150% profit). Beats all other hands except a dealer Blackjack (resulting in a Push).",
        rules_desc_4: "Dealer Peek Rule (Vegas Strip): When dealer shows an Ace or a 10, the dealer immediately checks the hidden hole card. If dealer has Blackjack, the hand terminates immediately.",
        rules_desc_5: "Player Decision Options:",
        rules_desc_5_hit: "Hit: Draw one additional card. May hit multiple times until standing or busting (>21).",
        rules_desc_5_stand: "Stand: Finalize current total and end turn for this hand.",
        rules_desc_5_double: "Double Down: Double original wager, receive exactly ONE additional card, then automatically stand.",
        rules_desc_5_split: "Split: If initial 2 cards share identical rank (e.g. 8-8, K-K), separate them into 2 individual hands by matching original bet. Split Aces receive only 1 card each and cannot be re-split.",
        rules_desc_5_surrender: "Late Surrender: Surrender initial hand before hitting, forfeiting 50% of the bet and saving the remaining 50%.",
        rules_desc_6: "Insurance & Even Money: If dealer shows an Ace, insurance wager (up to 50% of bet) pays 2:1 if dealer has Blackjack. Players with natural Blackjack against an Ace upcard can take Even Money (guaranteed 1:1).",
        rules_desc_7: "Dealer Play: Dealer acts last. Dealer must hit on any hand totaling 16 or less, and must stand on all 17s (including Soft 17)."
    }
};

class I18nManager {
    constructor() {
        this.currentLang = 'id'; // default Indonesian as requested
    }

    setLanguage(lang) {
        if (TRANSLATIONS[lang]) {
            this.currentLang = lang;
            this.updateDOM();
        }
    }

    t(key) {
        return TRANSLATIONS[this.currentLang][key] || key;
    }

    updateDOM() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (TRANSLATIONS[this.currentLang][key]) {
                if (el.tagName === 'INPUT' && el.type === 'text') {
                    el.placeholder = TRANSLATIONS[this.currentLang][key];
                } else {
                    el.textContent = TRANSLATIONS[this.currentLang][key];
                }
            }
        });
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            if (TRANSLATIONS[this.currentLang][key]) {
                el.title = TRANSLATIONS[this.currentLang][key];
            }
        });

        // Update lang switch buttons
        const btnId = document.getElementById('lang-id-btn');
        const btnEn = document.getElementById('lang-en-btn');
        if (btnId && btnEn) {
            btnId.classList.toggle('active', this.currentLang === 'id');
            btnEn.classList.toggle('active', this.currentLang === 'en');
        }
    }
}

window.i18n = new I18nManager();
