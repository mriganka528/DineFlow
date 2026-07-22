'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  ShoppingCart,
  SquareChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';
import api from '@/lib/api';

interface SidebarProps {
  restaurantName: string;
  isExpanded: boolean;
  onToggle: () => void;
}

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/inventory', label: 'Inventory', icon: Package },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

const ITEM_HEIGHT = 48;
const ITEM_GAP = 4;

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'DF';
  if (words.length === 1) return words[0][0]?.toUpperCase() ?? 'DF';
  const first = words[0];
  const last = words[words.length - 1];
  return `${first[0]?.toUpperCase() ?? ''}${last[0]?.toUpperCase() ?? ''}`;
}

export default function Sidebar({ restaurantName, isExpanded, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const initials = useMemo(() => getInitials(restaurantName), [restaurantName]);

  const activeIndex = useMemo(
    () => NAV_ITEMS.findIndex((item) => pathname === item.href || pathname.startsWith(item.href + '/')),
    [pathname],
  );

  // Close mobile sheet on navigation
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  async function handleLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await api.post('/api/admin/logout');
    } finally {
      router.push('/admin/login');
      router.refresh();
    }
  }

  function SidebarInner({ expanded }: { expanded: boolean }) {
    return (
      <div className="flex h-full flex-col">
        {/* Logo / Brand */} 
        <div className="flex items-center gap-3 px-4 py-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground font-bold text-sm shadow-sm">
            {initials}
          </div>
          <span
            className="overflow-hidden whitespace-nowrap font-semibold text-sidebar-foease-in-outreground transition-[opacity,transform,width] duration-300 "
            style={{
              opacity: expanded ? 1 : 0,
              transform: expanded ? 'translateX(0)' : 'translateX(-8px)',
              width: expanded ? 'auto' : 0,
            }}
          >
            {restaurantName}
          </span>
        </div>

        {/* Divider */}
        <div className="mx-3 h-px bg-sidebar-border" />

        {/* Navigation */}
        <nav id="sidebar-nav" className="flex-1 px-3 py-4" role="navigation" aria-label="Admin navigation">
          <ul role="list" className="relative flex flex-col gap-1">
            {activeIndex >= 0 && (
              <div
                aria-hidden="true"
                className="absolute left-0 right-0 rounded-xl bg-sidebar-primary shadow-md transition-transform duration-300 ease-in-out"
                style={{
                  height: ITEM_HEIGHT,
                  transform: `translateY(${activeIndex * (ITEM_HEIGHT + ITEM_GAP)}px)`,
                }}
              />
            )}

            {NAV_ITEMS.map((item, index) => {
              const Icon = item.icon;
              const isActive = index === activeIndex;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className="relative z-10 flex items-center gap-3 rounded-xl px-3 transition-colors duration-200"
                    style={{ height: ITEM_HEIGHT }}
                  >
                    <div className="flex size-6 shrink-0 items-center justify-center">
                      <Icon
                        className={`size-5 transition-colors duration-200 ${isActive
                          ? 'text-sidebar-primary-foreground'
                          : 'text-sidebar-foreground/70'
                          }`}
                      />
                    </div>
                    <span
                      className="overflow-hidden whitespace-nowrap text-sm font-medium transition-[opacity,transform,width] duration-300 delay-75 ease-in-out"
                      style={{
                        opacity: expanded ? 1 : 0,
                        transform: expanded ? 'translateX(0)' : 'translateX(-8px)',
                        width: expanded ? 'auto' : 0,
                        color: isActive ? 'var(--sidebar-primary-foreground)' : 'var(--sidebar-foreground)',
                      }}
                    >
                      {item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Divider */}
        <div className="mx-3 h-px bg-sidebar-border" />

        {/* Footer */}
        <div className="flex flex-col gap-2 p-3">

          <Button
            type="button"
            variant="ghost"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center justify-start gap-3 rounded-xl px-3 py-5 text-sidebar-foreground/70 transition-colors dark:hover:bg-destructive/10 hover:bg-destructive/10 hover:text-destructive disabled:opacity-60"
          >
            <span className='flex gap-2'>
              <LogOut className="size-5 shrink-0" />
              <span
                className="overflow-hidden whitespace-nowrap text-sm font-medium transition-[opacity,transform,width] duration-300 delay-75 ease-in-out"
                style={{
                  opacity: expanded ? 1 : 0,
                  transform: expanded ? 'translateX(0)' : 'translateX(-8px)',
                  width: expanded ? 'auto' : 0,
                }}
              >
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </span>
            </span>
          </Button>
          <span
            className="overflow-hidden whitespace-nowrap px-3 text-xs text-sidebar-foreground/50 transition-[opacity,width] duration-300 ease-in-out"
            style={{
              opacity: expanded ? 1 : 0,
              width: expanded ? 'auto' : 0,
              height: expanded ? 'auto' : 0,
            }}
          >
            Admin workspace
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile/Tablet trigger button — visible below lg */}

      <button
        type="button"
        onClick={() => setIsMobileOpen(true)}
        aria-label="Open navigation"
        className="fixed left-4 top-4 z-50 flex size-10 items-center justify-center rounded-xl bg-sidebar shadow-lg ring-1 ring-sidebar-border lg:hidden"
      >
        <Menu className="size-5 text-sidebar-foreground" />
      </button>

      {/* Mobile/Tablet: Sheet-based sidebar */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>

        <SheetContent
          side="left"
          className="w-70 max-w-[80vw] border-r-0 bg-sidebar p-0 sm:w-75 [&>button]:hidden"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarInner expanded={true} />
        </SheetContent>
      </Sheet>

      {/* Desktop: Floating sidebar — hidden below lg */}
      <aside
        className="fixed top-4 bottom-4 left-4 z-40 hidden flex-col rounded-2xl bg-sidebar shadow-xl ring-1 ring-sidebar-border/50 transition-[width] duration-300 ease-in-out lg:flex"
        style={{ width: isExpanded ? 256 : 72 }}
      >
        {/* Desktop toggle */}
        <div className="flex items-center justify-center p-3 ">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={isExpanded}
            aria-controls="sidebar-nav"
            aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
            className="flex size-10 items-center justify-center  rounded-xl text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <SquareChevronRight 
              className="size-6 transition-transform duration-300"
              style={{ transform: isExpanded ? 'scaleX(-1)' : 'scaleX(1)' }}
            />
          </button>
        </div>

        <SidebarInner expanded={isExpanded} />
      </aside>
    </>
  );
}
