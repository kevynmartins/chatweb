"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            if (res.ok) {
                const user = await res.json();
                if (user.role === "ADMIN") {
                    router.push("/admin");
                } else {
                    router.push("/chat");
                }
            } else {
                const data = await res.json();
                setError(data.error || "Erro ao fazer login");
            }
        } catch (err) {
            setError("Erro de conexão");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-whatsapp-bg p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-24 h-24 rounded-full bg-whatsapp-teal/10 p-1 mb-4 border-4 border-whatsapp-teal/20 shadow-inner overflow-hidden">
                        <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover rounded-full" />
                    </div>
                    <h1 className="text-2xl font-bold text-[#111b21]">Chat Corporativo</h1>
                    <p className="text-[#667781]">Faça login para continuar</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    {error && (
                        <div className="rounded bg-red-100 p-3 text-sm text-red-600 font-medium">
                            {error}
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-bold text-[#111b21] mb-1">Usuário</label>
                        <input
                            type="text"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2.5 shadow-sm focus:border-whatsapp-teal focus:outline-none focus:ring-1 focus:ring-whatsapp-teal text-[#111b21] font-medium placeholder:text-gray-400"
                            placeholder="Seu usuário"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-[#111b21] mb-1">Senha</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2.5 shadow-sm focus:border-whatsapp-teal focus:outline-none focus:ring-1 focus:ring-whatsapp-teal text-[#111b21] font-medium placeholder:text-gray-400"
                            placeholder="Sua senha"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-md bg-whatsapp-teal py-3 text-white font-bold hover:bg-whatsapp-dark focus:outline-none focus:ring-2 focus:ring-whatsapp-teal focus:ring-offset-2 disabled:bg-gray-400 shadow-md transition-all active:scale-[0.98]"
                    >
                        {loading ? "Entrando..." : "Entrar"}
                    </button>
                </form>
            </div>
        </div>
    );
}
