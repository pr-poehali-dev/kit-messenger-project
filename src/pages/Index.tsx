import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { t, Lang } from "@/lib/i18n";
import { emojiCategories } from "@/lib/emojis";
import {
  User, Message, Chat, GroupChat, Session, AppState,
  loadState, saveState, generateId, getDeviceName,
} from "@/lib/store";

const WHALE_IMG = "https://cdn.poehali.dev/projects/aa37963a-ac17-4996-997c-ec31fd6a084a/files/086eb4e5-b902-48c8-8c57-28d850664b71.jpg";
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION = 5 * 60 * 1000;

type Screen =
  | "welcome" | "login" | "register" | "created" | "main"
  | "chat" | "groupChat" | "search" | "settings" | "profile"
  | "changePassword" | "calling" | "sessions"
  | "createGroup1" | "createGroup2" | "createGroup3"
  | "groupSettings" | "addGroupMembers";

export default function Index() {
  const [state, setState] = useState<AppState>(loadState);
  const [screen, setScreen] = useState<Screen>(
    state.currentUser ? "main" : "welcome"
  );
  const [tab, setTab] = useState<"chats" | "contacts">("chats");

  const [regName, setRegName] = useState("");
  const [regPass, setRegPass] = useState("");
  const [regAvatar, setRegAvatar] = useState<string | null>(null);

  const [loginName, setLoginName] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<User | null>(null);
  const [searchDone, setSearchDone] = useState(false);

  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [activeGroup, setActiveGroup] = useState<GroupChat | null>(null);
  const [msgText, setMsgText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [callingUser, setCallingUser] = useState("");

  const [editName, setEditName] = useState("");
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [passError, setPassError] = useState("");

  const [grpSelectedMembers, setGrpSelectedMembers] = useState<string[]>([]);
  const [grpName, setGrpName] = useState("");
  const [grpAvatar, setGrpAvatar] = useState<string | null>(null);

  const [selectedMsg, setSelectedMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarEditRef = useRef<HTMLInputElement>(null);
  const grpAvatarRef = useRef<HTMLInputElement>(null);

  const lang = state.lang;

  useEffect(() => { saveState(state); }, [state]);

  useEffect(() => {
    if (state.darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [state.darkMode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages, activeChat, activeGroup]);

  useEffect(() => {
    if (!state.currentUser || !state.currentSessionId) return;
    const interval = setInterval(() => {
      const stored = loadState();
      const sessionExists = stored.sessions.some(
        (s) => s.id === state.currentSessionId && s.userId === state.currentUser!.id
      );
      if (!sessionExists) {
        setState({
          ...state,
          currentUser: null,
          currentSessionId: null,
        });
        setScreen("welcome");
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [state.currentUser, state.currentSessionId]);

  function up(partial: Partial<AppState>) {
    setState((prev) => ({ ...prev, ...partial }));
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>, cb: (url: string) => void) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => cb(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function createSession(userId: string): Session {
    return {
      id: generateId(),
      userId,
      device: getDeviceName(),
      createdAt: Date.now(),
      lastActive: Date.now(),
    };
  }

  function doLogin() {
    setLoginError("");
    const user = state.users.find(
      (u) => u.name.toLowerCase() === loginName.trim().toLowerCase()
    );
    if (!user) { setLoginError(t("userNotExist", lang)); return; }

    const attempts = state.loginAttempts[user.id] || { count: 0, lockedUntil: null };
    if (attempts.lockedUntil && Date.now() < attempts.lockedUntil) {
      const min = Math.ceil((attempts.lockedUntil - Date.now()) / 60000);
      setLoginError(t("accountLocked", lang).replace("{min}", String(min)));
      return;
    }

    if (loginPass !== user.password) {
      const newCount = (attempts.lockedUntil && Date.now() >= attempts.lockedUntil) ? 1 : attempts.count + 1;
      const locked = newCount >= MAX_LOGIN_ATTEMPTS ? Date.now() + LOCK_DURATION : null;
      up({
        loginAttempts: {
          ...state.loginAttempts,
          [user.id]: { count: newCount, lockedUntil: locked },
        },
      });
      if (locked) {
        setLoginError(t("accountLocked", lang).replace("{min}", "5"));
      } else {
        setLoginError(t("wrongPassword", lang));
      }
      return;
    }

    const session = createSession(user.id);
    up({
      currentUser: user,
      sessions: [...state.sessions, session],
      currentSessionId: session.id,
      loginAttempts: { ...state.loginAttempts, [user.id]: { count: 0, lockedUntil: null } },
    });
    setLoginName("");
    setLoginPass("");
    setScreen("main");
  }

  function createAccount() {
    if (!regName.trim() || !regPass.trim()) return;
    const existing = state.users.find(
      (u) => u.name.toLowerCase() === regName.trim().toLowerCase()
    );
    if (existing) return;
    const user: User = {
      id: generateId(),
      name: regName.trim(),
      password: regPass,
      avatar: regAvatar,
    };
    const session = createSession(user.id);
    up({
      currentUser: user,
      users: [...state.users, user],
      sessions: [...state.sessions, session],
      currentSessionId: session.id,
    });
    setScreen("created");
  }

  function doLogout() {
    const sessions = state.sessions.filter((s) => s.id !== state.currentSessionId);
    up({ currentUser: null, currentSessionId: null, sessions });
    setScreen("welcome");
  }

  function removeSession(sessionId: string) {
    up({ sessions: state.sessions.filter((s) => s.id !== sessionId) });
  }

  function doSearch() {
    const found = state.users.find(
      (u) =>
        u.name.toLowerCase() === searchQuery.trim().toLowerCase() &&
        u.id !== state.currentUser?.id
    );
    setSearchResult(found || null);
    setSearchDone(true);
  }

  function startChatWith(user: User) {
    let chat = state.chats.find((c) => c.userId === user.id);
    if (!chat) {
      chat = { userId: user.id, userName: user.name, userAvatar: user.avatar };
      up({ chats: [...state.chats, chat] });
    }
    setActiveChat(chat);
    setScreen("chat");
    setSearchQuery(""); setSearchResult(null); setSearchDone(false);
  }

  function sendMsg(text: string, type: "text" | "voice" | "emoji" = "text") {
    if (!text.trim() || !state.currentUser) return;
    const toId = activeGroup ? activeGroup.id : activeChat?.userId;
    if (!toId) return;
    const msg: Message = {
      id: generateId(), from: state.currentUser.id, to: toId,
      text, type, timestamp: Date.now(),
    };
    const messages = [...state.messages, msg];
    const lastTxt = type === "voice" ? "🎤 " + t("voiceMessage", lang) : text;

    if (activeGroup) {
      const groupChats = state.groupChats.map((g) =>
        g.id === activeGroup!.id ? { ...g, lastMessage: lastTxt, lastTime: msg.timestamp } : g
      );
      up({ messages, groupChats });
    } else if (activeChat) {
      const chats = state.chats.map((c) =>
        c.userId === activeChat!.userId ? { ...c, lastMessage: lastTxt, lastTime: msg.timestamp } : c
      );
      up({ messages, chats });
    }
    setMsgText(""); setShowEmoji(false);
  }

  function deleteMsg(msgId: string) {
    up({ messages: state.messages.filter((m) => m.id !== msgId) });
    setSelectedMsg(null);
  }

  function getChatMsgs() {
    if (!state.currentUser) return [];
    if (activeGroup) {
      return state.messages.filter((m) => m.to === activeGroup.id);
    }
    if (activeChat) {
      return state.messages.filter(
        (m) =>
          (m.from === state.currentUser!.id && m.to === activeChat.userId) ||
          (m.from === activeChat.userId && m.to === state.currentUser!.id)
      );
    }
    return [];
  }

  function handleVoice() {
    setIsRecording(true);
    setTimeout(() => { setIsRecording(false); sendMsg("🎤 0:03", "voice"); }, 2000);
  }

  function fmtTime(ts?: number) {
    if (!ts) return "";
    const d = new Date(ts);
    return d.getHours().toString().padStart(2, "0") + ":" + d.getMinutes().toString().padStart(2, "0");
  }

  function fmtDate(ts: number) {
    const d = new Date(ts);
    return d.toLocaleDateString() + " " + fmtTime(ts);
  }

  function saveProfile() {
    if (!state.currentUser || !editName.trim()) return;
    const updated = { ...state.currentUser, name: editName.trim() };
    const users = state.users.map((u) => (u.id === updated.id ? updated : u));
    up({ currentUser: updated, users });
    setScreen("main");
  }

  function changePassword() {
    if (!state.currentUser) return;
    setPassError("");

    const attempts = state.loginAttempts[state.currentUser.id + "_pass"] || { count: 0, lockedUntil: null };
    if (attempts.lockedUntil && Date.now() < attempts.lockedUntil) {
      const min = Math.ceil((attempts.lockedUntil - Date.now()) / 60000);
      setPassError(t("accountLocked", lang).replace("{min}", String(min)));
      return;
    }

    if (oldPass !== state.currentUser.password) {
      const newCount = attempts.count + 1;
      const locked = newCount >= MAX_LOGIN_ATTEMPTS ? Date.now() + LOCK_DURATION : null;
      up({
        loginAttempts: {
          ...state.loginAttempts,
          [state.currentUser.id + "_pass"]: { count: newCount, lockedUntil: locked },
        },
      });
      setPassError(locked
        ? t("accountLocked", lang).replace("{min}", "5")
        : t("wrongPassword", lang));
      return;
    }
    if (!newPass.trim()) return;
    const updated = { ...state.currentUser, password: newPass };
    const users = state.users.map((u) => (u.id === updated.id ? updated : u));
    up({
      currentUser: updated, users,
      loginAttempts: {
        ...state.loginAttempts,
        [state.currentUser.id + "_pass"]: { count: 0, lockedUntil: null },
      },
    });
    setOldPass(""); setNewPass(""); setPassError("");
    setScreen("profile");
  }

  function isGroupAdmin(groupId?: string) {
    if (!state.currentUser || !groupId) return false;
    const g = state.groupChats.find((gr) => gr.id === groupId);
    if (!g) return false;
    return g.creatorId === state.currentUser.id || g.adminIds.includes(state.currentUser.id);
  }

  function createGroupChat() {
    if (!state.currentUser || !grpName.trim()) return;
    const group: GroupChat = {
      id: generateId(),
      name: grpName.trim(),
      avatar: grpAvatar,
      creatorId: state.currentUser.id,
      adminIds: [state.currentUser.id],
      memberIds: [state.currentUser.id, ...grpSelectedMembers],
    };
    up({ groupChats: [...state.groupChats, group] });
    setActiveGroup(group);
    setScreen("groupChat");
    setGrpName(""); setGrpAvatar(null); setGrpSelectedMembers([]);
  }

  function getUserById(id: string) {
    return state.users.find((u) => u.id === id);
  }

  // ========================= WELCOME =========================
  if (screen === "welcome") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-blue-950 dark:to-background p-6">
        <div className="animate-fade-in flex flex-col items-center text-center max-w-sm">
          <div className="w-32 h-32 mb-8 rounded-full overflow-hidden shadow-lg border-4 border-white dark:border-blue-900">
            <img src={WHALE_IMG} alt="Кит" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t("welcome", lang)}</h1>
          <p className="text-muted-foreground text-lg mb-10">{t("welcomeSub", lang)}</p>
          <div className="w-full space-y-3">
            <Button className="w-full h-12 text-lg bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl" onClick={() => setScreen("login")}>
              {t("loginBtn", lang)}
            </Button>
            <Button variant="outline" className="w-full h-12 text-lg rounded-xl" onClick={() => setScreen("register")}>
              {t("registerBtn", lang)}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ========================= LOGIN =========================
  if (screen === "login") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-blue-950 dark:to-background p-6">
        <div className="animate-fade-in w-full max-w-sm">
          <h2 className="text-2xl font-bold text-center mb-8">{t("login", lang)}</h2>
          <div className="space-y-4">
            <Input placeholder={t("name", lang)} value={loginName} onChange={(e) => setLoginName(e.target.value)} className="h-12 rounded-xl" />
            <Input placeholder={t("password", lang)} type="password" value={loginPass}
              onChange={(e) => setLoginPass(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doLogin()}
              className="h-12 rounded-xl" />
            {loginError && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-600 dark:text-red-400 animate-fade-in">
                <Icon name="AlertCircle" size={16} className="inline mr-2" />{loginError}
              </div>
            )}
            <Button className="w-full h-12 text-lg bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
              onClick={doLogin} disabled={!loginName.trim() || !loginPass.trim()}>
              {t("loginBtn", lang)}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {t("noAccount", lang)}{" "}
              <button className="text-primary underline" onClick={() => { setScreen("register"); setLoginError(""); }}>
                {t("registerBtn", lang)}
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ========================= REGISTER =========================
  if (screen === "register") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-blue-950 dark:to-background p-6">
        <div className="animate-fade-in w-full max-w-sm">
          <h2 className="text-2xl font-bold text-center mb-8">{t("createAccount", lang)}</h2>
          <div className="flex flex-col items-center mb-6">
            <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center cursor-pointer overflow-hidden border-2 border-primary/20 hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}>
              {regAvatar ? <img src={regAvatar} alt="" className="w-full h-full object-cover" />
                : <Icon name="Camera" size={32} className="text-muted-foreground" />}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e, setRegAvatar)} />
            <div className="flex gap-2 mt-3">
              <Button variant="outline" size="sm" className="text-xs" onClick={() => fileInputRef.current?.click()}>
                <Icon name="Image" size={14} className="mr-1" />{t("gallery", lang)}
              </Button>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => fileInputRef.current?.click()}>
                <Icon name="Camera" size={14} className="mr-1" />{t("photo", lang)}
              </Button>
            </div>
          </div>
          <div className="space-y-4">
            <Input placeholder={t("name", lang)} value={regName} onChange={(e) => setRegName(e.target.value)} className="h-12 rounded-xl" />
            <Input placeholder={t("password", lang)} type="password" value={regPass} onChange={(e) => setRegPass(e.target.value)} className="h-12 rounded-xl" />
            <Button className="w-full h-12 text-lg bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
              onClick={createAccount} disabled={!regName.trim() || !regPass.trim()}>
              {t("create", lang)}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {t("hasAccount", lang)}{" "}
              <button className="text-primary underline" onClick={() => setScreen("login")}>
                {t("loginBtn", lang)}
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ========================= ACCOUNT CREATED =========================
  if (screen === "created") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-blue-950 dark:to-background p-6">
        <div className="animate-scale-in flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-6">
            <Icon name="Check" size={40} className="text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">{t("accountCreated", lang)}</h2>
          <p className="text-muted-foreground mb-8">{state.currentUser?.name}</p>
          <Button className="w-48 h-12 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl" onClick={() => setScreen("main")}>
            {t("continue", lang)}
          </Button>
        </div>
      </div>
    );
  }

  // ========================= CALLING =========================
  if (screen === "calling") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-600 to-blue-800 p-6">
        <div className="animate-fade-in flex flex-col items-center text-center">
          <div className="w-28 h-28 rounded-full bg-white/20 flex items-center justify-center mb-6 animate-pulse">
            <Icon name="Phone" size={48} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">{callingUser}</h2>
          <p className="text-blue-200 mb-10">{t("calling", lang)}</p>
          <Button className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600"
            onClick={() => { if (activeGroup) setScreen("groupChat"); else setScreen("chat"); }}>
            <Icon name="PhoneOff" size={28} className="text-white" />
          </Button>
          <p className="text-blue-200 text-sm mt-3">{t("endCall", lang)}</p>
        </div>
      </div>
    );
  }

  // ========================= CREATE GROUP STEP 1: SELECT MEMBERS =========================
  if (screen === "createGroup1") {
    const contacts = state.chats;
    return (
      <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
        <div className="flex items-center gap-3 p-4 border-b">
          <Button variant="ghost" size="icon" onClick={() => { setScreen("main"); setGrpSelectedMembers([]); }}>
            <Icon name="ArrowLeft" size={22} />
          </Button>
          <h2 className="text-lg font-semibold">{t("whoToAdd", lang)}</h2>
          <div className="flex-1" />
          <Button variant="ghost" className="text-primary" onClick={() => setScreen("createGroup2")}>
            {t("skip", lang)}
          </Button>
        </div>
        <ScrollArea className="flex-1 p-4">
          {contacts.length === 0 ? (
            <div className="text-center py-20">
              <Icon name="Users" size={40} className="mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">{t("noContacts", lang)}</p>
              <Button className="mt-4 rounded-xl bg-primary text-primary-foreground" onClick={() => setScreen("createGroup2")}>
                {t("skip", lang)}
              </Button>
            </div>
          ) : (
            contacts.map((c) => {
              const sel = grpSelectedMembers.includes(c.userId);
              return (
                <div key={c.userId} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${sel ? "bg-primary/10" : "hover:bg-secondary/50"}`}
                  onClick={() => {
                    setGrpSelectedMembers(sel ? grpSelectedMembers.filter((id) => id !== c.userId) : [...grpSelectedMembers, c.userId]);
                  }}>
                  <Avatar className="w-11 h-11">
                    {c.userAvatar && <AvatarImage src={c.userAvatar} />}
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">{c.userName.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <p className="flex-1 font-medium text-sm">{c.userName}</p>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${sel ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                    {sel && <Icon name="Check" size={14} className="text-white" />}
                  </div>
                </div>
              );
            })
          )}
        </ScrollArea>
        {grpSelectedMembers.length > 0 && (
          <div className="p-4 border-t">
            <Button className="w-full h-11 rounded-xl bg-primary text-primary-foreground" onClick={() => setScreen("createGroup2")}>
              {t("next", lang)} ({grpSelectedMembers.length})
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ========================= CREATE GROUP STEP 2: NAME & AVATAR =========================
  if (screen === "createGroup2") {
    return (
      <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
        <div className="flex items-center gap-3 p-4 border-b">
          <Button variant="ghost" size="icon" onClick={() => setScreen("createGroup1")}>
            <Icon name="ArrowLeft" size={22} />
          </Button>
          <h2 className="text-lg font-semibold">{t("createGroup", lang)}</h2>
        </div>
        <div className="p-4 space-y-6">
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center cursor-pointer overflow-hidden border-2 border-primary/20 hover:border-primary transition-colors"
              onClick={() => grpAvatarRef.current?.click()}>
              {grpAvatar ? <img src={grpAvatar} alt="" className="w-full h-full object-cover" />
                : <Icon name="Camera" size={32} className="text-muted-foreground" />}
            </div>
            <input ref={grpAvatarRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e, setGrpAvatar)} />
            <div className="flex gap-2 mt-3">
              <Button variant="outline" size="sm" className="text-xs" onClick={() => grpAvatarRef.current?.click()}>
                <Icon name="Image" size={14} className="mr-1" />{t("gallery", lang)}
              </Button>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => grpAvatarRef.current?.click()}>
                <Icon name="Camera" size={14} className="mr-1" />{t("photo", lang)}
              </Button>
            </div>
          </div>
          <Input placeholder={t("groupName", lang)} value={grpName} onChange={(e) => setGrpName(e.target.value)} className="h-12 rounded-xl" />
          <Button className="w-full h-12 bg-primary text-primary-foreground rounded-xl"
            onClick={createGroupChat} disabled={!grpName.trim()}>
            {t("create", lang)}
          </Button>
        </div>
      </div>
    );
  }

  // ========================= GROUP SETTINGS =========================
  if (screen === "groupSettings" && activeGroup) {
    const g = state.groupChats.find((gr) => gr.id === activeGroup.id) || activeGroup;
    const canEdit = g.creatorId === state.currentUser?.id || g.adminIds.includes(state.currentUser?.id || "");
    return (
      <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
        <div className="flex items-center gap-3 p-4 border-b">
          <Button variant="ghost" size="icon" onClick={() => setScreen("groupChat")}>
            <Icon name="ArrowLeft" size={22} />
          </Button>
          <h2 className="text-lg font-semibold">{t("groupSettings", lang)}</h2>
        </div>
        <div className="p-4 space-y-4">
          {canEdit && (
            <div className="flex flex-col items-center mb-2">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary/20 cursor-pointer hover:border-primary transition-colors"
                onClick={() => grpAvatarRef.current?.click()}>
                <Avatar className="w-full h-full">
                  {g.avatar && <AvatarImage src={g.avatar} />}
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold w-full h-full">{g.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
              </div>
              <input ref={grpAvatarRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e, (url) => {
                const groupChats = state.groupChats.map((gr) => gr.id === g.id ? { ...gr, avatar: url } : gr);
                up({ groupChats });
                setActiveGroup({ ...g, avatar: url });
              })} />
              <Input className="mt-3 h-11 rounded-xl text-center" value={g.name}
                onChange={(e) => {
                  const groupChats = state.groupChats.map((gr) => gr.id === g.id ? { ...gr, name: e.target.value } : gr);
                  up({ groupChats });
                  setActiveGroup({ ...g, name: e.target.value });
                }} />
            </div>
          )}

          <div className="bg-card rounded-xl border p-3">
            <div className="flex items-center justify-between mb-3">
              <p className="font-medium">{t("members", lang)} ({g.memberIds.length})</p>
              {canEdit && (
                <Button variant="ghost" size="sm" className="text-primary text-xs" onClick={() => setScreen("addGroupMembers")}>
                  <Icon name="UserPlus" size={14} className="mr-1" />{t("addToGroup", lang)}
                </Button>
              )}
            </div>
            {g.memberIds.map((mid) => {
              const u = getUserById(mid);
              if (!u) return null;
              const isCreator = g.creatorId === mid;
              const isAdmin = g.adminIds.includes(mid);
              const iMe = mid === state.currentUser?.id;
              return (
                <div key={mid} className="flex items-center gap-3 py-2">
                  <Avatar className="w-9 h-9">
                    {u.avatar && <AvatarImage src={u.avatar} />}
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{u.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.name}{iMe ? " (вы)" : ""}</p>
                    {isCreator && <p className="text-[10px] text-primary">{t("creator", lang)}</p>}
                    {!isCreator && isAdmin && <p className="text-[10px] text-blue-500">{t("admin", lang)}</p>}
                  </div>
                  {canEdit && !iMe && !isCreator && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="text-xs h-7 px-2"
                        onClick={() => {
                          const newAdmins = isAdmin
                            ? g.adminIds.filter((a) => a !== mid)
                            : [...g.adminIds, mid];
                          const groupChats = state.groupChats.map((gr) =>
                            gr.id === g.id ? { ...gr, adminIds: newAdmins } : gr
                          );
                          up({ groupChats });
                          setActiveGroup({ ...g, adminIds: newAdmins });
                        }}>
                        {isAdmin ? t("removeAdmin", lang) : t("makeAdmin", lang)}
                      </Button>
                      <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-red-500"
                        onClick={() => {
                          const newMembers = g.memberIds.filter((m) => m !== mid);
                          const newAdmins = g.adminIds.filter((a) => a !== mid);
                          const groupChats = state.groupChats.map((gr) =>
                            gr.id === g.id ? { ...gr, memberIds: newMembers, adminIds: newAdmins } : gr
                          );
                          up({ groupChats });
                          setActiveGroup({ ...g, memberIds: newMembers, adminIds: newAdmins });
                        }}>
                        <Icon name="X" size={12} />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ========================= ADD GROUP MEMBERS =========================
  if (screen === "addGroupMembers" && activeGroup) {
    const g = state.groupChats.find((gr) => gr.id === activeGroup.id) || activeGroup;
    const available = state.users.filter(
      (u) => u.id !== state.currentUser?.id && !g.memberIds.includes(u.id)
    );
    return (
      <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
        <div className="flex items-center gap-3 p-4 border-b">
          <Button variant="ghost" size="icon" onClick={() => setScreen("groupSettings")}>
            <Icon name="ArrowLeft" size={22} />
          </Button>
          <h2 className="text-lg font-semibold">{t("addMembers", lang)}</h2>
        </div>
        <ScrollArea className="flex-1 p-4">
          {available.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">{t("noContacts", lang)}</p>
          ) : available.map((u) => (
            <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 cursor-pointer"
              onClick={() => {
                const newMembers = [...g.memberIds, u.id];
                const groupChats = state.groupChats.map((gr) =>
                  gr.id === g.id ? { ...gr, memberIds: newMembers } : gr
                );
                up({ groupChats });
                setActiveGroup({ ...g, memberIds: newMembers });
              }}>
              <Avatar className="w-10 h-10">
                {u.avatar && <AvatarImage src={u.avatar} />}
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">{u.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <p className="flex-1 font-medium text-sm">{u.name}</p>
              <Icon name="Plus" size={18} className="text-primary" />
            </div>
          ))}
        </ScrollArea>
      </div>
    );
  }

  // ========================= SEARCH =========================
  if (screen === "search") {
    return (
      <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
        <div className="flex items-center gap-3 p-4 border-b">
          <Button variant="ghost" size="icon" onClick={() => { setScreen("main"); setSearchDone(false); setSearchResult(null); setSearchQuery(""); }}>
            <Icon name="ArrowLeft" size={22} />
          </Button>
          <h2 className="text-lg font-semibold">{t("search", lang)}</h2>
        </div>
        <div className="p-4">
          <div className="flex gap-2">
            <Input placeholder={t("searchPlaceholder", lang)} value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()} className="h-11 rounded-xl" />
            <Button className="h-11 rounded-xl bg-primary text-primary-foreground" onClick={doSearch}>
              <Icon name="Search" size={18} />
            </Button>
          </div>
          {searchDone && (
            <div className="mt-6 animate-fade-in">
              {searchResult ? (
                <div className="flex items-center gap-4 p-4 bg-card rounded-xl border">
                  <Avatar className="w-12 h-12">
                    {searchResult.avatar && <AvatarImage src={searchResult.avatar} />}
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">{searchResult.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold">{searchResult.name}</p>
                    <p className="text-xs text-green-500">{t("online", lang)}</p>
                  </div>
                  <Button className="bg-primary text-primary-foreground rounded-xl" onClick={() => startChatWith(searchResult!)}>
                    {t("startChat", lang)}
                  </Button>
                </div>
              ) : (
                <p className="text-center text-muted-foreground">{t("userNotFound", lang)}</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ========================= SETTINGS =========================
  if (screen === "settings") {
    return (
      <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
        <div className="flex items-center gap-3 p-4 border-b">
          <Button variant="ghost" size="icon" onClick={() => setScreen("main")}>
            <Icon name="ArrowLeft" size={22} />
          </Button>
          <h2 className="text-lg font-semibold">{t("settings", lang)}</h2>
        </div>
        <div className="p-4 space-y-4">
          <div className="bg-card rounded-xl border p-4">
            <p className="font-medium mb-3">{t("language", lang)}</p>
            <div className="flex gap-2">
              {(["ru", "en", "es"] as Lang[]).map((l) => (
                <Button key={l} variant={state.lang === l ? "default" : "outline"}
                  className={`rounded-xl flex-1 ${state.lang === l ? "bg-primary text-primary-foreground" : ""}`}
                  onClick={() => up({ lang: l })}>
                  {t(l === "ru" ? "russian" : l === "en" ? "english" : "spanish", lang)}
                </Button>
              ))}
            </div>
          </div>
          <div className="bg-card rounded-xl border p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon name="Moon" size={20} className="text-muted-foreground" />
              <p className="font-medium">{t("darkTheme", lang)}</p>
            </div>
            <Switch checked={state.darkMode} onCheckedChange={(v) => up({ darkMode: v })} />
          </div>
          <Button variant="outline" className="w-full rounded-xl h-11 text-red-500 border-red-200" onClick={doLogout}>
            <Icon name="LogOut" size={16} className="mr-2" />{t("logout", lang)}
          </Button>
        </div>
      </div>
    );
  }

  // ========================= SESSIONS =========================
  if (screen === "sessions") {
    const mySessions = state.sessions.filter((s) => s.userId === state.currentUser?.id);
    return (
      <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
        <div className="flex items-center gap-3 p-4 border-b">
          <Button variant="ghost" size="icon" onClick={() => setScreen("profile")}>
            <Icon name="ArrowLeft" size={22} />
          </Button>
          <h2 className="text-lg font-semibold">{t("sessions", lang)}</h2>
        </div>
        <div className="p-4 space-y-3">
          {mySessions.map((s) => {
            const isCurrent = s.id === state.currentSessionId;
            return (
              <div key={s.id} className={`bg-card rounded-xl border p-4 flex items-center gap-3 ${isCurrent ? "border-primary/40" : ""}`}>
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                  <Icon name={s.device.includes("iPhone") || s.device.includes("Android") ? "Smartphone" : "Monitor"} size={20} className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{s.device}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(s.createdAt)}</p>
                  {isCurrent && <p className="text-[10px] text-green-500 font-medium">{t("currentSession", lang)}</p>}
                </div>
                {!isCurrent && (
                  <Button variant="ghost" size="sm" className="text-red-500 text-xs" onClick={() => removeSession(s.id)}>
                    <Icon name="X" size={14} className="mr-1" />{t("endSession", lang)}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ========================= PROFILE =========================
  if (screen === "profile") {
    return (
      <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
        <div className="flex items-center gap-3 p-4 border-b">
          <Button variant="ghost" size="icon" onClick={() => setScreen("main")}>
            <Icon name="ArrowLeft" size={22} />
          </Button>
          <h2 className="text-lg font-semibold">{t("profile", lang)}</h2>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex flex-col items-center mb-4">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary/20 cursor-pointer hover:border-primary transition-colors"
              onClick={() => avatarEditRef.current?.click()}>
              <Avatar className="w-full h-full">
                {state.currentUser?.avatar && <AvatarImage src={state.currentUser.avatar} />}
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold w-full h-full">
                  {state.currentUser?.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <input ref={avatarEditRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => handleFile(e, (url) => {
                if (!state.currentUser) return;
                const updated = { ...state.currentUser, avatar: url };
                const users = state.users.map((u) => (u.id === updated.id ? updated : u));
                up({ currentUser: updated, users });
              })} />
            <Button variant="ghost" size="sm" className="mt-2 text-primary" onClick={() => avatarEditRef.current?.click()}>
              {t("changeAvatar", lang)}
            </Button>
          </div>

          <div className="bg-card rounded-xl border p-4 space-y-3">
            <p className="font-medium">{t("changeName", lang)}</p>
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder={state.currentUser?.name} className="h-11 rounded-xl" />
            <Button className="w-full rounded-xl bg-primary text-primary-foreground" onClick={saveProfile} disabled={!editName.trim()}>
              {t("save", lang)}
            </Button>
          </div>

          <div className="bg-card rounded-xl border p-4">
            <Button variant="outline" className="w-full rounded-xl" onClick={() => { setOldPass(""); setNewPass(""); setPassError(""); setScreen("changePassword"); }}>
              <Icon name="Lock" size={16} className="mr-2" />{t("changePassword", lang)}
            </Button>
          </div>

          <div className="bg-card rounded-xl border p-4">
            <Button variant="outline" className="w-full rounded-xl" onClick={() => setScreen("sessions")}>
              <Icon name="Monitor" size={16} className="mr-2" />{t("sessions", lang)}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ========================= CHANGE PASSWORD =========================
  if (screen === "changePassword") {
    return (
      <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
        <div className="flex items-center gap-3 p-4 border-b">
          <Button variant="ghost" size="icon" onClick={() => setScreen("profile")}>
            <Icon name="ArrowLeft" size={22} />
          </Button>
          <h2 className="text-lg font-semibold">{t("changePassword", lang)}</h2>
        </div>
        <div className="p-4 space-y-4">
          <Input placeholder={t("oldPassword", lang)} type="password" value={oldPass} onChange={(e) => setOldPass(e.target.value)} className="h-11 rounded-xl" />
          <Input placeholder={t("newPassword", lang)} type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} className="h-11 rounded-xl" />
          {passError && (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-600 dark:text-red-400 animate-fade-in">
              <Icon name="AlertCircle" size={16} className="inline mr-2" />{passError}
            </div>
          )}
          <Button className="w-full h-11 rounded-xl bg-primary text-primary-foreground"
            onClick={changePassword} disabled={!oldPass || !newPass}>
            {t("save", lang)}
          </Button>
        </div>
      </div>
    );
  }

  // ========================= DM CHAT =========================
  if (screen === "chat" && activeChat) {
    const msgs = getChatMsgs();
    return (
      <div className="h-screen bg-background flex flex-col max-w-lg mx-auto">
        <div className="flex items-center gap-3 p-3 border-b bg-card shrink-0">
          <Button variant="ghost" size="icon" onClick={() => { setScreen("main"); setShowEmoji(false); setSelectedMsg(null); }}>
            <Icon name="ArrowLeft" size={22} />
          </Button>
          <Avatar className="w-10 h-10">
            {activeChat.userAvatar && <AvatarImage src={activeChat.userAvatar} />}
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">{activeChat.userName.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold text-sm">{activeChat.userName}</p>
            <p className="text-xs text-green-500">{t("online", lang)}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => { setCallingUser(activeChat.userName); setScreen("calling"); }}>
            <Icon name="Phone" size={20} className="text-primary" />
          </Button>
        </div>

        <ScrollArea className="flex-1 p-4">
          {msgs.length === 0 && <p className="text-center text-muted-foreground text-sm mt-10">{t("typeMessage", lang)}</p>}
          {msgs.map((m) => {
            const isMine = m.from === state.currentUser?.id;
            return (
              <div key={m.id} className={`flex mb-3 ${isMine ? "justify-end" : "justify-start"}`}
                onClick={() => setSelectedMsg(selectedMsg === m.id ? null : m.id)}>
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl relative ${isMine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary text-secondary-foreground rounded-bl-md"}`}>
                  <p className="text-sm break-words">{m.text}</p>
                  <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{fmtTime(m.timestamp)}</p>
                  {selectedMsg === m.id && isMine && (
                    <button className="absolute -top-8 right-0 bg-red-500 text-white text-xs px-2 py-1 rounded-lg animate-scale-in"
                      onClick={(e) => { e.stopPropagation(); deleteMsg(m.id); }}>
                      {t("deleteMessage", lang)}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </ScrollArea>

        {showEmoji && (
          <div className="border-t bg-card p-3 max-h-52 overflow-y-auto animate-slide-up shrink-0">
            {emojiCategories.map((cat) => (
              <div key={cat.name} className="mb-2">
                <p className="text-xs text-muted-foreground mb-1">{cat.name}</p>
                <div className="flex flex-wrap gap-1">
                  {cat.emojis.map((e, i) => (
                    <button key={i} className="w-8 h-8 flex items-center justify-center text-lg hover:bg-secondary rounded-lg transition-colors"
                      onClick={() => sendMsg(e, "emoji")}>{e}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="p-3 border-t bg-card flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setShowEmoji(!showEmoji)}>
            <Icon name="Smile" size={22} className="text-muted-foreground" />
          </Button>
          <Input placeholder={t("typeMessage", lang)} value={msgText} onChange={(e) => setMsgText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMsg(msgText)} className="h-10 rounded-full" />
          {msgText.trim() ? (
            <Button size="icon" className="shrink-0 bg-primary text-primary-foreground rounded-full w-10 h-10" onClick={() => sendMsg(msgText)}>
              <Icon name="Send" size={18} />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className={`shrink-0 ${isRecording ? "text-red-500" : "text-muted-foreground"}`} onClick={handleVoice}>
              <Icon name="Mic" size={22} />
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ========================= GROUP CHAT =========================
  if (screen === "groupChat" && activeGroup) {
    const g = state.groupChats.find((gr) => gr.id === activeGroup.id) || activeGroup;
    const msgs = getChatMsgs();
    const canDelete = isGroupAdmin(g.id);
    return (
      <div className="h-screen bg-background flex flex-col max-w-lg mx-auto">
        <div className="flex items-center gap-3 p-3 border-b bg-card shrink-0">
          <Button variant="ghost" size="icon" onClick={() => { setScreen("main"); setShowEmoji(false); setSelectedMsg(null); setActiveGroup(null); }}>
            <Icon name="ArrowLeft" size={22} />
          </Button>
          <Avatar className="w-10 h-10 cursor-pointer" onClick={() => setScreen("groupSettings")}>
            {g.avatar && <AvatarImage src={g.avatar} />}
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">{g.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 cursor-pointer" onClick={() => setScreen("groupSettings")}>
            <p className="font-semibold text-sm">{g.name}</p>
            <p className="text-xs text-muted-foreground">{g.memberIds.length} {t("members", lang).toLowerCase()}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => { setCallingUser(g.name); setScreen("calling"); }}>
            <Icon name="Phone" size={20} className="text-primary" />
          </Button>
        </div>

        <ScrollArea className="flex-1 p-4">
          {msgs.length === 0 && <p className="text-center text-muted-foreground text-sm mt-10">{t("typeMessage", lang)}</p>}
          {msgs.map((m) => {
            const isMine = m.from === state.currentUser?.id;
            const sender = getUserById(m.from);
            return (
              <div key={m.id} className={`flex mb-3 ${isMine ? "justify-end" : "justify-start"}`}
                onClick={() => setSelectedMsg(selectedMsg === m.id ? null : m.id)}>
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl relative ${isMine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary text-secondary-foreground rounded-bl-md"}`}>
                  {!isMine && <p className="text-[10px] font-semibold mb-1 text-blue-500">{sender?.name}</p>}
                  <p className="text-sm break-words">{m.text}</p>
                  <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{fmtTime(m.timestamp)}</p>
                  {selectedMsg === m.id && (isMine || canDelete) && (
                    <button className="absolute -top-8 right-0 bg-red-500 text-white text-xs px-2 py-1 rounded-lg animate-scale-in"
                      onClick={(e) => { e.stopPropagation(); deleteMsg(m.id); }}>
                      {t("deleteMessage", lang)}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </ScrollArea>

        {showEmoji && (
          <div className="border-t bg-card p-3 max-h-52 overflow-y-auto animate-slide-up shrink-0">
            {emojiCategories.map((cat) => (
              <div key={cat.name} className="mb-2">
                <p className="text-xs text-muted-foreground mb-1">{cat.name}</p>
                <div className="flex flex-wrap gap-1">
                  {cat.emojis.map((e, i) => (
                    <button key={i} className="w-8 h-8 flex items-center justify-center text-lg hover:bg-secondary rounded-lg transition-colors"
                      onClick={() => sendMsg(e, "emoji")}>{e}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="p-3 border-t bg-card flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setShowEmoji(!showEmoji)}>
            <Icon name="Smile" size={22} className="text-muted-foreground" />
          </Button>
          <Input placeholder={t("typeMessage", lang)} value={msgText} onChange={(e) => setMsgText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMsg(msgText)} className="h-10 rounded-full" />
          {msgText.trim() ? (
            <Button size="icon" className="shrink-0 bg-primary text-primary-foreground rounded-full w-10 h-10" onClick={() => sendMsg(msgText)}>
              <Icon name="Send" size={18} />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className={`shrink-0 ${isRecording ? "text-red-500" : "text-muted-foreground"}`} onClick={handleVoice}>
              <Icon name="Mic" size={22} />
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ========================= MAIN SCREEN =========================
  const allChatsForList = [
    ...state.chats.map((c) => ({
      id: c.userId, name: c.userName, avatar: c.userAvatar,
      lastMsg: c.lastMessage, lastTime: c.lastTime, isGroup: false as const,
    })),
    ...state.groupChats
      .filter((g) => g.memberIds.includes(state.currentUser?.id || ""))
      .map((g) => ({
        id: g.id, name: g.name, avatar: g.avatar,
        lastMsg: g.lastMessage, lastTime: g.lastTime, isGroup: true as const,
      })),
  ].sort((a, b) => (b.lastTime || 0) - (a.lastTime || 0));

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
      <div className="p-4 pb-3 bg-card border-b">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <img src={WHALE_IMG} alt="" className="w-8 h-8 rounded-full" />
            <h1 className="text-xl font-bold">Кит</h1>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => setScreen("search")}>
              <Icon name="Search" size={20} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setScreen("settings")}>
              <Icon name="Settings" size={20} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => { setEditName(state.currentUser?.name || ""); setScreen("profile"); }}>
              <Icon name="User" size={20} />
            </Button>
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant={tab === "chats" ? "default" : "ghost"}
            className={`flex-1 rounded-xl h-9 text-sm ${tab === "chats" ? "bg-primary text-primary-foreground" : ""}`}
            onClick={() => setTab("chats")}>
            <Icon name="MessageCircle" size={16} className="mr-1.5" />{t("chats", lang)}
          </Button>
          <Button variant={tab === "contacts" ? "default" : "ghost"}
            className={`flex-1 rounded-xl h-9 text-sm ${tab === "contacts" ? "bg-primary text-primary-foreground" : ""}`}
            onClick={() => setTab("contacts")}>
            <Icon name="Users" size={16} className="mr-1.5" />{t("contacts", lang)}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1" style={{ height: "calc(100vh - 180px)" }}>
        {tab === "chats" && (
          <div className="p-2">
            <div className="px-3 py-2">
              <Button variant="outline" className="w-full rounded-xl h-10 text-sm border-dashed"
                onClick={() => { setGrpSelectedMembers([]); setGrpName(""); setGrpAvatar(null); setScreen("createGroup1"); }}>
                <Icon name="Plus" size={16} className="mr-2" />{t("createGroup", lang)}
              </Button>
            </div>
            {allChatsForList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                  <Icon name="MessageCircle" size={28} className="text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">{t("noChats", lang)}</p>
                <p className="text-sm text-muted-foreground/70 mt-1">{t("noChatsDesc", lang)}</p>
                <Button className="mt-4 rounded-xl bg-primary text-primary-foreground" onClick={() => setScreen("search")}>
                  <Icon name="Search" size={16} className="mr-2" />{t("search", lang)}
                </Button>
              </div>
            ) : (
              allChatsForList.map((item) => (
                <div key={item.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 cursor-pointer transition-colors"
                  onClick={() => {
                    if (item.isGroup) {
                      const g = state.groupChats.find((gr) => gr.id === item.id)!;
                      setActiveGroup(g);
                      setActiveChat(null);
                      setScreen("groupChat");
                    } else {
                      const c = state.chats.find((ch) => ch.userId === item.id)!;
                      setActiveChat(c);
                      setActiveGroup(null);
                      setScreen("chat");
                    }
                  }}>
                  <Avatar className="w-12 h-12">
                    {item.avatar && <AvatarImage src={item.avatar} />}
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">{item.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {item.isGroup && <Icon name="Users" size={13} className="text-muted-foreground" />}
                      <p className="font-semibold text-sm">{item.name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{item.lastMsg || t("noChats", lang)}</p>
                  </div>
                  {item.lastTime && <p className="text-xs text-muted-foreground">{fmtTime(item.lastTime)}</p>}
                </div>
              ))
            )}
          </div>
        )}

        {tab === "contacts" && (
          <div className="p-2">
            {state.chats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                  <Icon name="Users" size={28} className="text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">{t("contacts", lang)}</p>
                <Button className="mt-4 rounded-xl bg-primary text-primary-foreground" onClick={() => setScreen("search")}>
                  <Icon name="UserPlus" size={16} className="mr-2" />{t("search", lang)}
                </Button>
              </div>
            ) : (
              state.chats.map((chat) => (
                <div key={chat.userId}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 cursor-pointer transition-colors"
                  onClick={() => { setActiveChat(chat); setActiveGroup(null); setScreen("chat"); }}>
                  <Avatar className="w-12 h-12">
                    {chat.userAvatar && <AvatarImage src={chat.userAvatar} />}
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">{chat.userName.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{chat.userName}</p>
                    <p className="text-xs text-green-500">{t("online", lang)}</p>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Icon name="MessageCircle" size={18} className="text-primary" />
                  </Button>
                </div>
              ))
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}