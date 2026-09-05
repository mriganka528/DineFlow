"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bike,
  Check,
  ChevronRight,
  Clock3,
  Flame,
  Loader2,
  MapPin,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/currency";
import { cloudinaryLoader, isCloudinaryUrl } from "@/lib/cloudinary-loader";
import { FoodImage, FoodImagePlaceholder } from "@/components/ui/food-image";
import AccountMenu from "@/components/account-menu";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { State, City } from "country-state-city";
import { SearchableSelect } from "@/components/ui/searchable-select";

import type { CustomerAddress, MenuCategory, MenuItem, MenuSettings, ServerCart } from "./types";

type OrderType = "DINE_IN" | "DELIVERY";
type PaymentMethod = "CASH" | "ONLINE";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: () => void) => void;
    };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  if (typeof window !== "undefined" && window.Razorpay) return Promise.resolve(true);
  const existing = document.querySelector(
    'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
  ) as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      existing.addEventListener("load", () => resolve(!!window.Razorpay));
      existing.addEventListener("error", () => resolve(false));
    });
  }
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

type SortKey = "featured" | "rating" | "popular" | "newest" | "price-low" | "price-high" | "name";

type MenuClientProps = {
  items: MenuItem[];
  categories: MenuCategory[];
  settings: MenuSettings;
};

function formatPrice(value: number, currency: string) {
  return formatMoney(value, currency);
}

function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

function formatAddress(addr: CustomerAddress) {
  return [addr.houseNo, addr.street, addr.area, addr.city, addr.state, addr.pincode]
    .filter(Boolean)
    .join(", ");
}

