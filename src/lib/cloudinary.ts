import { v2 as cloudinary } from "cloudinary";

// Folder where all food images live in Cloudinary.
export const CLOUDINARY_FOOD_FOLDER = "foodbot/foods";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export type CloudinaryUploadResult = {
  url: string;
  publicId: string;
};

/**
 * Uploads a food image (provided as a data URI or remote URL) to the food
 * folder and returns the secure URL + public id.
 */
export async function uploadFoodImage(file: string): Promise<CloudinaryUploadResult> {
  const result = await cloudinary.uploader.upload(file, {
    folder: CLOUDINARY_FOOD_FOLDER,
    resource_type: "image",
    overwrite: true,
    // Store a reasonably sized master; per-use transforms happen via next/image.
    transformation: [{ width: 1200, height: 1200, crop: "limit", quality: "auto", fetch_format: "auto" }],
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}

/**
 * Deletes a previously uploaded food image. Safe to call with a null/empty id.
 * Never throws — orphan cleanup should not break the main flow.
 */
export async function deleteFoodImage(publicId: string | null | undefined): Promise<void> {
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  } catch (error) {
    console.error("Failed to delete Cloudinary image:", publicId, error);
  }
}

export { cloudinary };
