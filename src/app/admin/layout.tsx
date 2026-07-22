import { ThemeProvider } from "@/components/theme-provider";
import { prisma } from "@/lib/prisma";
import AdminShell from "./AdminShell";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const restaurant = await prisma.restaurant.findFirst({
    select: { restaurantName: true },
  });

  const restaurantName = restaurant?.restaurantName || "DineFlow";

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AdminShell restaurantName={restaurantName}>{children}</AdminShell>
    </ThemeProvider>
  );
}
