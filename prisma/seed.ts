import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    // Clear existing data
    await prisma.message.deleteMany({});
    await prisma.participant.deleteMany({});
    await prisma.conversation.deleteMany({});
    await prisma.user.deleteMany({});

    // Create users
    const user1 = await prisma.user.create({
        data: {
            username: "admin",
            password: "admin123",
            name: "Administrador",
            role: "ADMIN",
            status: "ONLINE",
            image: "https://ui-avatars.com/api/?name=Admin&background=0b141a&color=25d366"
        }
    });

    const user2 = await prisma.user.create({
        data: {
            username: "user1",
            password: "user123",
            name: "João Silva",
            role: "USER",
            status: "ONLINE",
            image: "https://ui-avatars.com/api/?name=João+Silva&background=0b141a&color=25d366"
        }
    });

    const user3 = await prisma.user.create({
        data: {
            username: "user2",
            password: "user123",
            name: "Maria Santos",
            role: "USER",
            status: "ONLINE",
            image: "https://ui-avatars.com/api/?name=Maria+Santos&background=0b141a&color=25d366"
        }
    });

    const user4 = await prisma.user.create({
        data: {
            username: "user3",
            password: "user123",
            name: "Carlos Oliveira",
            role: "USER",
            status: "OFFLINE",
            image: "https://ui-avatars.com/api/?name=Carlos+Oliveira&background=0b141a&color=25d366"
        }
    });

    // Create direct conversations
    const conv1 = await prisma.conversation.create({
        data: {
            isGroup: false,
            createdById: user1.id,
            participants: {
                create: [
                    { userId: user1.id },
                    { userId: user2.id }
                ]
            }
        }
    });

    const conv2 = await prisma.conversation.create({
        data: {
            isGroup: false,
            createdById: user1.id,
            participants: {
                create: [
                    { userId: user1.id },
                    { userId: user3.id }
                ]
            }
        }
    });

    // Create group conversation
    const groupConv = await prisma.conversation.create({
        data: {
            name: "Equipe de Desenvolvimento",
            isGroup: true,
            createdById: user1.id,
            participants: {
                create: [
                    { userId: user1.id, isAdmin: true },
                    { userId: user2.id },
                    { userId: user3.id },
                    { userId: user4.id }
                ]
            }
        }
    });

    // Create messages
    await prisma.message.create({
        data: {
            content: "Olá! Tudo bem?",
            type: "TEXT",
            conversationId: conv1.id,
            senderId: user2.id,
            status: "READ"
        }
    });

    await prisma.message.create({
        data: {
            content: "Oi! Tudo certo por aqui! 😊",
            type: "TEXT",
            conversationId: conv1.id,
            senderId: user1.id,
            status: "READ"
        }
    });

    await prisma.message.create({
        data: {
            content: "Boa tarde!",
            type: "TEXT",
            conversationId: conv2.id,
            senderId: user3.id,
            status: "READ"
        }
    });

    await prisma.message.create({
        data: {
            content: "Pessoal, alguma novidade no projeto?",
            type: "TEXT",
            conversationId: groupConv.id,
            senderId: user1.id,
            status: "READ"
        }
    });

    await prisma.message.create({
        data: {
            content: "Tudo funcionando perfeitamente! Conseguimos resolver aquele bug.",
            type: "TEXT",
            conversationId: groupConv.id,
            senderId: user2.id,
            status: "READ"
        }
    });

    await prisma.message.create({
        data: {
            content: "Excelente! Parabéns a todos. 🎉",
            type: "TEXT",
            conversationId: groupConv.id,
            senderId: user1.id,
            status: "READ"
        }
    });

    console.log("✅ Database seeded successfully!");
    console.log("\n📝 Test Accounts:");
    console.log("1. Admin");
    console.log("   Username: admin");
    console.log("   Password: admin123");
    console.log("\n2. User 1 - João Silva");
    console.log("   Username: user1");
    console.log("   Password: user123");
    console.log("\n3. User 2 - Maria Santos");
    console.log("   Username: user2");
    console.log("   Password: user123");
    console.log("\n4. User 3 - Carlos Oliveira");
    console.log("   Username: user3");
    console.log("   Password: user123");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
