import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

        const { conversationId } = await request.json();

        await prisma.message.updateMany({
            where: {
                conversationId,
                senderId: { not: session.id },
                status: "SENT"
            },
            data: {
                status: "READ"
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Erro ao marcar como lido" }, { status: 500 });
    }
}
