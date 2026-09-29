export interface WishlistItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productPrice: number;
  createdAt: string;
}

export interface Wishlist {
  id: string;
  items: WishlistItem[];
  createdAt: string;
  updatedAt: string;
}
