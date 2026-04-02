"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Send, Hash, User, LogOut, Check, CheckCheck, Users, Plus, X, MessageSquare, Shield, Edit2, Bell, BellOff, Trash2, Mic, Square, Paperclip, Image as ImageIcon, Smile, Download, RotateCw, ChevronDown, ChevronLeft, UserPlus, Crown, Info, ZoomIn, Menu } from "lucide-react";

// Socket replacement logic
// let socket: any;

export default function ChatPage() {
    const [conversations, setConversations] = useState<any[]>([]);
    const [currentChat, setCurrentChat] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState("");
    const [currentUser, setCurrentUser] = useState<any>(null);
    // editing state
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editingContent, setEditingContent] = useState("");
    // current message showing action menu
    const [actionMessageId, setActionMessageId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const handleStartEdit = (msg: any) => {
        setEditingMessageId(msg.id);
        setEditingContent(msg.content || "");
    };

    const handleCancelEdit = () => {
        setEditingMessageId(null);
        setEditingContent("");
    };

    const toggleActionMenu = (msgId: string) => {
        setActionMessageId(prev => (prev === msgId ? null : msgId));
    };

    // close action menu when clicking outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.action-menu') && !target.closest('.reply-chevron')) {
                setActionMessageId(null);
            }
        };
        document.addEventListener('click', handler);
        return () => document.removeEventListener('click', handler);
    }, []);
    const handleSaveEdit = async (msg: any) => {
        if (editingMessageId !== msg.id) return;
        if (editingContent.trim() === "") return; // avoid empty
        try {
            const res = await fetch("/api/chat", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messageId: msg.id, content: editingContent })
            });
            const data = await res.json();
            console.log("edit response", res.status, data);
            if (res.ok) {
                setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, content: editingContent, editedAt: new Date().toISOString() } : m));
            } else {
                console.error("edit error response:", data);
                alert(`Não foi possível editar a mensagem: ${data.error || 'erro desconhecido'}`);
            }
        } catch (err) {
            console.error("edit failed", err);
            alert(`Erro ao enviar requisição de edição: ${err instanceof Error ? err.message : String(err)}`);
        }
        handleCancelEdit();
        setActionMessageId(null);
    };

    const handleDeleteMessage = async (msg: any) => {
        if (!window.confirm("Excluir mensagem? OK = para todos, Cancel = apenas para você")) {
            // user canceled - interpret as delete just for self
            const res = await fetch("/api/chat", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messageId: msg.id })
            });
            if (res.ok) {
                setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, content: "Mensagem apagada", deleted: true } : m));
            }
            return;
        }
        // delete for all
        const res = await fetch("/api/chat", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messageId: msg.id, deleteForAll: true })
        });
        if (res.ok) {
            setMessages(prev => prev.filter(m => m.id !== msg.id));
        }
    };
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);
    const [groupName, setGroupName] = useState("");
    const [selectedParticipants, setSelectedParticipants] = useState<any[]>([]);
    const currentChatRef = useRef<any>(null);
    const conversationsRef = useRef<any[]>([]);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [profileData, setProfileData] = useState({ name: "", image: "" });
    const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [replyTo, setReplyTo] = useState<any>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
    const [groupMemberSearch, setGroupMemberSearch] = useState("");
    const [groupMemberResults, setGroupMemberResults] = useState<any[]>([]);
    const [chatLightboxImage, setChatLightboxImage] = useState<string | null>(null);
    // initialize closed to avoid SSR/client mismatch; adjust on mount
    const [isConversationsOpen, setIsConversationsOpen] = useState(false);

    useEffect(() => {
        conversationsRef.current = conversations;
    }, [conversations]);

    useEffect(() => {
        currentChatRef.current = currentChat;
    }, [currentChat]);

    useEffect(() => {
        if (currentUser) {
            setProfileData({
                name: currentUser.name,
                image: currentUser.image || ""
            });
        }
    }, [currentUser]);

    useEffect(() => {
        if (isRecording) {
            recordingTimerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } else {
            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
            setRecordingTime(0);
        }
        return () => {
            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        };
    }, [isRecording]);


    // ... existing useEffects

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileData({ ...profileData, image: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const res = await fetch("/api/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(profileData)
        });
        setLoading(false);
        if (res.ok) {
            const updated = await res.json();
            setCurrentUser(updated);
            setIsProfileOpen(false);
            // socket.emit("profileUpdate", { userId: updated.id });
            fetchConversations(); // Refresh to update names in list
        } else {
            alert("Erro ao atualizar perfil");
        }
    };

    const handleStatusUpdate = ({ userId, status }: { userId: string, status: string }) => {
        setConversations(prev => prev.map(c => {
            if (c.isGroup) return c;
            const updatedParticipants = c.participants?.map((p: any) =>
                p.userId === userId ? { ...p, user: { ...p.user, status } } : p
            );
            return { ...c, participants: updatedParticipants };
        }));

        // Also update currentChat if it matches
        setCurrentChat((prev: any) => {
            if (!prev || prev.isGroup) return prev;
            const isUserInChat = prev.participants?.some((p: any) => p.userId === userId);
            if (!isUserInChat) return prev;

            const updatedParticipants = prev.participants.map((p: any) =>
                p.userId === userId ? { ...p, user: { ...p.user, status } } : p
            );
            return { ...prev, participants: updatedParticipants };
        });
    };

    // Initial setup - only once on mount
    useEffect(() => {
        // Basic auth check
        fetch("/api/auth/me")
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    router.push("/login");
                } else {
                    setCurrentUser(data);
                }
            });

        // Realtime setup handled in following effect

        if ("Notification" in window) {
            setNotificationPermission(Notification.permission);
        }

        fetchConversations();

        return () => {
            // No cleanup needed here for socket to keep it alive
        };
    }, []);

    // Handle Supabase Realtime listeners, status and receipts
    useEffect(() => {
        if (!currentUser) return;

        // 1. Status Update: Marcando o usuário como ONLINE no banco
        const setOnline = async () => {
            await fetch("/api/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "ONLINE" })
            });
        };
        setOnline();

        // 2. Subscrição para Mensagens (postgres_changes)
        const channel = supabase.channel('chat_realtime')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'Message'
            }, async (payload) => {
                const msg = payload.new as any;
                const activeChat = currentChatRef.current;
                const isFromMe = msg.senderId === currentUser?.id;

                // Adicionar informações do remetente (payload não traz includes do Prisma)
                // Buscamos o remetente se não for o usuário local
                if (!isFromMe && !msg.sender) {
                    const res = await fetch(`/api/users/${msg.senderId}`);
                    if (res.ok) msg.sender = await res.json();
                }

                // Lógica de Atualização de UI
                if (activeChat && msg.conversationId === activeChat.id) {
                    setMessages(prev => {
                        if (prev.find(m => m.id === msg.id)) return prev;
                        return [...prev, msg];
                    });
                    
                    if (!isFromMe) {
                        fetch("/api/chat/read", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ conversationId: activeChat.id })
                        });
                    }
                }

                // Notificações e Atualização da Barra Lateral
                if (!isFromMe) {
                    setConversations(prev => prev.map(c => 
                        c.id === msg.conversationId ? { ...c, unreadCount: (c.unreadCount || 0) + 1, messages: [msg] } : c
                    ));

                    if (!document.hasFocus() || (activeChat && msg.conversationId !== activeChat.id)) {
                        if (Notification.permission === "granted") {
                            new Notification(`Nova mensagem`, { body: msg.content });
                        }
                        new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3').play().catch(() => {});
                    }
                } else {
                    setConversations(prev => prev.map(c => 
                        c.id === msg.conversationId ? { ...c, messages: [msg] } : c
                    ));
                }
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'Message'
            }, (payload) => {
                const updated = payload.new as any;
                setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m));
            })
            .on('postgres_changes', {
                event: 'DELETE',
                schema: 'public',
                table: 'Message'
            }, (payload) => {
                setMessages(prev => prev.filter(m => m.id !== payload.old.id));
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'User'
            }, (payload) => {
                const updatedUser = payload.new as any;
                handleStatusUpdate({ userId: updatedUser.id, status: updatedUser.status });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser]);

    // Handle receipts
    useEffect(() => {
        if (!currentChat || !currentUser) return;

        // Mark as read when entering chat
        fetch("/api/chat/read", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conversationId: currentChat.id })
        });
    }, [currentChat, currentUser]);

    useEffect(() => {
        if (searchQuery.trim().length > 1) {
            handleSearch();
        } else {
            setSearchResults([]);
            setIsSearching(false);
        }
    }, [searchQuery]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const fetchConversations = async () => {
        const res = await fetch("/api/chat");
        if (res.ok) {
            const data = await res.json();
            setConversations(data);
        }
    };

    const fetchMessages = async (chatId: string) => {
        const res = await fetch(`/api/chat/${chatId}`);
        if (res.ok) {
            const data = await res.json();
            setMessages(data);
        }
    };

    const handleSelectChat = (chat: any) => {
        setCurrentChat(chat);
        fetchMessages(chat.id);

        // Clear unread count locally
        setConversations(prev => prev.map(c =>
            c.id === chat.id ? { ...c, unreadCount: 0 } : c
        ));

        // On small screens hide the sidebar after picking a chat
        if (typeof window !== "undefined" && window.innerWidth < 768) {
            setIsConversationsOpen(false);
        }
    };

    const toggleSidebar = () => setIsConversationsOpen(prev => !prev);
    const closeChat = () => setCurrentChat(null);

    // after hydration, open sidebar automatically on desktop
    useEffect(() => {
        if (window.innerWidth >= 768) setIsConversationsOpen(true);
    }, []);

    // Handle ESC key to close chat on desktop
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key === "Escape" && currentChat) {
                closeChat();
            }
        };
        window.addEventListener("keydown", handleKeyPress);
        return () => window.removeEventListener("keydown", handleKeyPress);
    }, [currentChat]);

    const handleSendImage = async (base64Image: string) => {
        if (!currentChat || !currentUser) return;
        const currentId = currentChat.id;

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: "📷 Foto",
                    conversationId: currentId,
                    type: "IMAGE",
                    imageUrl: base64Image
                })
            });

            if (res.ok) {
                const savedMsg = await res.json();
                setMessages(prev => [...prev, savedMsg]);
            }
        } catch (error) {
            console.error("Erro ao enviar imagem:", error);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsUploadingImage(true);
            const reader = new FileReader();
            reader.onloadend = () => {
                handleSendImage(reader.result as string);
                setIsUploadingImage(false);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsUploadingImage(true);
            
            // Verificar se é imagem
            if (file.type.startsWith("image/")) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    handleSendImage(reader.result as string);
                    setIsUploadingImage(false);
                };
                reader.readAsDataURL(file);
            } else {
                // Para outros arquivos, enviar como arquivo
                const reader = new FileReader();
                reader.onloadend = () => {
                    handleSendFile(reader.result as string, file.name, file.type);
                    setIsUploadingImage(false);
                };
                reader.readAsDataURL(file);
            }
        }
    };

    const handleSendFile = async (fileData: string, fileName: string, fileType: string) => {
        if (!currentChatRef.current) return;

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: fileName,
                    conversationId: currentChatRef.current.id,
                    type: "FILE",
                    fileData,
                    fileName,
                    fileType
                })
            });

            if (res.ok) {
                const savedMsg = await res.json();
                setMessages(prev => [...prev, savedMsg]);
            }
        } catch (error) {
            console.error("Erro ao enviar arquivo:", error);
        }
    };

    const addEmoji = (emoji: string) => {
        setInput(prev => prev + emoji);
        setShowEmojiPicker(false);
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if ((!input.trim() && !replyTo) || !currentChat || !currentUser) return;

        const content = input;
        const currentId = currentChat.id;
        const msgType = "TEXT";
        const currentReplyTo = replyTo;

        setInput(""); // Clear immediately for better UX
        setReplyTo(null);
        setShowEmojiPicker(false);

        // Optimistic update
        const tempId = 'temp-' + Date.now();
        const optimisticMsg = {
            id: tempId,
            content,
            type: msgType,
            conversationId: currentId,
            senderId: currentUser.id,
            sender: currentUser,
            replyTo: currentReplyTo,
            createdAt: new Date().toISOString(),
            status: "SENT"
        };

        setMessages(prev => [...prev, optimisticMsg]);

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content,
                    conversationId: currentId,
                    type: msgType,
                    replyToId: currentReplyTo?.id
                })
            });

            if (res.ok) {
                const savedMsg = await res.json();
                setMessages(prev => prev.map(m => m.id === tempId ? savedMsg : m));
            } else {
                setMessages(prev => prev.filter(m => m.id !== tempId));
            }
        } catch (error) {
            console.error("Erro ao enviar mensagem:", error);
            setMessages(prev => prev.filter(m => m.id !== tempId));
        }
    };

    const handleSearch = async () => {
        setIsSearching(true);
        const res = await fetch(`/api/users/search?q=${searchQuery}`);
        if (res.ok) {
            const data = await res.json();
            setSearchResults(data);
        }
        setIsSearching(false);
    };

    const handleStartDirectChat = async (userId: string) => {
        const res = await fetch("/api/chat/direct", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ targetUserId: userId }),
        });

        if (res.ok) {
            const newChat = await res.json();
            // Check if this conversation already exists in the list
            const existingChat = conversations.find(c => c.id === newChat.id);
            if (!existingChat) {
                setConversations(prev => [newChat, ...prev]);
            }
            handleSelectChat(newChat);
            setSearchQuery(""); // Clear search after starting chat
        }
    };

    const toggleParticipant = (user: any) => {
        if (selectedParticipants.find(p => p.id === user.id)) {
            setSelectedParticipants(prev => prev.filter(p => p.id !== user.id));
        } else {
            setSelectedParticipants(prev => [...prev, user]);
        }
    };

    const handleHideConversation = async () => {
        if (!currentChat) return;

        const confirmed = window.confirm("Deseja realmente apagar esta conversa da sua tela? Ela continuará disponível para o administrador.");
        if (!confirmed) return;

        const res = await fetch(`/api/chat/${currentChat.id}/hide`, {
            method: "POST"
        });

        if (res.ok) {
            setConversations(prev => prev.filter(c => c.id !== currentChat.id));
            setCurrentChat(null);
            setMessages([]);
        } else {
            alert("Erro ao apagar conversa");
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64Audio = reader.result as string;
                    sendAudioMessage(base64Audio);
                };
                reader.readAsDataURL(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Não foi possível acessar o microfone.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const sendAudioMessage = async (base64Audio: string) => {
        if (!currentChat) return;

        const tempId = Date.now().toString();
        const optimisticMsg = {
            id: tempId,
            content: "🎤 Áudio",
            type: "AUDIO",
            audioUrl: base64Audio,
            senderId: currentUser.id,
            conversationId: currentChat.id,
            createdAt: new Date().toISOString(),
            status: "SENT",
            sender: { id: currentUser.id, name: currentUser.name, image: currentUser.image }
        };

        setMessages(prev => [...prev, optimisticMsg]);

        const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                conversationId: currentChat.id,
                content: "🎤 Áudio",
                type: "AUDIO",
                audioUrl: base64Audio
            })
        });

        if (res.ok) {
            const savedMsg = await res.json();
            setMessages(prev => prev.map(m => m.id === tempId ? savedMsg : m));
        } else {
            setMessages(prev => prev.filter(m => m.id !== tempId));
            alert("Erro ao enviar áudio");
        }
    };

    const handleCreateGroup = async () => {
        if (!groupName.trim() || selectedParticipants.length === 0) return;

        const res = await fetch("/api/chat/group", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: groupName,
                participantIds: selectedParticipants.map(p => p.id)
            })
        });

        if (res.ok) {
            const newGroup = await res.json();
            setConversations(prev => [newGroup, ...prev]);
            handleSelectChat(newGroup);
            setIsCreatingGroup(false);
            setGroupName("");
            setSelectedParticipants([]);
        }
    };

    const requestNotificationPermission = async () => {
        if (!("Notification" in window)) return;
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        if (permission === "granted") {
            new Notification("Notificações Ativadas!", {
                body: "Você receberá avisos de novas mensagens."
            });
        }
    };

    return (
        <div className="flex h-screen overflow-hidden text-[#e9edef]" style={{ backgroundColor: "#0b141a" }}>
            {/* Sidebar */}
            {/* container hides on mobile when closed, shows as fixed overlay when open */}
            <div className={`${isConversationsOpen ? 'md:flex' : 'hidden'} hidden w-1/3 max-w-[400px] border-r border-[#313d45] flex-col bg-[#111b21]`}>
                {/* Header */}
                <div className="p-3 bg-[#202c33] flex justify-between items-center">
                    <div
                        className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center cursor-pointer overflow-hidden border border-gray-600 hover:border-whatsapp-teal transition-all"
                        onClick={() => setIsProfileOpen(true)}
                    >
                        {currentUser?.image ? <img src={currentUser.image} alt="" className="w-full h-full object-cover" /> : <User size={24} className="text-gray-300" />}
                    </div>
                    <div className="flex space-x-2">
                        <button
                            className="p-2 text-[#aebac1] hover:bg-[#374248] rounded-full cursor-pointer transition-colors"
                            onClick={() => setIsCreatingGroup(true)}
                            title="Criar grupo"
                        >
                            <Plus size={20} />
                        </button>
                        <button
                            className="p-2 text-[#aebac1] hover:bg-[#374248] rounded-full transition-colors relative"
                            onClick={requestNotificationPermission}
                            title={notificationPermission === "granted" ? "Notificações Ativas" : "Ativar Notificações"}
                        >
                            {notificationPermission === "granted" ? (
                                <Bell size={20} className="text-whatsapp-teal" />
                            ) : (
                                <BellOff size={20} />
                            )}
                            {notificationPermission === "default" && (
                                <span className="absolute top-1 right-1 w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                            )}
                        </button>
                        <button
                            className="p-2 text-red-400 hover:bg-[#374248] rounded-full transition-colors"
                            onClick={() => {
                                fetch("/api/logout", { method: "POST" }).then(() => router.push("/login"));
                            }}
                            title="Sair"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="p-2 bg-[#111b21]">
                    <div className="flex items-center bg-[#202c33] rounded-lg px-3 py-1.5 focus-within:bg-[#2a3942] transition-colors">
                        <input
                            type="text"
                            placeholder="Pesquisar ou iniciar uma nova conversa"
                            className="bg-transparent border-none focus:ring-0 w-full text-sm text-[#e9edef] placeholder-[#8696a0]"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Conversas / Resultados */}
                <div className="flex-1 overflow-y-auto relative custom-scrollbar">
                    {/* Grupo Creation Overlay */}
                    {isCreatingGroup && (
                        <div className="absolute inset-0 bg-[#111b21] z-20 flex flex-col animate-in slide-in-from-left duration-300">
                            <div className="p-4 bg-[#202c33] text-[#e9edef] flex items-center space-x-6">
                                <X className="cursor-pointer hover:rotate-90 transition-transform" onClick={() => setIsCreatingGroup(false)} />
                                <h2 className="font-bold text-lg">Novo Grupo</h2>
                            </div>
                            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                                <input
                                    type="text"
                                    placeholder="Nome do grupo"
                                    className="w-full bg-transparent p-2 border-b-2 border-whatsapp-teal text-[#e9edef] focus:outline-none placeholder:text-gray-600"
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                />

                                {selectedParticipants.length > 0 && (
                                    <div className="flex flex-wrap gap-2 p-3 bg-[#202c33] rounded-xl border border-[#313d45]">
                                        {selectedParticipants.map(p => (
                                            <div key={p.id} className="bg-whatsapp-teal/20 text-whatsapp-teal px-3 py-1 rounded-full text-xs flex items-center space-x-2 border border-whatsapp-teal/30">
                                                <span className="font-medium">{p.name}</span>
                                                <X size={14} className="cursor-pointer hover:text-white" onClick={() => toggleParticipant(p)} />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <p className="text-[10px] font-bold text-whatsapp-teal uppercase tracking-widest">Contatos</p>
                                <div className="space-y-1">
                                    {(searchQuery ? searchResults : conversations
                                        .filter(c => !c.isGroup)
                                        .map(c => c.participants.find((p: any) => p.userId !== currentUser?.id)?.user)
                                        .filter(Boolean)
                                    ).map((user: any) => (
                                        <div
                                            key={user.id}
                                            onClick={() => toggleParticipant(user)}
                                            className={`flex items-center p-3 rounded-xl cursor-pointer transition-all ${selectedParticipants.find(p => p.id === user.id) ? 'bg-whatsapp-teal/10 border-[#00a884]' : 'hover:bg-[#202c33]'
                                                } border border-transparent`}
                                        >
                                            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center mr-3 overflow-hidden border border-[#313d45]">
                                                {user.image ? <img src={user.image} alt="" className="w-full h-full object-cover" /> : <User size={20} className="text-gray-400" />}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-semibold text-sm text-[#e9edef]">{user.name}</p>
                                                <p className="text-[11px] text-[#d1d7db] font-medium">@{user.username}</p>
                                            </div>
                                            {selectedParticipants.find(p => p.id === user.id) && <Check className="text-whatsapp-teal" size={18} />}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="p-4 bg-[#202c33] flex justify-center border-t border-[#313d45]">
                                <button
                                    onClick={handleCreateGroup}
                                    disabled={!groupName.trim() || selectedParticipants.length === 0}
                                    className="w-full py-3 bg-whatsapp-teal text-[#111b21] rounded-xl font-bold disabled:opacity-30 hover:bg-whatsapp-dark transition-all transform active:scale-95 shadow-lg flex items-center justify-center space-x-2"
                                >
                                    <Plus size={20} />
                                    <span>Criar Grupo</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {searchQuery ? (
                        <div className="animate-in fade-in duration-300">
                            <p className="p-4 text-[10px] font-bold text-whatsapp-teal uppercase tracking-widest">Resultados</p>
                            {searchResults.length > 0 ? (
                                searchResults.map((user) => (
                                    <div
                                        key={user.id}
                                        onClick={() => handleStartDirectChat(user.id)}
                                        className="flex items-center p-4 cursor-pointer hover:bg-[#202c33] transition-colors border-b border-[#222d34]"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center mr-4 overflow-hidden border border-[#313d45] relative">
                                            {user.image ? <img src={user.image} alt="" className="w-full h-full object-cover" /> : <User size={24} className="text-gray-400" />}
                                            <span className={`absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 border-[#111b21] ${user.status === "ONLINE" ? "bg-[#00a884]" : "bg-[#8696a0]"}`}></span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-[#e9edef]">{user.name}</h3>
                                            <p className="text-sm text-[#d1d7db] font-medium">@{user.username}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-10 text-center text-[#8696a0]">
                                    <p className="text-sm">Nenhum colaborador encontrado.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        conversations.map((chat) => {
                            const otherParticipant = chat.isGroup ? null : chat.participants.find((p: any) => p.userId !== currentUser?.id);
                            const isActive = currentChat?.id === chat.id;

                            return (
                                <div
                                    key={chat.id}
                                    onClick={() => handleSelectChat(chat)}
                                    className={`flex items-center p-3 cursor-pointer transition-all hover:bg-[#202c33] border-b border-[#222d34] ${isActive ? "bg-[#2a3942]" : ""}`}
                                >
                                    <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center mr-3 flex-shrink-0 overflow-hidden border border-[#313d45] relative">
                                        {chat.isGroup ? (
                                            <Hash size={24} className="text-gray-400" />
                                        ) : (
                                            otherParticipant?.user.image ? <img src={otherParticipant.user.image} alt="" className="w-full h-full object-cover" /> : <User size={24} className="text-gray-400" />
                                        )}
                                        {!chat.isGroup && (
                                            <span className={`absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 ${isActive ? "border-[#2a3942]" : "border-[#111b21]"} ${otherParticipant?.user.status === "ONLINE" ? "bg-[#00a884]" : "bg-transparent"}`}></span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center mb-0.5">
                                            <h3 className="font-semibold text-[#e9edef] truncate text-sm">
                                                {chat.isGroup ? chat.name : otherParticipant?.user.name}
                                            </h3>
                                            {chat.messages?.[0] && (
                                                <span className={`text-[10px] font-medium ${chat.unreadCount > 0 ? "text-[#00a884]" : "text-[#8696a0]"}`}>
                                                    {new Date(chat.messages[0].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <p className="text-[#d1d7db] text-xs truncate flex-1 leading-tight pr-2 font-medium">
                                                {chat.messages?.[0]?.content || "Inicie uma conversa"}
                                            </p>
                                            {chat.unreadCount > 0 && (
                                                <span className="bg-[#00a884] text-[#111b21] text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 shadow-sm animate-in zoom-in-50 duration-200">
                                                    {chat.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col relative bg-[#0b141a]">
                {/* mobile overlay for conversation list */}
                {isConversationsOpen && (
                    <div className="fixed inset-0 z-[999] md:hidden flex">
                        <div className="absolute inset-0 bg-black/50" onClick={() => setIsConversationsOpen(false)} />
                        <div className="relative w-full h-full bg-[#111b21] flex flex-col">
                            {/* replicate sidebar content */}
                            {/* Header */}
                            <div className="p-3 bg-[#202c33] flex justify-between items-center">
                                <div
                                    className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center cursor-pointer overflow-hidden border border-gray-600 hover:border-whatsapp-teal transition-all"
                                    onClick={() => { setIsConversationsOpen(false); setIsProfileOpen(true); }}
                                >
                                    {currentUser?.image ? <img src={currentUser.image} alt="" className="w-full h-full object-cover" /> : <User size={24} className="text-gray-300" />}
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        className="p-2 text-[#aebac1] hover:bg-[#374248] rounded-full cursor-pointer transition-colors"
                                        onClick={() => setIsCreatingGroup(true)}
                                        title="Criar grupo"
                                    >
                                        <Plus size={20} />
                                    </button>
                                    <button
                                        className="p-2 text-[#aebac1] hover:bg-[#374248] rounded-full transition-colors relative"
                                        onClick={requestNotificationPermission}
                                        title={notificationPermission === "granted" ? "Notificações Ativas" : "Ativar Notificações"}
                                    >
                                        {notificationPermission === "granted" ? (
                                            <Bell size={20} className="text-whatsapp-teal" />
                                        ) : (
                                            <BellOff size={20} />
                                        )}
                                        {notificationPermission === "default" && (
                                            <span className="absolute top-1 right-1 w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                                        )}
                                    </button>
                                    <button
                                        className="p-2 text-red-400 hover:bg-[#374248] rounded-full transition-colors"
                                        onClick={() => {
                                            fetch("/api/logout", { method: "POST" }).then(() => router.push("/login"));
                                        }}
                                        title="Sair"
                                    >
                                        <LogOut size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Search Bar */}
                            <div className="p-2 bg-[#111b21]">
                                <div className="flex items-center bg-[#202c33] rounded-lg px-3 py-1.5 focus-within:bg-[#2a3942] transition-colors">
                                    <input
                                        type="text"
                                        placeholder="Pesquisar ou iniciar uma nova conversa"
                                        className="bg-transparent border-none focus:ring-0 w-full text-sm text-[#e9edef] placeholder-[#8696a0]"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Conversas / Resultados */}
                            <div className="flex-1 overflow-y-auto relative custom-scrollbar">
                                {isCreatingGroup && (
                                    <div className="absolute inset-0 bg-[#111b21] z-20 flex flex-col animate-in slide-in-from-left duration-300">
                                        {/* group creation overlay (same as sidebar) */}
                                        <div className="p-4 bg-[#202c33] text-[#e9edef] flex items-center space-x-6">
                                            <X className="cursor-pointer hover:rotate-90 transition-transform" onClick={() => setIsCreatingGroup(false)} />
                                            <h2 className="font-bold text-lg">Novo Grupo</h2>
                                        </div>
                                        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                                            <input
                                                type="text"
                                                placeholder="Nome do grupo"
                                                className="w-full bg-transparent p-2 border-b-2 border-whatsapp-teal text-[#e9edef] focus:outline-none placeholder:text-gray-600"
                                                value={groupName}
                                                onChange={(e) => setGroupName(e.target.value)}
                                            />
                                            {selectedParticipants.length > 0 && (
                                                <div className="flex flex-wrap gap-2 p-3 bg-[#202c33] rounded-xl border border-[#313d45]">
                                                    {selectedParticipants.map(p => (
                                                        <div key={p.id} className="bg-whatsapp-teal/20 text-whatsapp-teal px-3 py-1 rounded-full text-xs flex items-center space-x-2 border border-whatsapp-teal/30">
                                                            <span className="font-medium">{p.name}</span>
                                                            <X size={14} className="cursor-pointer hover:text-white" onClick={() => toggleParticipant(p)} />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <p className="text-[10px] font-bold text-whatsapp-teal uppercase tracking-widest">Contatos</p>
                                            <div className="space-y-1">
                                                {(searchQuery ? searchResults : conversations
                                                    .filter(c => !c.isGroup)
                                                    .map(c => c.participants.find((p: any) => p.userId !== currentUser?.id)?.user)
                                                    .filter(Boolean)
                                                ).map((user: any) => (
                                                    <div
                                                        key={user.id}
                                                        onClick={() => toggleParticipant(user)}
                                                        className={`flex items-center p-3 rounded-xl cursor-pointer transition-all ${selectedParticipants.find(p => p.id === user.id) ? 'bg-whatsapp-teal/10 border-[#00a884]' : 'hover:bg-[#202c33]'
                                                            } border border-transparent`}
                                                    >
                                                        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center mr-3 overflow-hidden border border-[#313d45]">
                                                            {user.image ? <img src={user.image} alt="" className="w-full h-full object-cover" /> : <User size={20} className="text-gray-400" />}
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="font-semibold text-sm text-[#e9edef]">{user.name}</p>
                                                            <p className="text-[11px] text-[#d1d7db] font-medium">@{user.username}</p>
                                                        </div>
                                                        {selectedParticipants.find(p => p.id === user.id) && <Check className="text-whatsapp-teal" size={18} />}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="p-4 bg-[#202c33] flex justify-center border-t border-[#313d45]">
                                            <button
                                                onClick={handleCreateGroup}
                                                disabled={!groupName.trim() || selectedParticipants.length === 0}
                                                className="w-full py-3 bg-whatsapp-teal text-[#111b21] rounded-xl font-bold disabled:opacity-30 hover:bg-whatsapp-dark transition-all transform active:scale-95 shadow-lg flex items-center justify-center space-x-2"
                                            >
                                                <Plus size={20} />
                                                <span>Criar Grupo</span>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {searchQuery ? (
                                    <div className="animate-in fade-in duration-300">
                                        <p className="p-4 text-[10px] font-bold text-whatsapp-teal uppercase tracking-widest">Resultados</p>
                                        {searchResults.length > 0 ? (
                                            searchResults.map((user) => (
                                                <div
                                                    key={user.id}
                                                    onClick={() => handleStartDirectChat(user.id)}
                                                    className="flex items-center p-4 cursor-pointer hover:bg-[#202c33] transition-colors border-b border-[#222d34]"
                                                >
                                                    <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center mr-4 overflow-hidden border border-[#313d45] relative">
                                                        {user.image ? <img src={user.image} alt="" className="w-full h-full object-cover" /> : <User size={24} className="text-gray-400" />}
                                                        <span className={`absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 border-[#111b21] ${user.status === "ONLINE" ? "bg-[#00a884]" : "bg-[#8696a0]"}`}></span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-bold text-[#e9edef]">{user.name}</h3>
                                                        <p className="text-sm text-[#d1d7db] font-medium">@{user.username}</p>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-10 text-center text-[#8696a0]">
                                                <p className="text-sm">Nenhum colaborador encontrado.</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    conversations.map((chat) => {
                                        const otherParticipant = chat.isGroup ? null : chat.participants.find((p: any) => p.userId !== currentUser?.id);
                                        const isActive = currentChat?.id === chat.id;

                                        return (
                                            <div
                                                key={chat.id}
                                                onClick={() => handleSelectChat(chat)}
                                                className={`flex items-center p-3 cursor-pointer transition-all hover:bg-[#202c33] border-b border-[#222d34] ${isActive ? "bg-[#2a3942]" : ""}`}
                                            >
                                                <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center mr-3 flex-shrink-0 overflow-hidden border border-[#313d45] relative">
                                                    {chat.isGroup ? (
                                                        <Hash size={24} className="text-gray-400" />
                                                    ) : (
                                                        otherParticipant?.user.image ? <img src={otherParticipant.user.image} alt="" className="w-full h-full object-cover" /> : <User size={24} className="text-gray-400" />
                                                    )}
                                                    {!chat.isGroup && (
                                                        <span className={`absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 ${isActive ? "border-[#2a3942]" : "border-[#111b21]"} ${otherParticipant?.user.status === "ONLINE" ? "bg-[#00a884]" : "bg-transparent"}`}></span>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-center mb-0.5">
                                                        <h3 className="font-semibold text-[#e9edef] truncate text-sm">
                                                            {chat.isGroup ? chat.name : otherParticipant?.user.name}
                                                        </h3>
                                                        {chat.messages?.[0] && (
                                                            <span className={`text-[10px] font-medium ${chat.unreadCount > 0 ? "text-[#00a884]" : "text-[#8696a0]"}`}>
                                                                {chat.unreadCount}
                                                            </span>
                                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    }))}
                </div>
            </div>
        </div>
    )}
{currentChat ? (
    <>
        {/* Chat Header */}
                        <div className="p-3 bg-[#202c33] border-b border-[#111b21] flex items-center text-[#e9edef] shadow-sm z-10">
                            <button
                                onClick={toggleSidebar}
                                className="p-2 text-[#aebac1] hover:bg-[#374248] rounded-full transition-colors mr-3"
                                title={isConversationsOpen ? "Fechar barra lateral" : "Abrir barra lateral"}
                            >
                                {isConversationsOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
                            </button>
                            <div
                                className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center mr-4 overflow-hidden border border-[#313d45] relative cursor-pointer"
                                onClick={() => currentChat.isGroup && setIsGroupInfoOpen(true)}
                            >
                                {currentChat.isGroup ? (
                                    <Hash size={20} className="text-gray-400" />
                                ) : (
                                    (() => {
                                        const op = currentChat.participants.find((p: any) => p.userId !== currentUser?.id);
                                        return op?.user.image ? <img src={op.user.image} alt="" className="w-full h-full object-cover" /> : <User size={20} className="text-gray-400" />;
                                    })()
                                )}
                            </div>
                            <div className="flex-1 cursor-pointer" onClick={() => currentChat.isGroup && setIsGroupInfoOpen(true)}>
                                <h2 className="font-bold text-sm leading-tight text-[#e9edef]">
                                    {currentChat.isGroup ? currentChat.name : currentChat.participants.find((p: any) => p.userId !== currentUser?.id)?.user.name}
                                </h2>
                                {currentChat.isGroup ? (
                                    <p className="text-[10px] text-[#8696a0] font-medium">
                                        {currentChat.participants.length} participantes
                                    </p>
                                ) : (
                                    <p className={`text-[10px] font-bold uppercase tracking-wider ${currentChat.participants.find((p: any) => p.userId !== currentUser?.id)?.user.status === "ONLINE" ? "text-[#00a884]" : "text-[#8696a0]"}`}>
                                        {currentChat.participants.find((p: any) => p.userId !== currentUser?.id)?.user.status === "ONLINE" ? "Online" : "Offline"}
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center space-x-1">
                                {currentChat.isGroup && (
                                    <button
                                        onClick={() => setIsGroupInfoOpen(true)}
                                        className="p-2 text-[#aebac1] hover:bg-[#374248] rounded-full transition-colors"
                                        title="Informações do Grupo"
                                    >
                                        <Info size={18} />
                                    </button>
                                )}
                                <button
                                    onClick={handleHideConversation}
                                    className="p-2 text-[#aebac1] hover:bg-[#374248] rounded-full transition-colors flex items-center space-x-1 group"
                                    title="Apagar Conversa (Apenas para você)"
                                >
                                    <Trash2 size={18} className="group-hover:text-red-400" />
                                </button>
                                <button
                                    onClick={closeChat}
                                    className="p-2 text-[#aebac1] hover:bg-[#374248] rounded-full transition-colors ml-1"
                                    title="Fechar conversa (ESC)"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-opacity-5">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    id={`msg-${msg.id}`}
                                    className={`flex ${msg.senderId === currentUser?.id ? "justify-end" : "justify-start"}`}
                                >
                                    <div
                                        className={`relative group max-w-[75%] md:max-w-[65%] px-3 py-1.5 rounded-xl shadow-sm animate-in fade-in duration-200 ${msg.senderId === currentUser?.id
                                            ? "bg-[#005c4b] text-[#e9edef] rounded-tr-none"
                                            : "bg-[#202c33] text-[#e9edef] rounded-tl-none"
                                            }`}
                                    >
                                        {/* action menu when reply chevron clicked */}
                                        {actionMessageId === msg.id && (
                                            <div className="absolute top-0 right-0 bg-[#202c33] rounded-md shadow-lg p-1 flex space-x-1 z-20 action-menu">
                                                <button
                                                    onClick={() => { setReplyTo(msg); setActionMessageId(null); }}
                                                    title="Responder"
                                                    className="p-1"
                                                >
                                                    <ChevronDown size={16} />
                                                </button>
                                                {msg.senderId === currentUser?.id && !msg.deleted && (
                                                    <>
                                                        <button
                                                            onClick={() => { handleStartEdit(msg); setActionMessageId(null); }}
                                                            title="Editar"
                                                            className="p-1"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => { handleDeleteMessage(msg); setActionMessageId(null); }}
                                                            title="Apagar"
                                                            className="p-1"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                        {msg.senderId !== currentUser?.id && (
                                            <p className="text-[11px] font-bold text-[#ff8c00] mb-0.5 leading-none px-0.5">
                                                {msg.sender?.name}
                                            </p>
                                        )}

                                        <div className="flex flex-col space-y-1">
                                            {msg.replyTo && (
                                                <div
                                                    className={`mb-1 p-2 rounded-lg border-l-4 text-xs cursor-pointer bg-black/10 border-whatsapp-teal/50`}
                                                    onClick={() => {
                                                        const el = document.getElementById(`msg-${msg.replyToId}`);
                                                        if (!el) return;
                                                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                        // Remove class first to allow re-triggering animation
                                                        el.classList.remove('reply-highlight');
                                                        void el.offsetWidth; // Force reflow
                                                        el.classList.add('reply-highlight');
                                                        setTimeout(() => el.classList.remove('reply-highlight'), 1600);
                                                    }}
                                                >
                                                    <p className="font-bold text-whatsapp-teal mb-0.5">{msg.replyTo.sender?.name}</p>
                                                    <p className="opacity-70 truncate line-clamp-2">{msg.replyTo.content}</p>
                                                </div>
                                            )}

                                            {editingMessageId === msg.id ? (
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        className="flex-1 bg-[#0b141a] text-[#e9edef] border border-[#313d45] rounded px-2 py-1"
                                                        value={editingContent}
                                                        onChange={e => setEditingContent(e.target.value)}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSaveEdit(msg)}
                                                        className="p-2 bg-whatsapp-teal/20 hover:bg-whatsapp-teal/40 rounded text-white"
                                                        title="Salvar"
                                                    >
                                                        <Check size={20} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleCancelEdit}
                                                        className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded text-red-400"
                                                        title="Cancelar"
                                                    >
                                                        <X size={20} />
                                                    </button>
                                                </div>
                                            ) : msg.type === "AUDIO" ? (
                                                <div className="flex items-center space-x-3 py-2 min-w-[200px]">
                                                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2 border-whatsapp-teal/30 shadow-sm relative">
                                                        {msg.sender?.image ? <img src={msg.sender.image} alt="" className="w-full h-full object-cover" /> : <User size={20} className="text-gray-400 p-1.5" />}
                                                        <div className="absolute -bottom-1 -right-1 bg-[#202c33] rounded-full p-0.5">
                                                            <Mic size={10} className="text-whatsapp-teal" />
                                                        </div>
                                                    </div>
                                                    <div className="flex-1">
                                                        <audio
                                                            src={msg.audioUrl}
                                                            controls
                                                            className="h-8 max-w-[180px] filter invert opacity-80 current-audio"
                                                        />
                                                    </div>
                                                </div>
                                            ) : msg.type === "IMAGE" ? (
                                                <div className="py-1 group/img relative">
                                                    <div
                                                        className="rounded-lg overflow-hidden border border-black/10 shadow-sm max-w-[300px] cursor-pointer relative"
                                                        onClick={() => setChatLightboxImage(msg.imageUrl)}
                                                    >
                                                        <img src={msg.imageUrl} alt="Anexo" className="w-full h-auto object-cover max-h-[300px] hover:scale-[1.02] transition-transform duration-300" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center gap-3 transition-opacity">
                                                            <div className="p-2 bg-black/50 rounded-full">
                                                                <ZoomIn size={20} className="text-white" />
                                                            </div>
                                                            <a
                                                                href={msg.imageUrl}
                                                                download={`imagem-${msg.id}.png`}
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="p-2 bg-whatsapp-teal text-white rounded-full hover:bg-whatsapp-dark transition-all transform hover:scale-110"
                                                                title="Baixar imagem"
                                                            >
                                                                <Download size={20} />
                                                            </a>
                                                        </div>
                                                    </div>
                                                    {msg.content && msg.content !== "📷 Foto" && (
                                                        <p className="text-[15px] leading-relaxed break-words py-1.5 font-medium">
                                                            {msg.content}
                                                        </p>
                                                    )}
                                                </div>
                                            ) : msg.type === "FILE" ? (
                                                <a
                                                    href={msg.fileData}
                                                    download={msg.fileName || "arquivo"}
                                                    className="flex items-center gap-3 bg-whatsapp-teal/10 hover:bg-whatsapp-teal/20 rounded-lg px-3 py-2.5 transition-colors max-w-[280px]"
                                                >
                                                    <div className="flex-shrink-0 w-10 h-10 bg-whatsapp-teal/20 rounded-lg flex items-center justify-center">
                                                        <Paperclip size={20} className="text-whatsapp-teal" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold truncate text-[#e9edef]">
                                                            {msg.fileName || "Arquivo"}
                                                        </p>
                                                        <p className="text-xs text-gray-400 truncate">
                                                            {msg.fileType || "Arquivo"}
                                                        </p>
                                                    </div>
                                                    <Download size={18} className="flex-shrink-0 text-whatsapp-teal" />
                                                </a>
                                            ) : (
                                                <div className="flex flex-wrap items-end gap-x-3">
                                                    <p className="text-[15px] leading-relaxed flex-1 break-words py-0.5 font-medium">
                                                        {msg.content}
                                                    </p>
                                                </div>
                                            )}

                                            <div className="flex items-center space-x-1 shrink-0 self-end mb-0.5 ml-auto">
                                                <span className="text-[10px] text-[#d1d7db] tabular-nums font-bold">
                                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                {msg.editedAt && (
                                                    <span className="text-[10px] text-gray-400 italic ml-1">(editado)</span>
                                                )}
                                                {msg.senderId === currentUser?.id && (
                                                    <div className={msg.status === "READ" ? "text-[#53bdeb]" : "text-[#8696a0]"}>
                                                        {msg.status === "READ" ? (
                                                            <CheckCheck size={14} />
                                                        ) : (
                                                            <Check size={14} />
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Chevron Action Menu Toggle */}
                                            <button
                                                onClick={() => toggleActionMenu(msg.id)}
                                                className="absolute top-1 right-1 p-1 text-[#8696a0] hover:text-[#e9edef] opacity-0 group-hover:opacity-100 transition-opacity bg-[#202c33]/80 rounded-lg shadow-sm z-10 reply-chevron"
                                                title="Ações"
                                            >
                                                <ChevronDown size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Reply Preview */}
                        {replyTo && (
                            <div className="mx-3 mt-2 p-3 bg-[#1d282f] rounded-t-xl border-l-4 border-whatsapp-teal animate-in slide-in-from-bottom-2 duration-200 flex justify-between items-center shadow-lg">
                                <div className="min-w-0 pr-4">
                                    <p className="text-whatsapp-teal text-xs font-bold mb-0.5">{replyTo.sender?.name}</p>
                                    <p className="text-[#8696a0] text-xs truncate">{replyTo.content}</p>
                                </div>
                                <button onClick={() => setReplyTo(null)} className="p-1.5 text-[#8696a0] hover:text-white transition-colors bg-[#2a3942] rounded-full">
                                    <X size={14} />
                                </button>
                            </div>
                        )}

                        {/* Input Area */}
                        <div className="p-3 bg-[#202c33] flex flex-col z-20 transition-all border-t border-[#313d45]">
                            {showEmojiPicker && (
                                <div className="absolute bottom-[80px] left-4 bg-[#233138] p-3 rounded-2xl shadow-2xl border border-[#3b4a54] animate-in zoom-in-95 duration-200 grid grid-cols-8 gap-2 z-[60] max-h-[200px] overflow-y-auto custom-scrollbar">
                                    {["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😋", "😛", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈", "👿", "👹", "👺", "🤡", "👻", "💀", "☠️", "👽", "👾", "🤖", "🎃", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾"].map(emoji => (
                                        <button key={emoji} onClick={() => addEmoji(emoji)} className="text-2xl hover:bg-[#3b4a54] p-1 rounded-lg transition-colors scale-hover">
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center space-x-2">
                                {!isRecording ? (
                                    <>
                                        <div className="flex items-center space-x-1">
                                            <button
                                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                                className={`p-2.5 transition-colors rounded-full ${showEmojiPicker ? 'text-whatsapp-teal bg-[#2a3942]' : 'text-[#8696a0] hover:text-[#e9edef]'}`}
                                            >
                                                <Smile size={24} />
                                            </button>
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="p-2.5 text-[#8696a0] hover:text-[#e9edef] transition-colors rounded-full"
                                                title="Anexar arquivo ou imagem"
                                            >
                                                <Paperclip size={24} />
                                            </button>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                onChange={handleFileUpload}
                                            />
                                        </div>

                                        <div className="flex-1 bg-[#2a3942] rounded-xl px-4 py-2.5 border border-transparent focus-within:border-whatsapp-teal/20 transition-all flex items-center shadow-inner">
                                            <input
                                                type="text"
                                                placeholder="Digite uma mensagem"
                                                className="w-full bg-transparent border-none text-lg focus:ring-0 outline-none text-white placeholder-[#8696a0] font-medium caret-white"
                                                value={input}
                                                onChange={(e) => setInput(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" && !e.shiftKey) {
                                                        e.preventDefault();
                                                        handleSendMessage(e);
                                                    }
                                                }}
                                            />
                                        </div>

                                        {(input.trim() || replyTo) ? (
                                            <button onClick={() => handleSendMessage()} className="bg-whatsapp-teal text-[#111b21] p-3 rounded-full hover:bg-whatsapp-dark transition-all flex-shrink-0 shadow-lg active:scale-95 animate-in zoom-in duration-200">
                                                <Send size={24} />
                                            </button>
                                        ) : (
                                            <button onClick={startRecording} className="p-3 text-[#8696a0] hover:text-whatsapp-teal hover:bg-[#2a3942] rounded-full transition-all flex-shrink-0">
                                                <Mic size={24} />
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex-1 flex items-center justify-between bg-[#2a3942] rounded-xl px-4 py-3 animate-in slide-in-from-bottom-2 duration-300 shadow-lg">
                                        <div className="flex items-center space-x-3">
                                            <div className="flex space-x-1 items-center">
                                                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
                                                <span className="text-red-500 text-sm font-bold tabular-nums">
                                                    {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}
                                                </span>
                                            </div>
                                            <span className="text-[#8696a0] text-sm font-bold">Gravando...</span>
                                        </div>
                                        <button onClick={stopRecording} className="bg-red-500 text-white p-2.5 rounded-full hover:bg-red-600 transition-all flex-shrink-0 flex items-center justify-center shadow-lg active:scale-90">
                                            <Square size={20} fill="white" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 relative">
                        {/* Mobile sidebar toggle button */}
                        <button
                            onClick={toggleSidebar}
                            className="absolute top-4 left-4 md:hidden p-2 text-[#aebac1] hover:bg-[#374248] rounded-full transition-colors"
                            title={isConversationsOpen ? "Fechar barra lateral" : "Abrir barra lateral"}
                        >
                            {isConversationsOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
                        </button>
                        
                        <div className="w-32 h-32 rounded-full bg-[#202c33] flex items-center justify-center mb-6 shadow-xl border border-[#313d45] overflow-hidden">
                            <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity p-2" />
                        </div>
                        <h2 className="text-3xl font-bold text-[#e9edef] mb-3">Chat Corporativo</h2>
                        <p className="text-[#8696a0] max-w-sm text-sm">
                            Selecione uma conversa ou inicie um novo chat com seus colaboradores para começar a se comunicar.
                        </p>
                        <div className="mt-10 flex items-center text-[#8696a0] text-xs">
                            <Shield size={14} className="mr-2" />
                            <span>Criptografado de ponta-a-ponta</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Perfil */}
            {
                isProfileOpen && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                        <div className="bg-[#2a3942] rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 fade-in duration-300 overflow-hidden border border-[#3b4a54]">
                            <div className="p-6 border-b border-[#3b4a54] flex justify-between items-center bg-[#202c33]">
                                <div>
                                    <h3 className="font-bold text-xl text-[#e9edef]">Meu Perfil</h3>
                                    <p className="text-xs text-[#8696a0]">Personalize sua conta</p>
                                </div>
                                <button onClick={() => setIsProfileOpen(false)} className="p-2 text-[#aebac1] hover:bg-[#3b4a54] rounded-full transition-colors">
                                    <X size={24} />
                                </button>
                            </div>
                            <form onSubmit={handleUpdateProfile} className="p-6 space-y-6">
                                <div className="flex flex-col items-center">
                                    <div className="w-28 h-28 rounded-full bg-gray-700 mb-4 flex items-center justify-center overflow-hidden border-4 border-whatsapp-teal/30 shadow-2xl group relative cursor-pointer">
                                        {profileData.image ? <img src={profileData.image} alt="" className="w-full h-full object-cover" /> : <User size={56} className="text-gray-500" />}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                            <Edit2 size={24} className="text-white" />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-center text-[#8696a0] font-bold uppercase tracking-widest px-8">Essa imagem será visível para todos os seus colegas de trabalho</p>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-whatsapp-teal uppercase mb-1.5 tracking-wider">Nome de Exibição</label>
                                        <input
                                            value={profileData.name}
                                            onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                                            className="w-full bg-[#111b21] border border-[#3b4a54] p-3.5 rounded-xl text-[#e9edef] focus:ring-2 focus:ring-whatsapp-teal focus:border-transparent outline-none transition-all"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-whatsapp-teal uppercase mb-1.5 tracking-wider">Foto de Perfil</label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            className="w-full bg-[#111b21] border border-[#3b4a54] p-2 rounded-xl text-[#e9edef] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-whatsapp-teal file:text-[#111b21] hover:file:bg-whatsapp-dark cursor-pointer"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-whatsapp-teal text-[#111b21] py-4 rounded-xl font-bold hover:bg-whatsapp-dark mt-6 shadow-xl transition-all transform active:scale-95 flex items-center justify-center space-x-3"
                                >
                                    {loading ? (
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-current"></div>
                                    ) : (
                                        <>
                                            <Check size={20} />
                                            <span>Confirmar Alterações</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                )
            }


            {/* Group Info Panel */}
            {isGroupInfoOpen && currentChat?.isGroup && (() => {
                const myParticipant = currentChat.participants.find((p: any) => p.userId === currentUser?.id);
                const iAmAdmin = currentUser?.role === "ADMIN" || myParticipant?.isAdmin === true;

                const handleSearchGroupMember = async (q: string) => {
                    setGroupMemberSearch(q);
                    if (q.trim().length < 2) { setGroupMemberResults([]); return; }
                    const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
                    if (res.ok) {
                        const all = await res.json();
                        const existingIds = new Set(currentChat.participants.map((p: any) => p.userId));
                        setGroupMemberResults(all.filter((u: any) => !existingIds.has(u.id)));
                    }
                };

                const handleAddMember = async (userId: string) => {
                    const res = await fetch(`/api/chat/${currentChat.id}/members`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ userId })
                    });
                    if (res.ok) {
                        const newParticipant = await res.json();
                        setCurrentChat((prev: any) => ({ ...prev, participants: [...prev.participants, newParticipant] }));
                        setGroupMemberSearch("");
                        setGroupMemberResults([]);
                    } else {
                        alert("Erro ao adicionar membro.");
                    }
                };

                const handleRemoveMember = async (userId: string) => {
                    if (!confirm("Remover este membro do grupo?")) return;
                    const res = await fetch(`/api/chat/${currentChat.id}/members`, {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ userId })
                    });
                    if (res.ok) {
                        setCurrentChat((prev: any) => ({ ...prev, participants: prev.participants.filter((p: any) => p.userId !== userId) }));
                    } else {
                        const err = await res.json();
                        alert(err.error || "Erro ao remover membro.");
                    }
                };

                return (
                    <div className="fixed inset-0 z-[150] flex justify-end">
                        {/* Backdrop */}
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setIsGroupInfoOpen(false); setGroupMemberSearch(""); setGroupMemberResults([]); }} />
                        {/* Panel */}
                        <div className="relative w-full max-w-sm bg-[#111b21] h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 overflow-y-auto">
                            {/* Header */}
                            <div className="bg-[#202c33] p-4 flex items-center space-x-3 border-b border-[#313d45]">
                                <button onClick={() => { setIsGroupInfoOpen(false); setGroupMemberSearch(""); setGroupMemberResults([]); }} className="p-2 text-[#aebac1] hover:bg-[#374248] rounded-full">
                                    <X size={20} />
                                </button>
                                <h3 className="font-bold text-[#e9edef] text-lg">Informações do Grupo</h3>
                            </div>

                            {/* Group Identity */}
                            <div className="flex flex-col items-center py-8 border-b border-[#222d34] bg-[#0b141a]">
                                <div className="w-24 h-24 rounded-full bg-[#202c33] flex items-center justify-center mb-3 border-2 border-[#313d45]">
                                    <Hash size={40} className="text-whatsapp-teal" />
                                </div>
                                <h2 className="text-xl font-bold text-[#e9edef]">{currentChat.name}</h2>
                                <p className="text-sm text-[#8696a0] mt-1">{currentChat.participants.length} participantes</p>
                            </div>

                            {/* Add Member (admin only) */}
                            {iAmAdmin && (
                                <div className="p-4 border-b border-[#222d34]">
                                    <p className="text-[10px] font-bold text-whatsapp-teal uppercase tracking-widest mb-2">Adicionar Membro</p>
                                    <div className="flex items-center bg-[#2a3942] rounded-xl px-3 py-2 space-x-2">
                                        <UserPlus size={16} className="text-[#8696a0]" />
                                        <input
                                            type="text"
                                            placeholder="Buscar colaborador..."
                                            value={groupMemberSearch}
                                            onChange={(e) => handleSearchGroupMember(e.target.value)}
                                            className="bg-transparent text-[#e9edef] text-sm outline-none flex-1 placeholder-[#8696a0] caret-white"
                                        />
                                    </div>
                                    {groupMemberResults.length > 0 && (
                                        <div className="mt-2 bg-[#202c33] rounded-xl overflow-hidden border border-[#313d45]">
                                            {groupMemberResults.map((u: any) => (
                                                <div
                                                    key={u.id}
                                                    onClick={() => handleAddMember(u.id)}
                                                    className="flex items-center p-3 cursor-pointer hover:bg-[#2a3942] transition-colors gap-3"
                                                >
                                                    <div className="w-9 h-9 rounded-full bg-gray-700 overflow-hidden border border-[#313d45] flex-shrink-0">
                                                        {u.image ? <img src={u.image} alt="" className="w-full h-full object-cover" /> : <User size={18} className="text-gray-400 m-auto mt-1.5" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-[#e9edef] truncate">{u.name}</p>
                                                        <p className="text-xs text-[#8696a0]">@{u.username}</p>
                                                    </div>
                                                    <Plus size={16} className="text-whatsapp-teal flex-shrink-0" />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Participants List */}
                            <div className="p-4 flex-1">
                                <p className="text-[10px] font-bold text-whatsapp-teal uppercase tracking-widest mb-3">
                                    {currentChat.participants.length} Participantes
                                </p>
                                <div className="space-y-1">
                                    {currentChat.participants.map((p: any) => {
                                        const isCreator = currentChat.createdById === p.userId;
                                        const isParticipantAdmin = p.isAdmin;
                                        const canRemove = iAmAdmin && p.userId !== currentUser?.id && !isCreator;
                                        return (
                                            <div key={p.id} className="flex items-center p-3 rounded-xl hover:bg-[#202c33] transition-colors gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden border border-[#313d45] flex-shrink-0 relative">
                                                    {p.user?.image ? <img src={p.user.image} alt="" className="w-full h-full object-cover" /> : <User size={20} className="text-gray-400 m-auto mt-2.5" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <p className="text-sm font-semibold text-[#e9edef] truncate">{p.user?.name}</p>
                                                        {isCreator && <span title="Criador do grupo"><Crown size={12} className="text-yellow-400 flex-shrink-0" /></span>}
                                                        {isParticipantAdmin && !isCreator && <span title="Admin do grupo"><Shield size={12} className="text-whatsapp-teal flex-shrink-0" /></span>}
                                                    </div>
                                                    <p className="text-xs text-[#8696a0]">{p.user?.status === "ONLINE" ? "Online" : "Offline"}</p>
                                                </div>
                                                {canRemove && (
                                                    <button
                                                        onClick={() => handleRemoveMember(p.userId)}
                                                        className="p-1.5 text-[#8696a0] hover:text-red-400 hover:bg-red-400/10 rounded-full transition-all"
                                                        title="Remover do grupo"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
            {/* Chat Image Lightbox */}
            {chatLightboxImage && (
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-150"
                    onClick={() => setChatLightboxImage(null)}
                >
                    <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => setChatLightboxImage(null)}
                            className="absolute -top-11 right-0 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X size={24} />
                        </button>
                        <a
                            href={chatLightboxImage}
                            download="imagem"
                            className="absolute -top-11 right-12 flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-full transition-colors"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Download size={14} />
                            Baixar
                        </a>
                        <img
                            src={chatLightboxImage}
                            alt="Visualizar imagem"
                            className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl"
                        />
                    </div>
                </div>
            )}
        </div >
    );
}
