"use client";

import React, {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useState,
} from "react";
import { fabric } from "fabric";

export type CanvasEditorRef = {
  applyTextStyle: (style: Partial<fabric.IText>) => void;
};

type CanvasEditorProps = {
  onReady?: (canvas: fabric.Canvas) => void;
};

const CanvasEditor = forwardRef<CanvasEditorRef, CanvasEditorProps>(
  ({ onReady }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
    // kept to ensure the "below" code doesn't lose its state pattern
    const [canvasState, setCanvasState] = useState<fabric.Canvas | null>(null);

    useEffect(() => {
      if (!canvasRef.current) return;

      const canvasEl = canvasRef.current;
      const scaleFactor = window.devicePixelRatio || 1;

      // Initialize Fabric.js canvas
      const fabricCanvas = new fabric.Canvas(canvasEl, {
        backgroundColor: "#ffffff",
      });

      fabricCanvasRef.current = fabricCanvas;
      setCanvasState(fabricCanvas); // parity with the "below" code's setCanvas

      // Base logical size
      const width = 1280;
      const height = 720;

      // Physical pixels for crisp rendering on HiDPI
      canvasEl.width = width * scaleFactor;
      canvasEl.height = height * scaleFactor;

      // Keep the responsive container behavior from the "below" code
      // (we still set explicit CSS size so the zoom math lines up)
      canvasEl.style.width = `${width}px`;
      canvasEl.style.height = `${height}px`;

      // Match the "below" code behavior: set Fabric canvas to scaled size + zoom back
      fabricCanvas.setWidth(width * scaleFactor);
      fabricCanvas.setHeight(height * scaleFactor);
      fabricCanvas.setZoom(1 / scaleFactor);
      fabricCanvas.renderAll();

      onReady?.(fabricCanvas);

      // ===== Image upload parity (from "below" code) =====
      const handleImageUploaded = (e: Event) => {
        const customEvent = e as CustomEvent<{ url: string }>;
        const imageUrl = customEvent.detail?.url;
        if (!imageUrl) return;

        fabric.Image.fromURL(
          imageUrl,
          (img) => {
            if (!img) return;

            img.set({
              left: fabricCanvas.getWidth() / 2,
              top: fabricCanvas.getHeight() / 2,
              originX: "center",
              originY: "center",
              selectable: true,
            });

            fabricCanvas.add(img);
            fabricCanvas.setActiveObject(img);
            fabricCanvas.renderAll();
          },
          { crossOrigin: "anonymous" }
        );
      };

      // ===== Selection change (from "above" code) =====
      const handleSelection = (e: fabric.IEvent<MouseEvent>) => {
        const activeObject = (e as any).selected?.[0];
        const isText =
          activeObject?.type === "text" ||
          activeObject?.type === "i-text" ||
          activeObject?.type === "textbox";

        window.dispatchEvent(
          new CustomEvent("textSelectionChanged", { detail: isText })
        );
      };

      const clearSelection = () => {
        window.dispatchEvent(
          new CustomEvent("textSelectionChanged", { detail: false })
        );
      };

      fabricCanvas.on("selection:created", handleSelection);
      fabricCanvas.on("selection:updated", handleSelection);
      fabricCanvas.on("selection:cleared", clearSelection);

      window.addEventListener("imageUploaded", handleImageUploaded);

      return () => {
        fabricCanvas.off("selection:created", handleSelection);
        fabricCanvas.off("selection:updated", handleSelection);
        fabricCanvas.off("selection:cleared", clearSelection);
        window.removeEventListener("imageUploaded", handleImageUploaded);
        fabricCanvas.dispose();
      };
    }, [onReady]);

    // === Expose text styling API (from "above" code) ===
    useImperativeHandle(ref, () => ({
      applyTextStyle: (style) => {
        const fabricCanvas = fabricCanvasRef.current;
        const activeObject = fabricCanvas?.getActiveObject();

        if (
          fabricCanvas &&
          activeObject &&
          (activeObject.type === "textbox" ||
            activeObject.type === "text" ||
            activeObject.type === "i-text")
        ) {
          Object.entries(style).forEach(([key, value]) => {
            if (value !== undefined && key in activeObject) {
              (activeObject as any).set(key, value);
            }
          });
          fabricCanvas.renderAll();
        }
      },
    }));

    return (
      <div className="overflow-auto border rounded-md max-w-full">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
    );
  }
);

CanvasEditor.displayName = "CanvasEditor";
export default CanvasEditor;
