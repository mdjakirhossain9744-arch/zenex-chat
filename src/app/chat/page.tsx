"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Search, Send, Image as ImageIcon, MoreVertical, LogOut, MessageSquare, Phone, Video, UserPlus, UserMinus, X, Loader2, Settings, ArrowLeft, UserCheck, Info, Check, CheckCheck, Clock, AlertCircle, RefreshCcw, Copy, Forward, Trash2, Smile, Pin, PinOff, Reply, Download, Palette } from "lucide-react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";

let socket: Socket;

// SSR Warning এড়ানোর জন্য Custom Layout Effect
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const isOnlyEmojis = (str: string) => {
  const emojiRegex = /^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+$/u;
  return emojiRegex.test(str) && str.trim().length > 0 && str.trim().length <= 6;
};

const formatLastSeen = (dateString: string) => {
  if (!dateString) return "Offline";
  const diff = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 60000);
  if (diff < 1) return "Offline (Just now)";
  if (diff < 60) return `Offline (${diff} mins ago)`;
  if (diff < 1440) return `Offline (${Math.floor(diff/60)} hrs ago)`;
  return `Offline (${Math.floor(diff/1440)} days ago)`;
};

const formatMessageTime = (dateString: string) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const POPULAR_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const THEMES = [
  { id: "theme-default", name: "Pitch Black", color: "#2563eb" },
  { id: "theme-ocean", name: "Ocean Deep", color: "#06b6d4" },
  { id: "theme-neon", name: "Neon Purple", color: "#d946ef" },
  { id: "theme-forest", name: "Forest Green", color: "#10b981" }
];

