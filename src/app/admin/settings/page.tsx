import { getRestaurantSettings } from "@/actions/settings";
import SettingsClient from "./components/SettingsClient";
import { RestaurantSettings } from "./types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Settings() {
  const defaultSettings: RestaurantSettings = {
  restaurantName: 'DineFlow Restaurant',
  tagline: 'Fresh meals, fast service.',
  phone: '+91 98765 43210',
  email: 'contact@foodhub.com',
  address: '123 Main Street, New Delhi',
  currency: 'INR',
  gstRate: 5,
  serviceCharge: 2.5,
  orderMode:"ACCEPTING",
  averagePrepTime: 25,
  autoAcceptOrders: false,
  dineInEnabled: true,
  deliveryEnabled: true,
  logoUrl: null,
  logoPublicId: null,
};
  const restaurant = await getRestaurantSettings();

  return (
    <SettingsClient
      initialSettings={restaurant ?? defaultSettings}
    />
  );
}