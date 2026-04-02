import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession, setSession } from "@/lib/auth";

export async function PATCH(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        const { name, image, status } = await request.json();

        const updatedData: any = {};
        if (name) updatedData.name = name;
        if (image !== undefined) updatedData.image = image;
        if (status) updatedData.status = status;

        const user = await prisma.user.update({
            where: { id: session.id },
            data: updatedData,
            select: {
                id: true,
                username: true,
                name: true,
                role: true,
                image: true
            }
        });

        const sessionUser = {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
        };

        await setSession(sessionUser);

        return NextResponse.json(user);
    } catch (error) {
        return NextResponse.json({ error: "Erro ao atualizar perfil" }, { status: 500 });
    }
}
