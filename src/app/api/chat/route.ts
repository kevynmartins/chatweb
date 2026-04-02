import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        // Get all conversations for current user
        const conversations = await prisma.conversation.findMany({
            where: {
                participants: {
                    some: {
                        userId: session.id,
                        hidden: false
                    }
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
            }
        });

        return NextResponse.json(conversations);
    } catch (error) {
        return NextResponse.json({ error: "Erro ao buscar conversas" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

            const { content, conversationId, type, audioUrl, imageUrl, fileData, fileName, fileType, replyToId } = await request.json();

        const message = await prisma.message.create({
            data: {
                content,
                conversationId,
                type: type || "TEXT",
                audioUrl: audioUrl || null,
                imageUrl: imageUrl || null,
                fileData: fileData || null,
                fileName: fileName || null,
                fileType: fileType || null,
                replyToId: replyToId || null,
                senderId: session.id
            },
            include: {
                sender: { select: { id: true, name: true, image: true } },
                replyTo: {
                    include: {
                        sender: { select: { id: true, name: true } }
                    }
                }
            }
        });

        // Reset hidden=false for ALL participants when a new message arrives
        await prisma.participant.updateMany({
            where: { conversationId },
            data: { hidden: false }
        });

        return NextResponse.json(message);
    } catch (error) {
        return NextResponse.json({ error: "Erro ao enviar mensagem" }, { status: 500 });
    }
}

// allow editing or deleting messages
export async function PATCH(request: Request) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

        const { messageId, content, deleteForAll } = await request.json();
        console.log("[PATCH] received:", { messageId, content, deleteForAll });
        
        if (!messageId) return NextResponse.json({ error: "messageId é obrigatório" }, { status: 400 });

        const msg = await prisma.message.findUnique({ where: { id: messageId } });
        console.log("[PATCH] message found:", msg ? { id: msg.id, senderId: msg.senderId } : null);
        
        if (!msg) return NextResponse.json({ error: "Mensagem não encontrada" }, { status: 404 });
        if (msg.senderId !== session.id) {
            console.log("[PATCH] senderId mismatch:", { msgSenderId: msg.senderId, sessionId: session.id });
            return NextResponse.json({ error: "Não permitido" }, { status: 403 });
        }

        if (deleteForAll) {
            await prisma.message.delete({ where: { id: messageId } });
            return NextResponse.json({ success: true, deleted: true });
        } else if (content !== undefined) {
            // prisma client may need regeneration to recognize editedAt
            const updated = await prisma.message.update({
                where: { id: messageId },
                // @ts-ignore
                data: { content, editedAt: new Date() }
            });
            console.log("[PATCH] message updated:", { id: updated.id, content: updated.content });
            return NextResponse.json(updated);
        }

        return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
    } catch (error) {
        console.error("[PATCH] error:", error);
        return NextResponse.json({ error: "Erro ao atualizar mensagem", details: String(error) }, { status: 500 });
    }
}