export default function ChatPage() {
  const router = useRouter();
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState("");
  const [userStatuses, setUserStatuses] = useState<Record<string, any>>({});
  
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentUserRef = useRef(currentUser);
  const selectedContactRef = useRef(selectedContact);
  const isChatSwitchedRef = useRef(false);

  const [isChatLoading, setIsChatLoading] = useState(false); // NEW: Chat Loading State
  const [currentTheme, setCurrentTheme] = useState("theme-default");
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isChatHeaderMenuOpen, setIsChatHeaderMenuOpen] = useState(false);

  // Swipe, Actions & Viewers
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [activeReactId, setActiveReactId] = useState<string | null>(null);
  const [forwardMsg, setForwardMsg] = useState<any>(null);
  const [deleteModalMsg, setDeleteModalMsg] = useState<any>(null);
  const [replyingToMsg, setReplyingToMsg] = useState<any>(null); 
  const [pinnedMessage, setPinnedMessage] = useState<any>(null);
  const [viewImage, setViewImage] = useState<string | null>(null); 

  const [selectedFiles, setSelectedFiles] = useState<{file: File, preview: string}[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  
  // Modals...
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addPhone, setAddPhone] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addMessage, setAddMessage] = useState({ type: "", text: "" });

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ type: "", text: "" });

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteLoading, setNoteLoading] = useState(false);

  const [isContactProfileOpen, setIsContactProfileOpen] = useState(false);
  const [customNickname, setCustomNickname] = useState("");
  const [nicknameLoading, setNicknameLoading] = useState(false);

  const [replyingContact, setReplyingContact] = useState<any>(null);
  const [replyText, setReplyText] = useState("");

  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
  useEffect(() => { selectedContactRef.current = selectedContact; }, [selectedContact]);

  useEffect(() => {
    if (!socket) socket = io();
    fetchProfile(); fetchContacts();

    socket.off("receive_message"); socket.off("status_update"); socket.off("user_typing"); socket.off("user_stop_typing");
    socket.off("messages_seen_update"); socket.off("message_reaction_update"); socket.off("message_deleted_update"); 
    socket.off("message_pinned_update"); socket.off("theme_update");

    socket.on("receive_message", (newMsg) => {
      const myId = currentUserRef.current?._id;
      const currentChatId = selectedContactRef.current?._id;

      if ((newMsg.sender === currentChatId && newMsg.receiver === myId) || (newMsg.sender === myId && newMsg.receiver === currentChatId)) {
        setMessages((prev) => {
          const isDup = prev.some((msg) => msg._id === newMsg._id || msg.tempId === newMsg.tempId);
          if (isDup) return prev;
          return [...prev, newMsg];
        });
        if (newMsg.sender === currentChatId) markMessagesAsSeen(currentChatId, myId);
      }

      setContacts((prev) => {
        let isNewContact = true;
        const updatedContacts = prev.map(c => {
          if (c._id === newMsg.sender || c._id === newMsg.receiver) {
            isNewContact = false;
            return {
              ...c,
              lastMessage: (newMsg.sender === currentChatId) ? { ...newMsg, isRead: true, status: "seen" } : newMsg
            };
          }
          return c;
        });
        if (isNewContact) { fetchContacts(false); }
        
        updatedContacts.sort((a, b) => {
          const timeA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
          const timeB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
          return timeB - timeA;
        });

        return updatedContacts;
      });
    });

    socket.on("messages_seen_update", ({ senderId, receiverId }) => {
      const myId = currentUserRef.current?._id;
      if (myId === senderId) { 
        if (selectedContactRef.current?._id === receiverId) {
          setMessages((prev) => prev.map(msg => ({ ...msg, isRead: true, status: "seen" })));
        }
        setContacts(prev => prev.map(c => c._id === receiverId ? { 
          ...c, 
          lastMessage: c.lastMessage ? { ...c.lastMessage, isRead: true, status: "seen" } : null 
        } : c));
      }
    });

    socket.on("theme_update", ({ senderId, receiverId, theme }) => {
      if ((currentUserRef.current?._id === senderId && selectedContactRef.current?._id === receiverId) ||
          (currentUserRef.current?._id === receiverId && selectedContactRef.current?._id === senderId)) {
        setCurrentTheme(theme);
        setContacts(prev => prev.map(c => c._id === selectedContactRef.current._id ? { ...c, chatTheme: theme } : c));
      }
    });

    socket.on("message_reaction_update", ({ messageId, userId, emoji, isRemoved }) => {
      setMessages((prev) => prev.map(msg => {
        if (msg._id === messageId || msg.tempId === messageId) {
          const newReacts = (msg.reactions || []).filter((r: any) => r.userId !== userId);
          if (!isRemoved) newReacts.push({ userId, emoji });
          return { ...msg, reactions: newReacts };
        }
        return msg;
      }));
    });

    socket.on("message_deleted_update", ({ messageId, type, userId }) => {
      if (type === "everyone") {
        setMessages((prev) => prev.map(msg => msg._id === messageId || msg.tempId === messageId ? { ...msg, isDeleted: true, text: "This message was removed.", imageUrl: "" } : msg));
      } else if (type === "for_me" && currentUserRef.current?._id === userId) {
        setMessages((prev) => prev.filter(msg => msg._id !== messageId && msg.tempId !== messageId));
      }
      fetchContacts(false);
    });

    socket.on("message_pinned_update", ({ messageId, isPinned }) => {
      setMessages(prev => prev.map(msg => {
        if (msg._id === messageId) return { ...msg, isPinned };
        if (isPinned) return { ...msg, isPinned: false }; 
        return msg;
      }));
    });

    socket.on("status_update", (data) => setUserStatuses((prev) => ({ ...prev, [data.userId]: data })));
    
    socket.on("user_typing", (data) => {
      const myId = currentUserRef.current?._id;
      if (data.receiver === myId) {
        setTypingUsers((prev) => new Set(prev).add(data.sender));
      }
    });

    socket.on("user_stop_typing", (data) => {
      const myId = currentUserRef.current?._id;
      if (data.receiver === myId) {
        setTypingUsers((prev) => { 
          const newSet = new Set(prev); 
          newSet.delete(data.sender); 
          return newSet; 
        });
      }
    });

    return () => { socket.removeAllListeners(); };
  }, []);

  // ==========================================
  // FIX: Instant Scroll Sync & No Flash Bug
  // ==========================================
  useIsomorphicLayoutEffect(() => { 
    if (isChatSwitchedRef.current) {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
      isChatSwitchedRef.current = false;
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  const markMessagesAsSeen = async (senderId: string, receiverId: string) => {
    socket.emit("mark_seen", { senderId, receiverId });
    try { await fetch("/api/messages/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ senderId, receiverId }) }); } catch (e) {}
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      const data = await res.json();
      if (res.ok) { 
        setCurrentUser(data.user); setProfileName(data.user.name); setProfileBio(data.user.bio || "");
        setAvatarPreview(data.user.avatar || ""); setNoteText(data.user.note || ""); 
        socket.emit("register", data.user._id);
      }
    } catch (error) {}
  };

  const fetchContacts = async (showLoading = true) => {
    if (showLoading && contacts.length === 0) setInitialLoading(true);
    try {
      const res = await fetch("/api/contacts");
      const data = await res.json();
      if (res.ok) {
        setContacts(data.contacts);
        const savedContactId = sessionStorage.getItem("zenex_selected_contact");
        if (savedContactId && !selectedContactRef.current) {
          const foundContact = data.contacts.find((c: any) => c._id === savedContactId);
          if (foundContact) handleSelectContact(foundContact);
        }
      }
    } finally { setInitialLoading(false); }
  };

  const handleSelectContact = async (contact: any) => {
    setSelectedContact(contact);
    sessionStorage.setItem("zenex_selected_contact", contact._id);
    setCurrentTheme(contact.chatTheme || "theme-default"); 
    
    // UI clean up & Loading state ON
    setIsChatLoading(true);
    setMessages([]); 
    setReplyingToMsg(null); 
    setSelectedFiles([]); 
    setIsChatHeaderMenuOpen(false); 
    
    setContacts(prev => prev.map(c => {
      if (c._id === contact._id && c.lastMessage) {
        const isMe = c.lastMessage.sender === currentUserRef.current?._id;
        if (!isMe) {
          return { ...c, lastMessage: { ...c.lastMessage, isRead: true, status: "seen" } };
        }
      }
      return c;
    }));

    try {
      const res = await fetch(`/api/messages?userId=${contact._id}`);
      const data = await res.json();
      if (res.ok) {
        const validMsgs = data.messages.filter((m: any) => !m.deletedBy?.includes(currentUserRef.current?._id));
        isChatSwitchedRef.current = true; // Instantly scroll down
        setMessages(validMsgs);
        if (currentUserRef.current) markMessagesAsSeen(contact._id, currentUserRef.current._id);
      }
    } catch (error) {
      // Handle error gracefully if needed
    } finally {
      setIsChatLoading(false); // Turn off Loading state
    }
  };

  const handleChangeTheme = async (themeId: string) => {
    if (!selectedContact) return;
    setCurrentTheme(themeId);
    setIsThemeModalOpen(false);
    setContacts(prev => prev.map(c => c._id === selectedContact._id ? { ...c, chatTheme: themeId } : c));
    socket.emit("change_theme", { senderId: currentUser._id, receiverId: selectedContact._id, theme: themeId });
    try { await fetch("/api/contacts/theme", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contactId: selectedContact._id, theme: themeId }) }); } catch(e){}
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);
    if (!selectedContact || !currentUser) return;
    socket.emit("typing", { sender: currentUser._id, receiver: selectedContact._id });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => socket.emit("stop_typing", { sender: currentUser._id, receiver: selectedContact._id }), 1500);
  };

  const executeSend = async (text: string, imgUrl: string, targetContact: any, replyMsgToUse: any = null) => {
    if (!targetContact || !currentUser) return;
    socket.emit("stop_typing", { sender: currentUser._id, receiver: targetContact._id });

    const tempId = Date.now().toString() + Math.random().toString(36).substring(2, 7);
    const msgData = {
      tempId, _id: tempId,
      sender: currentUser._id, receiver: targetContact._id,
      text: text, imageUrl: imgUrl, isRead: false, status: "sending", reactions: [], isDeleted: false, deletedBy: [], isPinned: false,
      replyTo: replyMsgToUse ? { messageId: replyMsgToUse._id, text: replyMsgToUse.text, senderName: replyMsgToUse.sender === currentUser._id ? "You" : targetContact.displayName } : null,
      createdAt: new Date().toISOString(),
    };

    if (targetContact._id === selectedContact?._id) setMessages((prev) => [...prev, msgData]);

    try { 
      const res = await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(msgData) }); 
      const savedMsg = await res.json();
      if (res.ok) {
        const finalMsg = { ...msgData, _id: savedMsg.message._id || tempId, status: "sent" };
        if (targetContact._id === selectedContact?._id) setMessages((prev) => prev.map(m => m.tempId === tempId ? finalMsg : m));
        
        setContacts(prev => {
          const existing = prev.find(c => c._id === targetContact._id);
          const updated = existing ? { ...existing, lastMessage: finalMsg } : existing;
          const others = prev.filter(c => c._id !== targetContact._id);
          return updated ? [updated, ...others] : prev;
        });
        
        socket.emit("send_message", finalMsg);
      } else throw new Error();
    } catch (error) {
      if (targetContact._id === selectedContact?._id) setMessages((prev) => prev.map(m => m.tempId === tempId ? { ...m, status: "failed" } : m));
    }
  };

  const handleSendMessageForm = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageText.trim() && selectedFiles.length === 0) return;

    const textToSend = messageText;
    const replyTarget = replyingToMsg;
    setMessageText("");
    setReplyingToMsg(null);

    if (selectedFiles.length > 0) {
      setIsUploadingFiles(true);
      const urls: string[] = [];
      for (const item of selectedFiles) {
        const formData = new FormData(); formData.append("image", item.file);
        try {
          const res = await fetch("/api/messages/upload", { method: "POST", body: formData });
          const data = await res.json();
          if (data.imageUrl) urls.push(data.imageUrl);
        } catch(e) {}
      }
      setIsUploadingFiles(false);
      selectedFiles.forEach(f => URL.revokeObjectURL(f.preview));
      setSelectedFiles([]);

      if (urls.length > 0) {
        await executeSend(textToSend, urls[0], selectedContact, replyTarget);
        for (let i = 1; i < urls.length; i++) { await executeSend("", urls[i], selectedContact, null); }
      }
    } else {
      await executeSend(textToSend, "", selectedContact, replyTarget);
    }
  };

  const handleFileSelect = (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    const newFiles = imageFiles.map(file => ({ file, preview: URL.createObjectURL(file) }));
    setSelectedFiles(prev => [...prev, ...newFiles]);
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => { const newArr = [...prev]; URL.revokeObjectURL(newArr[index].preview); newArr.splice(index, 1); return newArr; });
  };

  const handlePaste = (e: React.ClipboardEvent) => { if (e.clipboardData.files && e.clipboardData.files.length > 0) handleFileSelect(e.clipboardData.files); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files) handleFileSelect(e.dataTransfer.files); };

  const handleRetry = (msg: any) => { setMessages((prev) => prev.map(m => m._id === msg._id ? { ...m, status: "sending" } : m)); executeSend(msg.text, msg.imageUrl, selectedContact, msg.replyTo); };
  const handleReaction = async (msgId: string, emoji: string, messageObj?: any) => { const targetMsg = messageObj || messages.find(m => m._id === msgId || m.tempId === msgId); if (!targetMsg) return; const isRemoving = targetMsg.reactions?.some((r: any) => r.userId === currentUser._id && r.emoji === emoji); socket.emit("react_message", { messageId: msgId, userId: currentUser._id, emoji, isRemoved: isRemoving }); setActiveReactId(null); setActiveMenuId(null); try { await fetch("/api/messages/react", { method: "POST", body: JSON.stringify({ messageId: msgId, userId: currentUser._id, emoji, isRemoved: isRemoving }) }); } catch(e){} };
  const handleConfirmDelete = async (type: "everyone" | "for_me") => { if (!deleteModalMsg) return; const msgId = deleteModalMsg._id || deleteModalMsg.tempId; socket.emit("delete_message", { messageId: msgId, type, userId: currentUser._id }); setDeleteModalMsg(null); setActiveMenuId(null); try { await fetch("/api/messages/delete", { method: "POST", body: JSON.stringify({ messageId: msgId, type, userId: currentUser._id }) }); } catch(e){} };
  const togglePin = async (msg: any) => { const newStatus = !msg.isPinned; socket.emit("pin_message", { messageId: msg._id, isPinned: newStatus }); setActiveMenuId(null); try { await fetch("/api/messages/pin", { method: "POST", body: JSON.stringify({ messageId: msg._id, isPinned: newStatus, chatId: selectedContact._id }) }); } catch(e){} };
  const scrollToMessage = (id: string) => { const el = document.getElementById(`msg-${id}`); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('opacity-50', 'transition-opacity', 'duration-500'); setTimeout(() => el.classList.remove('opacity-50'), 1000); } };
  const handleCopy = (text: string) => { navigator.clipboard.writeText(text); setActiveMenuId(null); };
  const handleSendNoteReply = async (e: React.FormEvent) => { e.preventDefault(); if (!replyText.trim() || !replyingContact || !currentUser) return; const fullMessage = `[Replied to Note: "${replyingContact.note}"]\n\n${replyText}`; executeSend(fullMessage, "", replyingContact, null); handleSelectContact(replyingContact); setReplyingContact(null); setReplyText(""); };
  const handleDownloadImage = async (url: string) => { try { const response = await fetch(url); const blob = await response.blob(); const blobUrl = window.URL.createObjectURL(blob); const a = document.createElement('a'); a.href = blobUrl; a.download = `zenex-image-${Date.now()}.jpg`; document.body.appendChild(a); a.click(); document.body.removeChild(a); window.URL.revokeObjectURL(blobUrl); } catch (e) {} };

  // ================= ADD/REMOVE CONTACT ACTIONS =================
  const handleAddUnknownContact = async () => { 
    try { 
      await fetch("/api/contacts/add", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contactPhone: selectedContact.phone }) }); 
      setSelectedContact({ ...selectedContact, isContact: true }); 
      fetchContacts(false); 
      setIsChatHeaderMenuOpen(false);
    } catch (e) {} 
  };
  
  const handleRemoveContact = async () => {
    if (!selectedContact) return;
    try {
      const res = await fetch("/api/contacts/remove", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contactId: selectedContact._id }) });
      if (res.ok) {
        setSelectedContact({ ...selectedContact, isContact: false, note: "", bio: "Available on Zenex" });
        fetchContacts(false);
        setIsChatHeaderMenuOpen(false);
      }
    } catch (e) {}
  };

  const handleAddContact = async (e: React.FormEvent) => { e.preventDefault(); setAddLoading(true); try { const res = await fetch("/api/contacts/add", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contactPhone: addPhone }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error); setAddMessage({ type: "success", text: data.message }); fetchContacts(false); setAddPhone(""); setTimeout(() => { setIsAddModalOpen(false); setAddMessage({ type: "", text: "" }); }, 2000); } catch (err: any) { setAddMessage({ type: "error", text: err.message }); } finally { setAddLoading(false); } };
  const handleProfileUpdate = async (e: React.FormEvent) => { e.preventDefault(); setProfileLoading(true); const formData = new FormData(); formData.append("name", profileName); formData.append("bio", profileBio); if (avatarFile) formData.append("avatar", avatarFile); try { const res = await fetch("/api/profile/update", { method: "POST", body: formData }); const data = await res.json(); if (!res.ok) throw new Error(data.error); setCurrentUser({ ...currentUser, ...data.user }); setAvatarPreview(data.user.avatar); setProfileMessage({ type: "success", text: "Profile updated successfully!" }); setTimeout(() => { setIsProfileModalOpen(false); setProfileMessage({ type: "", text: "" }); }, 2000); } catch (err: any) { setProfileMessage({ type: "error", text: err.message }); } finally { setProfileLoading(false); } };
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files[0]) { setAvatarFile(e.target.files[0]); setAvatarPreview(URL.createObjectURL(e.target.files[0])); } };
  const handleNoteUpdate = async (e: React.FormEvent) => { e.preventDefault(); setNoteLoading(true); try { const res = await fetch("/api/profile/note", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note: noteText }) }); if (res.ok) { setCurrentUser({ ...currentUser, note: noteText }); setIsNoteModalOpen(false); } } catch (e) {} finally { setNoteLoading(false); } };
  const handleSaveNickname = async (e: React.FormEvent) => { e.preventDefault(); if (!selectedContact) return; setNicknameLoading(true); try { const res = await fetch("/api/contacts/nickname", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contactId: selectedContact._id, nickname: customNickname }) }); if (res.ok) { setSelectedContact({ ...selectedContact, displayName: customNickname || selectedContact.name, nickname: customNickname }); fetchContacts(false); setIsContactProfileOpen(false); } } finally { setNicknameLoading(false); } };
  const handleLogout = async () => { try { sessionStorage.removeItem("zenex_selected_contact"); await fetch("/api/auth/logout", { method: "POST" }); router.push("/login"); } catch (e) {} };

  const getInitials = (name: string) => name ? name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase() : "ZX";
  const contactsWithNotes = contacts.filter((c) => c.note && c.isContact);
  const activePinnedMsg = messages.find(m => m.isPinned);

  let touchStartX = 0;

  return (
    <main className="flex h-screen bg-black text-white font-sans overflow-hidden relative">
      
      {/* ================= LEFT SIDEBAR (Hardcoded Dark Mode) ================= */}
      <aside className={`w-full sm:w-[350px] bg-[#0a0a0a] border-r border-white/[0.05] flex flex-col h-full relative z-20 ${selectedContact ? "hidden sm:flex" : "flex"}`}>
        <div className="h-16 px-5 flex items-center justify-between bg-[#0a0a0a]">
          <h1 className="text-xl font-bold tracking-tight">Chats</h1>
          <div className="flex items-center gap-1">
            <button onClick={() => setIsAddModalOpen(true)} className="p-2 text-neutral-400 hover:text-white bg-white/[0.02] hover:bg-white/[0.05] rounded-full"><UserPlus className="w-4 h-4" /></button>
            <button onClick={() => setIsProfileModalOpen(true)} className="p-2 text-neutral-400 hover:text-white bg-white/[0.02] hover:bg-white/[0.05] rounded-full"><Settings className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input type="text" placeholder="Search..." className="w-full pl-9 pr-4 py-2 bg-[#121212] border border-white/[0.05] rounded-full text-sm focus:outline-none focus:border-blue-500/50 text-white transition-colors" />
          </div>
        </div>

        {/* Note Slider */}
        <div className="flex overflow-x-auto gap-4 px-4 py-4 border-b border-white/[0.05] no-scrollbar shrink-0">
          <div className="flex flex-col items-center gap-1.5 cursor-pointer min-w-[70px]" onClick={() => setIsNoteModalOpen(true)}>
            <div className="relative mt-6">
              {currentUser?.note ? <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#121212] border border-white/10 px-3 py-1.5 rounded-2xl text-[10px] text-white z-10 whitespace-nowrap">{currentUser.note}</div> : <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-white/5 border border-white/10 px-2 py-1 rounded-2xl text-[10px] text-neutral-400 z-10">Note +</div>}
              {currentUser?.avatar ? <img src={currentUser.avatar} className="w-14 h-14 rounded-full object-cover border-2 border-[#0a0a0a]" /> : <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center font-bold text-blue-500 border-2 border-[#0a0a0a]">{getInitials(currentUser?.name)}</div>}
            </div>
            <span className="text-[11px] text-neutral-400 font-medium">Your Note</span>
          </div>
          {contactsWithNotes.map((contact, index) => (
            <div key={index} className="flex flex-col items-center gap-1.5 cursor-pointer min-w-[70px]" onClick={() => setReplyingContact(contact)}>
              <div className="relative mt-6">
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-blue-600 border border-blue-600 px-3 py-1.5 rounded-2xl text-[10px] text-white z-10 whitespace-nowrap">{contact.note}</div>
                {contact.avatar ? <img src={contact.avatar} className="w-14 h-14 rounded-full object-cover border-2 border-blue-600 shadow-lg" /> : <div className="w-14 h-14 bg-[#121212] rounded-full flex items-center justify-center font-bold text-white border-2 border-blue-600 shadow-lg">{getInitials(contact.displayName)}</div>}
              </div>
              <span className="text-[11px] text-white font-medium">{contact.displayName.split(" ")[0]}</span>
            </div>
          ))}
        </div>

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-0.5">
          {initialLoading ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div> : contacts.map((contact, index) => {
            const isOnline = userStatuses[contact._id]?.status === "Online";
            const isTyping = typingUsers.has(contact._id);
            const lastMsg = contact.lastMessage;
            const isMe = lastMsg?.sender === currentUser?._id;
            const isUnread = lastMsg && (!lastMsg.isRead && lastMsg.status !== "seen") && !isMe;

            return (
              <div key={index} onClick={() => handleSelectContact(contact)} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${selectedContact?._id === contact._id ? "bg-white/[0.08]" : "hover:bg-white/[0.04]"}`}>
                <div className="relative">
                  {contact.avatar ? <img src={contact.avatar} className="w-12 h-12 rounded-full object-cover" /> : <div className="w-12 h-12 bg-[#121212] border border-white/5 rounded-full flex items-center justify-center text-white font-bold">{getInitials(contact.displayName)}</div>}
                  {isOnline && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#0a0a0a] rounded-full"></div>}
                </div>
                <div className="flex-1 overflow-hidden">
                  <h3 className="text-sm font-bold text-white truncate">{contact.displayName}</h3>
                  {isTyping ? (
                    <p className="text-[12px] text-blue-500 font-medium italic animate-pulse mt-0.5">typing...</p>
                  ) : lastMsg ? (
                    <div className="flex items-center gap-1 mt-0.5">
                      {isMe && (
                        lastMsg.status === "seen" || lastMsg.isRead ? <CheckCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" /> : 
                        lastMsg.status === "sent" ? <Check className="w-3.5 h-3.5 text-neutral-500 shrink-0" /> : 
                        <Clock className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                      )}
                      <p className={`text-[12px] truncate ${isUnread ? "text-white font-bold" : "text-neutral-500 font-normal"}`}>
                        {isMe ? <span className="text-neutral-500 mr-1">You:</span> : null}
                        {lastMsg.isDeleted ? "Message removed" : lastMsg.text ? lastMsg.text : "🖼️ Image"}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[12px] text-neutral-500 truncate mt-0.5">Tap to chat</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ================= RIGHT SIDE (Chat Window - THEME APPLIED HERE) ================= */}
      {selectedContact ? (
        <section 
           className={`flex-1 flex flex-col h-full relative z-30 transition-colors duration-500 bg-[var(--bg-primary)] ${currentTheme}`} 
           onClick={() => { setActiveMenuId(null); setActiveReactId(null); setIsChatHeaderMenuOpen(false); }}
           onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
        >
          {isDragging && (
             <div className="absolute inset-0 z-50 bg-[var(--accent)]/20 backdrop-blur-sm border-4 border-dashed border-[var(--accent)] flex flex-col items-center justify-center pointer-events-none">
                <ImageIcon className="w-16 h-16 text-[var(--accent)] mb-4 animate-bounce" />
                <h2 className="text-2xl font-bold text-white shadow-black drop-shadow-lg">Drop images here to send</h2>
             </div>
          )}

          {/* Chat Header */}
          <div className="h-16 px-4 sm:px-6 flex items-center justify-between border-b border-white/[0.05] bg-[var(--bg-secondary)]/90 backdrop-blur-md z-20 shrink-0">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => { setCustomNickname(selectedContact.nickname || ""); setIsContactProfileOpen(true); }}>
              <button onClick={(e) => { e.stopPropagation(); setSelectedContact(null); sessionStorage.removeItem("zenex_selected_contact"); }} className="sm:hidden p-2 -ml-2 text-neutral-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></button>
              {selectedContact.avatar ? <img src={selectedContact.avatar} className="w-10 h-10 rounded-full object-cover group-hover:opacity-80 transition-opacity" /> : <div className="w-10 h-10 bg-[var(--bg-primary)] border border-white/10 rounded-full flex items-center justify-center text-white font-bold text-sm group-hover:bg-white/5 transition-colors">{getInitials(selectedContact.displayName)}</div>}
              <div>
                <h2 className="text-base font-bold text-white leading-tight group-hover:text-[var(--accent)] transition-colors flex items-center gap-2">
                  {selectedContact.displayName} <Info className="w-3.5 h-3.5 text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </h2>
                <div className="flex items-center gap-2">
                  <p className={`text-[11px] font-medium ${typingUsers.has(selectedContact._id) ? "text-[var(--accent)] italic animate-pulse" : userStatuses[selectedContact._id]?.status === "Online" ? "text-emerald-400" : "text-neutral-500"}`}>
                    {typingUsers.has(selectedContact._id) ? "typing..." : userStatuses[selectedContact._id]?.status === "Online" ? "Online" : formatLastSeen(userStatuses[selectedContact._id]?.lastSeen)}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 relative">
              <button className="p-2 text-neutral-400 hover:text-white bg-white/[0.02] hover:bg-white/[0.05] rounded-full transition-all"><Phone className="w-5 h-5" /></button>
              <button className="p-2 text-neutral-400 hover:text-white bg-white/[0.02] hover:bg-white/[0.05] rounded-full transition-all"><Video className="w-5 h-5" /></button>
              <button onClick={(e) => { e.stopPropagation(); setIsChatHeaderMenuOpen(!isChatHeaderMenuOpen); }} className="p-2 text-neutral-400 hover:text-white bg-white/[0.02] hover:bg-white/[0.05] rounded-full transition-all"><MoreVertical className="w-5 h-5" /></button>
              
              {isChatHeaderMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl py-1 z-50 overflow-hidden">
                  <button onClick={() => { setIsThemeModalOpen(true); setIsChatHeaderMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/5 flex items-center gap-3">
                    <Palette className="w-4 h-4 text-[var(--accent)]" /> Change Theme
                  </button>
                  
                  {selectedContact.isContact ? (
                    <button onClick={handleRemoveContact} className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-white/5 flex items-center gap-3 border-t border-white/5 transition-colors">
                      <UserMinus className="w-4 h-4 text-red-500" /> Remove Contact
                    </button>
                  ) : (
                    <button onClick={handleAddUnknownContact} className="w-full text-left px-4 py-3 text-sm text-blue-400 hover:bg-white/5 flex items-center gap-3 border-t border-white/5 transition-colors">
                      <UserPlus className="w-4 h-4 text-blue-400" /> Add to Contact
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {activePinnedMsg && (
            <div onClick={() => scrollToMessage(activePinnedMsg._id || activePinnedMsg.tempId)} className="bg-[var(--bg-secondary)] border-b border-white/[0.05] px-6 py-2.5 flex items-center justify-between shrink-0 cursor-pointer hover:bg-white/5 transition-colors shadow-lg z-10">
              <div className="flex flex-col border-l-4 border-[var(--accent)] pl-3 overflow-hidden w-full">
                <span className="text-[var(--accent)] text-[10px] font-bold uppercase tracking-wider">Pinned Message</span>
                <span className="text-white text-[13px] truncate">{activePinnedMsg.text || "🖼️ Image"}</span>
              </div>
              <button onClick={(e) => { e.stopPropagation(); togglePin(activePinnedMsg); }} className="p-1 hover:bg-white/10 rounded-full shrink-0"><X className="w-4 h-4 text-neutral-500" /></button>
            </div>
          )}

          {/* ================= MESSAGE LIST CONTAINER ================= */}
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 z-10 custom-scrollbar relative">
            {isChatLoading ? (
              // সুন্দর লোডিং স্পিনার (ব্ল্যাঙ্ক স্ক্রিন হবে না)
              <div className="h-full w-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)] opacity-50" />
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => {
                  const isMe = msg.sender === currentUser?._id;
                  const onlyEmoji = isOnlyEmojis(msg.text) && !msg.isDeleted;
                  const msgId = msg._id || msg.tempId;
                  const showMenu = activeMenuId === msgId;
                  const showReact = activeReactId === msgId;
                  const menuDirection = idx >= messages.length - 2 ? "bottom-full mb-2" : "top-full mt-2";

                  return (
                    <div key={idx} id={`msg-${msgId}`} className={`flex ${isMe ? "justify-end" : "justify-start"} mb-6 group rounded-lg`} 
                        onMouseLeave={() => {if(showMenu) setActiveMenuId(null)}}
                        onTouchStart={(e) => { touchStartX = e.touches[0].clientX; }}
                        onTouchEnd={(e) => { const diff = e.changedTouches[0].clientX - touchStartX; if(diff > 60) setReplyingToMsg(msg); }}
                    >
                      <div className={`flex items-center gap-2 max-w-[90%] sm:max-w-[70%] ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                        
                        <div className={`relative flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                          <div className={`flex flex-col ${!onlyEmoji && !msg.imageUrl && !msg.isDeleted ? (isMe ? "bg-[var(--accent)] text-white px-4 py-2.5 shadow-sm rounded-2xl rounded-tr-sm" : "bg-[var(--msg-in)] border border-white/[0.05] text-white px-4 py-2.5 shadow-sm rounded-2xl rounded-tl-sm") : (msg.isDeleted ? "bg-transparent border border-white/10 px-4 py-2 rounded-2xl text-neutral-500 italic" : "")}`}>
                            
                            {msg.replyTo && !msg.isDeleted && (
                              <div onClick={() => scrollToMessage(msg.replyTo.messageId)} className="bg-black/20 rounded-lg p-2 mb-1.5 border-l-4 border-white/50 cursor-pointer hover:bg-black/30 transition-colors max-w-xs">
                                <p className="text-[10px] font-bold text-white/80">{msg.replyTo.senderName}</p>
                                <p className="text-xs text-white/60 truncate">{msg.replyTo.text || "🖼️ Image"}</p>
                              </div>
                            )}

                            {msg.isDeleted ? (
                              <p className="text-sm flex items-center gap-2"><Trash2 className="w-3.5 h-3.5" /> Message removed</p>
                            ) : (
                              <>
                                {msg.imageUrl && <img onClick={() => setViewImage(msg.imageUrl)} src={msg.imageUrl} className="max-w-[250px] rounded-xl border border-white/10 shadow-lg cursor-pointer hover:opacity-90 mt-1" />}
                                {msg.text && <p className={`${onlyEmoji ? "text-[50px] animate-[bounce_2s_infinite] drop-shadow-2xl" : "text-[14px] leading-relaxed whitespace-pre-wrap"}`}>{msg.text}</p>}
                              </>
                            )}
                          </div>

                          {!msg.isDeleted && (
                            <div className={`flex items-center gap-1 mt-1 px-1 ${isMe ? "justify-end" : "justify-start"}`}>
                              <span className="text-[10px] text-neutral-500 font-medium tracking-wide">{formatMessageTime(msg.createdAt)}</span>
                              {isMe && (
                                <>
                                  {msg.status === "sending" && <Clock className="w-3 h-3 text-neutral-500 ml-1" />}
                                  {msg.status === "sent" && <Check className="w-3.5 h-3.5 text-neutral-400 ml-1" />}
                                  {(msg.status === "seen" || msg.isRead) && <CheckCheck className="w-3.5 h-3.5 text-[var(--accent)] ml-1" />}
                                  {msg.status === "failed" && <button onClick={() => handleRetry(msg)} className="flex items-center gap-1 text-red-400 hover:text-red-300 ml-1"><AlertCircle className="w-3 h-3" /> <RefreshCcw className="w-3 h-3" /></button>}
                                </>
                              )}
                            </div>
                          )}

                          {msg.reactions?.length > 0 && (
                            <div className={`absolute -bottom-3 ${isMe ? "left-2" : "right-2"} bg-[var(--bg-secondary)] border border-white/10 rounded-full px-1.5 py-0.5 text-xs shadow-md flex items-center gap-1 z-10 cursor-pointer`}>
                              {Array.from(new Set(msg.reactions.map((r: any) => r.emoji))).map((e: any, i) => (
                                <button key={i} onClick={() => handleReaction(msgId, e, msg)} className="hover:scale-125 transition-transform">{e}</button>
                              ))}
                              <span className="text-[10px] text-neutral-400 font-bold ml-0.5">{msg.reactions.length > 1 ? msg.reactions.length : ""}</span>
                            </div>
                          )}
                        </div>

                        <div className={`flex items-center gap-1 transition-opacity relative z-20 ${showMenu || showReact ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                          {!msg.isDeleted && <button onClick={(e) => { e.stopPropagation(); setActiveReactId(showReact ? null : msgId); setActiveMenuId(null); }} className="p-1.5 bg-[#1a1a1a] text-neutral-400 hover:text-white rounded-full shadow-lg border border-white/5"><Smile className="w-4 h-4" /></button>}
                          {!msg.isDeleted && <button onClick={(e) => { e.stopPropagation(); setReplyingToMsg(msg); }} className="p-1.5 bg-[#1a1a1a] text-neutral-400 hover:text-white rounded-full shadow-lg border border-white/5 sm:block hidden"><Reply className="w-4 h-4" /></button>}
                          
                          <div className="relative">
                            <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(showMenu ? null : msgId); setActiveReactId(null); }} className="p-1.5 bg-[#1a1a1a] text-neutral-400 hover:text-white rounded-full shadow-lg border border-white/5"><MoreVertical className="w-4 h-4" /></button>
                            {showMenu && (
                              <div className={`absolute ${menuDirection} w-44 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl py-1 z-50 ${isMe ? "right-0" : "left-0"}`}>
                                {!msg.isDeleted && msg.text && <button onClick={() => handleCopy(msg.text)} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/5 flex items-center gap-2"><Copy className="w-4 h-4" /> Copy</button>}
                                {!msg.isDeleted && <button onClick={() => setReplyingToMsg(msg)} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/5 flex items-center gap-2 sm:hidden"><Reply className="w-4 h-4" /> Reply</button>}
                                {!msg.isDeleted && <button onClick={() => { executeSend(msg.text, msg.imageUrl, selectedContact, null); setActiveMenuId(null); }} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/5 flex items-center gap-2"><Forward className="w-4 h-4" /> Forward</button>}
                                {!msg.isDeleted && <button onClick={() => togglePin(msg)} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/5 flex items-center gap-2">{msg.isPinned ? <><PinOff className="w-4 h-4" /> Unpin</> : <><Pin className="w-4 h-4" /> Pin</>}</button>}
                                <button onClick={() => setDeleteModalMsg(msg)} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 flex items-center gap-2 border-t border-white/10"><Trash2 className="w-4 h-4" /> Remove</button>
                              </div>
                            )}
                          </div>

                          {showReact && (
                            <div className={`absolute -top-10 z-50 bg-[#1a1a1a] border border-white/10 rounded-full shadow-2xl px-2 py-1 flex gap-1 ${isMe ? "right-0" : "left-0"}`}>
                              {POPULAR_REACTIONS.map((emoji) => <button key={emoji} onClick={() => handleReaction(msgId, emoji, msg)} className="text-xl hover:scale-125 transition-transform hover:bg-white/10 p-1 rounded-full">{emoji}</button>)}
                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          <div className="bg-[var(--bg-secondary)]/90 backdrop-blur-md border-t border-white/[0.05] z-20 shrink-0 flex flex-col transition-colors duration-500">
            {replyingToMsg && (
              <div className="bg-[var(--bg-primary)] border-l-4 border-[var(--accent)] p-2 mx-4 sm:mx-6 mt-3 mb-[-10px] rounded-t-xl flex justify-between items-center relative z-0 pb-4 shadow-lg">
                <div className="flex flex-col overflow-hidden px-2">
                  <span className="text-[var(--accent)] text-[11px] font-bold">{replyingToMsg.sender === currentUser._id ? "Replying to yourself" : `Replying to ${selectedContact.displayName}`}</span>
                  <span className="text-neutral-400 text-xs truncate">{replyingToMsg.text || "🖼️ Image"}</span>
                </div>
                <button onClick={() => setReplyingToMsg(null)} className="p-1 hover:bg-white/10 rounded-full"><X className="w-4 h-4 text-neutral-400" /></button>
              </div>
            )}

            {selectedFiles.length > 0 && (
              <div className="flex gap-3 px-4 pt-4 pb-1 overflow-x-auto no-scrollbar max-w-4xl mx-auto w-full">
                {selectedFiles.map((item, index) => (
                  <div key={index} className="relative shrink-0">
                    <img src={item.preview} className="h-20 w-20 object-cover rounded-xl border border-white/10" />
                    <button onClick={() => removeSelectedFile(index)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:scale-110 transition-transform"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleSendMessageForm} className="flex items-end gap-2 p-3 sm:p-4 w-full max-w-4xl mx-auto relative z-10 bg-transparent">
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploadingFiles} className="p-3 text-neutral-400 hover:text-[var(--accent)] hover:bg-white/5 rounded-xl transition-all"><ImageIcon className="w-5 h-5" /></button>
              <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={(e) => { if (e.target.files) handleFileSelect(e.target.files); e.target.value = ''; }} />
              
              <div className="flex-1 bg-[var(--bg-primary)] border border-white/[0.05] rounded-2xl flex items-center pr-1.5 focus-within:border-[var(--accent)]/50 transition-colors">
                <input type="text" onPaste={handlePaste} className="w-full bg-transparent px-4 py-3.5 text-[14px] text-white focus:outline-none placeholder:text-neutral-600" placeholder="Type a message or paste an image..." value={messageText} onChange={handleTyping} />
                <button type="submit" disabled={(!messageText.trim() && selectedFiles.length === 0) || isUploadingFiles} className="p-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl transition-all disabled:opacity-50">
                  {isUploadingFiles ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </form>
          </div>
        </section>
      ) : (
        <section className={`hidden sm:flex flex-1 flex-col h-full items-center justify-center transition-colors duration-500 ${currentTheme} bg-[var(--bg-primary)]`}>
          <MessageSquare className="w-16 h-16 text-white/5 mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Welcome to Zenex Chat</h2>
          <p className="text-sm text-neutral-500">Select a contact from the sidebar to start messaging</p>
        </section>
      )}

      {/* ================= THEME CHANGER MODAL ================= */}
      {isThemeModalOpen && (
        <div className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 ${currentTheme}`}>
          <div className="bg-[#121212] border border-white/[0.1] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-white/[0.05]">
              <h2 className="text-lg font-bold flex items-center gap-2"><Palette className="w-5 h-5 text-[var(--accent)]" /> Customize Chat</h2>
              <button onClick={() => setIsThemeModalOpen(false)} className="text-neutral-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <p className="text-sm text-neutral-400 mb-4">Select a theme for this conversation. This will change the theme for both of you.</p>
              <div className="grid grid-cols-2 gap-3">
                {THEMES.map((theme) => (
                  <button 
                    key={theme.id} 
                    onClick={() => handleChangeTheme(theme.id)}
                    className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${currentTheme === theme.id ? "border-[var(--accent)] bg-white/5" : "border-white/5 hover:border-white/20 bg-[#0a0a0a]"}`}
                  >
                    <div className="w-10 h-10 rounded-full shadow-lg" style={{ backgroundColor: theme.color }}></div>
                    <span className="text-xs font-bold text-white">{theme.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer */}
      {viewImage && (
        <div className={`fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 backdrop-blur-sm ${currentTheme}`}>
          <button onClick={() => setViewImage(null)} className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors p-2 bg-white/10 hover:bg-white/20 rounded-full"><X className="w-6 h-6" /></button>
          <button onClick={() => handleDownloadImage(viewImage)} className="absolute top-6 right-20 text-white hover:text-white flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] px-4 py-2 rounded-full transition-colors font-bold text-sm"><Download className="w-4 h-4" /> Download</button>
          <img src={viewImage} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalMsg && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-white/[0.1] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 text-center">
            <h3 className="text-lg font-bold text-white mb-2">Remove Message</h3>
            <p className="text-sm text-neutral-400 mb-6">Who do you want to remove this message for?</p>
            <div className="space-y-3">
              {deleteModalMsg.sender === currentUser?._id && !deleteModalMsg.isDeleted && (
                <button onClick={() => handleConfirmDelete("everyone")} className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all">Unsend for Everyone</button>
              )}
              <button onClick={() => handleConfirmDelete("for_me")} className="w-full py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all">Remove for You</button>
              <button onClick={() => setDeleteModalMsg(null)} className="w-full py-3.5 text-neutral-400 hover:text-white transition-all font-semibold">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= ALL OTHER MODALS (Default Dark Theme Applied) ================= */}
      {replyingContact && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <button onClick={() => setReplyingContact(null)} className="absolute top-6 right-6 text-white/50 hover:text-white"><X className="w-8 h-8" /></button>
          <div className="w-full max-w-md flex flex-col items-center">
            {replyingContact.avatar ? <img src={replyingContact.avatar} className="w-24 h-24 rounded-full object-cover border-4 border-blue-500 mb-4 shadow-lg" /> : <div className="w-24 h-24 bg-[#121212] rounded-full flex items-center justify-center font-bold text-3xl text-white border-4 border-blue-500 mb-4">{getInitials(replyingContact.displayName)}</div>}
            <h2 className="text-3xl font-bold text-white text-center mb-10 leading-tight">"{replyingContact.note}"</h2>
            <form onSubmit={handleSendNoteReply} className="w-full bg-[#121212] border border-white/10 rounded-full flex items-center p-1.5 focus-within:border-blue-500/50 shadow-2xl">
              <input type="text" autoFocus className="flex-1 bg-transparent px-5 py-3 text-sm text-white focus:outline-none" placeholder="Reply..." value={replyText} onChange={(e) => setReplyText(e.target.value)} />
              <button type="submit" disabled={!replyText.trim()} className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full"><Send className="w-4 h-4" /></button>
            </form>
          </div>
        </div>
      )}

      {isContactProfileOpen && selectedContact && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a0a0a] border border-white/[0.1] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-white/[0.05]">
              <h2 className="text-lg font-bold">Contact Info</h2>
              <button onClick={() => setIsContactProfileOpen(false)} className="text-neutral-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex flex-col items-center gap-3">
                {selectedContact.avatar ? <img src={selectedContact.avatar} className="w-24 h-24 rounded-full object-cover border-2 border-white/10" /> : <div className="w-24 h-24 bg-[#121212] border border-white/20 rounded-full flex items-center justify-center"><span className="text-2xl font-bold text-neutral-600">{getInitials(selectedContact.displayName)}</span></div>}
                <div className="text-center">
                  <h3 className="text-xl font-bold text-white">{selectedContact.name}</h3>
                  <p className="text-sm text-neutral-400 mt-1 flex items-center justify-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {selectedContact.phone}</p>
                </div>
              </div>
              <div className="p-4 bg-[#121212] border border-white/[0.05] rounded-xl">
                <p className="text-xs text-blue-500 uppercase font-semibold mb-1">Bio</p>
                <p className="text-sm text-white/90">{selectedContact.bio || "Available on Zenex"}</p>
              </div>
              <form onSubmit={handleSaveNickname} className="space-y-2 pt-2 border-t border-white/[0.05]">
                <label className="text-xs font-semibold text-neutral-400 uppercase">Set Custom Nickname</label>
                <div className="flex gap-2">
                  <input type="text" className="flex-1 px-4 py-3 bg-[#121212] border border-white/[0.05] rounded-xl focus:outline-none focus:border-blue-500/50 text-white" placeholder="E.g. Boss, Bro..." value={customNickname} onChange={(e) => setCustomNickname(e.target.value)} />
                  <button type="submit" disabled={nicknameLoading} className="px-5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold">{nicknameLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a0a0a] border border-white/[0.1] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b border-white/[0.05] shrink-0">
              <h2 className="text-lg font-bold">My Profile</h2>
              <button onClick={() => setIsProfileModalOpen(false)} className="text-neutral-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto custom-scrollbar p-6">
              <form onSubmit={handleProfileUpdate} className="space-y-5">
                {profileMessage.text && <div className={`p-3 text-xs rounded-lg border text-center ${profileMessage.type === "error" ? "text-red-400 bg-red-500/10" : "text-emerald-400 bg-emerald-500/10"}`}>{profileMessage.text}</div>}
                <div className="flex flex-col items-center gap-3">
                  <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    {avatarPreview ? <img src={avatarPreview} className="w-24 h-24 rounded-full object-cover border-2 border-white/10" /> : <div className="w-24 h-24 bg-[#121212] border-2 border-dashed border-white/20 rounded-full flex items-center justify-center"><span className="text-2xl font-bold text-neutral-600">{getInitials(profileName)}</span></div>}
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5"><label className="text-xs font-semibold text-neutral-400 uppercase">Registered Phone</label><input type="text" readOnly className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/[0.05] rounded-xl text-neutral-500 cursor-not-allowed" value={currentUser?.phone} /></div>
                  <div className="space-y-1.5"><label className="text-xs font-semibold text-neutral-400 uppercase">Display Name</label><input type="text" required className="w-full px-4 py-3 bg-[#121212] border border-white/[0.05] rounded-xl text-white focus:outline-none focus:border-blue-500/50" value={profileName} onChange={(e) => setProfileName(e.target.value)} /></div>
                  <div className="space-y-1.5">
                     <label className="text-xs font-semibold text-neutral-400 uppercase">Bio</label>
                     <input type="text" maxLength={100} className="w-full px-4 py-3 bg-[#121212] border border-white/[0.05] rounded-xl text-white focus:outline-none focus:border-blue-500/50" value={profileBio} onChange={(e) => setProfileBio(e.target.value)} />
                     <p className="text-[10px] text-neutral-500 text-right">{profileBio.length}/100</p>
                  </div>
                </div>
                <button type="submit" disabled={profileLoading} className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold">{profileLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Changes"}</button>
              </form>
              <div className="mt-6 pt-5 border-t border-white/[0.05]">
                <button onClick={handleLogout} className="w-full py-3.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-xl font-bold flex justify-center items-center gap-2"><LogOut className="w-4 h-4" /> Secure Logout</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a0a0a] border border-white/[0.1] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-white/[0.05]">
              <h2 className="text-lg font-bold">Add Contact</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-neutral-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddContact} className="p-6 space-y-5">
              {addMessage.text && <div className={`p-3 text-xs rounded-lg border text-center ${addMessage.type === "error" ? "text-red-400 bg-red-500/10" : "text-emerald-400 bg-emerald-500/10"}`}>{addMessage.text}</div>}
              <div className="space-y-1.5"><label className="text-xs font-semibold text-neutral-400 uppercase">Phone Number</label><input type="tel" required className="w-full px-4 py-3.5 bg-[#121212] border border-white/[0.05] rounded-xl text-white focus:outline-none focus:border-blue-500/50" placeholder="e.g. 01700000000" value={addPhone} onChange={(e) => setAddPhone(e.target.value)} /></div>
              <button type="submit" disabled={addLoading} className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold">{addLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Search & Add"}</button>
            </form>
          </div>
        </div>
      )}

      {isNoteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a0a0a] border border-white/[0.1] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b border-white/[0.05]">
              <h2 className="text-lg font-bold">Set 24-Hour Note</h2>
              <button onClick={() => setIsNoteModalOpen(false)} className="text-neutral-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleNoteUpdate} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <textarea maxLength={100} rows={3} className="w-full px-4 py-3 bg-[#121212] border border-white/[0.05] rounded-xl text-white resize-none focus:outline-none focus:border-blue-500/50" placeholder="Share a thought..." value={noteText} onChange={(e) => setNoteText(e.target.value)} />
                <p className="text-[10px] text-neutral-500 text-right">{noteText.length}/100</p>
              </div>
              <button type="submit" disabled={noteLoading} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex justify-center items-center">{noteLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Share Note"}</button>
            </form>
          </div>
        </div>
      )}

    </main>
  );
}