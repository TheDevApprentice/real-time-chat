 // src/services/websocket/websocket.ts

// ===== SOCKET.IO-CLIENT SERVICE POUR TOUTE L'APP =====
import { getCookie } from '@/utils/cookieHelper';
import { io, Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WEBSOCKET_URL as string;
const RECONNECT_INTERVAL = Number(import.meta.env.VITE_WEBSOCKET_RECONNECT_INTERVAL);
const DEBUG = import.meta.env.VITE_ENABLE_DEBUG_MODE === 'true';

class SocketService {
  private socket: Socket;

  constructor() {
    console.log("token", getCookie("session_token"));
    console.log("X-XSRF-TOKEN", getCookie("X-XSRF-TOKEN"));
    this.socket = io(WS_URL, {
      autoConnect: false,
      withCredentials: true,
      transports: ['websocket'],
      auth: {
        csrf: getCookie('X-XSRF-TOKEN') || '',
      },
    });
    if (DEBUG) {
      this.socket.onAny((event, ...args) => {
        console.debug('[socket.io] event:', event, ...args);
      });
    }
  }

  connect() {
    if (!this.socket.connected) this.socket.connect();
  }
  disconnect() {
    if (this.socket.connected) this.socket.disconnect();
  }
  isConnected(): boolean {
    return this.socket.connected;
  }
  on(event: string, cb: (...args: any[]) => void) {
    this.socket.on(event, cb);
  }
  off(event: string, cb: (...args: any[]) => void) {
    this.socket.off(event, cb);
  }
  emit(event: string, data?: any, cb?: (...args: any[]) => void) {
    if (cb) {
      this.socket.emit(event, data, cb);
    } else {
      this.socket.emit(event, data);
    }
  }
}

export const socketService = new SocketService();

// Toute authentification/session est gérée côté backend local via cookie sécurisé (HttpOnly/Secure)
// Le frontend ne manipule aucun token, le cookie de session est envoyé automatiquement par Electron

// Types d'événements bas niveau
export type WebSocketEvent = 'open' | 'close' | 'error' | 'message' | string;
export type WebSocketCallback = (event: Event | MessageEvent) => void;

// Types métier pour la communication structurée
export interface WsMessage<T = any> {
  type: string;
  payload?: T;
  [key: string]: any;
}
export type WsTypedCallback<T = any> = (msg: WsMessage<T>, raw: MessageEvent) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private manuallyClosed = false;
  private listeners: Map<WebSocketEvent, Set<WebSocketCallback>> = new Map();
  private typeListeners: Map<string, Set<WsTypedCallback>> = new Map();

  /**
   * Ouvre la connexion WebSocket (si pas déjà ouverte)
   */
  connect(): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      if (DEBUG) console.log('[WS] Already connected or connecting');
      return;
    }
    this.manuallyClosed = false;
    this.socket = new WebSocket(WS_URL);
    this.socket.onopen = (event) => this.handleEvent('open', event);
    this.socket.onclose = (event) => this.handleEvent('close', event);
    this.socket.onerror = (event) => this.handleEvent('error', event);
    this.socket.onmessage = (event) => this.handleEvent('message', event);
    if (DEBUG) console.log('[WS] Connecting to', WS_URL);
  }

  /**
   * Ferme la connexion WebSocket
   */
  disconnect(): void {
    this.manuallyClosed = true;
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      if (DEBUG) console.log('[WS] Disconnected');
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Envoie une donnée (string ou objet) brute sur le socket
   */
  send(data: string | object): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      if (DEBUG) console.warn('[WS] Cannot send, socket not open');
      return;
    }
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    this.socket.send(payload);
    if (DEBUG) console.log('[WS] Sent:', payload);
  }

  /**
   * Envoie un message métier typé (automatiquement stringifié)
   */
  sendJson<T = any>(type: string, payload?: T, extra?: Record<string, any>): void {
    const msg: WsMessage<T> = { type, payload, ...extra };
    this.send(msg);
  }

  /**
   * S'abonne à un événement WebSocket natif (open, close, error, message)
   */
  on(event: WebSocketEvent, callback: WebSocketCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Se désabonne d'un événement WebSocket natif
   */
  off(event: WebSocketEvent, callback: WebSocketCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  /**
   * S'abonne à un type métier (ex : 'MES_EVENT')
   */
  onType<T = any>(type: string, callback: WsTypedCallback<T>): void {
    if (!this.typeListeners.has(type)) {
      this.typeListeners.set(type, new Set());
    }
    this.typeListeners.get(type)!.add(callback);
  }

  /**
   * Se désabonne d'un type métier
   */
  offType<T = any>(type: string, callback: WsTypedCallback<T>): void {
    this.typeListeners.get(type)?.delete(callback);
  }

  /**
   * Gère tous les événements natifs et métier (décodage JSON, dispatch)
   */
  private handleEvent(event: WebSocketEvent, e: Event | MessageEvent): void {
    if (DEBUG) console.log(`[WS] Event: ${event}`, e);
    // Gestion reconnexion
    if (event === 'close' && !this.manuallyClosed) {
      if (DEBUG) console.warn('[WS] Connection closed, attempting to reconnect in', RECONNECT_INTERVAL, 'ms');
      this.reconnectTimer = window.setTimeout(() => this.connect(), RECONNECT_INTERVAL);
    }
    // Appel des callbacks natifs
    this.listeners.get(event)?.forEach(cb => cb(e));
    // Décodage JSON et dispatch métier
    if (event === 'message') {
      const msgEvent = e as MessageEvent;
      let parsed: WsMessage | null = null;
      try {
        parsed = JSON.parse(msgEvent.data);
      } catch (err) {
        if (DEBUG) console.warn('[WS] Message is not valid JSON:', msgEvent.data);
      }
      if (parsed && parsed.type && this.typeListeners.has(parsed.type)) {
        this.typeListeners.get(parsed.type)!.forEach(cb => cb(parsed!, msgEvent));
      }
    }
  }

  /**
   * Statut de connexion
   */
  isConnected(): boolean {
    return !!this.socket && this.socket.readyState === WebSocket.OPEN;
  }
}

export const websocketService = new WebSocketService();
export default websocketService;