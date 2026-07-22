import { getRestaurantSettings } from "@/actions/settings";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import OrdersClient from "./components/OrdersClient";

export default async function OrdersPage() {
  const settings = await getRestaurantSettings();
  return (
    <OrdersClient
      currency={settings?.currency ?? DEFAULT_CURRENCY}
      restaurant={{
        name: settings?.restaurantName ?? "Dine Flow Kitchen",
        tagline: settings?.tagline ?? null,
        logoUrl: settings?.logoUrl ?? null,
        address: settings?.address ?? "",
        phone: settings?.phone ?? "",
        email: settings?.email ?? "",
        currency: settings?.currency ?? DEFAULT_CURRENCY,
      }}
    />
  );
}
