import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getSession();
        if (!session || session.role !== "ADMIN") {
            return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
        }

        const { userId } = await request.json();

        // Check if already a member
        const existing = await prisma.participant.findUnique({
            where: { userId_conversationId: { userId, conversationId: params.id } }
        });
        if (existing) {
            return NextResponse.json({ error: "Usuário já é membro" }, { status: 400 });
        }

        await prisma.participant.create({
            data: { userId, conversationId: params.id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Erro ao adicionar membro" }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getSession();
        if (!session || session.role !== "ADMIN") {
            return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
        }

        const { userId } = await request.json();

        await prisma.participant.delete({
            where: { userId_conversationId: { userId, conversationId: params.id } }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Erro ao remover membro" }, { status: 500 });
    }
}
