import { Suspense } from "react";
import { getRestaurantSettings } from "@/actions/settings";
import VerifyClient from "./VerifyClient";

export default async function VerifyPage() {
  const settings = await getRestaurantSettings();

  return (
    <Suspense>
      <VerifyClient
        restaurantName={settings?.restaurantName ?? "Foodbot Kitchen"}
        logoUrl={settings?.logoUrl ?? null}
      />
    </Suspense>
  );
}
