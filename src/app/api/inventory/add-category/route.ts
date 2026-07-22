import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { categorySchema } from "@/schemas/inventorySchema";

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const validationResult = categorySchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { success: false, message: "Validation failed", errors: validationResult.error.issues },
                { status: 400 }
            );
        }
        const { name } = body;

        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        const newcategory = await prisma.category.create({
            data: {
                name,
            },
        });
         
        return NextResponse.json(newcategory, { status: 201 });
    } catch (error) {
        console.error("Error creating category:", error);
        return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
    }
}
