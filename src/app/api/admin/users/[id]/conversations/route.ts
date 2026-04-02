import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getSession();
        if (!session || session.role !== "ADMIN") {
            return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
        }

        const userId = params.id;

        const conversations = await prisma.conversation.findMany({
            where: {
                participants: {
                    some: { userId: userId }
                }
            },
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
            orderBy: {
                createdAt: "desc"
            }
        });

        return NextResponse.json(conversations);
    } catch (error) {
        return NextResponse.json({ error: "Erro ao buscar conversas do usuário" }, { status: 500 });
    }
}
