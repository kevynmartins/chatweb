import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

        const conversationId = params.id;

        // Set hidden=true for the current user in this conversation
        await prisma.participant.update({
            where: {
                userId_conversationId: {
                    userId: session.id,
                    conversationId: conversationId
                }
            },
            data: {
                hidden: true
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error hiding conversation:", error);
        return NextResponse.json({ error: "Erro ao esconder conversa" }, { status: 500 });
    }
}
