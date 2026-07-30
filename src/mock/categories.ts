export interface CategoryItem {
  id: string;
  label: string;
  icon: string;
}

export const categories: CategoryItem[] = [
  { id: 'agriculture', label: 'Agriculture', icon: 'Leaf' },
  { id: 'fashion', label: 'Fashion', icon: 'Scissors' },
  { id: 'electronics', label: 'Electronics', icon: 'Smartphone' },
  { id: 'services', label: 'Services', icon: 'Tool' },
  { id: 'handmade', label: 'Handmade', icon: 'Sparkles' },
  { id: 'home', label: 'Home & Living', icon: 'Home' },
  { id: 'beauty', label: 'Beauty', icon: 'Droplet' },
  { id: 'more', label: 'More', icon: 'MoreHorizontal' },
];
