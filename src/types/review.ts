export interface Review {
  id: string;
  reviewerEmail: string;
  rating: number;
  comment: string;
  productId?: string;
  serviceId?: string;
  storeId?: string;
  createdAt: string;
  updatedAt: string;
}
