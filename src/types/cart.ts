export interface CartItem {
  id: string;
  productId: string;
  productSlug?: string;
  name: string;
  quantity: number;
  price: number;
  priceUnit?: string;
  optionId?: string;
  optionLabel?: string;
  optionUnavailable?: boolean;
  availableStock?: number;
}

export interface CartSnapshot {
  id: string;
  buyerId: string;
  items: CartItem[];
}
