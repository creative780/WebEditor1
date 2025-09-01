"use client";

/*
 * CanvasStage
 *
 * Fully functional Fabric.js drawing surface hooked to CanvasEngine.
 * Supports: pan/zoom, brush, shapes, text (point/area), uploads (click/drag),
 * gradients, crop, templates, and an imperative API used by the editor.
 */

import React, {
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
import * as fabric from "fabric";
import { CanvasEngine } from "../../fabric/CanvasEngine";

/** Max dimension for initial image scale-down */
const MAX_IMG_SIDE = 600;

/** Load a DOM <img> reliably (handles CORS + blob/data URLs) */
function loadHTMLImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // crossOrigin only helps for remote http(s) resources; blob/data ignore it.
    if (/^https?:/i.test(src)) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

/** Create a Fabric image from any URL; supports Fabric v5/v6 */
async function loadFabricImage(src: string): Promise<fabric.Image> {
  const anyFabric: any = fabric as any;
  const FabricImage = anyFabric.Image;

  // Prefer Fabric v6 promise API if available
  if (FabricImage?.fromURL) {
    try {
      const maybe = FabricImage.fromURL(src, { crossOrigin: "anonymous" });
      // v6 returns a Promise; v5 used a callback
      if (maybe && typeof maybe.then === "function") {
        return (await maybe) as fabric.Image;
      }
      // Fallback: v5 callback form
      return await new Promise<fabric.Image>((resolve, reject) => {
        FabricImage.fromURL(
          src,
          (img: fabric.Image | null) =>
            img ? resolve(img) : reject(new Error("Image load failed")),
          { crossOrigin: "anonymous" }
        );
      });
    } catch {
      /* fall through to manual path */
    }
  }

  // Last resort: build from a loaded HTMLImageElement
  const el = await loadHTMLImage(src);
  return new FabricImage(el, {});
}

/** Create a blob URL for a File and a revoker for cleanup */
function fileToObjectURL(file: File) {
  const url = URL.createObjectURL(file);
  return { url, revoke: () => URL.revokeObjectURL(url) };
}

export interface CanvasStageProps {
  selectedTool?: string;
  currentColor?: string;
  currentGradient?: {
    type: string;
    c1: string;
    c2: string;
    mid?: number;
    angle?: number;
    opacity?: number;
    origin?: { x: number; y: number };
    aspectRatio?: number;
    reverse?: boolean;
    applyTo?: "fill" | "stroke" | "both";
  } | null;
  /** Notify parent so UI reflects text selection style */
  onTextSelectionChange?: (
    style: {
      fontFamily?: string;
      fontSize?: number;
      fontWeight?: string | number;
      fontStyle?: string;
      underline?: boolean;
      textAlign?: string;
    } | null
  ) => void;
  /** Force text tool behaviour */
  textMode?: "point" | "area";
}

/** Imperative API exposed to the editor page */
export interface CanvasStageRef {
  setFillColor: (hex: string) => void;
  applyGradient: (options: {
    type: string;
    c1: string;
    c2: string;
    mid?: number;
    angle?: number;
    opacity?: number;
    origin?: { x: number; y: number };
    aspectRatio?: number;
    reverse?: boolean;
    applyTo?: "fill" | "stroke" | "both";
  }) => void;
  insertTemplate: (id: string) => void;
  /** Insert images (Files, URLs, or HTMLImageElements) near top-left */
  addImages: (items: Array<File | string | HTMLImageElement>) => void;
  /** Insert images centered around a specific (x, y) drop point */
  addImagesAt: (
    x: number,
    y: number,
    items: Array<File | string | HTMLImageElement>
  ) => void;
  finalizeCrop: () => void;
  getCanvas: () => fabric.Canvas | null;
  applyTextStyle: (style: {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string | number;
    fontStyle?: string;
    underline?: boolean;
    textAlign?: string;
  }) => void;
  applyTextLayout: (mode: "point" | "area" | "path" | "wrap") => void;
}

const CanvasStage = forwardRef<CanvasStageRef, CanvasStageProps>(
  function CanvasStageInner(
    {
      selectedTool,
      currentColor,
      currentGradient,
      onTextSelectionChange,
      textMode,
    },
    ref
  ) {
    // DOM refs used by CanvasEngine
    const wrapRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const topRulerRef = useRef<HTMLCanvasElement | null>(null);
    const leftRulerRef = useRef<HTMLCanvasElement | null>(null);
    const rightRulerRef = useRef<HTMLCanvasElement | null>(null);
    const bottomRulerRef = useRef<HTMLCanvasElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // Persistent state
    const engineRef = useRef<CanvasEngine | null>(null);
    const toolRef = useRef<string | undefined>(selectedTool);
    const fillColourRef = useRef<string>(currentColor || "#111827");
    const gradientRef = useRef<CanvasStageProps["currentGradient"]>(null);
    const annotatorRef = useRef<{
      line: fabric.Line;
      a: fabric.Circle;
      b: fabric.Circle;
    } | null>(null);

    // Crop state
    const cropRectRef = useRef<fabric.Rect | null>(null);
    const cropStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const croppingFlagRef = useRef<boolean>(false);

    // Text drag-to-area state
    const textDragRef = useRef<{
      startX: number;
      startY: number;
      dragging: boolean;
    } | null>(null);

    // Mount: init engine, default content, handlers
    useEffect(() => {
      const wrapEl = wrapRef.current;
      const canvasEl = canvasRef.current;
      const top = topRulerRef.current;
      const left = leftRulerRef.current;
      const right = rightRulerRef.current;
      const bottom = bottomRulerRef.current;
      if (!wrapEl || !canvasEl || !top || !left || !right || !bottom) return;

      const engine = new CanvasEngine({
        canvasEl,
        wrapEl,
        rulers: { top, left, right, bottom },
        initialWidth: 800,
        initialHeight: 600,
        bleed: { top: 40, right: 40, bottom: 40, left: 40 },
      });
      engineRef.current = engine;

      const defaultRect = new fabric.Rect({
        left: 100,
        top: 100,
        width: 200,
        height: 120,
        fill: "#60a5fa",
        stroke: "#1d4ed8",
        strokeWidth: 1,
      });
      engine.canvas.add(defaultRect);
      engine.canvas.setActiveObject(defaultRect);
      engine.canvas.requestRenderAll();

      engine.resizeToWrap();

      // Mouse handlers
      function handleMouseDown(opt: any) {
        const canvas = engine.canvas;
        if (opt.target) return; // don't create over existing objects
        const pointer = canvas.getPointer(opt.e as MouseEvent);
        const { x, y } = pointer;
        const t = toolRef.current;

        if (t === "crop") {
          croppingFlagRef.current = true;
          cropStartRef.current = { x, y };
          const rect = new fabric.Rect({
            left: x,
            top: y,
            width: 0,
            height: 0,
            fill: "rgba(0,0,0,0.2)",
            stroke: "#c01919",
            strokeDashArray: [4, 4],
            selectable: false,
            evented: false,
          });
          cropRectRef.current = rect;
          canvas.add(rect);
          canvas.requestRenderAll();
          return;
        }

        switch (t) {
          case "rect":
          case "rectangle": {
            const obj = new fabric.Rect({
              left: x,
              top: y,
              width: 120,
              height: 80,
              fill: fillColourRef.current,
              stroke: "#1f2937",
              strokeWidth: 1,
            });
            canvas.add(obj);
            canvas.setActiveObject(obj);
            canvas.requestRenderAll();
            break;
          }
          case "square": {
            const obj = new fabric.Rect({
              left: x,
              top: y,
              width: 100,
              height: 100,
              fill: fillColourRef.current,
              stroke: "#1f2937",
              strokeWidth: 1,
            });
            canvas.add(obj);
            canvas.setActiveObject(obj);
            canvas.requestRenderAll();
            break;
          }
          case "circle":
          case "ellipse": {
            const obj = new fabric.Circle({
              left: x,
              top: y,
              radius: 40,
              fill: fillColourRef.current,
              stroke: "#1f2937",
              strokeWidth: 1,
            });
            canvas.add(obj);
            canvas.setActiveObject(obj);
            canvas.requestRenderAll();
            break;
          }
          case "polygon": {
            const size = 80;
            const points = [
              { x: 0, y: -1 },
              { x: 0.9511, y: 0.309 },
              { x: 0.5878, y: 0.809 },
              { x: -0.5878, y: 0.809 },
              { x: -0.9511, y: 0.309 },
            ].map((p) => ({ x: p.x * size + x, y: p.y * size + y }));
            const obj = new fabric.Polygon(points, {
              fill: fillColourRef.current,
              stroke: "#1f2937",
              strokeWidth: 1,
            });
            canvas.add(obj);
            canvas.setActiveObject(obj);
            canvas.requestRenderAll();
            break;
          }
          case "line": {
            const obj = new fabric.Line([x, y, x + 120, y], {
              fill: fillColourRef.current,
              stroke: fillColourRef.current,
              strokeWidth: 3,
            });
            canvas.add(obj);
            canvas.setActiveObject(obj);
            canvas.requestRenderAll();
            break;
          }
          case "arrow": {
            const pathData = `M ${x} ${y} L ${x + 120} ${y} M ${x + 100} ${
              y - 15
            } L ${x + 120} ${y} L ${x + 100} ${y + 15}`;
            const obj = new fabric.Path(pathData, {
              fill: fillColourRef.current,
              stroke: fillColourRef.current,
              strokeWidth: 3,
            });
            canvas.add(obj);
            canvas.setActiveObject(obj);
            canvas.requestRenderAll();
            break;
          }
          case "star": {
            const size = 40;
            const pts: { x: number; y: number }[] = [];
            const spikes = 5;
            const outerRadius = size;
            const innerRadius = size / 2;
            for (let i = 0; i < spikes * 2; i++) {
              const r = i % 2 === 0 ? outerRadius : innerRadius;
              const ang = (Math.PI / spikes) * i;
              pts.push({ x: x + Math.cos(ang) * r, y: y + Math.sin(ang) * r });
            }
            const obj = new fabric.Polygon(pts, {
              fill: fillColourRef.current,
              stroke: "#1f2937",
              strokeWidth: 1,
            });
            canvas.add(obj);
            canvas.setActiveObject(obj);
            canvas.requestRenderAll();
            break;
          }
          case "text": {
            // defer point vs area to mouse up
            textDragRef.current = { startX: x, startY: y, dragging: false };
            break;
          }
          default:
            break;
        }
      }

      function handleMouseMove(opt: any) {
        const canvas = engine.canvas;
        if (
          toolRef.current !== "crop" ||
          !croppingFlagRef.current ||
          !cropRectRef.current
        )
          return;
        const pointer = canvas.getPointer(opt.e as MouseEvent);
        const { x: startX, y: startY } = cropStartRef.current;
        cropRectRef.current.set({
          width: pointer.x - startX,
          height: pointer.y - startY,
        });
        canvas.requestRenderAll();
      }

      function handleMouseUp(opt: any) {
        const canvas = engine.canvas;

        // Text: click -> IText, drag -> Textbox
        if (toolRef.current === "text" && textDragRef.current) {
          const start = textDragRef.current;
          const pointer = canvas.getPointer(opt.e as MouseEvent);
          const dx = Math.abs(pointer.x - start.startX);
          const dy = Math.abs(pointer.y - start.startY);
          const dragged = dx > 4 || dy > 4;
          const forceArea = textMode === "area";
          const forcePoint = textMode === "point";

          if ((dragged && !forcePoint) || forceArea) {
            const w = Math.max(40, dx);
            const h = Math.max(24, dy);
            const tb = new fabric.Textbox("Type here", {
              left: Math.min(start.startX, pointer.x),
              top: Math.min(start.startY, pointer.y),
              width: w,
              height: h,
              fill: fillColourRef.current,
              fontSize: 24,
              fontFamily: "Inter, sans-serif",
              editable: true,
            });
            canvas.add(tb);
            canvas.setActiveObject(tb);
            canvas.requestRenderAll();
          } else {
            const it = new fabric.IText("Type here", {
              left: start.startX,
              top: start.startY,
              fill: fillColourRef.current,
              fontSize: 24,
              fontFamily: "Inter, sans-serif",
              editable: true,
            });
            canvas.add(it);
            canvas.setActiveObject(it);
            canvas.requestRenderAll();
          }
          textDragRef.current = null;
          return;
        }

        // Crop finalize
        if (
          toolRef.current !== "crop" ||
          !croppingFlagRef.current ||
          !cropRectRef.current
        )
          return;
        croppingFlagRef.current = false;

        const rect = cropRectRef.current;
        let left = rect.left || 0;
        let top = rect.top || 0;
        let width = rect.width || 0;
        let height = rect.height || 0;
        if (width < 0) {
          left += width;
          width = Math.abs(width);
        }
        if (height < 0) {
          top += height;
          height = Math.abs(height);
        }

        canvas.remove(rect);
        cropRectRef.current = null;
        canvas.requestRenderAll();

        const dataUrl = canvas.toDataURL({
          format: "png",
          left,
          top,
          width,
          height,
          multiplier: 1,
        });

        const objects = canvas.getObjects();
        objects.forEach((o) => {
          if (!(o as any).excludeFromExport) canvas.remove(o);
        });

        fabric.Image.fromURL(
          dataUrl,
          (img: any) => {
            img.set({ left, top });
            canvas.add(img);
            canvas.setActiveObject(img);
            canvas.requestRenderAll();
          },
          { crossOrigin: "anonymous" } as any
        );
      }

      engine.canvas.on("mouse:down", handleMouseDown as any);
      engine.canvas.on("mouse:move", handleMouseMove as any);
      engine.canvas.on("mouse:up", handleMouseUp as any);

      return () => {
        engine.canvas.off("mouse:down", handleMouseDown as any);
        engine.canvas.off("mouse:move", handleMouseMove as any);
        engine.canvas.off("mouse:up", handleMouseUp as any);
        engine.canvas.isDrawingMode = false;
        engine.canvas.dispose();
      };
    }, [textMode]);

    // Tool mode toggles drawing & triggers file input for uploads
    useEffect(() => {
      toolRef.current = selectedTool;
      const engine = engineRef.current;
      if (!engine) return;
      const canvas = engine.canvas;

      if (selectedTool === "brush") {
        canvas.isDrawingMode = true;
        const brush = canvas.freeDrawingBrush as fabric.PencilBrush;
        brush.color = fillColourRef.current as any;
        brush.width = 4;
      } else {
        canvas.isDrawingMode = false;
      }

      if (selectedTool === "upload") {
        setTimeout(() => fileInputRef.current?.click(), 0);
      }
    }, [selectedTool]);

    // Colour changes: update brush & selected objects immediately
    useEffect(() => {
      if (!currentColor) return;
      fillColourRef.current = currentColor;
      const engine = engineRef.current;
      if (!engine) return;

      if (engine.canvas.isDrawingMode) {
        const brush = engine.canvas.freeDrawingBrush as fabric.PencilBrush;
        brush.color = currentColor as any;
      }
      const active = engine.canvas.getActiveObjects();
      active.forEach((o) => (o as any).set({ fill: currentColor }));
      if (active.length) engine.canvas.requestRenderAll();
    }, [currentColor]);

    // Gradient cache
    useEffect(() => {
      gradientRef.current = currentGradient || null;
    }, [currentGradient]);

    // Selection change -> emit text style + gradient annotator
    useEffect(() => {
      const engine = engineRef.current;
      if (!engine) return;
      const canvas = engine.canvas;

      const cleanupAnnotator = () => {
        if (annotatorRef.current) {
          const { line, a, b } = annotatorRef.current;
          canvas.remove(line);
          canvas.remove(a);
          canvas.remove(b);
          annotatorRef.current = null;
          canvas.requestRenderAll();
        }
      };

      const emitTextStyle = () => {
        const obj = canvas.getActiveObject() as any;
        if (onTextSelectionChange) {
          if (obj && obj.text != null) {
            onTextSelectionChange({
              fontFamily: obj.fontFamily,
              fontSize: obj.fontSize,
              fontWeight: obj.fontWeight,
              fontStyle: obj.fontStyle,
              underline: !!obj.underline,
              textAlign: obj.textAlign,
            });
          } else {
            onTextSelectionChange(null);
          }
        }
      };

      const updateGradientHandles = () => {
        cleanupAnnotator();
        if (toolRef.current !== "gradient") return;
        const obj = canvas.getActiveObject() as any;
        if (!obj) return;
        const fill = obj.fill as any;
        if (!fill || !fill.colorStops || !fill.coords) return;

        const bounds = obj.getBoundingRect(true, true);
        const c = fill.coords as any;
        const x1 = (c.x1 ?? 0) + (obj.left || 0);
        const y1 = (c.y1 ?? 0) + (obj.top || 0);
        const x2 = (c.x2 ?? bounds.width) + (obj.left || 0);
        const y2 = (c.y2 ?? 0) + (obj.top || 0);

        const line = new fabric.Line([x1, y1, x2, y2], {
          stroke: "#8B0000",
          strokeWidth: 1,
          selectable: false,
          evented: false,
          excludeFromExport: true,
        });
        const handleOpts: fabric.ICircleOptions = {
          radius: 6,
          fill: "#ffffff",
          stroke: "#8B0000",
          strokeWidth: 2,
          hasControls: false,
          hasBorders: false,
          hoverCursor: "grab",
          excludeFromExport: true,
        } as any;
        const a = new fabric.Circle({
          left: x1 - 6,
          top: y1 - 6,
          ...handleOpts,
        });
        const b = new fabric.Circle({
          left: x2 - 6,
          top: y2 - 6,
          ...handleOpts,
        });

        const updateFromHandles = () => {
          const bounds2 = obj.getBoundingRect(true, true);
          const lx = (line.get("x1") as number) - (obj.left || 0);
          const ly = (line.get("y1") as number) - (obj.top || 0);
          const angle =
            (Math.atan2(
              (line.get("y2") as number) - (line.get("y1") as number),
              (line.get("x2") as number) - (line.get("x1") as number)
            ) *
              180) /
            Math.PI;

          applyGradient({
            ...(gradientRef.current ||
              ({ type: "linear", c1: "#ffffff", c2: "#000000" } as any)),
            origin: { x: lx / bounds2.width, y: ly / bounds2.height },
            angle,
            applyTo: (gradientRef.current as any)?.applyTo || "fill",
          });
          canvas.requestRenderAll();
        };

        a.on("moving", () => {
          line.set({ x1: (a.left || 0) + 6, y1: (a.top || 0) + 6 });
          updateFromHandles();
        });
        b.on("moving", () => {
          line.set({ x2: (b.left || 0) + 6, y2: (b.top || 0) + 6 });
          updateFromHandles();
        });

        [line, a, b].forEach((o) => ((o as any).selectable = false));
        canvas.add(line);
        canvas.add(a);
        canvas.add(b);
        annotatorRef.current = { line, a, b };
        canvas.requestRenderAll();
      };

      const onUpdate = () => {
        emitTextStyle();
        updateGradientHandles();
      };

      canvas.on("selection:created", onUpdate as any);
      canvas.on("selection:updated", onUpdate as any);
      canvas.on("selection:cleared", onUpdate as any);

      return () => {
        canvas.off("selection:created", onUpdate as any);
        canvas.off("selection:updated", onUpdate as any);
        canvas.off("selection:cleared", onUpdate as any);
        cleanupAnnotator();
      };
    }, [onTextSelectionChange]);

    // Recreate annotator when switching to/from gradient tool
    useEffect(() => {
      const engine = engineRef.current;
      if (!engine) return;
      const canvas = engine.canvas;
      const obj = canvas.getActiveObject();
      if (selectedTool === "gradient" && obj) {
        canvas.fire("selection:updated");
      } else if (selectedTool !== "gradient" && annotatorRef.current) {
        const { line, a, b } = annotatorRef.current;
        canvas.remove(line);
        canvas.remove(a);
        canvas.remove(b);
        annotatorRef.current = null;
        canvas.requestRenderAll();
      }
    }, [selectedTool]);

    // Hidden file input → add images
    useEffect(() => {
      const input = fileInputRef.current;
      if (!input) return;
      const handleChange = (e: Event) => {
        const target = e.target as HTMLInputElement;
        const files = Array.from(target.files ?? []);
        if (files.length) addImages(files);
        target.value = ""; // allow re-selecting same file
      };
      input.addEventListener("change", handleChange);
      return () => input.removeEventListener("change", handleChange);
    }, []);

    /** Core: add images (Files, URLs, or HTMLImageElements) at default position */
    const addImages = (items: Array<File | string | HTMLImageElement>) => {
      const engine = engineRef.current;
      if (!engine) return;
      const canvas = engine.canvas;

      items.forEach(async (item, index) => {
        let revoke: null | (() => void) = null;
        let src: string;

        if (typeof item === "string") {
          src = item; // data:, blob:, http(s)
        } else if (item instanceof File) {
          const obj = fileToObjectURL(item);
          src = obj.url;
          revoke = obj.revoke;
        } else {
          src = item.src;
        }

        try {
          const img = await loadFabricImage(src);
          const w = img.width ?? MAX_IMG_SIDE;
          const h = img.height ?? MAX_IMG_SIDE;
          const scale = Math.min(1, MAX_IMG_SIDE / Math.max(w, h));

          img.set({
            left: 80 + index * 20,
            top: 80 + index * 20,
            selectable: true,
          });
          if (scale < 1) img.scale(scale);

          canvas.add(img);
          canvas.setActiveObject(img);
          canvas.requestRenderAll();
        } finally {
          revoke?.();
        }
      });
    };

    /** Add images centered around a specific drop-point */
    const addImagesAt = (
      x: number,
      y: number,
      items: Array<File | string | HTMLImageElement>
    ) => {
      const engine = engineRef.current;
      if (!engine) return;
      const canvas = engine.canvas;

      items.forEach(async (item, index) => {
        let revoke: null | (() => void) = null;
        let src: string;

        if (typeof item === "string") {
          src = item;
        } else if (item instanceof File) {
          const obj = fileToObjectURL(item);
          src = obj.url;
          revoke = obj.revoke;
        } else {
          src = item.src;
        }

        try {
          const img = await loadFabricImage(src);
          const w = img.width ?? MAX_IMG_SIDE;
          const h = img.height ?? MAX_IMG_SIDE;
          const scale = Math.min(1, MAX_IMG_SIDE / Math.max(w, h));

          img.set({
            left: x + index * 10,
            top: y + index * 10,
            selectable: true,
          });
          if (scale < 1) img.scale(scale);

          canvas.add(img);
          canvas.setActiveObject(img);
          canvas.requestRenderAll();
        } finally {
          revoke?.();
        }
      });
    };

    /** Apply gradient to active selection */
    const applyGradient = (options: {
      type: string;
      c1: string;
      c2: string;
      mid?: number;
      angle?: number;
      opacity?: number;
      origin?: { x: number; y: number };
      aspectRatio?: number;
      reverse?: boolean;
      applyTo?: "fill" | "stroke" | "both";
    }) => {
      const engine = engineRef.current;
      if (!engine) return;
      const canvas = engine.canvas;
      const active = canvas.getActiveObjects();
      if (!active.length) return;

      const hexToRgb = (hex: string) => {
        let h = hex.replace("#", "");
        if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        const bigint = parseInt(h, 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return { r, g, b };
      };
      const toRgba = (hex: string, alpha: number) => {
        const { r, g, b } = hexToRgb(hex);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      };
      const mixColor = (aHex: string, bHex: string, t: number) => {
        const a = hexToRgb(aHex);
        const b = hexToRgb(bHex);
        const r = Math.round(a.r + (b.r - a.r) * t);
        const g = Math.round(a.g + (b.g - a.g) * t);
        const blue = Math.round(a.b + (b.b - a.b) * t);
        return `#${[r, g, blue]
          .map((v) => v.toString(16).padStart(2, "0"))
          .join("")}`;
      };

      active.forEach((obj: fabric.Object) => {
        const bounds = obj.getBoundingRect(true, true);
        const width = bounds.width;
        const height = bounds.height;
        const origin = options.origin || { x: 0, y: 0 };
        const aspect = Math.max(0.01, options.aspectRatio || 1);
        const applyTo = options.applyTo || "fill";

        const type = (options.type || "linear").toLowerCase();
        const midPct = options.mid != null ? options.mid : 50;
        const mid = midPct / 100;
        const angleVal = options.angle != null ? options.angle : 0;
        const opacityVal = options.opacity != null ? options.opacity : 100;
        const alpha = opacityVal / 100;
        const cStart = options.reverse ? options.c2 : options.c1;
        const cEnd = options.reverse ? options.c1 : options.c2;
        const c1Rgba = toRgba(cStart, alpha);
        const c2Rgba = toRgba(cEnd, alpha);
        const mixedMidHex = mixColor(cStart, cEnd, mid);
        const mixedMidRgba = toRgba(mixedMidHex, alpha);

        let grad: fabric.Gradient;

        if (type === "radial" || type === "conic") {
          const r2 = Math.max(width, height) / 2;
          grad = new fabric.Gradient({
            type: "radial",
            coords: {
              x1: width * (origin.x || 0.5),
              y1: height * (origin.y || 0.5),
              r1: 0,
              x2: width * (origin.x || 0.5),
              y2: height * (origin.y || 0.5),
              r2,
            },
            colorStops: [
              { offset: 0, color: c1Rgba },
              { offset: mid, color: mixedMidRgba },
              { offset: 1, color: c2Rgba },
            ],
          });
        } else if (type === "diamond") {
          const r2 = (Math.min(width, height) / 2) * aspect;
          grad = new fabric.Gradient({
            type: "radial",
            coords: {
              x1: width * (origin.x || 0.5),
              y1: height * (origin.y || 0.5),
              r1: 0,
              x2: width * (origin.x || 0.5),
              y2: height * (origin.y || 0.5),
              r2,
            },
            colorStops: [
              { offset: 0, color: c1Rgba },
              { offset: mid, color: mixedMidRgba },
              { offset: 1, color: c2Rgba },
            ],
          });
        } else {
          const rad = (angleVal * Math.PI) / 180;
          const x1 = width * (origin.x || 0.0);
          const y1 = height * (origin.y || 0.0);
          const x2 = x1 + Math.cos(rad) * width * aspect;
          const y2 = y1 + Math.sin(rad) * height;

          let colorStops: { offset: number; color: string }[] = [];
          if (type === "reflected") {
            const mixStartHex = mixColor(cStart, cEnd, mid);
            const mixStartRgba = toRgba(mixStartHex, alpha);
            const mirroredMid = 1 - mid;
            colorStops = [
              { offset: 0, color: c1Rgba },
              { offset: mid, color: mixStartRgba },
              { offset: mirroredMid, color: mixStartRgba },
              { offset: 1, color: c1Rgba },
            ];
          } else if (type === "multi-point" || type === "multi") {
            const mix35Hex = mixColor(cStart, cEnd, 0.35);
            const mix70Hex = mixColor(cStart, cEnd, 0.7);
            colorStops = [
              { offset: 0, color: c1Rgba },
              { offset: 0.35, color: toRgba(mix35Hex, alpha) },
              { offset: 0.7, color: toRgba(mix70Hex, alpha) },
              { offset: 1, color: c2Rgba },
            ];
          } else {
            colorStops = [
              { offset: 0, color: c1Rgba },
              { offset: mid, color: mixedMidRgba },
              { offset: 1, color: c2Rgba },
            ];
          }

          grad = new fabric.Gradient({
            type: "linear",
            coords: { x1, y1, x2, y2 },
            colorStops,
          });
        }

        if (applyTo === "stroke" || applyTo === "both")
          (obj as any).set({ stroke: grad });
        if (applyTo === "fill" || applyTo === "both")
          (obj as any).set({ fill: grad });
      });

      canvas.requestRenderAll();
    };

    /** Simple templates */
    const insertTemplate = (id: string) => {
      const engine = engineRef.current;
      if (!engine) return;
      const canvas = engine.canvas;

      if (id === "tpl-1" || id === "1") {
        const bg = new fabric.Rect({
          left: 100,
          top: 100,
          width: 300,
          height: 180,
          fill: "#f7fafc",
          stroke: "#e5e7eb",
          strokeWidth: 1,
          rx: 12,
          ry: 12,
        });
        const title = new fabric.Textbox("Your Title", {
          left: 120,
          top: 120,
          width: 260,
          fontSize: 28,
          fontWeight: 700,
          fill: fillColourRef.current,
        });
        const subtitle = new fabric.Textbox("Your subtitle goes here", {
          left: 120,
          top: 160,
          width: 260,
          fontSize: 16,
          fill: "#374151",
        });
        const group = new fabric.Group([bg, title, subtitle], {
          left: 80,
          top: 80,
        });
        canvas.add(group);
        canvas.setActiveObject(group);
        canvas.requestRenderAll();
        return;
      }

      if (id === "tpl-2" || id === "2") {
        const circle = new fabric.Circle({
          left: 150,
          top: 150,
          radius: 80,
          fill: fillColourRef.current,
        });
        const text = new fabric.Textbox("Template 2", {
          left: 120,
          top: 190,
          width: 160,
          textAlign: "center",
          fontSize: 20,
          fill: "white",
        });
        const group = new fabric.Group([circle, text], { left: 80, top: 80 });
        canvas.add(group);
        canvas.setActiveObject(group);
        canvas.requestRenderAll();
      }
    };

    /** Finalize crop if active */
    const finalizeCrop = () => {
      const engine = engineRef.current;
      if (!engine) return;
      if (!croppingFlagRef.current || !cropRectRef.current) return;

      const canvas = engine.canvas;
      croppingFlagRef.current = false;

      const rect = cropRectRef.current;
      let left = rect.left || 0;
      let top = rect.top || 0;
      let width = rect.width || 0;
      let height = rect.height || 0;
      if (width < 0) {
        left += width;
        width = Math.abs(width);
      }
      if (height < 0) {
        top += height;
        height = Math.abs(height);
      }

      canvas.remove(rect);
      cropRectRef.current = null;
      canvas.requestRenderAll();

      const dataUrl = canvas.toDataURL({
        format: "png",
        left,
        top,
        width,
        height,
        multiplier: 1,
      });

      const objects = canvas.getObjects();
      objects.forEach((o) => {
        if (!(o as any).excludeFromExport) canvas.remove(o);
      });

      fabric.Image.fromURL(
        dataUrl,
        (img: any) => {
          img.set({ left, top });
          canvas.add(img);
          canvas.setActiveObject(img);
          canvas.requestRenderAll();
        },
        { crossOrigin: "anonymous" } as any
      );
    };

    // External drag & drop on wrapper (single handler to avoid duplicates)
    useEffect(() => {
      const wrapEl = wrapRef.current;
      const engine = engineRef.current;
      if (!wrapEl || !engine) return;

      const onDragOver = (e: DragEvent) => e.preventDefault();
      const onDrop = async (e: DragEvent) => {
        e.preventDefault();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const url =
          e.dataTransfer?.getData("application/x-cc-image-url") ||
          e.dataTransfer?.getData("text/uri-list") ||
          e.dataTransfer?.getData("text/plain");

        const canvas = engine.canvas;
        const activeObj = canvas.getActiveObject() as any;
        const useAsPattern =
          !!activeObj &&
          (activeObj.type === "rect" ||
            activeObj.type === "circle" ||
            activeObj.type === "polygon" ||
            activeObj.type === "path" ||
            activeObj.type === "textbox" ||
            activeObj.type === "i-text");

        if (url) {
          if (useAsPattern && activeObj) {
            try {
              const imgEl = await loadHTMLImage(url);
              const bounds = activeObj.getBoundingRect(true, true);
              const patternCanvas = document.createElement("canvas");
              patternCanvas.width = Math.max(1, Math.round(bounds.width));
              patternCanvas.height = Math.max(1, Math.round(bounds.height));
              const ctx = patternCanvas.getContext("2d")!;
              const scale = Math.min(
                patternCanvas.width / imgEl.width,
                patternCanvas.height / imgEl.height
              );
              const dw = imgEl.width * scale;
              const dh = imgEl.height * scale;
              const dx = (patternCanvas.width - dw) / 2;
              const dy = (patternCanvas.height - dh) / 2;
              ctx.drawImage(imgEl, dx, dy, dw, dh);
              const pat = new (fabric as any).Pattern({
                source: patternCanvas,
                repeat: "no-repeat",
              });
              activeObj.set({ fill: pat });
              canvas.requestRenderAll();
            } catch {
              /* ignore */
            }
          } else {
            addImagesAt(x, y, [url]);
          }
          return;
        }

        const files = Array.from(e.dataTransfer?.files || []);
        if (files.length) addImagesAt(x, y, files as File[]);
      };

      wrapEl.addEventListener("dragover", onDragOver);
      wrapEl.addEventListener("drop", onDrop);
      return () => {
        wrapEl.removeEventListener("dragover", onDragOver);
        wrapEl.removeEventListener("drop", onDrop);
      };
    }, []);

    // Expose imperative API
    useImperativeHandle(ref, () => ({
      setFillColor(hex: string) {
        fillColourRef.current = hex;
        const engine = engineRef.current;
        if (!engine) return;

        if (engine.canvas.isDrawingMode) {
          const brush = engine.canvas.freeDrawingBrush as fabric.PencilBrush;
          brush.color = hex as any;
        }
        const active = engine.canvas.getActiveObjects();
        active.forEach((o) => (o as any).set({ fill: hex }));
        if (active.length) engine.canvas.requestRenderAll();
      },
      applyGradient(options) {
        applyGradient(options);
      },
      insertTemplate(id) {
        insertTemplate(id);
      },
      addImages(items) {
        addImages(items);
      },
      addImagesAt(x, y, items) {
        addImagesAt(x, y, items);
      },
      finalizeCrop() {
        finalizeCrop();
      },
      getCanvas() {
        return engineRef.current?.canvas ?? null;
      },
      applyTextStyle(style) {
        const canvas = engineRef.current?.canvas;
        if (!canvas) return;
        const selection = canvas.getActiveObjects();
        selection.forEach((o) => {
          if ((o as any).isEditing || (o as any).text != null) {
            (o as any).set({
              fontFamily: style.fontFamily ?? (o as any).fontFamily,
              fontSize: style.fontSize ?? (o as any).fontSize,
              fontWeight: style.fontWeight ?? (o as any).fontWeight,
              fontStyle: style.fontStyle ?? (o as any).fontStyle,
              underline: style.underline ?? (o as any).underline,
              textAlign: style.textAlign ?? (o as any).textAlign,
            });
          }
        });
        if (selection.length) canvas.requestRenderAll();
      },
      applyTextLayout(mode) {
        const canvas = engineRef.current?.canvas;
        if (!canvas) return;
        if (mode === "point" || mode === "area") return;
        const sel = canvas.getActiveObjects();
        if (!sel.length) return;
        const textObj = sel.find((o: any) => o.text != null) as any;
        const shapeObj = sel.find((o: any) => o !== textObj) as any;
        if (!textObj || !shapeObj) return;

        const toPathString = (o: fabric.Object): string | null => {
          const br = o.getBoundingRect(true, true);
          const left = o.left || 0;
          const top = o.top || 0;
          const x = left;
          const y = top;
          const w = br.width;
          const h = br.height;
          const type = (o as any).type;

          if (type === "path") {
            return (
              (o as any).path?.map((seg: any[]) => seg.join(" ")) || []
            ).join(" ");
          }
          if (type === "circle") {
            const cx = x + w / 2,
              cy = y + h / 2;
            const r = Math.max(w, h) / 2;
            return `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${
              cx + r
            } ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
          }
          if (type === "rect") {
            const rx = (o as any).rx || 0,
              ry = (o as any).ry || 0;
            if (!rx && !ry)
              return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${
                y + h
              } Z`;
            const r = Math.min(rx || ry || 0, Math.min(w, h) / 2);
            return `M ${x + r} ${y} L ${x + w - r} ${y} Q ${x + w} ${y} ${
              x + w
            } ${y + r} L ${x + w} ${y + h - r} Q ${x + w} ${y + h} ${
              x + w - r
            } ${y + h} L ${x + r} ${y + h} Q ${x} ${y + h} ${x} ${
              y + h - r
            } L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} Z`;
          }
          if (type === "polygon") {
            const pts = (o as any).points || [];
            if (!pts.length) return null;
            const path = [`M ${x + pts[0].x} ${y + pts[0].y}`].concat(
              pts.slice(1).map((p: any) => `L ${x + p.x} ${y + p.y}`)
            );
            path.push("Z");
            return path.join(" ");
          }
          return null;
        };

        if (mode === "path") {
          const d = toPathString(shapeObj);
          if (!d) return;
          const p = new fabric.Path(d, {
            fill: "",
            stroke: "",
            selectable: false,
            evented: false,
          } as any);
          (textObj as any).set({ path: p });
          canvas.requestRenderAll();
          return;
        }

        if (mode === "wrap") {
          const clone = (shapeObj as any).clone() as any;
          clone.set({
            absolutePositioned: true,
            evented: false,
            selectable: false,
          });
          (textObj as any).set({ clipPath: clone });
          canvas.requestRenderAll();
        }
      },
    }));

    return (
      <div
        ref={wrapRef}
        className="relative w-full h-full bg-neutral-50 overflow-hidden"
      >
        {/* main drawing surface */}
        <canvas ref={canvasRef} className="absolute inset-0" />

        {/* Horizontal rulers */}
        <canvas
          ref={topRulerRef}
          className="absolute left-6 right-6 top-0 h-6 select-none cursor-default pointer-events-none"
        />
        <canvas
          ref={bottomRulerRef}
          className="absolute left-6 right-6 bottom-0 h-6 select-none cursor-default pointer-events-none"
        />

        {/* Vertical rulers */}
        <canvas
          ref={leftRulerRef}
          className="absolute top-6 bottom-6 left-0 w-6 select-none cursor-default pointer-events-none"
        />
        <canvas
          ref={rightRulerRef}
          className="absolute top-6 bottom-6 right-0 w-6 select-none cursor-default pointer-events-none"
        />

        {/* Hidden file input for uploads (triggered when tool === 'upload') */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
        />
      </div>
    );
  }
);

export default CanvasStage;
