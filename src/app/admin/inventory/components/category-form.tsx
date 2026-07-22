'use client';

import { useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Tags, X } from 'lucide-react';
import toast from "react-hot-toast";
import { Category } from '@prisma/client';

interface CategoryFormProps {
  onCancel?: () => void;
  onSuccess?: (category: Category) => void;
  onError?: (message: string) => void;
}

export default function CategoryForm({
  onCancel,
  onSuccess,
  onError,
}: CategoryFormProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    try {
      setLoading(true);

      const response = await axios.post<Category>('/api/inventory/add-category', {
        name: name.trim(),
      });

      setName('');

      if (onSuccess) {
        toast.success('Category added successfully');
        onSuccess(response.data);
      }
    } catch (error: unknown) {
      console.error(error);

      if (onError) {
        onError(getApiError(error, 'Failed to create category'));
        toast.error(getApiError(error, 'Failed to create category'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setName('');

    if (onCancel) {
      onCancel();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-border bg-card p-4 shadow-sm animate-in fade-in-0 slide-in-from-top-2 duration-200"
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Tags className="size-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">New category</h3>
          <p className="text-xs text-muted-foreground">Group related menu items for faster filtering.</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
        <div className="space-y-2">
          <Label htmlFor="category-name" className="text-xs font-medium text-muted-foreground">
            Category name
          </Label>
          <Input
            id="category-name"
            type="text"
            placeholder="e.g. Starters, Drinks, Desserts"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-background transition focus-visible:ring-primary/20"
            autoFocus
            disabled={loading}
          />
        </div>

        <Button
          type="submit"
          className="h-9"
          disabled={loading || !name.trim()}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
          {loading ? 'Adding' : 'Add category'}
        </Button>

        <Button
          type="button"
          size="icon-lg"
          variant="outline"
          onClick={handleCancel}
          aria-label="Cancel category form"
          disabled={loading}
        >
          <X className="size-4" />
        </Button>
      </div>
    </form>
  );
}

function getApiError(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ error?: string; message?: string }>(error)) {
    return error.response?.data?.error ?? error.response?.data?.message ?? fallback;
  }

  return error instanceof Error ? error.message : fallback;
}
