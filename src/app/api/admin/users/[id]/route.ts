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

        const userId = params.id;
        const { name, username, password, role, image } = await request.json();

        const updatedData: any = {};
        if (name) updatedData.name = name;
        if (username) updatedData.username = username;
        if (password) updatedData.password = password;
        if (role) updatedData.role = role;
        if (image !== undefined) updatedData.image = image;

        const user = await prisma.user.update({
            where: { id: userId },
            data: updatedData,
            select: {
                id: true,
                username: true,
                name: true,
                role: true,
                status: true,
                image: true
            }
        });

        return NextResponse.json(user);
    } catch (error) {
        return NextResponse.json({ error: "Erro ao atualizar usuário" }, { status: 500 });
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

        const userId = params.id;

        // Prevent admin from deleting themselves
        if (userId === session.id) {
            return NextResponse.json({ error: "Você não pode excluir seu próprio usuário" }, { status: 400 });
        }

        // Delete user (cascade should handle related messages/participants if defined, 
        // but SQLite with Prisma might need explicit cleanup or relying on referential actions)
        // Actually, we'll let Prisma handle it if we have onDelete: Cascade. 
        // In our schema, we don't have explicit cascade, so we might need to delete relations.

        await prisma.$transaction([
            prisma.message.deleteMany({ where: { senderId: userId } }),
            prisma.participant.deleteMany({ where: { userId: userId } }),
            prisma.user.delete({ where: { id: userId } })
        ]);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Erro ao excluir usuário" }, { status: 500 });
    }
}
