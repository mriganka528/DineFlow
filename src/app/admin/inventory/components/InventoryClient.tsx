'use client';
import {  useState } from 'react';
import axios from 'axios';
import {
  CheckCircle2,
  Edit2,
  Filter,
  Loader2,
  Package,
  Plus,
  Search,
  Tags,
  Trash2,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CategoryForm from './category-form';
import FoodItemForm from './food-item-form';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import toast from 'react-hot-toast';
import { getApiError } from '@/actions/getApiError';
import { formatMoney } from '@/lib/currency';
import { FoodImage } from '@/components/ui/food-image';
import { Category, Food } from '@prisma/client';

interface InventoryProps {
  initialCategories: Category[];
  initialFoodItems: Food[];
  currency: string;
}

export default function Inventory({
  initialCategories,
  initialFoodItems,
  currency,
}: InventoryProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [foodItems, setFoodItems] = useState<Food[]>(initialFoodItems);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Food | null>(null);
  const [categoryError, setCategoryError] = useState('');
  const [deletingCategory, setDeletingCategory] = useState('');
  const [updatingAvailabilityId, setUpdatingAvailabilityId] = useState('');
  const [deletingFoodItemId, setDeletingFoodItemId] = useState('');


  const handleAddCategory = (category: Category) => {
    setCategoryError('');
    setCategories((currentCategories) => {
      const nextCategories = currentCategories.filter(
        (currentCategory) => currentCategory.id !== category.id,
      );

      return [...nextCategories, category].sort((first, second) =>
        first.name.localeCompare(second.name),
      );
    });
    setShowCategoryForm(false);
  };

  const handleDeleteCategory = async (category: Category) => {
    const { name } = category;
    setCategoryError('');
    setDeletingCategory(name);

    try {
      await axios.delete('/api/inventory/remove-category', {
        data: { name },
      });
      toast.success(`Category "${name}" deleted successfully`);
      setCategories((currentCategories) =>
        currentCategories.filter((currentCategory) => currentCategory.id !== category.id),
      );
      // Update food items to have categoryId = null so they appear under "Uncategorized"
      // instead of filtering them out (which made them disappear from UI)
      setFoodItems((currentItems) =>
        currentItems.map((item) =>
          item.categoryId === category.id ? { ...item, categoryId: null } : item,
        ),
      );

      if (selectedCategory === category.id) {
        setSelectedCategory('all');
      }
    } catch (error) {
      toast.error(getApiError(error, 'Failed to delete category'));
      setCategoryError(getApiError(error, 'Failed to delete category'));
    } finally {
      setDeletingCategory('');
    }

  };


  const handleDeleteFoodItem = async (id: string) => {
    setDeletingFoodItemId(id);

    try {
      await axios.delete('/api/inventory/delete-food-item', {
        data: { id },
      });

      setFoodItems((currentItems) => currentItems.filter((item) => item.id !== id));
      toast.success('Food item deleted successfully');
    } catch (error) {
      toast.error(getApiError(error, 'Failed to delete food item'));
    } finally {
      setDeletingFoodItemId('');
    }
  };

  const handleToggleAvailability = async (id: string) => {
    setUpdatingAvailabilityId(id);

    try {
      const response = await axios.patch<Food>('/api/inventory/toggle-availability', {
        id,
      });

      setFoodItems((currentItems) =>
        currentItems.map((item) =>
          item.id === response.data.id
            ? {
                ...item,
                ...response.data,
                imageUrl: response.data.imageUrl ?? item.imageUrl,
                imagePublicId: response.data.imagePublicId ?? item.imagePublicId,
              }
            : item,
        ),
      );
      toast.success(response.data.available ? 'Food item marked available' : 'Food item marked unavailable');
    } catch (error) {
      toast.error(getApiError(error, 'Failed to update availability'));
    } finally {
      setUpdatingAvailabilityId('');
    }
  };

  const filteredItems = foodItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  const availableCount = foodItems.filter((item) => item.available).length;
  const unavailableCount = foodItems.length - availableCount;
  const activeCategory = categories.find((category) => category.id === selectedCategory);

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Package className="size-3.5" />
            Admin inventory
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Manage categories, pricing, and live item availability from one focused workspace.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-sm">
          <span className="size-2 rounded-full bg-green-500" />
          {availableCount} active items
        </div>
      </div>

      {/* Categories Section */}
      <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <Tags className="size-5 text-muted-foreground" />
              Categories
            </h2>
            <p className="text-sm text-muted-foreground">Keep item groups tidy and easy to scan.</p>
          </div>
          <Button
            onClick={() => setShowCategoryForm(!showCategoryForm)}
            variant={showCategoryForm ? 'outline' : 'default'}
            className="self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            {showCategoryForm ? 'Close form' : 'Add category'}
          </Button>
        </div>

        {showCategoryForm && (
          <CategoryForm
            onSuccess={(category) => {
              handleAddCategory(category);
            }}
            onError={setCategoryError}
            onCancel={() => setShowCategoryForm(false)}
          />
        )}

        {categoryError && (
          <p className="text-sm text-destructive">{categoryError}</p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
          { categories.length > 0 ? (
            categories.map((category) => (
              <div
                key={category.id}
                className="group flex items-center justify-between rounded-lg border border-border bg-card p-3 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <span className={`${deletingCategory === category.name ? 'text-muted-foreground' : 'font-medium'} min-w-0 flex-1 truncate text-sm`}>
                  {deletingCategory === category.name ? 'Deleting...' : category.name}
                </span>
                <AlertDialog>
                  <AlertDialogTrigger
                    disabled={deletingCategory === category.name}
                    className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
                    aria-label={`Delete ${category.name}`}
                  >
                    <Trash2 className="size-4" />
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete category?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. The category {category.name} will be removed from inventory.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel >Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteCategory(category)} >Delete category</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))
          ) : (
            <div className="col-span-full rounded-lg border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
              No categories found. Add your first category to organize menu items.
            </div>
          )}
        </div>
      </div>
      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Total items</p>
            <Package className="size-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-3xl font-semibold">{foodItems.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {filteredItems.length} shown with current filters
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Available</p>
            <CheckCircle2 className="size-4 text-green-500" />
          </div>
          <p className="mt-2 text-3xl font-semibold text-green-600">{availableCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">Visible to customers</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Unavailable</p>
            <XCircle className="size-4 text-destructive" />
          </div>
          <p className="mt-2 text-3xl font-semibold text-destructive">{unavailableCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">Hidden or temporarily paused</p>
        </div>
      </div>
      {/* Food Items Section */}
      <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <Package className="size-5 text-muted-foreground" />
              Food items
            </h2>
            <p className="text-sm text-muted-foreground">
              {activeCategory ? `Filtered by ${activeCategory.name}` : 'Review, edit, and publish menu items.'}
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingItem(null);
              setShowItemForm(!showItemForm);
            }}
            variant={showItemForm && !editingItem ? 'outline' : 'default'}
            className="self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            {showItemForm && !editingItem ? 'Close form' : 'Add item'}
          </Button>
        </div>

        {showItemForm && (
          <FoodItemForm
            key={editingItem?.id ?? 'new-food-item'}
            categories={categories}
            currency={currency}

            editingItem={editingItem}
            onSuccess={(food) => {
              if (editingItem) {
                setFoodItems((items) =>
                  items.map((item) => (item.id === food.id ? food : item))
                );
              } else {
                setFoodItems((items) => [...items, food]);
              }

              setShowItemForm(false);
              setEditingItem(null);
            }}

            onCancel={() => {
              setShowItemForm(false);
              setEditingItem(null);
            }}
          />
        )}

        {/* Filters */}
        <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search food items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background transition focus-visible:ring-primary/20"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full bg-background transition focus-visible:ring-primary/20 md:w-56">
                <Filter className="size-4 text-muted-foreground" />
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Food Items Table */}
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/60">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Availability</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="transition-colors hover:bg-muted/40">
                      <td className="px-6 py-4 text-sm font-medium">
                        <div className="flex items-center gap-3">
                          <div className="relative size-10 shrink-0 overflow-hidden rounded-lg border border-border">
                            <FoodImage src={item.imageUrl} alt={item.name} width={40} height={40} sizes="40px" />
                          </div>
                          <span>{item.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="inline-flex items-center rounded-lg border border-border bg-muted px-2.5 py-1 text-xs font-medium">
                          {categories.find((cat) => cat.id === item.categoryId)?.name ?? 'Uncategorized'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold">{formatMoney(item.price, currency)}</td>
                      <td className="px-6 py-4 text-sm">
                        <Button
                          type="button"
                          role="switch"
                          aria-checked={item.available}
                          aria-busy={updatingAvailabilityId === item.id}
                          disabled={updatingAvailabilityId === item.id}
                          onClick={() => handleToggleAvailability(item.id)}
                          className="group inline-flex min-w-44 items-center gap-4  rounded-full border border-border bg-background px-3 py-5 text-left transition hover:border-primary/50 hover:bg-sidebar disabled:cursor-not-allowed disabled:opacity-80"
                        >
                          <span
                            className={`relative h-6 w-12 rounded-full transition-colors ${item.available ? 'bg-green-500' : 'bg-muted-foreground/40'
                              }`}
                          >
                            <span
                              className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${item.available ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            />
                          </span>
                          <span className="flex flex-col leading-tight">
                            <span
                              className={`font-medium ${item.available ? 'text-green-600' : 'text-muted-foreground '
                                }`}
                            >
                              {item.available ? 'Available' : 'Unavailable'}
                            </span>
                            {updatingAvailabilityId === item.id && (
                              <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Changing availability...
                              </span>
                            )}
                          </span>
                        </Button>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={deletingFoodItemId === item.id}
                            onClick={() => {
                              setEditingItem(item);
                              setShowItemForm(true);
                            }}
                            className="border-primary/30 text-primary hover:border-primary/50 hover:bg-primary/10"
                          >
                            <Edit2 className="size-4" />
                            Edit
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger
                              disabled={deletingFoodItemId === item.id}
                              className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
                              aria-label={`Delete ${item.name}`}
                            >
                              <Trash2 className="size-4" />
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete item?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. The item {item.name} will be removed from inventory.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel >Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteFoodItem(item.id)} >Delete item</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                        {deletingFoodItemId === item.id && (
                          <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive">
                            <Loader2 className="size-3 animate-spin" />
                            Deleting {item.name}...
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                      No food items found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

