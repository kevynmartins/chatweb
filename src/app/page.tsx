import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Home() {
    const session = await getSession();

    if (session) {
        if (session.role === "ADMIN") {
            redirect("/admin");
        } else {
            redirect("/chat");
        }
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-whatsapp-bg">
            <div className="text-center bg-white p-12 rounded-2xl shadow-xl max-w-lg w-full">
                <div className="flex justify-center mb-6 overflow-hidden">
                    <img src="/logo.jpg" alt="Logo" className="w-32 h-32 rounded-full object-cover border-4 border-whatsapp-teal/20 shadow-lg" />
                </div>
                <h1 className="text-4xl font-extrabold text-[#111b21] mb-4">Chat Corporativo</h1>
                <p className="text-[#667781] mb-8 text-lg font-medium">Seja bem-vindo ao sistema de comunicação interna. Conecte-se com seus colegas de trabalho.</p>

                <Link
                    href="/login"
                    className="inline-block w-full py-4 px-8 bg-whatsapp-teal text-white rounded-lg font-bold text-xl hover:bg-whatsapp-dark transition shadow-md"
                >
                    Acessar Chat
                </Link>
                <p className="mt-6 text-sm text-gray-400">
                    Versão Beta 1.0 - Uso Interno
                </p>
            </div>
        </main>
    );
}
