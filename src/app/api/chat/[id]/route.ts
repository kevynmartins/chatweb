import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

        const messages = await prisma.message.findMany({
            where: { conversationId: params.id },
            include: {
                sender: { select: { id: true, name: true, image: true } },
                replyTo: {
                    include: {
                        sender: { select: { name: true } }
                    }
                }
            },
            orderBy: { createdAt: "asc" }
        });

        return NextResponse.json(messages);
    } catch (error) {
        return NextResponse.json({ error: "Erro ao buscar mensagens" }, { status: 500 });
    }
}