export default function MenuClient({
  items: initialItems,
  categories,
  settings: initialSettings,
}: MenuClientProps) {
  const router = useRouter();
  const [menuItems, setMenuItems] = useState<MenuItem[]>(initialItems);
  const [settings, setSettings] = useState(initialSettings);
  const items = menuItems;
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("featured");
  const [availableOnly, setAvailableOnly] = useState(true);
  const [addedItemId, setAddedItemId] = useState<string | null>(null);
  const [orderType, setOrderType] = useState<OrderType>("DINE_IN");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [tableNumber, setTableNumber] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const gridSection = useInView(0.05);

  // Cart state — single cart per customer
  const [cart, setCart] = useState<ServerCart | null>(null);

  // Address state for delivery checkout
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState({
    label: "",
    houseNo: "",
    street: "",
    area: "",
    city: "",
    state: "",
    pincode: "",
    landmark: "",
  });
  const [savingAddress, setSavingAddress] = useState(false);
  const [stateCode, setStateCode] = useState("");

  const indianStates = useMemo(
    () =>
      State.getStatesOfCountry("IN").map((s) => ({
        label: s.name,
        value: s.isoCode,
      })),
    [],
  );

  const stateCities = useMemo(
    () =>
      stateCode
        ? City.getCitiesOfState("IN", stateCode).map((c) => ({
          label: c.name,
          value: c.name,
        }))
        : [],
    [stateCode],
  );


  const fetchCart = useCallback(async () => {
    try {
      const { data } = await api.get("/api/cart");
      setCart(data.cart);
    } catch {
      // silently fail
    }
  }, []);

  const fetchAddresses = useCallback(async () => {
    try {
      const { data } = await api.get("/api/address");
      setAddresses(data.addresses);
      const defaultAddr = data.addresses.find(
        (a: CustomerAddress) => a.isDefault,
      );
      if (defaultAddr && !selectedAddressId) {
        setSelectedAddressId(defaultAddr.id);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  useEffect(() => {
    if (orderType === "DINE_IN" && !settings.dineInEnabled && settings.deliveryEnabled) {
      setOrderType("DELIVERY");
    } else if (orderType === "DELIVERY" && !settings.deliveryEnabled && settings.dineInEnabled) {
      setOrderType("DINE_IN");
    }
  }, [settings.dineInEnabled, settings.deliveryEnabled, orderType]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  // SSE: real-time food availability and settings updates
  useEffect(() => {
    const es = new EventSource("/api/orders/stream");

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "food_availability" && data.food) {
          setMenuItems((prev) =>
            prev.map((item) =>
              item.id === data.food.id ? { ...item, available: data.food.available } : item,
            ),
          );
        } else if (data.type === "settings_update" && data.settings) {
          setSettings((prev) => ({ ...prev, ...data.settings }));
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      es.close();
    };

    return () => es.close();
  }, []);

  const quantityMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (cart) {
      for (const item of cart.items) {
        map[item.foodId] = item.quantity;
      }
    }
    return map;
  }, [cart]);

  const visibleItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return items
      .filter((item) => {
        const matchesSearch =
          !normalizedSearch ||
          item.name.toLowerCase().includes(normalizedSearch) ||
          item.description.toLowerCase().includes(normalizedSearch) ||
          item.categoryName.toLowerCase().includes(normalizedSearch);
        const matchesCategory =
          selectedCategory === "all" || item.categoryId === selectedCategory;
        const matchesAvailability = !availableOnly || item.available;

        return matchesSearch && matchesCategory && matchesAvailability;
      })
      .sort((first, second) => {
        if (sortKey === "price-low") return first.price - second.price;
        if (sortKey === "price-high") return second.price - first.price;
        if (sortKey === "name") return first.name.localeCompare(second.name);
        if (sortKey === "rating") return (second.rating ?? 0) - (first.rating ?? 0);
        if (sortKey === "popular") return (second.popularity ?? 0) - (first.popularity ?? 0);
        if (sortKey === "newest") {
          return (second.createdAt ?? "").localeCompare(first.createdAt ?? "");
        }
        return Number(second.available) - Number(first.available);
      });
  }, [availableOnly, items, searchTerm, selectedCategory, sortKey]);

  const cartLines = useMemo(() => {
    if (!cart) return [];
    return cart.items
      .map((cartItem) => {
        const menuItem = items.find((mi) => mi.id === cartItem.foodId);
        if (!menuItem) return null;
        return {
          item: menuItem,
          quantity: cartItem.quantity,
          lineTotal: menuItem.price * cartItem.quantity,
        };
      })
      .filter(Boolean) as Array<{
        item: MenuItem;
        quantity: number;
        lineTotal: number;
      }>;
  }, [cart, items]);

  const subtotal = cartLines.reduce((total, line) => total + line.lineTotal, 0);
  const tax = subtotal * (settings.gstRate / 100);
  const serviceCharge = subtotal > 0 ? settings.serviceCharge : 0;
  const total = subtotal + tax + serviceCharge;
  const cartQuantity = cartLines.reduce((t, line) => t + line.quantity, 0);
  const activeCategory = categories.find(
    (category) => category.id === selectedCategory,
  );
  const availableCount = items.filter((item) => item.available).length;

  const addItem = useCallback(
    async (item: MenuItem) => {
      if (!item.available || settings.orderMode !== "ACCEPTING" || !cart) return;

      setCart((prev) => {
        if (!prev) return prev;
        const existing = prev.items.find((ci) => ci.foodId === item.id);
        if (existing) {
          return {
            ...prev,
            items: prev.items.map((ci) =>
              ci.foodId === item.id
                ? { ...ci, quantity: ci.quantity + 1 }
                : ci,
            ),
          };
        }
        return {
          ...prev,
          items: [
            ...prev.items,
            {
              id: "temp-" + item.id,
              foodId: item.id,
              quantity: 1,
              food: {
                id: item.id,
                name: item.name,
                price: item.price,
                gst: 0,
                available: item.available,
              },
            },
          ],
        };
      });

      setAddedItemId(item.id);
      setTimeout(() => setAddedItemId(null), 600);

      try {
        await api.post("/api/cart/items", { foodId: item.id, quantity: 1 });
        fetchCart();
      } catch {
        fetchCart();
      }
    },
    [settings.orderMode, cart, fetchCart],
  );

  const decreaseItem = useCallback(
    async (item: MenuItem) => {
      if (!cart) return;
      const currentQty = quantityMap[item.id] ?? 0;
      const newQty = currentQty - 1;

      setCart((prev) => {
        if (!prev) return prev;
        if (newQty <= 0) {
          return {
            ...prev,
            items: prev.items.filter((ci) => ci.foodId !== item.id),
          };
        }
        return {
          ...prev,
          items: prev.items.map((ci) =>
            ci.foodId === item.id ? { ...ci, quantity: newQty } : ci,
          ),
        };
      });

      try {
        if (newQty <= 0) {
          await api.delete("/api/cart/items", { data: { foodId: item.id } });
        } else {
          await api.patch("/api/cart/items", { foodId: item.id, quantity: newQty });
        }
        fetchCart();
      } catch {
        fetchCart();
      }
    },
    [cart, fetchCart],
  );

  const removeItem = useCallback(
    async (foodId: string) => {
      if (!cart) return;

      setCart((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.filter((ci) => ci.foodId !== foodId),
        };
      });

      try {
        await api.delete("/api/cart/items", { data: { foodId } });
        fetchCart();
      } catch {
        fetchCart();
      }
    },
    [cart, fetchCart],
  );

  const handleSaveAddress = useCallback(async () => {
    const { houseNo, street, area, city, state, pincode } = addressForm;
    if (!houseNo || !street || !area || !city || !state || !pincode) return;

    setSavingAddress(true);
    try {
      const { data } = await api.post("/api/address", {
        ...addressForm,
        isDefault: addresses.length === 0,
      });
      setSelectedAddressId(data.address.id);
      setShowAddressForm(false);
      setAddressForm({
        label: "",
        houseNo: "",
        street: "",
        area: "",
        city: "",
        state: "",
        pincode: "",
        landmark: "",
      });
      fetchAddresses();
    } catch {
      // silently fail
    } finally {
      setSavingAddress(false);
    }
  }, [addressForm, addresses.length, fetchAddresses]);

  const handleDeleteAddress = useCallback(
    async (id: string) => {
      try {
        await api.delete("/api/address", { data: { id } });
        if (selectedAddressId === id) {
          setSelectedAddressId(null);
        }
        fetchAddresses();
      } catch {
        // silently fail
      }
    },
    [selectedAddressId, fetchAddresses],
  );

  const unavailableCartItems = cartLines.filter((line) => !line.item.available);
  const hasUnavailableItems = unavailableCartItems.length > 0;

  const canCheckout =
    cartQuantity > 0 &&
    settings.orderMode === "ACCEPTING" &&
    !hasUnavailableItems &&
    (orderType === "DINE_IN" || selectedAddressId !== null);

  const handleCheckout = useCallback(async () => {
    if (!cart || cartQuantity === 0) return;
    if (orderType === "DELIVERY" && !selectedAddressId) return;
    if (hasUnavailableItems) {
      toast.error("Some items in your cart are unavailable. Please remove them.");
      return;
    }
    setCheckingOut(true);

    try {
      if (paymentMethod === "ONLINE") {
        const loaded = await loadRazorpayScript();
        if (!loaded) {
          toast.error("Failed to load payment gateway");
          setCheckingOut(false);
          return;
        }
      }

      const { data } = await api.post("/api/checkout", {
        orderType,
        tableNumber:
          orderType === "DINE_IN" && tableNumber
            ? Number(tableNumber)
            : null,
        addressId: orderType === "DELIVERY" ? selectedAddressId : null,
        paymentMethod,
      });

      if (!data.success) {
        toast.error(data.message || "Checkout failed");
        setCheckingOut(false);
        return;
      }

      if (paymentMethod === "ONLINE") {
        const { data: payData } = await api.post("/api/payment/create-order", { orderId: data.order.id });

        if (!payData.success) {
          toast.error(payData.message || "Failed to create payment");
          setCheckingOut(false);
          return;
        }

        const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
        if (!razorpayKey) {
          toast.error("Payment configuration error");
          setCheckingOut(false);
          return;
        }

        setCheckoutOpen(false);

        const options: Record<string, unknown> = {
          key: razorpayKey,
          amount: payData.amount,
          currency: payData.currency,
          name: settings.restaurantName,
          description: `Order #${data.order.orderNumber}`,
          order_id: payData.razorpayOrderId,
          method: {
            upi: true,
            card: true,
            netbanking: true,
            wallet: true,
          },
          handler: async (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            try {
              const { data: verifyData } = await api.post("/api/payment/verify", response);

              if (verifyData.success) {
                setCart((prev) => (prev ? { ...prev, items: [] } : prev));
                fetchCart();
                toast.success("Payment successful!");
                router.push(`/menu/orders/${data.order.id}`);
              } else {
                toast.error("Payment verification failed");
                fetchCart();
              }
            } catch {
              toast.error("Payment verification failed");
              fetchCart();
            }
          },
          modal: {
            ondismiss: () => {
              toast.error("Payment cancelled");
              fetchCart();
            },
          },
          theme: { color: "#f59e0b" },
        };

        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", () => {
          toast.error("Payment failed. Please try again.");
          fetchCart();
        });
        rzp.open();
        setCheckingOut(false);
        return;
      }

      // CASH flow: order is created and cart is already cleared server-side
      setCheckoutOpen(false);
      setCart((prev) => (prev ? { ...prev, items: [] } : prev));
      fetchCart();
      toast.success("Order placed successfully!");
      router.push(`/menu/orders/${data.order.id}`);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setCheckingOut(false);
    }
  }, [
    cart,
    cartQuantity,
    orderType,
    tableNumber,
    selectedAddressId,
    paymentMethod,
    settings.restaurantName,
    fetchCart,
  ]);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setSortKey("featured");
    setAvailableOnly(true);
  };

  const hasActiveFilters =
    searchTerm ||
    selectedCategory !== "all" ||
    sortKey !== "featured" ||
    !availableOnly;



  return (
    <main className="min-h-screen bg-linear-to-b from-amber-50/80 via-white to-slate-50/50 pb-32 text-foreground">
      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden">
        <div className="menu-hero-gradient absolute inset-0 bg-linear-to-br from-amber-100/90 via-orange-50/60 to-teal-50/70" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.04)_1px,transparent_0)] bg-size-[20px_20px]" />
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-linear-to-br from-amber-200/40 to-orange-200/30 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-linear-to-tr from-teal-200/30 to-emerald-100/20 blur-3xl" />
        <div className="flex justify-end my-3 pr-3 z-10">
          <span className=" rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm ring-1 ring-black/5 backdrop-blur">
            <AccountMenu />
          </span>
        </div>
        <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-8 sm:px-6 sm:pb-14 sm:pt-12 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            {/* Left: text */}
            <div className="flex flex-col justify-center gap-5 menu-fade-up">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm">
                  <Sparkles className="mr-1.5 size-3" />
                  Freshly prepared
                </Badge>
                {settings.orderMode === "ACCEPTING" && (
                  <Badge
                    variant="outline"
                    className="border-emerald-200 bg-emerald-50/80 text-emerald-700"
                  >
                    <Check className="mr-1 size-3" />
                    Accepting Orders
                  </Badge>
                )}
                {settings.orderMode === "PAUSED" && (
                  <Badge
                    variant="outline"
                    className="border-amber-200 bg-amber-50/80 text-amber-700"
                  >
                    <Clock3 className="mr-1 size-3" />
                    Paused
                    <span className="ml-1 hidden text-amber-600/80 sm:inline">
                      — Restaurant is temporarily unavailable
                    </span>
                  </Badge>
                )}
                {settings.orderMode === "CLOSED" && (
                  <Badge
                    variant="outline"
                    className="border-red-200 bg-red-50/80 text-red-700"
                  >
                    <X className="mr-1 size-3" />
                    Closed
                    <span className="ml-1 hidden text-red-600/80 sm:inline">
                      — Opens tomorrow
                    </span>
                  </Badge>
                )}
              </div>
              {/* Restaurant Logo */}
              {settings.logoUrl && (
                <div className="flex gap-3">
                  <Image
                    src={settings.logoUrl}
                    alt={settings.restaurantName}
                    width={53}
                    height={53}
                    className="rounded-full object-cover ring-2 ring-white shadow-lg"
                  />
                  <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl">
                    {settings.restaurantName}
                  </h1>
                </div>
              )}


              <p className="max-w-lg text-base leading-relaxed text-zinc-600 sm:text-lg">
                {settings.tagline ||
                  "Browse the live menu, find your cravings quickly, and build your cart in a few taps."}
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-1">
                <div className="flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm ring-1 ring-black/5 backdrop-blur">
                  <UtensilsCrossed className="size-4 text-amber-600" />
                  {items.length} dishes
                </div>
                <div className="flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm ring-1 ring-black/5 backdrop-blur">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                  </span>
                  {availableCount} available now
                </div>
                <div className="flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm ring-1 ring-black/5 backdrop-blur">
                  <Clock3 className="size-4 text-teal-600" />~
                  {settings.averagePrepTime} min
                </div>
                <Link
                  href="/menu/orders"
                  className="flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm transition-colors hover:bg-amber-400"
                >
                  <ShoppingBag className="size-4" />
                  My Orders
                </Link>
              </div>

              {/* Order type toggle */}
              <div className="flex items-center gap-1.5 self-start rounded-full border border-amber-200/70 bg-white/90 p-1.5 shadow-md shadow-amber-500/10 ring-1 ring-black/5 backdrop-blur">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOrderType("DINE_IN")}
                  disabled={!settings.dineInEnabled}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-7 py-3 text-base font-semibold transition-all duration-300",
                    orderType === "DINE_IN"
                      ? "bg-linear-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30"
                      : "text-zinc-600 hover:bg-amber-50 hover:text-amber-700",
                    !settings.dineInEnabled && "cursor-not-allowed opacity-40",
                  )}
                >
                  <Store className="size-5" />
                  Dine in
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOrderType("DELIVERY")}
                  disabled={!settings.deliveryEnabled}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-7 py-3 text-base font-semibold transition-all duration-300",
                    orderType === "DELIVERY"
                      ? "bg-linear-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30"
                      : "text-zinc-600 hover:bg-amber-50 hover:text-amber-700",
                    !settings.deliveryEnabled && "cursor-not-allowed opacity-40",
                  )}
                >
                  <Bike className="size-5" />
                  Delivery
                </Button>
              </div>
            </div>

            {/* Right: image mosaic */}
            <div
              className="menu-fade-up grid min-h-88 grid-cols-3 grid-rows-2 gap-2.5 sm:min-h-104 sm:gap-3"
              style={{ animationDelay: "120ms" }}
            >
              <div className="relative col-span-2 row-span-2 overflow-hidden rounded-2xl shadow-lg ring-1 ring-black/5">
                {items[0]?.imageUrl && (
                  <Image
                    src={items[0].imageUrl}
                    alt="A table filled with plated food"
                    fill
                    preload
                    sizes="(min-width: 1024px) 30vw, 60vw"
                    className="object-cover transition-transform duration-700 hover:scale-105"
                  />
                )}
                {items[0]?.imageUrl && (
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
                )}
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-white/70">
                    Today&apos;s picks
                  </p>
                  <p className="mt-1 text-lg font-semibold text-white sm:text-xl">
                    Handpicked from the kitchen
                  </p>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-2xl shadow-md ring-1 ring-black/5">
                {items[0]?.imageUrl && (
                  <>
                    <Image
                      src={items[0].imageUrl}
                      alt={items[0]?.name ?? "Featured dish"}
                      fill
                      sizes="(min-width: 1024px) 15vw, 30vw"
                      className="object-cover transition-transform duration-700 hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent" />
                    <p className="absolute bottom-2 left-2 right-2 line-clamp-2 text-xs font-semibold text-white sm:text-sm">
                      {items[0]?.name ?? "Featured dish"}
                    </p>
                  </>
                )}
              </div>
              <div className="relative overflow-hidden rounded-2xl shadow-md ring-1 ring-black/5">
                {items[1]?.imageUrl && (
                  <>
                    <Image
                      src={items[1].imageUrl}
                      alt={items[1]?.name ?? "Popular dish"}
                      fill
                      sizes="(min-width: 1024px) 15vw, 30vw"
                      className="object-cover transition-transform duration-700 hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent" />
                    <p className="absolute bottom-2 left-2 right-2 line-clamp-2 text-xs font-semibold text-white sm:text-sm">
                      {items[1]?.name ?? "Popular dish"}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-amber-300/40 to-transparent" />
      </section>

      {/* ─── Sticky Search Bar ─── */}
      <section className="sticky top-0 z-30 border-b border-black/6 bg-white/80 shadow-sm shadow-black/3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-2.5 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:gap-3 lg:px-8">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search dishes, ingredients..."
              className="h-11 rounded-xl text-zinc-700 border-zinc-200/80 bg-zinc-50/60 pl-10 text-sm shadow-inner transition-colors duration-200 placeholder:text-zinc-600 focus-visible:bg-white"
            />
            {searchTerm && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
              >
                <X className="size-3.5" />
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="h-11 w-full rounded-xl border-zinc-200/80 bg-zinc-50/80 text-sm sm:w-44 text-zinc-700">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={sortKey}
              onValueChange={(value) => setSortKey(value as SortKey)}
            >
              <SelectTrigger className="h-11 w-full rounded-xl border-zinc-200/80 bg-zinc-50/80 text-sm sm:w-40 text-zinc-700">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="featured">Featured first</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price-low">Price: low to high</SelectItem>
                <SelectItem value="price-high">Price: high to low</SelectItem>
                <SelectItem value="name">Name: A to Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* ─── Categories & Grid ─── */}
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Category pills */}
        <div
          ref={categoryScrollRef}
          className="hide-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
        >
          <Button
            type="button"
            variant="ghost"
            onClick={() => setSelectedCategory("all")}
            className={cn(
              "menu-scale-in inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-5 text-sm font-medium transition-all duration-300",
              selectedCategory === "all"
                ? "bg-zinc-900 text-white shadow-md shadow-zinc-900/20"
                : "bg-white text-zinc-600 shadow-sm ring-1 ring-black/6 hover:bg-zinc-50 hover:text-zinc-900",
            )}
          >
            <Flame className="size-3.5" />
            All
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs",
                selectedCategory === "all"
                  ? "bg-white/20"
                  : "bg-zinc-100 text-zinc-500",
              )}
            >
              {items.length}
            </span>
          </Button>
          {categories.map((category, i) => (
            <Button
              key={category.id}
              type="button"
              variant="ghost"
              onClick={() => setSelectedCategory(category.id)}
              className={cn(
                "menu-scale-in inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-5 text-sm font-medium transition-all duration-300",
                selectedCategory === category.id
                  ? "bg-zinc-900 text-white shadow-md shadow-zinc-900/20"
                  : "bg-white text-zinc-600 shadow-sm ring-1 ring-black/6 hover:bg-zinc-50 hover:text-zinc-900",
              )}
              style={{ animationDelay: `${(i + 1) * 50}ms` }}
            >
              {category.name}
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs",
                  selectedCategory === category.id
                    ? "bg-white/20"
                    : "bg-zinc-100 text-zinc-500",
                )}
              >
                {items.filter((item) => item.categoryId === category.id).length}
              </span>
            </Button>
          ))}
          <Button
            type="button"
            variant="ghost"
            onClick={() => setAvailableOnly((value) => !value)}
            className={cn(
              "menu-scale-in inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-5 text-sm font-medium transition-all duration-300",
              availableOnly
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "bg-white text-zinc-600 shadow-sm ring-1 ring-black/6 hover:bg-zinc-50",
            )}
            style={{ animationDelay: `${(categories.length + 1) * 50}ms` }}
          >
            <Check className="size-3.5" />
            Available
          </Button>
        </div>

        {/* Section header */}
        <div className="flex flex-col gap-2 border-b border-zinc-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="menu-slide-right">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-600">
              Explore dishes
            </p>
            <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
              {activeCategory ? activeCategory.name : "Full menu"}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {visibleItems.length} of {items.length} dishes
            </p>
          </div>
          {hasActiveFilters && (
            <Button
              type="button"
              variant="outline"
              onClick={clearFilters}
              className="menu-fade-in self-start rounded-full text-sm text-zinc-700"
            >
              <X className="size-3.5" />
              Reset filters
            </Button>
          )}
        </div>

        {/* Food grid */}
        <div ref={gridSection.ref} className="pt-6">
          {visibleItems.length > 0 ? (
            <div
              className={cn(
                "menu-card-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
                gridSection.inView && "is-visible",
              )}
            >
              {visibleItems.map((item) => {
                const quantity = quantityMap[item.id] ?? 0;
                const justAdded = addedItemId === item.id;

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "group menu-fade-up overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-zinc-900/8",
                      !item.available && "opacity-70",
                    )}
                  >
                    {/* Image */}
                    <div className="relative aspect-16/10 overflow-hidden">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          className="object-cover transition-transform duration-500 will-change-transform group-hover:scale-[1.06]"
                          loading="lazy"
                          loader={isCloudinaryUrl(item.imageUrl) ? cloudinaryLoader : undefined}
                        />
                      ) : (
                        <FoodImagePlaceholder />
                      )}
                      <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                      {/* Badges */}
                      <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                        <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-zinc-700 shadow-sm backdrop-blur-sm">
                          {item.categoryName}
                        </span>
                        {item.tag && (
                          <span className="rounded-full bg-rose-500/90 px-2.5 py-1 text-xs font-semibold text-white shadow-sm backdrop-blur-sm">
                            {item.tag}
                          </span>
                        )}
                        {!item.available && (
                          <span className="rounded-full bg-zinc-900/80 px-2.5 py-1 text-xs font-semibold text-white shadow-sm backdrop-blur-sm">
                            Sold out
                          </span>
                        )}
                      </div>

                      {/* Price tag */}
                      <div className="absolute bottom-3 right-3 rounded-full bg-white/95 px-3 py-1.5 text-sm font-bold text-zinc-900 shadow-md backdrop-blur-sm transition-transform duration-300 group-hover:scale-105">
                        {formatPrice(item.price, settings.currency)}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="line-clamp-1 text-base font-bold text-zinc-900">
                        {item.name}
                      </h3>
                      <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-relaxed text-zinc-500">
                        {item.description}
                      </p>

                      {/* Meta row */}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {(item.ratingCount ?? 0) > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                            <Star className="size-3 fill-amber-400 text-amber-400" />
                            {item.rating?.toFixed(1)}
                            <span className="text-amber-600/70">({item.ratingCount})</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500">
                            <Star className="size-3 opacity-40" />
                            Not Rated Yet
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">
                          <Clock3 className="size-3" />
                          {item.prepTime ?? settings.averagePrepTime}m
                        </span>
                      </div>

                      {/* Add to cart */}
                      <div className="mt-4">
                        {quantity > 0 ? (
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="icon"
                              className="size-9 rounded-full bg-zinc-900 text-gray-100 hover:bg-zinc-800"
                              onClick={() => decreaseItem(item)}
                              aria-label={`Remove one ${item.name}`}
                            >
                              <Minus className="size-3.5" />
                            </Button>
                            <div className="flex h-9 flex-1 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200">
                              {quantity} in cart
                            </div>
                            <Button
                              type="button"
                              size="icon"
                              className="size-9 rounded-full bg-zinc-900 text-gray-100 hover:bg-zinc-800"
                              onClick={() => addItem(item)}
                              disabled={
                                !item.available || settings.orderMode !== "ACCEPTING"
                              }
                              aria-label={`Add one ${item.name}`}
                            >
                              <Plus className="size-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            className={cn(
                              "h-10 w-full rounded-full bg-zinc-900 text-gray-100 font-semibold shadow-sm transition-all duration-300 hover:bg-zinc-800 hover:shadow-md active:scale-[0.98]",
                              justAdded && "menu-cart-bounce",
                            )}
                            onClick={() => addItem(item)}
                            disabled={
                              !item.available || settings.orderMode !== "ACCEPTING"
                            }
                          >
                            <Plus className="size-4" />
                            Add to cart
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : categories.length === 0 ? (
            <div className="menu-fade-up flex flex-col items-center rounded-2xl border-2 border-dashed border-zinc-200 bg-white/80 px-6 py-16 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-zinc-100">
                <UtensilsCrossed className="size-7 text-zinc-400" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-zinc-800">No categories available</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-500">
                Something delicious is on the way! Our menu will be ready soon.
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="menu-fade-up flex flex-col items-center rounded-2xl border-2 border-dashed border-zinc-200 bg-white/80 px-6 py-16 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-zinc-100">
                <UtensilsCrossed className="size-7 text-zinc-400" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-zinc-800">No food items available</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-500">
                Add food items to your categories in the admin panel to populate the menu.
              </p>
            </div>
          ) : (
            <div className="menu-fade-up flex flex-col items-center rounded-2xl border-2 border-dashed border-zinc-200 bg-white/80 px-6 py-16 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-zinc-100">
                <Search className="size-7 text-zinc-400" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-zinc-800">No dishes found</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-500">
                Try adjusting your search or filters to discover more from the
                menu.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={clearFilters}
                className="mt-5 rounded-full"
              >
                Clear all filters
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* ─── Cart Bar ─── */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 px-4 pb-4 transition-all duration-500 sm:px-6 lg:px-8",
          cartQuantity > 0
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-full opacity-0",
        )}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-2xl border border-white/10 bg-zinc-900/95 p-3 text-white shadow-2xl shadow-black/25 backdrop-blur-xl sm:p-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "relative flex size-11 items-center justify-center rounded-xl bg-amber-500 text-zinc-900 transition-transform",
                addedItemId && "menu-cart-bounce",
              )}
            >
              <ShoppingBag className="size-5" />
              {cartQuantity > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-zinc-900 shadow">
                  {cartQuantity}
                </span>
              )}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold">
                {cartQuantity} item{cartQuantity === 1 ? "" : "s"}
              </p>
              <p className="text-xs text-white/60">
                {formatPrice(total, settings.currency)} incl. taxes
              </p>
            </div>
            <p className="text-sm font-semibold sm:hidden">
              {formatPrice(total, settings.currency)}
            </p>
          </div>

          <Button
            type="button"
            size="lg"
            disabled={cartQuantity === 0 || settings.orderMode !== "ACCEPTING"}
            onClick={() => setCheckoutOpen(true)}
            className="rounded-xl bg-amber-500 font-bold text-zinc-900 shadow-lg shadow-amber-500/25 transition-all hover:bg-amber-400 hover:shadow-amber-400/30 active:scale-[0.97]"
          >
            Checkout
            <ChevronRight className="size-4" />
          </Button>

          <AlertDialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
            <AlertDialogContent className="max-h-[90vh] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl sm:max-w-lg">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-xl">
                  Review your order
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Confirm the items below before placing your order.
                </AlertDialogDescription>
              </AlertDialogHeader>

              {/* Cart items */}
              <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                {cartLines.map(({ item, quantity, lineTotal }) => (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-2.5 transition-colors",
                      !item.available
                        ? "border-red-200 bg-red-50"
                        : "border-zinc-100 bg-zinc-50 hover:bg-zinc-50",
                    )}
                  >
                    <div className={cn("relative size-13 shrink-0 overflow-hidden rounded-lg", !item.available && "opacity-50")}>
                      <FoodImage
                        src={item.imageUrl}
                        alt={item.name}
                        width={52}
                        height={52}
                        sizes="52px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-semibold text-gray-700">
                        {item.name}
                      </p>
                      {!item.available && (
                        <p className="text-xs font-medium text-red-600">Unavailable</p>
                      )}
                      <p className="text-xs text-zinc-500">
                        {quantity} &times;{" "}
                        {formatPrice(item.price, settings.currency)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-700">
                        {formatPrice(lineTotal, settings.currency)}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        className="mt-0.5 inline-flex items-center gap-1 text-xs text-zinc-400 transition-colors hover:text-red-500"
                      >
                        <Trash2 className="size-3" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order options */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-500">
                      Payment
                    </label>
                    <Select
                      value={paymentMethod}
                      onValueChange={(v) =>
                        setPaymentMethod(v as PaymentMethod)
                      }
                    >
                      <SelectTrigger className="h-10 rounded-lg text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="ONLINE">Pay Online</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {orderType === "DINE_IN" && (
                    <div className="space-y-1.5">
                      <label
                        htmlFor="table-number"
                        className="text-xs font-medium text-zinc-500"
                      >
                        Table number
                      </label>
                      <Input
                        id="table-number"
                        type="number"
                        min="1"
                        value={tableNumber}
                        onChange={(e) => setTableNumber(e.target.value)}
                        placeholder="Optional"
                        className="h-10 rounded-lg text-sm"
                      />
                    </div>
                  )}
                </div>

                {/* Delivery address section */}
                {orderType === "DELIVERY" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-zinc-500">
                        Delivery address
                      </label>
                      <Button
                        type="button"
                        variant="link"
                        onClick={() => setShowAddressForm((v) => !v)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-700"
                      >
                        {showAddressForm ? <> <X className="size-3" /> Cancel </> : <><Plus className="size-3" /> Add new </>}
                      </Button>
                    </div>

                    {/* Saved addresses */}
                    {addresses.length > 0 && !showAddressForm && (
                      <div className="max-h-36 space-y-1.5 overflow-y-auto">
                        {addresses.map((addr) => (
                          <div
                            key={addr.id}
                            className={cn(
                              "flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition-all",
                              selectedAddressId === addr.id
                                ? "border-amber-300 bg-amber-50/80 ring-1 ring-amber-200"
                                : "border-zinc-100 bg-zinc-50 hover:border-zinc-200",
                            )}
                            onClick={() => setSelectedAddressId(addr.id)}
                          >
                            <div
                              className={cn(
                                "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                                selectedAddressId === addr.id
                                  ? "border-amber-500 bg-amber-500"
                                  : "border-zinc-300",
                              )}
                            >
                              {selectedAddressId === addr.id && (
                                <Check className="size-2.5 text-white" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <MapPin className="size-3 shrink-0 text-zinc-400" />
                                <p className="text-xs font-semibold text-zinc-700">
                                  {addr.label || "Address"}
                                </p>
                                {addr.isDefault && (
                                  <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                                    Default
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">
                                {formatAddress(addr)}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAddress(addr.id);
                              }}
                              className="shrink-0 rounded p-1 text-zinc-300 transition-colors hover:bg-red-50 hover:text-red-500"
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* No addresses */}
                    {addresses.length === 0 && !showAddressForm && (
                      <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/50 px-4 py-3 text-center">
                        <p className="text-xs text-zinc-800">
                          No saved addresses.{" "}
                          <Button
                            type="button"
                            variant="link"
                            onClick={() => setShowAddressForm(true)}
                            className="font-medium text-amber-600 hover:text-amber-700"
                          >
                            Add one
                          </Button>
                        </p>
                      </div>
                    )}

                    {/* Add address form */}
                    {showAddressForm && (
                      <div className="space-y-2 rounded-lg border border-zinc-200 bg-white p-3 text-gray-600">
                        <Input
                          placeholder="Label (e.g. Home, Work)"
                          value={addressForm.label}
                          onChange={(e) =>
                            setAddressForm((p) => ({
                              ...p,
                              label: e.target.value,
                            }))
                          }
                          className="h-9 rounded-lg text-xs"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="House / Flat No *"
                            value={addressForm.houseNo}
                            onChange={(e) =>
                              setAddressForm((p) => ({
                                ...p,
                                houseNo: e.target.value,
                              }))
                            }
                            className="h-9 rounded-lg text-xs"
                          />
                          <Input
                            placeholder="Street *"
                            value={addressForm.street}
                            onChange={(e) =>
                              setAddressForm((p) => ({
                                ...p,
                                street: e.target.value,
                              }))
                            }
                            className="h-9 rounded-lg text-xs"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="Area *"
                            value={addressForm.area}
                            onChange={(e) =>
                              setAddressForm((p) => ({
                                ...p,
                                area: e.target.value,
                              }))
                            }
                            className="h-9 rounded-lg text-xs"
                          />
                          <SearchableSelect
                            options={indianStates}
                            value={stateCode}
                            onChange={(code) => {
                              setStateCode(code);
                              const stateName = indianStates.find((s) => s.value === code)?.label ?? "";
                              setAddressForm((p) => ({ ...p, state: stateName, city: "" }));
                            }}
                            placeholder="State *"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <SearchableSelect
                            options={stateCities}
                            value={addressForm.city}
                            onChange={(city) =>
                              setAddressForm((p) => ({ ...p, city }))
                            }
                            placeholder="City *"
                            disabled={!stateCode}
                          />
                          <Input
                            placeholder="Pincode *"
                            value={addressForm.pincode}
                            onChange={(e) =>
                              setAddressForm((p) => ({
                                ...p,
                                pincode: e.target.value,
                              }))
                            }
                            className="h-9 rounded-lg text-xs"
                          />
                          <Input
                            placeholder="Landmark"
                            value={addressForm.landmark}
                            onChange={(e) =>
                              setAddressForm((p) => ({
                                ...p,
                                landmark: e.target.value,
                              }))
                            }
                            className="h-9 rounded-lg text-xs"
                          />
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          disabled={
                            savingAddress ||
                            !addressForm.houseNo ||
                            !addressForm.street ||
                            !addressForm.area ||
                            !addressForm.city ||
                            !addressForm.state ||
                            !addressForm.pincode
                          }
                          onClick={handleSaveAddress}
                          className="h-8 w-full rounded-lg bg-zinc-900 text-xs font-semibold text-white hover:bg-zinc-800"
                        >
                          {savingAddress ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            "Save address"
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Order summary */}
              <div className="space-y-2 rounded-xl bg-zinc-50 p-4 text-sm">
                <div className="flex justify-between text-zinc-500">
                  <span>Subtotal</span>
                  <span className="text-zinc-900">
                    {formatPrice(subtotal, settings.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>Tax ({settings.gstRate}%)</span>
                  <span className="text-zinc-900">
                    {formatPrice(tax, settings.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>Service charge</span>
                  <span className="text-zinc-900">
                    {formatPrice(serviceCharge, settings.currency)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-bold text-zinc-900">
                  <span>Total</span>
                  <span>{formatPrice(total, settings.currency)}</span>
                </div>
              </div>

              <AlertDialogFooter>
                {hasUnavailableItems && (
                  <p className="text-xs font-medium text-red-600 text-center">
                    Remove unavailable items to place your order
                  </p>
                )}
                <AlertDialogCancel className="rounded-xl">
                  Keep browsing
                </AlertDialogCancel>
                <Button
                  onClick={handleCheckout}
                  disabled={checkingOut || !canCheckout}
                  className="rounded-xl bg-amber-500 font-semibold text-zinc-900 hover:bg-amber-400"
                >
                  {checkingOut ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Placing order...
                    </>
                  ) : (
                    "Place order"
                  )}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </main>
  );
}
