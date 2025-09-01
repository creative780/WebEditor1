import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

/**
 * POST handler for the upload API.  Accepts multipart/form-data with one or
 * more files in the `files` field and writes them into the `public/uploads`
 * directory.  A unique filename is generated for each upload to avoid
 * collisions.  The response contains the public URLs of the saved files.
 *
 * The dynamic export ensures that this route is always treated as a
 * serverless function rather than being statically optimised.  Without
 * this directive Next.js might attempt to precompute the route at build
 * time, which would disable file system access during runtime.
 */
export const dynamic = "force-dynamic";

export async function POST(req) {
  const formData = await req.formData();
  const entries = formData.getAll("files");
  const urls = [];
  for (const entry of entries) {
    if (entry && typeof entry.arrayBuffer === "function" && entry.name) {
      const arrayBuffer = await entry.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const ext = path.extname(entry.name) || "";
      const slug = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const filename = `${slug}${ext}`;
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      await fs.mkdir(uploadDir, { recursive: true });
      const filepath = path.join(uploadDir, filename);
      await fs.writeFile(filepath, buffer);
      urls.push(`/uploads/${filename}`);
    }
  }
  return NextResponse.json({ urls });
}