import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, isErrorResponse } from "@/lib/admin-auth";
import { badRequest, supabaseError } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { adminClient } = result;

  const modelId = request.nextUrl.searchParams.get("model_id");
  if (!modelId) return badRequest("model_id required");

  const { data, error } = await adminClient
    .from("catalog_model_images")
    .select("*")
    .eq("model_id", modelId)
    .order("sort_order");
  if (error) return supabaseError(error);
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { adminClient } = result;

  const formData = await request.formData();
  const modelId = formData.get("model_id") as string;
  const file = formData.get("file") as File;
  if (!modelId || !file) return badRequest("model_id and file required");

  // Validate file
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) return badRequest("File too large (max 5MB)");
  const mimeMap: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  const ext = mimeMap[file.type];
  if (!ext) return badRequest("Unsupported image type (jpg, png, webp only)");

  // Upload to storage
  const filePath = `catalog-models/${modelId}/${Date.now()}.${ext}`;
  const { error: uploadError } = await adminClient.storage
    .from("club-images")
    .upload(filePath, file, { contentType: file.type, upsert: false });
  if (uploadError) return supabaseError(uploadError);

  const { data: urlData } = adminClient.storage.from("club-images").getPublicUrl(filePath);

  // Get next sort_order
  const { data: existing } = await adminClient
    .from("catalog_model_images")
    .select("sort_order")
    .eq("model_id", modelId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

  const { data, error } = await adminClient
    .from("catalog_model_images")
    .insert({ model_id: modelId, image_url: urlData.publicUrl, sort_order: nextOrder })
    .select()
    .single();
  if (error) return supabaseError(error);
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { adminClient } = result;

  const raw = await request.json();
  // Bulk sort_order update: [{ id, sort_order }]
  const schema = z.array(z.object({ id: z.string().uuid(), sort_order: z.number().int() }));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  // Parallel updates to avoid N+1 sequential queries
  const results = await Promise.all(
    parsed.data.map((item) =>
      adminClient.from("catalog_model_images").update({ sort_order: item.sort_order }).eq("id", item.id)
    )
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return supabaseError(failed.error);
  return NextResponse.json({ success: true });
}

const deleteImageSchema = z.object({ id: z.string().uuid() });

export async function DELETE(request: NextRequest) {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { adminClient } = result;

  const raw = await request.json();
  const parsed = deleteImageSchema.safeParse(raw);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  // Get URL to delete from storage
  const { data: img } = await adminClient
    .from("catalog_model_images")
    .select("image_url")
    .eq("id", parsed.data.id)
    .single();

  const { error } = await adminClient.from("catalog_model_images").delete().eq("id", parsed.data.id);
  if (error) return supabaseError(error);

  // Best-effort storage cleanup
  if (img?.image_url) {
    const match = img.image_url.match(/club-images\/(.+)$/);
    if (match) {
      await adminClient.storage.from("club-images").remove([match[1]]);
    }
  }

  return NextResponse.json({ success: true });
}
