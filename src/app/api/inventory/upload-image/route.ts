import { NextResponse } from "next/server";
import { uploadFoodImage, deleteFoodImage } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Uploads a food image to Cloudinary and returns its URL + public id.
// Accepts multipart/form-data with a `file`, or JSON `{ file: <dataUri> }`.
// Optionally pass `previousPublicId` to delete the replaced image afterwards.
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let dataUri = "";
    let previousPublicId: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      previousPublicId = (form.get("previousPublicId") as string) || null;

      if (!(file instanceof File)) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;
    } else {
      const body = await request.json();
      dataUri = typeof body?.file === "string" ? body.file : "";
      previousPublicId = typeof body?.previousPublicId === "string" ? body.previousPublicId : null;
    }

    if (!dataUri) {
      return NextResponse.json({ error: "No image data provided" }, { status: 400 });
    }

    const result = await uploadFoodImage(dataUri);

    // Delete the replaced image only after the new one is safely uploaded.
    if (previousPublicId && previousPublicId !== result.publicId) {
      await deleteFoodImage(previousPublicId);
    }

    return NextResponse.json({ url: result.url, publicId: result.publicId }, { status: 201 });
  } catch (error) {
    console.error("Error uploading food image:", error);
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
}
