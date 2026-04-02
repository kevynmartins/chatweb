import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const query = searchParams.get("q") || "";

        if (!query) return NextResponse.json([]);

        const users = await prisma.user.findMany({
            where: {
                AND: [
                    {
                        OR: [
                            { name: { contains: query } },
                            { username: { contains: query } }
                        ]
                    },
                    { id: { not: session.id } } // Don't find self
                ]
            },
            select: {
                id: true,
                name: true,
                username: true,
                image: true,
                status: true
            },
            take: 20
        });

        return NextResponse.json(users);
    } catch (error) {
        return NextResponse.json({ error: "Erro ao buscar usuários" }, { status: 500 });
    }
}
