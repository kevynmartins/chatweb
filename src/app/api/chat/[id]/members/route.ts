import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

async function isGroupAdmin(sessionId: string, conversationId: string): Promise<boolean> {
    // System admins always have access
    const user = await prisma.user.findUnique({ where: { id: sessionId }, select: { role: true } });
    if (user?.role === "ADMIN") return true;

    // Check if session user is a group admin participant
    const participant = await prisma.participant.findUnique({
        where: { userId_conversationId: { userId: sessionId, conversationId } }
    });
    return participant?.isAdmin === true;
}

// POST /api/chat/[id]/members — Add a user to the group
export async function POST(request: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

        const conversationId = params.id;
        const canManage = await isGroupAdmin(session.id, conversationId);
        if (!canManage) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

        const { userId } = await request.json();

        // Upsert so we don't get a duplicate error if they were previously hidden
        const participant = await prisma.participant.upsert({
            where: { userId_conversationId: { userId, conversationId } },
            update: { hidden: false },
            create: { userId, conversationId },
            include: {
                user: { select: { id: true, name: true, image: true } }
            }
        });

        return NextResponse.json(participant);
    } catch (error) {
        return NextResponse.json({ error: "Erro ao adicionar membro" }, { status: 500 });
    }
}

// DELETE /api/chat/[id]/members — Remove a user from the group
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

        const conversationId = params.id;
        const canManage = await isGroupAdmin(session.id, conversationId);
        if (!canManage) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

        const { userId } = await request.json();

        // Prevent removing the group creator
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            select: { createdById: true }
        });
        if (conversation?.createdById === userId) {
            return NextResponse.json({ error: "Não é possível remover o criador do grupo" }, { status: 400 });
        }

        await prisma.participant.delete({
            where: { userId_conversationId: { userId, conversationId } }
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        return NextResponse.json({ error: "Erro ao remover membro" }, { status: 500 });
    }
}
