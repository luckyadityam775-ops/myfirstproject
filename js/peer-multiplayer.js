/**
 * P2P WebRTC & Local Synchronization Engine for Blackjack Multiplayer
 * Supports PeerJS for online play + BroadcastChannel for multi-tab fallback
 */

class MultiplayerManager {
    constructor(game) {
        this.game = game;
        this.isHost = false;
        this.isOnline = false;
        this.peer = null;
        this.connections = new Map(); // peerId -> DataConnection (if host)
        this.hostConn = null; // DataConnection to host (if client)
        this.roomCode = null;
        this.myPeerId = null;
        this.myPlayerId = 'p_' + Math.random().toString(36).substr(2, 9);
        this.myName = 'Player ' + Math.floor(100 + Math.random() * 900);
        this.myAvatar = '🎩';
        this.broadcastChannel = null;

        this.initBroadcastChannel();
    }

    initBroadcastChannel() {
        if ('BroadcastChannel' in window) {
            try {
                this.broadcastChannel = new BroadcastChannel('royal-blackjack-sync');
                this.broadcastChannel.onmessage = (event) => {
                    this.handleIncomingMessage(event.data, 'broadcast');
                };
            } catch (e) {
                console.warn('BroadcastChannel not available', e);
            }
        }
    }

    // Generate random 6-character room code (alphanumeric uppercase)
    static generateRoomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    createRoom(code = null) {
        this.isHost = true;
        this.isOnline = true;
        this.roomCode = code || MultiplayerManager.generateRoomCode();
        const fullPeerId = `royal-bj-${this.roomCode.toLowerCase()}`;

        if (window.Peer) {
            try {
                if (this.peer) this.peer.destroy();
                this.peer = new Peer(fullPeerId, {
                    debug: 1,
                    config: {
                        iceServers: [
                            { urls: 'stun:stun.l.google.com:19302' },
                            { urls: 'stun:global.stun.twilio.com:3478' }
                        ]
                    }
                });

                this.peer.on('open', (id) => {
                    this.myPeerId = id;
                    this.game.onRoomCreated(this.roomCode);
                });

                this.peer.on('connection', (conn) => {
                    this.handleNewClientConnection(conn);
                });

                this.peer.on('error', (err) => {
                    console.warn('Peer error:', err);
                    if (err.type === 'unavailable-id') {
                        // try another room code
                        this.createRoom();
                    } else {
                        this.game.showToast(`P2P Status: ${err.type || 'Connection issue'}, multi-tab fallback active.`);
                    }
                });
            } catch (e) {
                console.error('PeerJS init failed:', e);
                this.game.onRoomCreated(this.roomCode);
            }
        } else {
            // Local fallback
            this.game.onRoomCreated(this.roomCode);
        }

        // Notify broadcast channel
        this.broadcast({
            type: 'ROOM_ANNOUNCE',
            roomCode: this.roomCode,
            hostName: this.myName
        });
    }

    joinRoom(code) {
        if (!code) return;
        this.isHost = false;
        this.isOnline = true;
        this.roomCode = code.toUpperCase().trim();
        const targetPeerId = `royal-bj-${this.roomCode.toLowerCase()}`;

        if (window.Peer) {
            try {
                if (this.peer) this.peer.destroy();
                this.peer = new Peer({
                    debug: 1,
                    config: {
                        iceServers: [
                            { urls: 'stun:stun.l.google.com:19302' },
                            { urls: 'stun:global.stun.twilio.com:3478' }
                        ]
                    }
                });

                this.peer.on('open', (id) => {
                    this.myPeerId = id;
                    const conn = this.peer.connect(targetPeerId, { reliable: true });
                    this.setupClientConnection(conn);
                });

                this.peer.on('error', (err) => {
                    console.warn('Join Peer error:', err);
                    this.game.showToast(`Tidak dapat tersambung via P2P: ${err.message || err.type}. Mencoba koneksi lokal...`);
                });
            } catch (e) {
                console.error('Join room failed:', e);
            }
        }

        // Also ping via BroadcastChannel for multi-tab join
        this.broadcast({
            type: 'CLIENT_JOIN_REQUEST',
            roomCode: this.roomCode,
            playerId: this.myPlayerId,
            name: this.myName,
            avatar: this.myAvatar
        });
    }

    handleNewClientConnection(conn) {
        conn.on('open', () => {
            this.connections.set(conn.peer, conn);
            this.game.onPlayerConnected(conn.peer);

            // Send full current game state to newly joined client
            const state = this.game.serializeStateForSync();
            conn.send({
                type: 'FULL_STATE_SYNC',
                state: state
            });
        });

        conn.on('data', (data) => {
            this.handleIncomingMessage(data, conn.peer);
        });

        conn.on('close', () => {
            this.connections.delete(conn.peer);
            this.game.onPlayerDisconnected(conn.peer);
        });
    }

    setupClientConnection(conn) {
        this.hostConn = conn;

        conn.on('open', () => {
            this.game.onJoinedRoom(this.roomCode);
            // Send client info
            conn.send({
                type: 'CLIENT_HELLO',
                playerId: this.myPlayerId,
                name: this.myName,
                avatar: this.myAvatar
            });
        });

        conn.on('data', (data) => {
            this.handleIncomingMessage(data, 'host');
        });

        conn.on('close', () => {
            this.hostConn = null;
            this.game.showToast('Koneksi ke Host terputus.');
            this.game.onDisconnectedFromHost();
        });
    }

    sendToHost(msg) {
        msg.senderId = this.myPlayerId;
        msg.senderName = this.myName;

        if (this.hostConn && this.hostConn.open) {
            this.hostConn.send(msg);
        }
        if (this.broadcastChannel) {
            this.broadcastChannel.postMessage({
                ...msg,
                _target: 'host',
                _roomCode: this.roomCode
            });
        }
    }

    broadcast(msg) {
        // Send to all connected WebRTC peers if host
        if (this.isHost) {
            for (const [peerId, conn] of this.connections.entries()) {
                if (conn.open) {
                    conn.send(msg);
                }
            }
        }

        // Also broadcast over local tab channel
        if (this.broadcastChannel) {
            this.broadcastChannel.postMessage({
                ...msg,
                _roomCode: this.roomCode
            });
        }
    }

    handleIncomingMessage(msg, fromSource) {
        if (!msg || !msg.type) return;

        // If local multi-tab message, check room code filter
        if (msg._roomCode && this.roomCode && msg._roomCode !== this.roomCode) {
            return;
        }

        // If message is directed to host and I am not host, ignore
        if (msg._target === 'host' && !this.isHost) {
            return;
        }

        // Route message to game engine
        this.game.handleNetworkMessage(msg, fromSource);
    }

    leaveRoom() {
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
        this.connections.clear();
        this.hostConn = null;
        this.isHost = false;
        this.isOnline = false;
        this.roomCode = null;
    }
}

window.MultiplayerManager = MultiplayerManager;
