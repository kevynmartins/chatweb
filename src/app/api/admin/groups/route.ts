import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.role !== "ADMIN") {
            return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
        }

        const groups = await prisma.conversation.findMany({
            where: { isGroup: true },
            include: {
                participants: {
                    include: {
                        user: {
                            select: { id: true, name: true, image: true, status: true }
                        }
                    }
                },
                messages: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                    include: {
                        sender: { select: { id: true, name: true } }
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        return NextResponse.json(groups);
    } catch (error) {
        return NextResponse.json({ error: "Erro ao buscar grupos" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.role !== "ADMIN") {
            return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
        }

        const { name, participantIds } = await request.json();
        if (!name || !participantIds || participantIds.length === 0) {
            return NextResponse.json({ error: "Nome e participantes são obrigatórios" }, { status: 400 });
        }

        const allParticipantIds: string[] = Array.from(new Set(participantIds));

        const conversation = await prisma.conversation.create({
            data: {
                name,
                isGroup: true,
                createdById: session.id,
                participants: {
                    create: allParticipantIds.map((userId: string, idx: number) => ({
                        userId,
                        isAdmin: idx === 0
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
