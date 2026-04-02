"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import { Edit2, Trash2, Eye, X, MessageSquare, User as UserIcon, Shield, Check, Users, Download, ZoomIn, Play, Pause, Paperclip } from "lucide-react";

let socket: any;

// Componente customizado de player de áudio estilo WhatsApp
function AudioPlayer({ src }: { src: string }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);

    const handlePlayPause = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateTime = () => setCurrentTime(audio.currentTime);
        const updateDuration = () => setDuration(audio.duration || 0);
        const handleEnded = () => setIsPlaying(false);

        audio.addEventListener("timeupdate", updateTime);
        audio.addEventListener("loadedmetadata", updateDuration);
        audio.addEventListener("ended", handleEnded);

        return () => {
            audio.removeEventListener("timeupdate", updateTime);
            audio.removeEventListener("loadedmetadata", updateDuration);
            audio.removeEventListener("ended", handleEnded);
        };
    }, []);

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!audioRef.current || !duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        audioRef.current.currentTime = percent * duration;
    };

    const formatTime = (time: number) => {
        if (!time || isNaN(time)) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };

    return (
        <div className="w-full bg-whatsapp-teal/80 rounded-2xl p-3 flex items-center gap-2 shadow-md">
            <audio ref={audioRef} src={src} onEnded={() => setIsPlaying(false)} />

            {/* Botão Play/Pause */}
            <button
                onClick={handlePlayPause}
                className="flex-shrink-0 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
            >
                {isPlaying ? (
                    <Pause size={18} className="fill-current" />
                ) : (
                    <Play size={18} className="ml-0.5 fill-current" />
                )}
            </button>

            {/* Barra de Progresso com Waveform */}
            <div
                onClick={handleProgressClick}
                className="flex-1 h-6 bg-white/20 rounded-full cursor-pointer group relative overflow-hidden flex items-center min-w-0"
            >
                {/* Waveform Visual */}
                <div className="absolute inset-0 flex items-center justify-center gap-0.5 px-2">
                    {[...Array(25)].map((_, i) => (
                        <div
                            key={i}
                            className="w-0.5 bg-white/40 rounded-full flex-1"
                            style={{
                                height: `${15 + Math.sin(i / 4) * 10}%`,
                            }}
                        />
                    ))}
                </div>

                {/* Barra de Progresso */}
                <div
                    className="absolute left-0 top-0 h-full bg-blue-400 rounded-full transition-all"
                    style={{ width: duration ? `${(currentTime / duration) * 100}%` : "0%" }}
                />

                {/* Indicador de Progresso */}
                {duration > 0 && (
                    <div
                        className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-blue-400 rounded-full shadow-lg z-10"
                        style={{ left: `${(currentTime / duration) * 100}%`, transform: "translate(-50%, -50%)" }}
                    />
                )}
            </div>

            {/* Tempo */}
            <span className="text-xs font-bold text-white/90 whitespace-nowrap flex-shrink-0">
                {formatTime(currentTime)} / {formatTime(duration)}
            </span>
        </div>
    );
}

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState<"users" | "groups">("users");
    const [users, setUsers] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [allConversations, setAllConversations] = useState<any[]>([]);
    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("USER");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Modal states
    const [editingUser, setEditingUser] = useState<any>(null);
    const [viewingConversations, setViewingConversations] = useState<any>(null);
    const [conversations, setConversations] = useState<any[]>([]);
    const [selectedAuditChat, setSelectedAuditChat] = useState<any>(null);
    const [auditMessages, setAuditMessages] = useState<any[]>([]);
    const [isAuditLoading, setIsAuditLoading] = useState(false);
    const [isMessagesLoading, setIsMessagesLoading] = useState(false);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const [editingGroup, setEditingGroup] = useState<any>(null);
    const [loadingGroups, setLoadingGroups] = useState(false);
    const [loadingAllConversations, setLoadingAllConversations] = useState(false);
    const [selectedConversation, setSelectedConversation] = useState<any>(null);
    const [viewingGroupHistory, setViewingGroupHistory] = useState<any>(null);
    const [groupHistoryMessages, setGroupHistoryMessages] = useState<any[]>([]);
    const [loadingGroupHistory, setLoadingGroupHistory] = useState(false);

    // group creation / membership states
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");
    const [newGroupMembers, setNewGroupMembers] = useState<string[]>([]);
    const [newGroupSearch, setNewGroupSearch] = useState("");
    const [addingMembersTo, setAddingMembersTo] = useState<any>(null);
    const [availableUsersForGroup, setAvailableUsersForGroup] = useState<any[]>([]);
    const [addMembersSearch, setAddMembersSearch] = useState("");
    const [isConversationsOpen, setIsConversationsOpen] = useState(false);

    const router = useRouter();

    useEffect(() => {
        fetchUsers();
        fetchGroups();

        if (!socket) {
            socket = io();
        }

        const handleStatusUpdate = ({ userId, status }: any) => {
            setUsers(prev => prev.map(u =>
                u.id === userId ? { ...u, status } : u
            ));
        };

        socket.on("statusUpdate", handleStatusUpdate);

        const emitOnline = (userId: string) => {
            if (socket) {
                console.log("Admin emitting userOnline for", userId);
                socket.emit("userOnline", userId);
            }
        };

        // Identify current user to set as ONLINE
        fetch("/api/auth/me")
            .then(res => res.json())
            .then(data => {
                if (!data.error) {
                    emitOnline(data.id);
                    socket.on("connect", () => emitOnline(data.id));
                }
            });

        return () => {
            socket.off("statusUpdate", handleStatusUpdate);
            socket.off("connect");
        };
    }, []);

    const fetchUsers = async () => {
        const res = await fetch("/api/admin/users");
        if (res.ok) {
            const data = await res.json();
            setUsers(data);
        } else {
            router.push("/login");
        }
    };

    const fetchGroups = async () => {
        setLoadingGroups(true);
        try {
            const res = await fetch("/api/admin/groups");
            if (res.ok) {
                const data = await res.json();
                setGroups(data);
            }
        } catch (err) {
            console.error("Erro ao buscar grupos:", err);
        } finally {
            setLoadingGroups(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/admin/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, username, password, role, image: (window as any)._tempCreateImg }),
            });

            if (res.ok) {
                setName("");
                setUsername("");
                setPassword("");
                (window as any)._tempCreateImg = null;
                fetchUsers();
            } else {
                const data = await res.json();
                setError(data.error || "Erro ao criar usuário");
            }
        } catch (err) {
            setError("Erro de conexão");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm("Tem certeza que deseja excluir este usuário? Todas as suas mensagens serão perdidas.")) return;

        const res = await fetch(`/api/admin/users/${userId}`, {
            method: "DELETE"
        });

        if (res.ok) {
            fetchUsers();
        } else {
            const data = await res.json();
            alert(data.error || "Erro ao excluir usuário");
        }
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;

        setLoading(true);
        const res = await fetch(`/api/admin/users/${editingUser.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: editingUser.name,
                username: editingUser.username,
                role: editingUser.role,
                image: editingUser.image,
                password: editingUser.newPassword
            })
        });

        setLoading(false);
        if (res.ok) {
            setEditingUser(null);
            if (socket) {
                socket.emit("profileUpdate", { userId: editingUser.id });
            }
            fetchUsers();
        } else {
            alert("Erro ao atualizar usuário");
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "create" | "edit") => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                if (type === "edit" && editingUser) {
                    setEditingUser({ ...editingUser, image: base64 });
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const fetchAuditMessages = async (chatId: string) => {
        setIsMessagesLoading(true);
        setSelectedAuditChat(chatId);
        try {
            const res = await fetch(`/api/chat/${chatId}`);
            if (res.ok) {
                const data = await res.json();
                setAuditMessages(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsMessagesLoading(false);
        }
    };

    const handleAuditConversations = async (user: any) => {
        setViewingConversations(user);
        setIsAuditLoading(true);
        setConversations([]);
        setSelectedAuditChat(null);
        setAuditMessages([]);

        try {
            const res = await fetch(`/api/admin/users/${user.id}/conversations`);
            if (res.ok) {
                const data = await res.json();
                setConversations(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsAuditLoading(false);
        }
    };

    const handleUpdateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingGroup) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/admin/groups/${editingGroup.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: editingGroup.name })
            });

            if (res.ok) {
                setEditingGroup(null);
                fetchGroups();
            } else {
                alert("Erro ao atualizar grupo");
            }
        } catch (err) {
            alert("Erro ao atualizar grupo");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteGroup = async (groupId: string, groupName: string) => {
        if (!confirm(`Tem certeza que deseja excluir o grupo "${groupName}"? Todas as mensagens serão perdidas.`)) return;

        try {
            const res = await fetch(`/api/admin/groups/${groupId}`, {
                method: "DELETE"
            });

            if (res.ok) {
                fetchGroups();
            } else {
                const data = await res.json();
                alert(data.error || "Erro ao excluir grupo");
            }
        } catch (err) {
            alert("Erro ao excluir grupo");
        }
    };

    const handleRemoveMember = async (groupId: string, userId: string, memberName: string) => {
        if (!confirm(`Tem certeza que deseja remover ${memberName} do grupo?`)) return;

        try {
            const res = await fetch(`/api/admin/groups/${groupId}/members`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId })
            });

            if (res.ok) {
                fetchGroups();
            } else {
                const data = await res.json();
                alert(data.error || "Erro ao remover membro");
            }
        } catch (err) {
            alert("Erro ao remover membro");
        }
    };

    const handleViewGroupHistory = async (group: any) => {
        setViewingGroupHistory(group);
        setLoadingGroupHistory(true);
        try {
            const res = await fetch(`/api/chat/${group.id}`);
            if (res.ok) {
                const data = await res.json();
                setGroupHistoryMessages(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingGroupHistory(false);
        }
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim() || newGroupMembers.length === 0) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/groups`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newGroupName, participantIds: newGroupMembers })
            });
            if (res.ok) {
                setNewGroupName("");
                setNewGroupMembers([]);
                setNewGroupSearch("");
                setIsCreatingGroup(false);
                fetchGroups();
            } else {
                const data = await res.json();
                alert(data.error || "Erro ao criar grupo");
            }
        } catch (err) {
            console.error(err);
            alert("Erro de conexão");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAddMembers = (group: any) => {
        setAddingMembersTo(group);
        // compute available users
        const ids = group.participants.map((p: any) => p.userId);
        setAvailableUsersForGroup(users.filter(u => !ids.includes(u.id)));
        setNewGroupMembers([]);
        setAddMembersSearch("");
    };

    const handleAddMembers = async () => {
        if (!addingMembersTo || newGroupMembers.length === 0) return;
        setLoading(true);
        try {
            for (const userId of newGroupMembers) {
                await fetch(`/api/admin/groups/${addingMembersTo.id}/members`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId })
                });
            }
            setAddingMembersTo(null);
            setNewGroupMembers([]);
            fetchGroups();
        } catch (err) {
            console.error(err);
            alert("Erro ao adicionar membros");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center space-x-3">
                        <Shield className="text-whatsapp-teal" size={32} />
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Gerenciamento Admin</h1>
                    </div>
                    <button
                        onClick={() => {
                            fetch("/api/logout", { method: "POST" }).then(() => router.push("/login"));
                        }}
                        className="text-red-600 font-medium hover:underline flex items-center space-x-1"
                    >
                        <span>Sair</span>
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex space-x-2 mb-8 border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab("users")}
                        className={`px-6 py-3 font-semibold rounded-t-lg transition-all ${
                            activeTab === "users"
                                ? "bg-whatsapp-teal text-white"
                                : "text-gray-600 hover:bg-gray-100"
                        }`}
                    >
                        <div className="flex items-center space-x-2">
                            <UserIcon size={18} />
                            <span>Colaboradores</span>
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab("groups")}
                        className={`px-6 py-3 font-semibold rounded-t-lg transition-all ${
                            activeTab === "groups"
                                ? "bg-whatsapp-teal text-white"
                                : "text-gray-600 hover:bg-gray-100"
                        }`}
                    >
                        <div className="flex items-center space-x-2">
                            <Users size={18} />
                            <span>Grupos</span>
                        </div>
                    </button>
                </div>

                {/* Aba Colaboradores */}
                {activeTab === "users" && (
                    <>
                        {/* Create Section */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8 transition-all hover:shadow-md">
                            <h2 className="text-lg font-semibold mb-4 text-whatsapp-teal flex items-center">
                                <Edit2 size={18} className="mr-2" />
                                Novo Colaborador
                            </h2>
                            <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                <input
                                    placeholder="Nome Completo"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-whatsapp-teal focus:border-transparent outline-none transition-all"
                                    required
                                />
                                <input
                                    placeholder="Nome de Usuário"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-whatsapp-teal focus:border-transparent outline-none transition-all"
                                    required
                                />
                                <input
                                    placeholder="Senha"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-whatsapp-teal focus:border-transparent outline-none transition-all"
                                    required
                                />
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-whatsapp-teal focus:border-transparent outline-none transition-all"
                                >
                                    <option value="USER">Colaborador</option>
                                    <option value="ADMIN">Administrador</option>
                                </select>
                                <div className="lg:col-span-2">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => {
                                                    (window as any)._tempCreateImg = reader.result;
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                        className="w-full border border-gray-300 p-1.5 rounded-lg text-xs"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-whatsapp-teal text-white py-2.5 rounded-lg font-bold hover:bg-whatsapp-dark disabled:bg-gray-400 shadow-sm transition-all"
                                >
                                    {loading ? "Processando..." : "Criar Usuário"}
                                </button>
                                {error && <p className="text-red-500 text-sm mt-1 lg:col-span-5">{error}</p>}
                            </form>
                        </div>

                        {/* List Section */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            {/* mobile cards */}
                            <div className="md:hidden p-4 space-y-4">
                                {users.map(u => (
                                    <div key={u.id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-3">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                                                {u.image ? <img src={u.image} alt="" className="w-full h-full object-cover" /> : <UserIcon className="text-gray-400" size={20} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-[#111b21] truncate">{u.name}</p>
                                                <p className="text-xs text-gray-500 truncate">@{u.username}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-xs mb-2">
                                            <span className={`px-2.5 py-1 font-black rounded-full ${u.role === "ADMIN" ? "bg-purple-100 text-purple-900 border border-purple-200" : "bg-blue-100 text-blue-900 border border-blue-200"}`}>{u.role}</span>
                                            <div className="flex items-center">
                                                <span className={`inline-block w-2.5 h-2.5 rounded-full mr-2 shadow-sm ${u.status === "ONLINE" ? "bg-green-500 animate-pulse" : "bg_gray-400"}`}></span>
                                                <span className={`${u.status === "ONLINE" ? "text-green-800" : "text-gray-700"}`}>{u.status}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-end space-x-2">
                                            <button
                                                onClick={() => handleAuditConversations(u)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Ver Conversas"
                                            >
                                                <MessageSquare size={18} />
                                            </button>
                                            <button
                                                onClick={() => setEditingUser(u)}
                                                className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                title="Editar"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(u.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Excluir"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* desktop table */}
                            <div className="hidden md:overflow-x-auto md:block">
                                <table className="w-full">
                                    <thead className="bg-[#f8f9fa] border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Colaborador</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Usuário</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Cargo</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {users.map((u) => (
                                            <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="w-10 h-10 rounded-full bg-gray-100 mr-3 flex items-center justify-center overflow-hidden border border-gray-200">
                                                            {u.image ? <img src={u.image} alt="" className="w-full h-full object-cover" /> : <UserIcon className="text-gray-400" size={20} />}
                                                        </div>
                                                        <div className="text-sm font-bold text-[#111b21]">{u.name}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-[#111b21] font-medium">@{u.username}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2.5 py-1 text-[10px] font-black rounded-full ${u.role === "ADMIN" ? "bg-purple-100 text-purple-900 border border-purple-200" : "bg-blue-100 text-blue-900 border border-blue-200"}`}>
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <span className={`inline-block w-2.5 h-2.5 rounded-full mr-2 shadow-sm ${u.status === "ONLINE" ? "bg-green-500 animate-pulse" : "bg-gray-400"}`}></span>
                                                        <span className={`text-xs font-black ${u.status === "ONLINE" ? "text-green-800" : "text-gray-700"}`}>
                                                            {u.status}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                                    <div className="flex items-center justify-end space-x-2">
                                                        <button
                                                            onClick={() => handleAuditConversations(u)}
                                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Ver Conversas"
                                                        >
                                                            <MessageSquare size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingUser(u)}
                                                            className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                            title="Editar"
                                                        >
                                                            <Edit2 size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteUser(u.id)}
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Excluir"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {/* Aba Grupos */}
                {activeTab === "groups" && (
                    <div>
                        <div className="flex justify-end mb-4">
                            <button
                                onClick={() => { setIsCreatingGroup(true); setNewGroupSearch(""); setNewGroupMembers([]); setNewGroupName(""); }}
                                className="bg-whatsapp-teal text-white py-2 px-4 rounded-lg font-semibold hover:bg-whatsapp-dark transition-all flex items-center space-x-2"
                            >
                                <Users size={18} />
                                <span>Criar Grupo</span>
                            </button>
                        </div>
                        {loadingGroups ? (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-whatsapp-teal mb-2"></div>
                                <p className="text-sm">Buscando grupos...</p>
                            </div>
                        ) : groups.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {groups.map((group) => (
                                    <div
                                        key={group.id}
                                        className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all"
                                    >
                                        {/* Header */}
                                        <div className="bg-gradient-to-r from-whatsapp-teal to-whatsapp-dark p-4 text-white">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="font-bold text-lg truncate">{group.name}</h3>
                                                <div className="flex items-center space-x-1">
                                                    <button
                                                        onClick={() => setEditingGroup(group)}
                                                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                                                        title="Editar grupo"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteGroup(group.id, group.name)}
                                                        className="p-2 hover:bg-red-500/30 rounded-lg transition-colors"
                                                        title="Excluir grupo"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-xs opacity-80">Criado em {new Date(group.createdAt).toLocaleDateString('pt-BR')}</p>
                                        </div>

                                        {/* Members */}
                                        <div className="p-4">
                                            <p className="text-xs font-bold text-gray-500 uppercase mb-3">Membros ({group.participants.length})</p>
                                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                                {group.participants.map((participant: any) => (
                                                    <div
                                                        key={participant.id}
                                                        className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                                                    >
                                                        <div className="flex items-center space-x-2 min-w-0">
                                                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200 flex-shrink-0">
                                                                {participant.user.image ? (
                                                                    <img src={participant.user.image} alt="" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <UserIcon className="text-gray-400" size={16} />
                                                                )}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-sm font-semibold text-gray-900 truncate">{participant.user.name}</p>
                                                                {participant.isAdmin && (
                                                                    <p className="text-[10px] text-whatsapp-teal font-bold">Administrador</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleRemoveMember(group.id, participant.userId, participant.user.name)}
                                                            className="p-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                                                            title="Remover membro"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Last message / History */}
                                            <div className="mt-4 pt-4 border-t border-gray-100">
                                                {group.messages.length > 0 && (
                                                    <>
                                                        <p className="text-xs font-bold text-gray-500 uppercase mb-2">Última Mensagem</p>
                                                        <div className="bg-gray-50 p-2 rounded-lg mb-3">
                                                            <p className="text-xs text-gray-600">
                                                                <span className="font-semibold">{group.messages[0].sender?.name}:</span> {group.messages[0].content.substring(0, 50)}...
                                                            </p>
                                                            <p className="text-[10px] text-gray-400 mt-1">{new Date(group.messages[0].createdAt).toLocaleString('pt-BR')}</p>
                                                        </div>
                                                    </>
                                                )}
                                                <button
                                                    onClick={() => handleOpenAddMembers(group)}
                                                    className="w-full bg-blue-500 text-white py-2 rounded-lg font-semibold hover:bg-blue-600 transition-all text-sm flex items-center justify-center space-x-2 mb-2"
                                                >
                                                    <Users size={16} />
                                                    <span>Adicionar Membros</span>
                                                </button>
                                                <button
                                                    onClick={() => handleViewGroupHistory(group)}
                                                    className="w-full bg-whatsapp-teal text-white py-2 rounded-lg font-semibold hover:bg-whatsapp-dark transition-all text-sm flex items-center justify-center space-x-2"
                                                >
                                                    <MessageSquare size={16} />
                                                    <span>Ver Histórico Completo</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                                <Users size={48} className="mx-auto text-gray-300 mb-4" />
                                <p className="text-gray-500 font-medium">Nenhum grupo criado ainda.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal Editar Usuário */}
            {editingUser && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-900">Editar Colaborador</h3>
                            <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-gray-200 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Completo</label>
                                <input
                                    value={editingUser.name}
                                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-whatsapp-teal outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome de Usuário</label>
                                <input
                                    value={editingUser.username}
                                    onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-whatsapp-teal outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Foto do Colaborador</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleFileChange(e, "edit")}
                                    className="w-full border border-gray-300 p-2 rounded-lg text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nova Senha (opcional)</label>
                                <input
                                    type="password"
                                    placeholder="Deixe em branco para manter a atual"
                                    value={editingUser.newPassword || ""}
                                    onChange={(e) => setEditingUser({ ...editingUser, newPassword: e.target.value })}
                                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-whatsapp-teal outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cargo</label>
                                <select
                                    value={editingUser.role}
                                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-whatsapp-teal outline-none"
                                >
                                    <option value="USER">Colaborador</option>
                                    <option value="ADMIN">Administrador</option>
                                </select>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-whatsapp-teal text-white py-3 rounded-xl font-bold hover:bg-whatsapp-dark mt-4 shadow-lg transition-all"
                            >
                                {loading ? "Salvando..." : "Salvar Alterações"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Auditoria de Conversas */}
            {viewingConversations && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-whatsapp-teal text-white">
                            <div>
                                <h3 className="font-bold text-lg">Conversas de {viewingConversations.name}</h3>
                                <p className="text-xs opacity-80">Auditoria administrativa</p>
                            </div>
                            <button onClick={() => setViewingConversations(null)} className="p-2 hover:bg-black/10 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 flex overflow-hidden">
                            {/* Conversas List */}
                            <div className={`${selectedAuditChat ? 'hidden md:block w-72' : 'w-full'} overflow-y-auto p-4 bg-gray-50 border-r border-gray-100`}>
                                {isAuditLoading ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-whatsapp-teal mb-2"></div>
                                        <p className="text-sm">Buscando conversas...</p>
                                    </div>
                                ) : conversations.length > 0 ? (
                                    <div className="space-y-3">
                                        {conversations.map((chat) => {
                                            const otherParticipant = chat.isGroup ? null : chat.participants.find((p: any) => p.userId !== viewingConversations.id);
                                            const isSelected = selectedAuditChat === chat.id;
                                            return (
                                                <div
                                                    key={chat.id}
                                                    onClick={() => fetchAuditMessages(chat.id)}
                                                    className={`p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-white border-whatsapp-teal shadow-sm ring-1 ring-whatsapp-teal' : 'bg-white border-transparent hover:border-gray-300'}`}
                                                >
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-100 flex-shrink-0">
                                                            {chat.isGroup ? <Users size={20} className="text-whatsapp-teal" /> : <UserIcon size={20} className="text-gray-400" />}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="font-bold text-gray-900 text-sm truncate">
                                                                {chat.name || otherParticipant?.user.name || "Conversa Direta"}
                                                            </h4>
                                                            <p className="text-[10px] text-gray-400 uppercase font-bold">
                                                                {chat.isGroup ? "Grupo" : "Direta"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-20 text-gray-400">
                                        <MessageSquare size={48} className="mx-auto opacity-10 mb-2" />
                                        <p className="text-sm font-medium">Nenhuma conversa encontrada.</p>
                                    </div>
                                )}
                            </div>

                            {/* Mobile overlay for conversations (opened by button) */}
                            {isConversationsOpen && (
                                <div className="fixed inset-0 z-60 md:hidden flex">
                                    <div className="absolute inset-0 bg-black/50" onClick={() => setIsConversationsOpen(false)} />
                                    <div className="relative w-72 bg-white h-full overflow-y-auto p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-bold text-gray-900">Conversas</h4>
                                            <button onClick={() => setIsConversationsOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                                <X size={18} />
                                            </button>
                                        </div>
                                        {isAuditLoading ? (
                                            <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-whatsapp-teal mb-2"></div>
                                                <p className="text-sm">Buscando conversas...</p>
                                            </div>
                                        ) : conversations.length > 0 ? (
                                            <div className="space-y-3">
                                                {conversations.map((chat) => {
                                                    const otherParticipant = chat.isGroup ? null : chat.participants.find((p: any) => p.userId !== viewingConversations.id);
                                                    const isSelected = selectedAuditChat === chat.id;
                                                    return (
                                                        <div
                                                            key={chat.id}
                                                            onClick={() => { fetchAuditMessages(chat.id); setSelectedAuditChat(chat.id); setIsConversationsOpen(false); }}
                                                            className={`p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-white border-whatsapp-teal shadow-sm ring-1 ring-whatsapp-teal' : 'bg-white border-transparent hover:border-gray-300'}`}
                                                        >
                                                            <div className="flex items-center space-x-3">
                                                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-100 flex-shrink-0">
                                                                    {chat.isGroup ? <Users size={20} className="text-whatsapp-teal" /> : <UserIcon size={20} className="text-gray-400" />}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <h4 className="font-bold text-gray-900 text-sm truncate">
                                                                        {chat.name || otherParticipant?.user.name || "Conversa Direta"}
                                                                    </h4>
                                                                    <p className="text-[10px] text-gray-400 uppercase font-bold">
                                                                        {chat.isGroup ? "Grupo" : "Direta"}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="text-center py-6 text-gray-400">
                                                <MessageSquare size={36} className="mx-auto opacity-10 mb-2" />
                                                <p className="text-sm font-medium">Nenhuma conversa encontrada.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Mensagem Details */}
                            <div className={`flex-1 flex flex-col bg-white overflow-hidden ${!selectedAuditChat ? 'hidden md:flex items-center justify-center text-gray-300' : ''}`}>
                                {!selectedAuditChat ? (
                                    <div className="text-center">
                                        <MessageSquare size={64} className="mx-auto mb-4 opacity-5" />
                                        <p className="font-medium">Selecione uma conversa para ver o histórico completo</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                            <div className="flex items-center space-x-2">
                                                    {/* mobile: open conversations list */}
                                                    <button onClick={() => setIsConversationsOpen(true)} className="md:hidden p-2 -ml-1 hover:bg-gray-200 rounded-full">
                                                        <Users size={16} />
                                                    </button>
                                                    <button onClick={() => setSelectedAuditChat(null)} className="md:hidden p-2 -ml-2 hover:bg-gray-200 rounded-full">
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <span className="font-bold text-gray-800 text-sm">Histórico da Conversa</span>
                                                </div>
                                            {isMessagesLoading && <div className="animate-spin h-4 w-4 border-2 border-whatsapp-teal border-t-transparent rounded-full"></div>}
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f0f2f5]">
                                            {auditMessages.map((msg) => {
                                                const isFromAuditedUser = msg.senderId === viewingConversations.id;
                                                return (
                                                    <div key={msg.id} className={`flex ${isFromAuditedUser ? 'justify-end' : 'justify-start'}`}>
                                                        <div className={`${msg.type === "AUDIO" ? 'max-w-sm' : 'max-w-[85%]'} ${msg.type === "AUDIO" ? 'p-0' : 'p-3'} rounded-2xl shadow-sm ${isFromAuditedUser ? 'bg-[#d9fdd3] text-[#111b21] rounded-tr-none' : 'bg-white text-[#111b21] rounded-tl-none'}`}>
                                                            {!isFromAuditedUser && msg.type !== "AUDIO" && <p className="text-[10px] font-bold text-whatsapp-teal mb-0.5">{msg.sender?.name}</p>}
                                                            {msg.type === "AUDIO" ? (
                                                                <div className="py-0 w-full">
                                                                    <AudioPlayer src={msg.audioUrl} />
                                                                </div>
                                                            ) : msg.type === "IMAGE" && msg.imageUrl ? (
                                                                <div className="mt-1 flex flex-col gap-2">
                                                                    <div className="relative group cursor-pointer inline-block" onClick={() => setLightboxImage(msg.imageUrl)}>
                                                                        <img
                                                                            src={msg.imageUrl}
                                                                            alt="Imagem"
                                                                            className="max-w-[220px] max-h-[220px] rounded-xl object-cover transition-opacity group-hover:opacity-80 shadow-sm"
                                                                            loading="lazy"
                                                                        />
                                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                                                                            <div className="bg-black/50 rounded-full p-2">
                                                                                <ZoomIn size={18} className="text-white" />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    {msg.content && msg.content !== "Foto" && (
                                                                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                                                    )}
                                                                </div>
                                                            ) : msg.type === "FILE" && msg.fileData ? (
                                                                <a
                                                                    href={msg.fileData}
                                                                    download={msg.fileName || "arquivo"}
                                                                    className="flex items-center gap-3 bg-whatsapp-teal/10 hover:bg-whatsapp-teal/20 rounded-lg px-3 py-2.5 transition-colors max-w-[280px]"
                                                                >
                                                                    <div className="flex-shrink-0 w-10 h-10 bg-whatsapp-teal/20 rounded-lg flex items-center justify-center">
                                                                        <Paperclip size={20} className="text-whatsapp-teal" />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm font-semibold truncate text-[#111b21]">
                                                                            {msg.fileName || "Arquivo"}
                                                                        </p>
                                                                        <p className="text-xs text-gray-400 truncate">
                                                                            {msg.fileType || "Arquivo"}
                                                                        </p>
                                                                    </div>
                                                                    <Download size={18} className="flex-shrink-0 text-whatsapp-teal" />
                                                                </a>
                                                            ) : (
                                                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                                            )}
                                                            <p className="text-[9px] text-gray-400 text-right mt-1">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {auditMessages.length === 0 && !isMessagesLoading && (
                                                <div className="text-center py-20 text-gray-400">
                                                    <p className="text-sm">Sem mensagens nesta conversa.</p>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Lightbox Modal */}
            {lightboxImage && (
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-150"
                    onClick={() => setLightboxImage(null)}
                >
                    <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => setLightboxImage(null)}
                            className="absolute -top-11 right-0 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X size={24} />
                        </button>
                        <a
                            href={lightboxImage}
                            download="imagem"
                            className="absolute -top-11 right-12 flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-full transition-colors"
                            title="Baixar imagem"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Download size={14} />
                            Baixar
                        </a>
                        <img
                            src={lightboxImage}
                            alt="Visualizar imagem"
                            className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl"
                        />
                    </div>
                </div>
            )}

            {/* Modal Editar Grupo */}
            {editingGroup && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-900">Editar Grupo</h3>
                            <button onClick={() => setEditingGroup(null)} className="p-2 hover:bg-gray-200 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateGroup} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome do Grupo</label>
                                <input
                                    value={editingGroup.name}
                                    onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-whatsapp-teal outline-none"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-whatsapp-teal text-white py-3 rounded-xl font-bold hover:bg-whatsapp-dark mt-4 shadow-lg transition-all"
                            >
                                {loading ? "Salvando..." : "Salvar Alterações"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Criar Grupo */}
            {isCreatingGroup && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-900">Criar Grupo</h3>
                            <button onClick={() => setIsCreatingGroup(false)} className="p-2 hover:bg-gray-200 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <input
                                placeholder="Nome do grupo"
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                                className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-whatsapp-teal focus:border-transparent outline-none transition-all"
                            />
                            <div>
                                <input
                                    placeholder="Pesquisar usuários"
                                    value={newGroupSearch}
                                    onChange={(e) => setNewGroupSearch(e.target.value)}
                                    className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-whatsapp-teal outline-none mb-2"
                                />
                                <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                                    {(users.filter(u => u.name.toLowerCase().includes(newGroupSearch.toLowerCase()) && !newGroupMembers.includes(u.id))).map(u => (
                                        <div key={u.id} className="flex items-center justify-between">
                                            <span className="text-sm truncate">{u.name}</span>
                                            <button
                                                onClick={() => setNewGroupMembers(prev => [...prev, u.id])}
                                                className="text-whatsapp-teal text-xs font-bold hover:underline"
                                            >Adicionar</button>
                                        </div>
                                    ))}
                                </div>
                                {newGroupMembers.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {newGroupMembers.map(id => {
                                            const user = users.find(u => u.id === id);
                                            return user ? (
                                                <span key={id} className="bg-whatsapp-teal/20 text-whatsapp-teal px-2 py-1 rounded-full text-xs flex items-center gap-1">
                                                    {user.name}
                                                    <button onClick={() => setNewGroupMembers(prev => prev.filter(x => x !== id))} className="ml-1">×</button>
                                                </span>
                                            ) : null;
                                        })}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={handleCreateGroup}
                                className="w-full bg-whatsapp-teal text-white py-2 rounded-lg font-semibold hover:bg-whatsapp-dark transition-all"
                            >
                                Criar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Adicionar Membros */}
            {addingMembersTo && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-900">Adicionar membros a {addingMembersTo.name}</h3>
                            <button onClick={() => setAddingMembersTo(null)} className="p-2 hover:bg-gray-200 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <input
                                placeholder="Pesquisar usuários"
                                value={addMembersSearch}
                                onChange={(e) => setAddMembersSearch(e.target.value)}
                                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-whatsapp-teal outline-none mb-2"
                            />
                            <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                                {(availableUsersForGroup.filter(u => u.name.toLowerCase().includes(addMembersSearch.toLowerCase()) && !newGroupMembers.includes(u.id))).map(u => (
                                    <div key={u.id} className="flex items-center justify-between">
                                        <span className="text-sm truncate">{u.name}</span>
                                        <button
                                            onClick={() => setNewGroupMembers(prev => [...prev, u.id])}
                                            className="text-blue-600 text-xs font-bold hover:underline"
                                        >Adicionar</button>
                                    </div>
                                ))}
                            </div>
                            {newGroupMembers.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {newGroupMembers.map(id => {
                                        const user = availableUsersForGroup.find(u => u.id === id) || users.find(u => u.id === id);
                                        return user ? (
                                            <span key={id} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs flex items-center gap-1">
                                                {user.name}
                                                <button onClick={() => setNewGroupMembers(prev => prev.filter(x => x !== id))} className="ml-1">×</button>
                                            </span>
                                        ) : null;
                                    })}
                                </div>
                            )}
                            <button
                                onClick={handleAddMembers}
                                className="w-full bg-blue-500 text-white py-2 rounded-lg font-semibold hover:bg-blue-600 transition-all"
                            >
                                Adicionar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Histórico do Grupo */}
            {viewingGroupHistory && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-whatsapp-teal text-white">
                            <div>
                                <h3 className="font-bold text-lg">Histórico do Grupo: {viewingGroupHistory.name}</h3>
                                <p className="text-xs opacity-80">{groupHistoryMessages.length} mensagens</p>
                            </div>
                            <button onClick={() => setViewingGroupHistory(null)} className="p-2 hover:bg-black/10 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f0f2f5]">
                            {loadingGroupHistory ? (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-whatsapp-teal mb-2"></div>
                                    <p className="text-sm">Carregando histórico...</p>
                                </div>
                            ) : groupHistoryMessages.length > 0 ? (
                                groupHistoryMessages.map((msg) => (
                                    <div key={msg.id} className="flex justify-start">
                                        <div className="max-w-[85%] p-3 rounded-2xl shadow-sm bg-white text-gray-900">
                                            <p className="text-[10px] font-bold text-whatsapp-teal mb-0.5">{msg.sender?.name || "Usuário desconhecido"}</p>
                                            {msg.type === "IMAGE" && msg.imageUrl ? (
                                                <div className="mt-1 flex flex-col gap-2">
                                                    <div className="relative group cursor-pointer inline-block" onClick={() => setLightboxImage(msg.imageUrl)}>
                                                        <img
                                                            src={msg.imageUrl}
                                                            alt="Imagem"
                                                            className="max-w-[220px] max-h-[220px] rounded-lg object-cover transition-opacity group-hover:opacity-80 shadow-sm"
                                                            loading="lazy"
                                                        />
                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                                                            <div className="bg-black/50 rounded-full p-2">
                                                                <ZoomIn size={18} className="text-white" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {msg.content && msg.content !== "Foto" && (
                                                        <p className="text-sm mt-1">{msg.content}</p>
                                                    )}
                                                </div>
                                            ) : msg.type === "AUDIO" ? (
                                                <div className="mt-0 w-full">
                                                    <AudioPlayer src={msg.audioUrl} />
                                                </div>
                                            ) : (
                                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                            )}
                                            <p className="text-[9px] text-gray-400 text-right mt-1">{new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                    <MessageSquare size={48} className="opacity-10 mb-2" />
                                    <p className="text-sm">Sem mensagens neste grupo.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
