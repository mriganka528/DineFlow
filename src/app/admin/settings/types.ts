import { OrderMode } from "@prisma/client";

export interface RestaurantSettings {
  restaurantName: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  currency: string;
  gstRate: number;
  serviceCharge: number;
  orderMode: OrderMode;
  averagePrepTime: number;
  autoAcceptOrders: boolean;
  dineInEnabled: boolean;
  deliveryEnabled: boolean;
  logoUrl: string | null;
  logoPublicId: string | null;
}