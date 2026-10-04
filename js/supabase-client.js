/**
 * Supabase Backend Integration for Blackjack VIP
 * Cloud profiles, real-time leaderboard, bankroll persistence, and Realtime Channels
 */

const DEFAULT_SUPABASE_URL = 'https://hddecjvkaaxjmyfgzqwh.supabase.co';
const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkZGVjanZrYWF4am15Zmd6cXdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExMTE4MTAsImV4cCI6MjEwNjY4NzgxMH0.SGDzmHUy8ygidb5bpWPr0JAgD_ilcbw0ctfdG1DnDZ4';

class SupabaseService {
    constructor() {
        this.client = null;
        this.url = localStorage.getItem('supabase_url') || DEFAULT_SUPABASE_URL;
        this.key = localStorage.getItem('supabase_key') || DEFAULT_SUPABASE_KEY;
        this.connected = false;
        this.activeChannel = null;

        if (this.url && this.key) {
            this.initClient(this.url, this.key);
        }
    }

    initClient(url, key) {
        if (!window.supabase) {
            console.warn('Supabase JS SDK not loaded yet.');
            return;
        }

        try {
            this.client = window.supabase.createClient(url, key);
            this.url = url;
            this.key = key;
            this.checkConnection();
        } catch (err) {
            console.error('Supabase init error:', err);
            this.connected = false;
            this.updateStatusBadge();
        }
    }

    async checkConnection() {
        if (!this.client) {
            this.connected = false;
            this.updateStatusBadge();
            return false;
        }

        try {
            const { error } = await this.client
                .from('blackjack_profiles')
                .select('id')
                .limit(1);

            this.connected = !error || error.code === 'PGRST116';
            this.updateStatusBadge();
            return this.connected;
        } catch (e) {
            this.connected = false;
            this.updateStatusBadge();
            return false;
        }
    }

    updateStatusBadge() {
        const badge = document.getElementById('supabase-status-badge');
        const dot = document.getElementById('supabase-status-dot');
        const text = document.getElementById('supabase-status-text');

        if (badge && dot && text) {
            if (this.connected) {
                badge.classList.add('connected');
                badge.classList.remove('disconnected');
                text.textContent = 'Cloud Terhubung';
            } else {
                badge.classList.remove('connected');
                badge.classList.add('disconnected');
                text.textContent = this.url ? 'Gagal Terhubung' : 'Belum Terhubung';
            }
        }
    }

    async saveConfig(url, key) {
        url = url.trim();
        key = key.trim();

        if (!url || !key) {
            this.client = null;
            this.url = '';
            this.key = '';
            localStorage.removeItem('supabase_url');
            localStorage.removeItem('supabase_key');
            this.connected = false;
            this.updateStatusBadge();
            return { success: false, message: 'URL atau Key tidak boleh kosong!' };
        }

        try {
            this.initClient(url, key);
            const isOk = await this.checkConnection();
            if (isOk) {
                localStorage.setItem('supabase_url', url);
                localStorage.setItem('supabase_key', key);
                return { success: true, message: 'Berhasil terhubung ke Supabase Cloud!' };
            } else {
                return { success: false, message: 'Tidak dapat mengakses tabel Supabase. Pastikan skrip SQL sudah dijalankan di Supabase Dashboard.' };
            }
        } catch (err) {
            return { success: false, message: `Error: ${err.message || err}` };
        }
    }

    // Save/update player bankroll and stats to Supabase Cloud
    async syncPlayerToCloud(player, stats) {
        if (!this.client || !this.connected || !player) return;

        try {
            const payload = {
                id: player.id,
                username: player.name,
                avatar: player.avatar,
                bankroll: player.bankroll,
                rounds_played: stats.roundsPlayed || 0,
                wins: stats.wins || 0,
                losses: stats.losses || 0,
                pushes: stats.pushes || 0,
                blackjacks: stats.blackjacks || 0,
                best_streak: stats.bestStreak || 0,
                net_profit: stats.netProfit || 0,
                updated_at: new Date().toISOString()
            };

            await this.client
                .from('blackjack_profiles')
                .upsert(payload, { onConflict: 'id' });
        } catch (err) {
            console.warn('Sync to Supabase failed:', err);
        }
    }

    // Fetch cloud player data
    async fetchCloudProfile(playerId) {
        if (!this.client || !this.connected || !playerId) return null;

        try {
            const { data, error } = await this.client
                .from('blackjack_profiles')
                .select('*')
                .eq('id', playerId)
                .single();

            if (!error && data) return data;
        } catch (e) {
            console.warn('Fetch cloud profile failed:', e);
        }
        return null;
    }

    // Fetch top 10 richest players for leaderboard
    async fetchLeaderboard() {
        if (!this.client || !this.connected) return [];

        try {
            const { data, error } = await this.client
                .from('blackjack_profiles')
                .select('username, avatar, bankroll, wins, blackjacks')
                .order('bankroll', { ascending: false })
                .limit(10);

            if (!error && data) return data;
        } catch (e) {
            console.warn('Fetch leaderboard failed:', e);
        }
        return [];
    }

    // Record game round history
    async recordRound(log) {
        if (!this.client || !this.connected || !log) return;

        try {
            await this.client
                .from('blackjack_rounds')
                .insert({
                    player_id: log.playerId,
                    player_name: log.playerName,
                    bet_amount: log.bet,
                    player_cards: log.playerCards,
                    dealer_cards: log.dealerCards,
                    result: log.result,
                    payout: log.payout
                });
        } catch (e) {
            console.warn('Record round to Supabase failed:', e);
        }
    }

    // Supabase Realtime Channels for Multiplayer Table Sync
    subscribeToTableChannel(roomCode, onEvent) {
        if (!this.client) return null;

        if (this.activeChannel) {
            this.client.removeChannel(this.activeChannel);
        }

        const channelName = `table_room_${roomCode.toLowerCase()}`;
        this.activeChannel = this.client.channel(channelName, {
            config: { broadcast: { self: false } }
        });

        this.activeChannel
            .on('broadcast', { event: 'game_event' }, (payload) => {
                if (onEvent) onEvent(payload.payload);
            })
            .subscribe((status) => {
                console.log(`Supabase Realtime Channel [${channelName}] status:`, status);
            });

        return this.activeChannel;
    }

    sendTableBroadcast(eventData) {
        if (this.activeChannel) {
            this.activeChannel.send({
                type: 'broadcast',
                event: 'game_event',
                payload: eventData
            });
        }
    }
}

window.supabaseService = new SupabaseService();
