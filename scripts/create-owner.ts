import bcrypt from "bcryptjs";
import { existsSync } from "node:fs";
import process from "node:process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { Writable } from "node:stream";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

function loadEnv() {
  if (!process.env.DATABASE_URL && existsSync(".env")) {
    process.loadEnvFile(".env");
  }
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/);
  const firstName = parts.shift();

  if (!firstName) {
    throw new Error("Name is required.");
  }

  return {
    firstName,
    lastName: parts.length > 0 ? parts.join(" ") : null,
  };
}

async function askHidden(question: string) {
  const mutedOutput = new Writable({
    write(chunk, _encoding, callback) {
      const text = chunk.toString();

      if (text.includes(question)) {
        output.write(text);
      }

      callback();
    }
  });

  const rl = createInterface({ input, output: mutedOutput });

  try {
    const answer = await rl.question(question);
    output.write("\n");
    return answer;
  } finally {
    rl.close();
  }
}

async function main() {
  loadEnv();

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Add it to .env or your shell environment.");
  }

  const existingOwner = await prisma.admin.findFirst({
    where: { role: Role.OWNER },
    select: { email: true },
  });

  if (existingOwner) {
    console.log(`Owner already exists: ${existingOwner.email}`);
    return;
  }

  const rl = createInterface({ input, output });

  try {
    const name = await rl.question("Enter Name: ");
    const email = (await rl.question("Enter Email: ")).trim().toLowerCase();
    rl.close();

    if (!email) {
      throw new Error("Email is required.");
    }

    const password = await askHidden("Enter Password: ");

    if (password.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }

    const { firstName, lastName } = splitName(name);
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const owner = await prisma.admin.create({
      data: {
        firstName,
        lastName,
        email,
        passwordHash,
        role: Role.OWNER,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    console.log(`Done. Created ${owner.role.toLowerCase()} ${owner.email} (${owner.id}).`);
  } finally {
    rl.close();
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
