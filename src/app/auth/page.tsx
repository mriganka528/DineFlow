import { Suspense } from "react";
import { getRestaurantSettings } from "@/actions/settings";
import AuthClient from "./AuthClient";

export default async function AuthPage() {
  const settings = await getRestaurantSettings();

  return (
    <Suspense>
      <AuthClient
        restaurantName={settings?.restaurantName ?? "Foodbot Kitchen"}
        tagline={settings?.tagline ?? "Fresh meals, fast service."}
        phone={settings?.phone ?? ""}
        address={settings?.address ?? ""}
      />
    </Suspense>
  );
}
