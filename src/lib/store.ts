import { Lang } from "./i18n";

export interface User {
  id: string;
  name: string;
  password: string;
  avatar: string | null;
}

export interface Message {
  id: string;
  from: string;
  to: string;
  text: string;
  type: "text" | "voice" | "emoji";
  timestamp: number;
}

export interface Chat {
  userId: string;
  userName: string;
  userAvatar: string | null;
  lastMessage?: string;
  lastTime?: number;
  unread?: number;
}

export interface AppState {
  currentUser: User | null;
  users: User[];
  chats: Chat[];
  messages: Message[];
  lang: Lang;
  darkMode: boolean;
}

const STORAGE_KEY = "kit-messenger";

export function loadState(): AppState {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch (_e) { /* skip */ }
  return {
    currentUser: null,
    users: [],
    chats: [],
    messages: [],
    lang: "ru",
    darkMode: false,
  };
}

export function saveState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export default { loadState, saveState, generateId };