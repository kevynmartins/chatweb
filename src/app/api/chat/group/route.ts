import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

        const { name, participantIds } = await request.json();

        // Ensure current user is included
        const allParticipantIds: string[] = Array.from(new Set([...participantIds, session.id]));

        const conversation = await prisma.conversation.create({
            data: {
                name,
                isGroup: true,
                createdById: session.id,
                participants: {
                    create: allParticipantIds.map((userId: string) => ({
                        userId,
                        isAdmin: userId === session.id  // Creator is the admin
                    }))
                }
            },
            include: {
                participants: {
                    include: {
                        user: { select: { id: true, name: true, image: true } }
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
        return NextResponse.json({ error: "Erro ao criar grupo" }, { status: 500 });
    }
}
