'use client';

import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageUpload } from '@/components/ui/image-upload';
import { getCurrencySymbol } from '@/lib/currency';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle2,
  Loader2,
  PackagePlus,
  Pencil,
  Utensils,
  X,
  XCircle,
} from 'lucide-react';
import { Category, Food } from '@prisma/client';

interface FoodItemFormProps {
  categories: Category[];
  editingItem?: Food | null;
  currency?: string;
  onCancel?: () => void;
  onSuccess?: (item: Food) => void;
  onError?: (message: string) => void;
}

export default function FoodItemForm({
  categories,
  editingItem,
  currency,
  onCancel,
  onSuccess,
  onError,
}: FoodItemFormProps) {
  const [name, setName] = useState(editingItem?.name ?? '');
  const [categoryId, setCategoryId] = useState(editingItem?.categoryId ?? '');
  const [price, setPrice] = useState(editingItem?.price.toString() ?? '');
  const [available, setAvailable] = useState(editingItem?.available ?? true);
  const [imageUrl, setImageUrl] = useState(editingItem?.imageUrl ?? '');
  const [imagePublicId, setImagePublicId] = useState(editingItem?.imagePublicId ?? '');
  const [loading, setLoading] = useState(false);
  const canSubmit = Boolean(name.trim() && categoryId && price);

  const resetForm = () => {
    setName('');
    setCategoryId('');
    setPrice('');
    setAvailable(true);
    setImageUrl('');
    setImagePublicId('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSubmit) return;

    try {
      setLoading(true);

      const payload = {
        name: name.trim(),
        categoryId,
        price: Number(price),
        available,
        imageUrl: imageUrl || '',
        imagePublicId: imagePublicId || '',
      };

      const response = editingItem
        ? await axios.put<Food>(
          `/api/inventory/update-food-item/${editingItem.id}`,
          payload
        )
        : await axios.post<Food>(
          '/api/inventory/add-food-item',
          payload
        );

      toast.success(
        editingItem
          ? 'Food item updated successfully'
          : 'Food item added successfully'
      );

      if (!editingItem) {
        resetForm();
      }

      onSuccess?.(response.data);
    } catch (error: unknown) {
      console.error(error);

      const message = getApiError(
        error,
        editingItem
          ? 'Failed to update food item'
          : 'Failed to create food item'
      );

      toast.error(message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    resetForm();
    onCancel?.();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-border bg-card p-5 shadow-sm animate-in fade-in-0 slide-in-from-top-2 duration-200"
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {editingItem ? <Pencil className="size-4" /> : <PackagePlus className="size-5" />}
          </div>
          <div>
            <h3 className="text-base font-semibold">
              {editingItem ? 'Edit food item' : 'Add food item'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {editingItem ? 'Update item details and availability.' : 'Create a menu item with pricing and category.'}
            </p>
          </div>
        </div>

        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={handleCancel}
          aria-label="Close food item form"
          disabled={loading}
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="item-name" className="text-xs font-medium text-muted-foreground">
            Item name
          </Label>
          <Input
            id="item-name"
            placeholder="Enter item name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-background transition focus-visible:ring-primary/20"
            disabled={loading}
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="item-category" className="text-xs font-medium text-muted-foreground">
            Category
          </Label>
          <Select
            value={categoryId}
            onValueChange={setCategoryId}
            disabled={loading}
          >
            <SelectTrigger
              id="item-category"
              className="w-full bg-background transition focus-visible:ring-primary/20"
            >
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {categories.map((category) => (
                <SelectItem
                  key={category.id}
                  value={category.id}
                >
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="item-price" className="text-xs font-medium text-muted-foreground">
            Price
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              {getCurrencySymbol(currency)}
            </span>
            <Input
              id="item-price"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="bg-background pl-9 transition focus-visible:ring-primary/20"
              disabled={loading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="item-available" className="text-xs font-medium text-muted-foreground">
            Availability
          </Label>
          <div
            id="item-available"
            className="grid h-9 grid-cols-2 overflow-hidden rounded-lg border border-border bg-background p-1"
          >
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAvailable(true)}
              disabled={loading}
              className={`inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition ${
                available
                  ? 'bg-green-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <CheckCircle2 className="size-4" />
              Available
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAvailable(false)}
              disabled={loading}
              className={`inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition ${
                !available
                  ? 'bg-destructive text-white shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <XCircle className="size-4" />
              Unavailable
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">
          Food image
        </Label>
        <ImageUpload
          value={imageUrl}
          publicId={imagePublicId}
          disabled={loading}
          onChange={({ url, publicId }) => {
            setImageUrl(url);
            setImagePublicId(publicId);
          }}
          onRemove={() => {
            setImageUrl('');
            setImagePublicId('');
          }}
        />
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Utensils className="size-3.5" />
          {editingItem ? 'Changes update the live inventory item.' : 'New items appear in inventory after saving.'}
        </div>

        <div className="flex gap-3">
          <Button
            type="submit"
            className="min-w-32"
            disabled={loading || !canSubmit}
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {loading
              ? editingItem
                ? 'Updating'
                : 'Adding'
              : editingItem
                ? 'Update item'
                : 'Add item'}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className="border-border"
            disabled={loading}
          >
            <X className="size-4" />
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}

function getApiError(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ error?: string; message?: string }>(error)) {
    return (
      error.response?.data?.error ??
      error.response?.data?.message ??
      fallback
    );
  }

  return error instanceof Error ? error.message : fallback;
}
