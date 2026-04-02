import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const adminExists = await prisma.user.findFirst({
            where: { role: "ADMIN" },
        });

        if (adminExists) {
            return NextResponse.json({ message: "Admin já existe" });
        }

        const admin = await prisma.user.create({
            data: {
                username: "admin",
                password: "admin123", // In production, use hashing
                name: "Administrador",
                role: "ADMIN",
                status: "OFFLINE",
            },
        });

        return NextResponse.json({ message: "Admin criado com sucesso", admin });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Erro ao criar admin" }, { status: 500 });
    }
}
