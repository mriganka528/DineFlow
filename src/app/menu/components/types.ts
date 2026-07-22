export type MenuItem = {
  id: string
  name: string
  description: string
  available: boolean
  categoryId: string
  categoryName: string
  price: number
  imageUrl: string | null
  tag?: string
  prepTime?: number
  rating?: number
  ratingCount?: number
  ratingDistribution?: { 1: number; 2: number; 3: number; 4: number; 5: number }
  popularity?: number
  createdAt?: string
}

export type MenuCategory = {
  id: string
  name: string
}

export type MenuSettings = {
  restaurantName: string
  tagline: string
  currency: string
  gstRate: number
  serviceCharge: number
  averagePrepTime: number
  orderMode: "ACCEPTING" | "PAUSED" | "CLOSED"
  dineInEnabled: boolean
  deliveryEnabled: boolean
  logoUrl: string | null
}

export type ServerCartFood = {
  id: string
  name: string
  price: number
  gst: number
  available: boolean
}

export type ServerCartItem = {
  id: string
  foodId: string
  quantity: number
  food: ServerCartFood
}

export type ServerCart = {
  id: string
  items: ServerCartItem[]
}

export type CustomerAddress = {
  id: string
  label: string | null
  houseNo: string
  street: string
  area: string
  city: string
  state: string
  pincode: string
  landmark: string | null
  isDefault: boolean
}
