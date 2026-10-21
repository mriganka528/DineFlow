"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { FoodImage } from "./food-image";
import toast from "react-hot-toast";

interface ImageUploadProps {
  value?: string;
  publicId?: string;
  disabled?: boolean;
  /** Render a small thumbnail-style picker (useful for logos). */
  compact?: boolean;
  onChange?: (result: { url: string; publicId: string }) => void;
  onRemove?: () => void;
}

/**
 * Image upload component with drag-drop support.
 * Uploads to /api/inventory/upload-image and calls onChange with { url, publicId }.
 */
export function ImageUpload({
  value,
  publicId,
  disabled = false,
  compact = false,
  onChange,
  onRemove,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<{
    url: string;
    publicId: string;
  } | null>(
    value && publicId
      ? { url: value, publicId }
      : null
  );
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadImage = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select a valid image file");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be smaller than 5MB");
        return;
      }

      setUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);
        if (uploadedImage?.publicId) {
          formData.append("previousPublicId", uploadedImage.publicId);
        }

        const response = await api.post<{ url: string; publicId: string }>(
          "/api/inventory/upload-image",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );

        const { url, publicId: newPublicId } = response.data;
        setUploadedImage({ url, publicId: newPublicId });
        onChange?.({ url, publicId: newPublicId });
        toast.success("Image uploaded successfully");
      } catch (error) {
        console.error("Upload error:", error);
        toast.error("Failed to upload image");
      } finally {
        setUploading(false);
      }
    },
    [uploadedImage, onChange]
  );

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadImage(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadImage(file);
    }
  };

  const handleRemove = () => {
    setUploadedImage(null);
    onRemove?.();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          disabled={disabled || uploading}
          className="hidden"
          aria-label="Upload image"
        />

        <div className="flex flex-wrap items-center gap-3">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={cn(
              "relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed bg-muted/30 transition-colors",
              dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
              uploading && "pointer-events-none opacity-70",
            )}
          >
            {uploadedImage ? (
              <FoodImage
                src={uploadedImage.url}
                alt="Restaurant logo"
                width={128}
                height={128}
                className="size-full object-cover"
              />
            ) : (
              <Upload className="size-5 text-muted-foreground" />
            )}

            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                <Loader2 className="size-4 animate-spin text-primary" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="text-xs font-medium text-foreground">
              {uploadedImage ? "Restaurant logo" : "Upload a restaurant logo"}
            </p>
            <p className="text-xs text-muted-foreground">PNG, JPG or WebP. Max 5MB.</p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || uploading}
              >
                <Upload className="size-3.5" />
                {uploadedImage ? "Change logo" : "Select logo"}
              </Button>
              {uploadedImage && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemove}
                  disabled={disabled || uploading}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="size-3.5" />
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          "relative rounded-lg border-2 border-dashed transition-colors p-6",
          dragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 bg-muted/30 hover:border-muted-foreground/40",
          disabled && "opacity-50 cursor-not-allowed",
          uploading && "pointer-events-none"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          disabled={disabled || uploading}
          className="hidden"
          aria-label="Upload image"
        />

        <Button
          type="button"
          variant="ghost"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="w-full cursor-pointer"
        >
          <div className="flex flex-col items-center justify-center gap-2 text-center">
            {uploading ? (
              <>
                <Loader2 className="size-8 animate-spin text-primary" />
                <p className="text-sm font-medium text-muted-foreground">
                  Uploading...
                </p>
              </>
            ) : (
              <>
                <Upload className="size-8 text-muted-foreground" />
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-medium text-foreground">
                    Drag image here or click to select
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG or WebP. Max 5MB.
                  </p>
                </div>
              </>
            )}
          </div>
        </Button>
      </div>

      {/* Preview */}
      {uploadedImage && (
        <div className="relative rounded-lg overflow-hidden border border-border bg-muted">
          <div className="relative w-full aspect-square bg-muted">
            <FoodImage
              src={uploadedImage.url}
              alt="Uploaded food image"
              width={400}
              height={400}
              className="w-full h-full"
            />
          </div>

          {/* Remove Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleRemove}
            disabled={disabled || uploading}
            className={cn(
              "absolute top-2 right-2 p-1.5 rounded-lg bg-background/80 backdrop-blur-sm border border-border hover:bg-background transition-colors",
              (disabled || uploading) && "opacity-50 cursor-not-allowed"
            )}
            aria-label="Remove image"
          >
            <X className="size-4 text-muted-foreground" />
          </Button>

          {/* Success Checkmark */}
          <div className="absolute bottom-2 right-2 p-1 rounded-full bg-green-500 text-white">
            <Check className="size-4" />
          </div>
        </div>
      )}

      {/* Status Message */}
      {!uploadedImage && !uploading && (
        <p className="text-xs text-muted-foreground">
          No image uploaded yet.
        </p>
      )}
    </div>
  );
}
