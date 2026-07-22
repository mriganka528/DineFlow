// Client-safe Cloudinary helpers (no secrets). Used to build optimized
// delivery URLs and as a next/image loader so Cloudinary performs the
// transformation (resize + f_auto + q_auto) instead of the Next optimizer.

const UPLOAD_SEGMENT = "/upload/";

/**
 * Returns true for a Cloudinary delivery URL we can transform.
 */
export function isCloudinaryUrl(url: string | null | undefined): url is string {
  return !!url && url.includes("res.cloudinary.com") && url.includes(UPLOAD_SEGMENT);
}

/**
 * Injects transformation params into a Cloudinary URL. Auto format + auto
 * quality are always applied; width/height/crop are optional.
 */
export function cloudinaryUrl(
  src: string,
  opts: { width?: number; height?: number; crop?: string; quality?: number | string } = {},
): string {
  if (!isCloudinaryUrl(src)) return src;

  const parts: string[] = ["f_auto", `q_${opts.quality ?? "auto"}`];
  if (opts.width) parts.push(`w_${opts.width}`);
  if (opts.height) parts.push(`h_${opts.height}`);
  if (opts.crop) parts.push(`c_${opts.crop}`);

  const [prefix, rest] = src.split(UPLOAD_SEGMENT);
  return `${prefix}${UPLOAD_SEGMENT}${parts.join(",")}/${rest}`;
}

/**
 * next/image `loader` prop implementation. Delegates optimization to Cloudinary.
 * Non-Cloudinary sources are returned unchanged so the component still renders.
 */
export function cloudinaryLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  if (!isCloudinaryUrl(src)) return src;
  return cloudinaryUrl(src, { width, crop: "limit", quality: quality ?? "auto" });
}
