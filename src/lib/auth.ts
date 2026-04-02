import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

export async function getSession() {
    const session = cookies().get("session")?.value;
    if (!session) return null;
    const parsed = JSON.parse(session);
    if (!parsed?.id) return null;

    // Always fetch fresh user from DB so that role changes (e.g. promoting to admin)
    // take effect immediately without requiring a logout/login cycle.
    const user = await prisma.user.findUnique({
        where: { id: parsed.id },
        select: { id: true, username: true, name: true, role: true, image: true, status: true }
    });
    return user ?? null;
}

export async function setSession(user: any) {
    cookies().set("session", JSON.stringify(user), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: "/",
    });
}

export async function logout() {
    cookies().delete("session");
}
