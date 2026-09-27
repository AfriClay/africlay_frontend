import type { CatalogCategory } from '../services/productService';

export type CategoryTreeItem = {
  category: CatalogCategory;
  depth: 0 | 1 | 2;
};

export const flattenCategoryTree = (categories: CatalogCategory[]): CategoryTreeItem[] => {
  const knownIds = new Set(categories.map(category => category.id));
  const children = new Map<string, CatalogCategory[]>();
  const roots: CatalogCategory[] = [];

  for (const category of categories) {
    if (category.parent && category.parent !== category.id && knownIds.has(category.parent)) {
      children.set(category.parent, [...(children.get(category.parent) ?? []), category]);
    } else {
      roots.push(category);
    }
  }

  const result: CategoryTreeItem[] = [];
  const visited = new Set<string>();
  const visit = (category: CatalogCategory, depth: number) => {
    if (visited.has(category.id)) return;
    visited.add(category.id);
    result.push({ category, depth: Math.min(depth, 2) as 0 | 1 | 2 });
    for (const child of children.get(category.id) ?? []) visit(child, depth + 1);
  };

  roots.forEach(category => visit(category, 0));
  categories.forEach(category => visit(category, 0));
  return result;
};

export const rootCategories = (categories: CatalogCategory[]): CatalogCategory[] => {
  const knownIds = new Set(categories.map(category => category.id));
  return categories.filter(category => !category.parent || !knownIds.has(category.parent) || category.parent === category.id);
};

export const leafCategoryItems = (categories: CatalogCategory[]): CategoryTreeItem[] => {
  const parentIds = new Set(categories.flatMap(category => category.parent ? [category.parent] : []));
  return flattenCategoryTree(categories).filter(item => !parentIds.has(item.category.id));
};

export const categoryBranchIds = (categories: CatalogCategory[], rootId: string): Set<string> => {
  const result = new Set<string>([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const category of categories) {
      if (category.parent && result.has(category.parent) && !result.has(category.id)) {
        result.add(category.id);
        changed = true;
      }
    }
  }
  return result;
};
