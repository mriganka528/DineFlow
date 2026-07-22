import Image from "next/image";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { cloudinaryLoader, isCloudinaryUrl } from "@/lib/cloudinary-loader";

type FoodImageProps = {
  src: string | null | undefined;
  alt: string;
  /** Rendered width/height hint for optimization (Cloudinary resizes to this). */
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  /** Load eagerly (above-the-fold). Defaults to lazy. */
  eager?: boolean;
};

/**
 * Renders a food image via next/image with Cloudinary optimization, lazy
 * loading and aspect-ratio preservation. When no image is available it shows a
 * consistent "No Image Available" placeholder instead of a broken image.
 *
 * The parent controls the box size; this component fills it (position relative).
 */
export function FoodImage({
  src,
  alt,
  width = 400,
  height = 400,
  className,
  sizes = "(max-width: 768px) 50vw, 400px",
  eager = false,
}: FoodImageProps) {
  if (!src) {
    return <FoodImagePlaceholder className={className} />;
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      loading={eager ? "eager" : "lazy"}
      // Cloudinary handles the transform for its own URLs; other hosts fall back
      // to the default Next optimizer.
      loader={isCloudinaryUrl(src) ? cloudinaryLoader : undefined}
      className={cn("h-full w-full object-cover", className)}
    />
  );
}

export function FoodImagePlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-1.5 bg-muted text-muted-foreground",
        className,
      )}
    >
      <ImageOff className="size-6 opacity-70" aria-hidden />
      <span className="text-[11px] font-medium">No Image Available</span>
    </div>
  );
}
