import { Lang } from "./i18n";

export interface User {
  id: string;
  name: string;
  password: string;
  avatar: string | null;
}

export interface Session {
  id: string;
  userId: string;
  device: string;
  createdAt: number;
  lastActive: number;
}

export interface Message {
  id: string;
  from: string;
  to: string;
  text: string;
  type: "text" | "voice" | "emoji";
  timestamp: number;
}

export interface GroupChat {
  id: string;
  name: string;
  avatar: string | null;
  creatorId: string;
  adminIds: string[];
  memberIds: string[];
  lastMessage?: string;
  lastTime?: number;
}

export interface Chat {
  userId: string;
  userName: string;
  userAvatar: string | null;
  lastMessage?: string;
  lastTime?: number;
  unread?: number;
}

export interface LoginAttempts {
  count: number;
  lockedUntil: number | null;
}

export interface AppState {
  currentUser: User | null;
  users: User[];
  chats: Chat[];
  groupChats: GroupChat[];
  messages: Message[];
  sessions: Session[];
  loginAttempts: Record<string, LoginAttempts>;
  lang: Lang;
  darkMode: boolean;
  currentSessionId: string | null;
}

const STORAGE_KEY = "kit-messenger";

export function loadState(): AppState {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      return {
        currentUser: parsed.currentUser || null,
        users: parsed.users || [],
        chats: parsed.chats || [],
        groupChats: parsed.groupChats || [],
        messages: parsed.messages || [],
        sessions: parsed.sessions || [],
        loginAttempts: parsed.loginAttempts || {},
        lang: parsed.lang || "ru",
        darkMode: parsed.darkMode || false,
        currentSessionId: parsed.currentSessionId || null,
      };
    }
  } catch (_e) { /* skip */ }
  return {
    currentUser: null,
    users: [],
    chats: [],
    groupChats: [],
    messages: [],
    sessions: [],
    loginAttempts: {},
    lang: "ru",
    darkMode: false,
    currentSessionId: null,
  };
}

export function saveState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function getDeviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Mac/.test(ua)) return "Mac";
  if (/Win/.test(ua)) return "Windows";
  if (/Linux/.test(ua)) return "Linux";
  return "Unknown Device";
}

export default { loadState, saveState, generateId, getDeviceName };
