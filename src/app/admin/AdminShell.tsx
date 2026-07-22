"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import Sidebar from "@/components/sidebar";

export default function AdminShell({
  children,
  restaurantName,
}: Readonly<{
  children: React.ReactNode;
  restaurantName: string;
}>) {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar
        restaurantName={restaurantName}
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded((prev) => !prev)}
      />
      <main
        className="min-h-screen pt-20 transition-[margin-left] duration-300 ease-in-out sm:pt-16 lg:pt-0"
        style={{ marginLeft: isExpanded ? 288 : 104 }}
      >
        <div className="p-4 sm:p-6 md:p-8">{children}</div>
      </main>
      <style>{`
        @media (max-width: 1023px) {
          main { margin-left: 0 !important; }
        }
      `}</style>
    </div>
  );
}
