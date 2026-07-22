import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
  const carts = await prisma.cart.findMany({ orderBy: { createdAt: "asc" } });
  console.log("Total carts:", carts.length);

  const seen = new Set<string>();
  for (const c of carts) {
    if (seen.has(c.customerId)) {
      await prisma.cartItem.deleteMany({ where: { cartId: c.id } });
      await prisma.cart.delete({ where: { id: c.id } });
      console.log("Deleted duplicate cart", c.id, "for customer", c.customerId);
    } else {
      seen.add(c.customerId);
    }
  }

  const remaining = await prisma.cart.findMany();
  console.log("Remaining carts:", remaining.length);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
