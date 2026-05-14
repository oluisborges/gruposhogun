import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_OWNER_EMAIL ?? "owner@shogun.com";
  const password = process.env.SEED_OWNER_PASSWORD ?? "changeme123";
  const name = process.env.SEED_OWNER_NAME ?? "Owner Shogun";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Owner already exists: ${email}`);
    return;
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, password: hashed, role: Role.OWNER },
  });

  console.log(`Created owner: ${user.email}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
