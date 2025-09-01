"use client";

import React, { useState } from "react";
import ImageKit from "imagekit";
import { Loader2Icon } from "lucide-react";
// NOTE: No canvas context needed for this fix

/**
 * UploadImage uploads a single image to ImageKit.
 * After upload, it calls `onUploaded` AND dispatches a global "imageUploaded"
 * event that CanvasEditor is already listening for.
 */
export default function UploadImage({
  onUploaded,
}: {
  onUploaded: (file: { id: string; url: string }) => void;
}) {
  const [loading, setLoading] = useState(false);

  // WARNING: privateKey in browser is insecure. Use only for development.
  const imagekit = new ImageKit({
    publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY!,
    privateKey: process.env.NEXT_PUBLIC_IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!,
  });

  const onFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const res = await imagekit.upload({
        file,
        fileName: `${Date.now()}-${file.name}`,
        isPublished: true,
      });
      const url = res?.url as string | undefined;
      const id = res?.fileId || res?.name || `${Date.now()}`;
      if (!url) throw new Error("No URL returned from ImageKit upload.");

      // Update your side panel list
      onUploaded({ id, url });

      // 🔑 Make CanvasEditor place it (works even if canvas context is null)
      window.dispatchEvent(
        new CustomEvent("imageUploaded", { detail: { url } })
      );
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setLoading(false);
      e.currentTarget.value = "";
    }
  };

  return (
    <div>
      <label htmlFor="uploadImage">
        <h2 className="p-2 bg-[#8B0000] text-white rounded-md text-sm text-center flex justify-center items-center gap-2 cursor-pointer">
          {loading ? <Loader2Icon className="animate-spin" /> : "Upload Image"}
        </h2>
      </label>
      <input
        id="uploadImage"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileUpload}
        disabled={loading}
      />
    </div>
  );
}
