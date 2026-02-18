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
  User, Message, Chat, AppState,
  loadState, saveState, generateId,
} from "@/lib/store";

const WHALE_IMG = "https://cdn.poehali.dev/projects/aa37963a-ac17-4996-997c-ec31fd6a084a/files/086eb4e5-b902-48c8-8c57-28d850664b71.jpg";

type Screen =
  | "welcome"
  | "register"
  | "created"
  | "main"
  | "chat"
  | "search"
  | "settings"
  | "profile"
  | "changePassword"
  | "calling";

export default function Index() {
  const [state, setState] = useState<AppState>(loadState);
  const [screen, setScreen] = useState<Screen>(
    state.currentUser ? "main" : "welcome"
  );
  const [tab, setTab] = useState<"chats" | "contacts">("chats");

  const [regName, setRegName] = useState("");
  const [regPass, setRegPass] = useState("");
  const [regAvatar, setRegAvatar] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<User | null>(null);
  const [searchDone, setSearchDone] = useState(false);

  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [msgText, setMsgText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [callingUser, setCallingUser] = useState<string>("");

  const [editName, setEditName] = useState("");
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarEditRef = useRef<HTMLInputElement>(null);

  const lang = state.lang;

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    if (state.darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [state.darkMode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages, activeChat]);

  function update(partial: Partial<AppState>) {
    setState((prev) => ({ ...prev, ...partial }));
  }

  function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>, cb: (url: string) => void) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => cb(reader.result as string);
    reader.readAsDataURL(file);
  }

  function createAccount() {
    if (!regName.trim() || !regPass.trim()) return;
    const user: User = {
      id: generateId(),
      name: regName.trim(),
      password: regPass,
      avatar: regAvatar,
    };
    const users = [...state.users, user];
    update({ currentUser: user, users });
    setScreen("created");
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
      chat = {
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar,
      };
      update({ chats: [...state.chats, chat] });
    }
    setActiveChat(chat);
    setScreen("chat");
    setSearchQuery("");
    setSearchResult(null);
    setSearchDone(false);
  }

  function sendMessage(text: string, type: "text" | "voice" | "emoji" = "text") {
    if (!text.trim() || !activeChat || !state.currentUser) return;
    const msg: Message = {
      id: generateId(),
      from: state.currentUser.id,
      to: activeChat.userId,
      text,
      type,
      timestamp: Date.now(),
    };
    const messages = [...state.messages, msg];
    const chats = state.chats.map((c) =>
      c.userId === activeChat.userId
        ? { ...c, lastMessage: type === "voice" ? "🎤 " + t("voiceMessage", lang) : text, lastTime: msg.timestamp }
        : c
    );
    update({ messages, chats });
    setMsgText("");
    setShowEmoji(false);
  }

  function getChatMessages() {
    if (!activeChat || !state.currentUser) return [];
    return state.messages.filter(
      (m) =>
        (m.from === state.currentUser!.id && m.to === activeChat.userId) ||
        (m.from === activeChat.userId && m.to === state.currentUser!.id)
    );
  }

  function handleVoice() {
    setIsRecording(true);
    setTimeout(() => {
      setIsRecording(false);
      sendMessage("🎤 0:03", "voice");
    }, 2000);
  }

  function formatTime(ts?: number) {
    if (!ts) return "";
    const d = new Date(ts);
    return d.getHours().toString().padStart(2, "0") + ":" + d.getMinutes().toString().padStart(2, "0");
  }

  function saveProfile() {
    if (!state.currentUser || !editName.trim()) return;
    const updated = { ...state.currentUser, name: editName.trim() };
    const users = state.users.map((u) => (u.id === updated.id ? updated : u));
    const chats = state.chats.map((c) =>
      c.userId === updated.id ? { ...c, userName: updated.name, userAvatar: updated.avatar } : c
    );
    update({ currentUser: updated, users, chats });
    setScreen("main");
  }

  function changePassword() {
    if (!state.currentUser) return;
    if (oldPass !== state.currentUser.password) return;
    if (!newPass.trim()) return;
    const updated = { ...state.currentUser, password: newPass };
    const users = state.users.map((u) => (u.id === updated.id ? updated : u));
    update({ currentUser: updated, users });
    setOldPass("");
    setNewPass("");
    setScreen("profile");
  }

  if (screen === "welcome") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-blue-950 dark:to-background p-6">
        <div className="animate-fade-in flex flex-col items-center text-center max-w-sm">
          <div className="w-32 h-32 mb-8 rounded-full overflow-hidden shadow-lg border-4 border-white dark:border-blue-900">
            <img src={WHALE_IMG} alt="Кит" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t("welcome", lang)}</h1>
          <p className="text-muted-foreground text-lg mb-10">{t("welcomeSub", lang)}</p>
          <Button
            className="w-full h-12 text-lg bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
            onClick={() => setScreen("register")}
          >
            {t("continue", lang)}
          </Button>
        </div>
      </div>
    );
  }

  if (screen === "register") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-blue-950 dark:to-background p-6">
        <div className="animate-fade-in w-full max-w-sm">
          <h2 className="text-2xl font-bold text-center mb-8">{t("createAccount", lang)}</h2>
          <div className="flex flex-col items-center mb-6">
            <div
              className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center cursor-pointer overflow-hidden border-2 border-primary/20 hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {regAvatar ? (
                <img src={regAvatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <Icon name="Camera" size={32} className="text-muted-foreground" />
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleAvatarUpload(e, setRegAvatar)}
            />
            <div className="flex gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => fileInputRef.current?.click()}
              >
                <Icon name="Image" size={14} className="mr-1" />
                {t("gallery", lang)}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => fileInputRef.current?.click()}
              >
                <Icon name="Camera" size={14} className="mr-1" />
                {t("photo", lang)}
              </Button>
            </div>
          </div>
          <div className="space-y-4">
            <Input
              placeholder={t("name", lang)}
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              className="h-12 rounded-xl"
            />
            <Input
              placeholder={t("password", lang)}
              type="password"
              value={regPass}
              onChange={(e) => setRegPass(e.target.value)}
              className="h-12 rounded-xl"
            />
            <Button
              className="w-full h-12 text-lg bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
              onClick={createAccount}
              disabled={!regName.trim() || !regPass.trim()}
            >
              {t("create", lang)}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "created") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-blue-950 dark:to-background p-6">
        <div className="animate-scale-in flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-6">
            <Icon name="Check" size={40} className="text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">{t("accountCreated", lang)}</h2>
          <p className="text-muted-foreground mb-8">{state.currentUser?.name}</p>
          <Button
            className="w-48 h-12 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
            onClick={() => setScreen("main")}
          >
            {t("continue", lang)}
          </Button>
        </div>
      </div>
    );
  }

  if (screen === "calling") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-600 to-blue-800 p-6">
        <div className="animate-fade-in flex flex-col items-center text-center">
          <div className="w-28 h-28 rounded-full bg-white/20 flex items-center justify-center mb-6 animate-pulse">
            <Icon name="Phone" size={48} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">{callingUser}</h2>
          <p className="text-blue-200 mb-10">{t("calling", lang)}</p>
          <Button
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600"
            onClick={() => setScreen("chat")}
          >
            <Icon name="PhoneOff" size={28} className="text-white" />
          </Button>
          <p className="text-blue-200 text-sm mt-3">{t("endCall", lang)}</p>
        </div>
      </div>
    );
  }

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
            <Input
              placeholder={t("searchPlaceholder", lang)}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
              className="h-11 rounded-xl"
            />
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
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {searchResult.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold">{searchResult.name}</p>
                    <p className="text-xs text-green-500">{t("online", lang)}</p>
                  </div>
                  <Button
                    className="bg-primary text-primary-foreground rounded-xl"
                    onClick={() => startChatWith(searchResult!)}
                  >
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
                <Button
                  key={l}
                  variant={state.lang === l ? "default" : "outline"}
                  className={`rounded-xl flex-1 ${state.lang === l ? "bg-primary text-primary-foreground" : ""}`}
                  onClick={() => update({ lang: l })}
                >
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
            <Switch
              checked={state.darkMode}
              onCheckedChange={(v) => update({ darkMode: v })}
            />
          </div>
        </div>
      </div>
    );
  }

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
            <div
              className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary/20 cursor-pointer hover:border-primary transition-colors"
              onClick={() => avatarEditRef.current?.click()}
            >
              <Avatar className="w-full h-full">
                {state.currentUser?.avatar && <AvatarImage src={state.currentUser.avatar} />}
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold w-full h-full">
                  {state.currentUser?.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <input
              ref={avatarEditRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) =>
                handleAvatarUpload(e, (url) => {
                  if (!state.currentUser) return;
                  const updated = { ...state.currentUser, avatar: url };
                  const users = state.users.map((u) => (u.id === updated.id ? updated : u));
                  update({ currentUser: updated, users });
                })
              }
            />
            <Button variant="ghost" size="sm" className="mt-2 text-primary" onClick={() => avatarEditRef.current?.click()}>
              {t("changeAvatar", lang)}
            </Button>
          </div>

          <div className="bg-card rounded-xl border p-4 space-y-3">
            <p className="font-medium">{t("changeName", lang)}</p>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder={state.currentUser?.name}
              className="h-11 rounded-xl"
            />
            <Button
              className="w-full rounded-xl bg-primary text-primary-foreground"
              onClick={saveProfile}
              disabled={!editName.trim()}
            >
              {t("save", lang)}
            </Button>
          </div>

          <div className="bg-card rounded-xl border p-4">
            <Button
              variant="outline"
              className="w-full rounded-xl"
              onClick={() => {
                setOldPass("");
                setNewPass("");
                setScreen("changePassword");
              }}
            >
              <Icon name="Lock" size={16} className="mr-2" />
              {t("changePassword", lang)}
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
          <Input
            placeholder={t("oldPassword", lang)}
            type="password"
            value={oldPass}
            onChange={(e) => setOldPass(e.target.value)}
            className="h-11 rounded-xl"
          />
          <Input
            placeholder={t("newPassword", lang)}
            type="password"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            className="h-11 rounded-xl"
          />
          <Button
            className="w-full h-11 rounded-xl bg-primary text-primary-foreground"
            onClick={changePassword}
            disabled={!oldPass || !newPass}
          >
            {t("save", lang)}
          </Button>
        </div>
      </div>
    );
  }

  if (screen === "chat" && activeChat) {
    const msgs = getChatMessages();
    return (
      <div className="h-screen bg-background flex flex-col max-w-lg mx-auto">
        <div className="flex items-center gap-3 p-3 border-b bg-card shrink-0">
          <Button variant="ghost" size="icon" onClick={() => { setScreen("main"); setShowEmoji(false); }}>
            <Icon name="ArrowLeft" size={22} />
          </Button>
          <Avatar className="w-10 h-10">
            {activeChat.userAvatar && <AvatarImage src={activeChat.userAvatar} />}
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
              {activeChat.userName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold text-sm">{activeChat.userName}</p>
            <p className="text-xs text-green-500">{t("online", lang)}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setCallingUser(activeChat.userName);
              setScreen("calling");
            }}
          >
            <Icon name="Phone" size={20} className="text-primary" />
          </Button>
        </div>

        <ScrollArea className="flex-1 p-4">
          {msgs.length === 0 && (
            <p className="text-center text-muted-foreground text-sm mt-10">
              {t("typeMessage", lang)}
            </p>
          )}
          {msgs.map((m) => {
            const isMine = m.from === state.currentUser?.id;
            return (
              <div
                key={m.id}
                className={`flex mb-3 ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                    isMine
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-secondary text-secondary-foreground rounded-bl-md"
                  }`}
                >
                  <p className="text-sm break-words">{m.text}</p>
                  <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    {formatTime(m.timestamp)}
                  </p>
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
                    <button
                      key={i}
                      className="w-8 h-8 flex items-center justify-center text-lg hover:bg-secondary rounded-lg transition-colors"
                      onClick={() => sendMessage(e, "emoji")}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="p-3 border-t bg-card flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => setShowEmoji(!showEmoji)}
          >
            <Icon name="Smile" size={22} className="text-muted-foreground" />
          </Button>
          <Input
            placeholder={t("typeMessage", lang)}
            value={msgText}
            onChange={(e) => setMsgText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage(msgText)}
            className="h-10 rounded-full"
          />
          {msgText.trim() ? (
            <Button
              size="icon"
              className="shrink-0 bg-primary text-primary-foreground rounded-full w-10 h-10"
              onClick={() => sendMessage(msgText)}
            >
              <Icon name="Send" size={18} />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className={`shrink-0 ${isRecording ? "text-red-500" : "text-muted-foreground"}`}
              onClick={handleVoice}
            >
              <Icon name="Mic" size={22} />
            </Button>
          )}
        </div>
      </div>
    );
  }

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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setEditName(state.currentUser?.name || "");
                setScreen("profile");
              }}
            >
              <Icon name="User" size={20} />
            </Button>
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            variant={tab === "chats" ? "default" : "ghost"}
            className={`flex-1 rounded-xl h-9 text-sm ${tab === "chats" ? "bg-primary text-primary-foreground" : ""}`}
            onClick={() => setTab("chats")}
          >
            <Icon name="MessageCircle" size={16} className="mr-1.5" />
            {t("chats", lang)}
          </Button>
          <Button
            variant={tab === "contacts" ? "default" : "ghost"}
            className={`flex-1 rounded-xl h-9 text-sm ${tab === "contacts" ? "bg-primary text-primary-foreground" : ""}`}
            onClick={() => setTab("contacts")}
          >
            <Icon name="Users" size={16} className="mr-1.5" />
            {t("contacts", lang)}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1" style={{ height: "calc(100vh - 140px)" }}>
        {tab === "chats" && (
          <div className="p-2">
            {state.chats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                  <Icon name="MessageCircle" size={28} className="text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">{t("noChats", lang)}</p>
                <p className="text-sm text-muted-foreground/70 mt-1">{t("noChatsDesc", lang)}</p>
                <Button
                  className="mt-4 rounded-xl bg-primary text-primary-foreground"
                  onClick={() => setScreen("search")}
                >
                  <Icon name="Search" size={16} className="mr-2" />
                  {t("search", lang)}
                </Button>
              </div>
            ) : (
              state.chats
                .sort((a, b) => (b.lastTime || 0) - (a.lastTime || 0))
                .map((chat) => (
                  <div
                    key={chat.userId}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 cursor-pointer transition-colors"
                    onClick={() => {
                      setActiveChat(chat);
                      setScreen("chat");
                    }}
                  >
                    <Avatar className="w-12 h-12">
                      {chat.userAvatar && <AvatarImage src={chat.userAvatar} />}
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {chat.userName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{chat.userName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {chat.lastMessage || t("noChats", lang)}
                      </p>
                    </div>
                    {chat.lastTime && (
                      <p className="text-xs text-muted-foreground">{formatTime(chat.lastTime)}</p>
                    )}
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
                <Button
                  className="mt-4 rounded-xl bg-primary text-primary-foreground"
                  onClick={() => setScreen("search")}
                >
                  <Icon name="UserPlus" size={16} className="mr-2" />
                  {t("search", lang)}
                </Button>
              </div>
            ) : (
              state.chats.map((chat) => (
                <div
                  key={chat.userId}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 cursor-pointer transition-colors"
                  onClick={() => {
                    setActiveChat(chat);
                    setScreen("chat");
                  }}
                >
                  <Avatar className="w-12 h-12">
                    {chat.userAvatar && <AvatarImage src={chat.userAvatar} />}
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {chat.userName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
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
