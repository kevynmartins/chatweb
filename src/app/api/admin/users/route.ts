import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.role !== "ADMIN") {
            return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
        }

        const { username, password, name, role } = await request.json();

        const existingUser = await prisma.user.findUnique({
            where: { username },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "Usuário já existe" },
                { status: 400 }
            );
        }

        const user = await prisma.user.create({
            data: {
                username,
                password,
                name,
                role: role || "USER",
                status: "OFFLINE",
            },
        });

        return NextResponse.json(user);
    } catch (error) {
        return NextResponse.json(
            { error: "Erro ao criar usuário" },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.role !== "ADMIN") {
            return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
        }

        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                name: true,
                role: true,
                status: true,
                image: true,
                createdAt: true,
            },
        });

        return NextResponse.json(users);
    } catch (error) {
        return NextResponse.json(
            { error: "Erro ao buscar usuários" },
            { status: 500 }
        );
    }
}
