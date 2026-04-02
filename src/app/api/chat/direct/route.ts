import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

        const { targetUserId } = await request.json();

        // Check if conversation already exists
        const existing = await prisma.conversation.findFirst({
            where: {
                isGroup: false,
                AND: [
                    { participants: { some: { userId: session.id } } },
                    { participants: { some: { userId: targetUserId } } }
                ]
            },
            include: {
                participants: {
                    include: {
                        user: { select: { id: true, name: true } }
                    }
                },
                messages: {
                    take: 1,
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (existing) return NextResponse.json(existing);

        const conversation = await prisma.conversation.create({
            data: {
                isGroup: false,
                participants: {
                    create: [
                        { userId: session.id },
                        { userId: targetUserId }
                    ]
                }
            },
            include: {
                participants: {
                    include: {
                        user: { select: { id: true, name: true } }
                    }
                },
                messages: {
                    take: 1,
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        return NextResponse.json(conversation);
    } catch (error) {
        return NextResponse.json({ error: "Erro ao iniciar conversa" }, { status: 500 });
    }
}
