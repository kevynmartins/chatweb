import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { setSession } from "@/lib/auth";

export async function POST(request: Request) {
    try {
        const { username, password } = await request.json();

        const user = await prisma.user.findUnique({
            where: { username },
        });

        if (!user || user.password !== password) {
            return NextResponse.json(
                { error: "Usuário ou senha inválidos" },
                { status: 401 }
            );
        }

        const sessionUser = {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
        };

        await setSession(sessionUser);

        return NextResponse.json(sessionUser);
    } catch (error) {
        return NextResponse.json(
            { error: "Erro interno do servidor" },
            { status: 500 }
        );
    }
}
