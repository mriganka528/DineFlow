export type BillItem = {
  id: string;
  name: string;
  quantity: number;
  /** Unit price captured at order time (historical, not current Food price). */
  price: number;
  /** GST rate (%) captured at order time. */
  gst: number;
};

export type BillRestaurant = {
  name: string;
  tagline: string | null;
  logoUrl: string | null;
  address: string;
  phone: string;
  email: string;
  currency: string;
};

export type BillCustomer = {
  name: string | null;
  phone: string;
};

export type BillPayment = {
  method: string;
  status: string;
  paidAt: string | null;
  transactionId: string | null;
};

export type BillData = {
  /** Invoice number — the order number. */
  invoiceNumber: number;
  createdAt: string;
  orderType: "DINE_IN" | "DELIVERY";
  tableNumber: number | null;
  deliveryAddress: string | null;
  orderStatus: string;
  restaurant: BillRestaurant;
  customer: BillCustomer;
  payment: BillPayment;
  items: BillItem[];
  subtotal: number;
  gstAmount: number;
  serviceCharge: number;
  total: number;
};
