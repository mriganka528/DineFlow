import { getCategories, getFoodItems } from "@/actions/inventory";
import { getRestaurantSettings } from "@/actions/settings";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import InventoryClient from "./components/InventoryClient";

export default async function InventoryPage() {
  const [categories, foodItems, settings] = await Promise.all([
    getCategories(),
    getFoodItems(),
    getRestaurantSettings(),
  ]);

  return (
    <InventoryClient
      initialCategories={categories}
      initialFoodItems={foodItems}
      currency={settings?.currency ?? DEFAULT_CURRENCY}
    />
  );
}