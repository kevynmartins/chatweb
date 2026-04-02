import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getSession();
        if (!session || session.role !== "ADMIN") {
            return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
        }

        const { name, image } = await request.json();

        const updated = await prisma.conversation.update({
            where: { id: params.id },
            data: {
                ...(name !== undefined && { name }),
                ...(image !== undefined && { image }),
            },
            include: {
                participants: {
                    include: {
                        user: { select: { id: true, name: true, image: true, status: true } }
                    }
                }
            }
        });

        return NextResponse.json(updated);
    } catch (error) {
        return NextResponse.json({ error: "Erro ao atualizar grupo" }, { status: 500 });
    }
}

export async function DELETE(
    _request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getSession();
        if (!session || session.role !== "ADMIN") {
            return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
        }

        // Delete related data first to respect FK constraints
        await prisma.message.deleteMany({ where: { conversationId: params.id } });
        await prisma.participant.deleteMany({ where: { conversationId: params.id } });
        await prisma.conversation.delete({ where: { id: params.id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Erro ao excluir grupo" }, { status: 500 });
    }
}
