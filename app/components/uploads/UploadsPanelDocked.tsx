"use client";

import React from "react";
import { Trash2 } from "lucide-react";
import UploadImage from "./UploadImage";
import SearchImages from "./SearchImages";
import { useCanvasHook } from "@/app/hooks/useCanvasHook";

/**
 * UploadsPanelDocked combines the upload button, a grid of uploaded
 * images, and an Unsplash search list. It manages its own local
 * state of uploaded files and renders a checkbox and delete icon for
 * each image. The search panel sits below the uploads.
 */
export default function UploadsPanelDocked() {
  const [files, setFiles] = React.useState<Array<{ id: string; url: string }>>(
    []
  );
  const { canvasEditor } = useCanvasHook();

  /**
   * Inserts the given image URL into the Fabric canvas. Uses dynamic
   * import to avoid assuming a named export.
   */
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

  const onUploaded = (file: { id: string; url: string }) => {
    setFiles((prev) => [...prev, file]);
  };

  const removeAt = (id: string) => {
    setFiles((prev) => prev.filter((x) => x.id !== id));
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-3 pt-3 pb-2">
        <div className="text-[18px] font-semibold text-[#7b7b7b] text-center">
          Uploads
        </div>
      </div>
      {/* Upload button */}
      <div className="px-3">
        <UploadImage onUploaded={onUploaded} />
      </div>
      {/* Uploaded images grid (no empty placeholders) */}
      <div className="mt-3 px-3">
        {files.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {files.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => insertToCanvas(item.url)}
                className="relative rounded-[6px] bg-white border border-[#d6d6d6] pt-[100%] overflow-hidden hover:shadow"
                title="Insert into canvas"
              >
                <label className="absolute left-2 top-2">
                  <input
                    type="checkbox"
                    className="h-[14px] w-[14px] rounded-[3px] border border-black/70 accent-black"
                    onClick={(e) => e.stopPropagation()}
                  />
                </label>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAt(item.id);
                  }}
                  className="absolute right-2 top-2 p-1 rounded hover:bg-[#f1f1f1]"
                  title="Delete"
                  aria-label="Delete"
                >
                  <Trash2 className="w-4 h-4 text-black" />
                </button>
                <img
                  src={item.url}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
      {/* Unsplash search, docked below the upload section */}
      <div className="mt-4 flex-1 overflow-y-auto px-3 pb-3">
        <SearchImages />
      </div>
    </div>
  );
}
