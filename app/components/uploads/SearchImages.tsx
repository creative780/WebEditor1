"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { Loader2Icon, SearchIcon } from "lucide-react";
import { useCanvasHook } from "@/app/hooks/useCanvasHook";

/**
 * Searches Unsplash and inserts selected images.
 * If canvas context exists, insert directly.
 * If it doesn't, fall back to global "imageUploaded" so CanvasEditor handles it.
 */
export default function SearchImages() {
  const { canvasEditor } = useCanvasHook();
  const [imageList, setImageList] = useState<any[]>([]);
  const [query, setQuery] = useState("Mountain");
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await axios.get("https://api.unsplash.com/search/photos", {
        params: { query: query.trim(), page: 1, per_page: 20 },
        headers: {
          Authorization: `Client-ID ${process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY}`,
        },
      });
      setImageList(res?.data?.results || []);
    } catch (e) {
      console.error("Unsplash search error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reusable direct insert (when canvasEditor is ready)
  const insertToCanvas = async (src: string) => {
    if (!canvasEditor) return;
    const mod = await import("fabric");
    const F: any = mod.fabric ?? mod;
    const imgObj: HTMLImageElement = await new Promise((resolve, reject) => {
      F.util.loadImage(
        src,
        (img: HTMLImageElement) => {
          if (!img) return reject(new Error("Failed to load image"));
          resolve(img);
        },
        { crossOrigin: "anonymous" }
      );
    });
    const img = new F.Image(imgObj);
    const cw = canvasEditor.getWidth();
    const ch = canvasEditor.getHeight();
    img.set({
      left: cw / 2,
      top: ch / 2,
      originX: "center",
      originY: "center",
      selectable: true,
    });
    const maxW = cw * 0.9;
    const maxH = ch * 0.9;
    const scale = Math.min(maxW / img.width!, maxH / img.height!, 1);
    if (scale < 1) img.scale(scale);
    canvasEditor.add(img);
    canvasEditor.setActiveObject(img);
    canvasEditor.requestRenderAll();
  };

  const addToCanvas = async (unsplash: any) => {
    const src = unsplash?.urls?.raw
      ? `${unsplash.urls.raw}&w=2000&q=85&dpr=1`
      : unsplash?.urls?.regular ||
        unsplash?.urls?.full ||
        unsplash?.urls?.small;

    if (!src) return;

    if (canvasEditor) {
      // Use direct insert when context is available
      await insertToCanvas(src);
    } else {
      // ✅ Fallback that guarantees it works: let CanvasEditor do it
      window.dispatchEvent(
        new CustomEvent("imageUploaded", { detail: { url: src } })
      );
    }
  };

  return (
    <div className="mt-5">
      <h2 className="text-sm font-medium mb-2">Search Images</h2>
      <div className="flex w-full mb-4">
        <input
          type="text"
          placeholder="Mountain"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          className="flex-1 rounded-l-md border border-[#cfcfcf] px-3 py-2 text-sm focus:outline-none"
        />
        <button
          onClick={search}
          disabled={loading}
          aria-label="Search"
          className="rounded-r-md bg-[#8B0000] text-white px-3 grid place-items-center"
        >
          {loading ? (
            <Loader2Icon className="w-4 h-4 animate-spin" />
          ) : (
            <SearchIcon className="w-4 h-4" />
          )}
        </button>
      </div>
      <div
        className="grid grid-cols-2 gap-2 overflow-y-auto pr-1"
        style={{ maxHeight: "75vh" }}
      >
        {imageList.map((img, i) => (
          <button
            key={i}
            type="button"
            onClick={() => addToCanvas(img)}
            title="Add to canvas"
            className="relative block w-full pt-[60%] rounded-sm overflow-hidden border border-[#d6d6d6] hover:shadow"
          >
            <img
              src={img?.urls?.thumb || img?.urls?.small}
              alt={img?.slug || "unsplash-image"}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
