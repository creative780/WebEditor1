"use client";

/*
 * CanvasStage
 *
 * This component provides a fully functional drawing surface based on
 * Fabric.js.  It supports panning and zooming via the CanvasEngine
 * wrapper, freehand drawing with the brush tool, inserting various
 * shapes and text, uploading images directly to the canvas and
 * cropping the document.  Colours and gradients can be applied to
 * selected objects and are propagated to new objects.  A ref
 * interface exposes imperative methods so the parent page can
 * interact with the stage without prop drilling.  The interface
 * includes methods for updating the fill colour, applying gradient
 * fills, inserting templates, adding images and finalising a crop
 * operation.
 */

import React, {
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
import * as fabric from "fabric";
import { CanvasEngine } from "../../fabric/CanvasEngine";

// Describes the props accepted by the CanvasStage.  The selected tool
// determines the behaviour of pointer interactions.  The current
// colour and gradient are used when drawing new objects or updating
// existing selections.  The gradient object is optional; when
// provided and the user triggers a gradient application it will be
// applied via the ref method.
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
  } | null;
}

// Methods exposed on the CanvasStage via a ref.  Consumers can use
// these functions to manipulate the canvas directly.
export interface CanvasStageRef {
  /**
   * Set the active fill colour.  Updates the brush colour and
   * immediately applies the colour to all selected objects.  Future
   * shapes and strokes will use this colour.
   */
  setFillColor: (hex: string) => void;
  /**
   * Apply a gradient fill to all currently selected objects.  The
   * gradient definition supports several types and includes start/end
   * colours and an angle.  Unknown types will fall back to a simple
   * linear gradient.
   */
  applyGradient: (options: {
    type: string;
    c1: string;
    c2: string;
    mid?: number;
    angle?: number;
    opacity?: number;
  }) => void;
  /**
   * Insert a template onto the canvas.  Templates are predefined
   * arrangements of objects demonstrating how multiple shapes and
   * text can be composed.  The implementation includes a few basic
   * examples.
   */
  insertTemplate: (id: string) => void;
  /**
   * Insert one or more images onto the canvas.  The argument can
   * either be a list of File objects (from a file input) or a list
   * of data URLs.  Each image will be added at a default position
   * near the top left of the canvas.
   */
  addImages: (files: File[] | string[]) => void;
  /**
   * Finalise a cropping operation.  If the user has drawn a crop
   * rectangle the canvas contents will be exported to an image and
   * replaced by the cropped artwork.  If no crop is in progress
   * this is a no‑op.
   */
  finalizeCrop: () => void;
  /** Return the underlying Fabric canvas for advanced interactions. */
  getCanvas: () => fabric.Canvas | null;
}

/**
 * The CanvasStage component.  Accepts a selected tool and optional
 * colour/gradient definitions and exposes an imperative API via a ref.
 */
const CanvasStage = forwardRef<CanvasStageRef, CanvasStageProps>(
  function CanvasStageInner({ selectedTool, currentColor, currentGradient }, ref) {
    // References to DOM elements used by the CanvasEngine
    const wrapRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const topRulerRef = useRef<HTMLCanvasElement | null>(null);
    const leftRulerRef = useRef<HTMLCanvasElement | null>(null);
    const rightRulerRef = useRef<HTMLCanvasElement | null>(null);
    const bottomRulerRef = useRef<HTMLCanvasElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // The engine and tool references persist across renders.  The
    // fillColourRef stores the currently active colour for drawing and
    // shape fills.  The gradientRef holds the latest gradient
    // definition to apply when requested.
    const engineRef = useRef<CanvasEngine | null>(null);
    const toolRef = useRef<string | undefined>(selectedTool);
    const fillColourRef = useRef<string>(currentColor || "#111827");
    const gradientRef = useRef<CanvasStageProps["currentGradient"]>(null);

    // Cropping state.  When cropping is active the user drags out a
    // rectangle on the canvas.  The cropRectRef stores the Fabric
    // rectangle used for the overlay.  cropStartRef keeps the
    // coordinate where the drag started.  croppingFlagRef is a boolean
    // wrapper used to signal whether cropping is in progress.
    const cropRectRef = useRef<fabric.Rect | null>(null);
    const cropStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const croppingFlagRef = useRef<boolean>(false);

    // Initialise the CanvasEngine and basic handlers once on mount
    useEffect(() => {
      const wrapEl = wrapRef.current;
      const canvasEl = canvasRef.current;
      const top = topRulerRef.current;
      const left = leftRulerRef.current;
      const right = rightRulerRef.current;
      const bottom = bottomRulerRef.current;
      if (!wrapEl || !canvasEl || !top || !left || !right || !bottom) return;

      // Create a new engine and store it
      const engine = new CanvasEngine({
        canvasEl: canvasEl,
        wrapEl: wrapEl,
        rulers: { top, left, right, bottom },
        initialWidth: 800,
        initialHeight: 600,
        bleed: { top: 40, right: 40, bottom: 40, left: 40 },
      });
      engineRef.current = engine;

      // Add a default rectangle so the canvas isn't empty
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

      // Resize the engine to fit its wrapper and draw rulers
      engine.resizeToWrap();

      // Handler for mouse down events.  Creates shapes/text when not
      // cropping.  When cropping, it starts drawing the crop rectangle.
      function handleMouseDown(opt: fabric.IEvent) {
        const canvas = engine.canvas;
        // Ignore clicks on existing objects when adding new ones
        if (opt.target) return;
        const pointer = canvas.getPointer(opt.e as MouseEvent);
        const { x, y } = pointer;
        const t = toolRef.current;
        // Begin cropping by creating the overlay rectangle
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

        // For other tools create appropriate objects
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
            const pathData = `M ${x} ${y} L ${x + 120} ${y} M ${x + 100} ${y - 15} L ${x + 120} ${y} L ${x + 100} ${y + 15}`;
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
            const obj = new fabric.Textbox("Double-click to edit", {
              left: x,
              top: y,
              width: 200,
              fill: fillColourRef.current,
              fontSize: 24,
              fontFamily: "Inter, sans-serif",
              editable: true,
            });
            canvas.add(obj);
            canvas.setActiveObject(obj);
            canvas.requestRenderAll();
            break;
          }
          case "upload": {
            // In upload mode clicking does not create objects; the file
            // input is triggered separately via a useEffect.
            break;
          }
          default:
            break;
        }
      }

      // Handler for mouse move events during cropping.  Updates the
      // overlay rectangle as the user drags the pointer.
      function handleMouseMove(opt: fabric.IEvent) {
        const canvas = engine.canvas;
        const t = toolRef.current;
        if (t !== "crop" || !croppingFlagRef.current || !cropRectRef.current) return;
        const pointer = canvas.getPointer(opt.e as MouseEvent);
        const { x: startX, y: startY } = cropStartRef.current;
        cropRectRef.current.set({
          width: pointer.x - startX,
          height: pointer.y - startY,
        });
        canvas.requestRenderAll();
      }

      // Handler for mouse up events when cropping.  Finalises the crop
      // rectangle and replaces the artwork with the cropped snapshot.
      function handleMouseUp(opt: fabric.IEvent) {
        const canvas = engine.canvas;
        const t = toolRef.current;
        if (t !== "crop" || !croppingFlagRef.current || !cropRectRef.current) return;
        croppingFlagRef.current = false;
        const rect = cropRectRef.current;
        // Normalise the rectangle (fabric may store negative widths/heights)
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
        // Remove the overlay
        canvas.remove(rect);
        cropRectRef.current = null;
        canvas.requestRenderAll();
        // Export the specified region to an image.  The bleed rectangle
        // is marked excludeFromExport so it will not appear in the
        // resulting image.
        const dataUrl = canvas.toDataURL({
          format: "png",
          left,
          top,
          width,
          height,
          multiplier: 1,
        });
        // Remove all objects except those excluded from export (e.g. bleed)
        const objects = canvas.getObjects();
        objects.forEach((o) => {
          if (!(o as any).excludeFromExport) {
            canvas.remove(o);
          }
        });
        // Add the cropped image at the origin of the crop region
        fabric.Image.fromURL(dataUrl, (img) => {
          img.set({ left, top });
          canvas.add(img);
          canvas.setActiveObject(img);
          canvas.requestRenderAll();
        });
      }

      // Register handlers
      engine.canvas.on("mouse:down", handleMouseDown as any);
      engine.canvas.on("mouse:move", handleMouseMove as any);
      engine.canvas.on("mouse:up", handleMouseUp as any);

      // Clean up all listeners on unmount
      return () => {
        engine.canvas.off("mouse:down", handleMouseDown as any);
        engine.canvas.off("mouse:move", handleMouseMove as any);
        engine.canvas.off("mouse:up", handleMouseUp as any);
        engine.canvas.isDrawingMode = false;
        engine.canvas.dispose();
      };
    }, []);

    // Update tool and drawing mode whenever selectedTool changes
    useEffect(() => {
      toolRef.current = selectedTool;
      const engine = engineRef.current;
      if (!engine) return;
      const canvas = engine.canvas;
      if (selectedTool === "brush") {
        canvas.isDrawingMode = true;
        const brush = canvas.freeDrawingBrush as fabric.PencilBrush;
        brush.color = fillColourRef.current;
        brush.width = 4;
      } else {
        canvas.isDrawingMode = false;
      }
      // Trigger file input when the upload tool becomes active
      if (selectedTool === "upload") {
        // Delay to ensure the ref is set
        setTimeout(() => {
          fileInputRef.current?.click();
        }, 0);
      }
    }, [selectedTool]);

    // Update the stored colour whenever currentColor prop changes
    useEffect(() => {
      if (currentColor) {
        fillColourRef.current = currentColor;
        // Immediately update brush colour if in drawing mode
        const engine = engineRef.current;
        if (engine && engine.canvas.isDrawingMode) {
          const brush = engine.canvas.freeDrawingBrush as fabric.PencilBrush;
          brush.color = currentColor;
        }
        // Apply colour to active objects
        const canvas = engineRef.current?.canvas;
        if (canvas) {
          const active = canvas.getActiveObjects();
          active.forEach((o) => {
            (o as any).set({ fill: currentColor });
          });
          if (active.length) {
            canvas.requestRenderAll();
          }
        }
      }
    }, [currentColor]);

    // Update the stored gradient whenever the prop changes
    useEffect(() => {
      gradientRef.current = currentGradient || null;
    }, [currentGradient]);

    // Handle file input changes for image uploads
    useEffect(() => {
      const input = fileInputRef.current;
      if (!input) return;
      const handleChange = (e: Event) => {
        const target = e.target as HTMLInputElement;
        const files = Array.from(target.files ?? []);
        if (!files.length) return;
        // Add the images via our imperative API
        addImages(files);
        // Reset the input so the same file can be selected again
        target.value = "";
      };
      input.addEventListener("change", handleChange);
      return () => {
        input.removeEventListener("change", handleChange);
      };
    }, []);

    /**
     * Insert images onto the canvas.  Accepts either File objects or
     * pre‑existing data URLs.  Images are scaled down if necessary to
     * maintain a maximum size of 400×400 pixels.
     */
    const addImages = (files: File[] | string[]) => {
      const engine = engineRef.current;
      if (!engine) return;
      const canvas = engine.canvas;
      files.forEach((file, index) => {
        const load = (url: string) => {
          fabric.Image.fromURL(url, (img) => {
            // Limit the size to a reasonable maximum
            const maxDim = 400;
            const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
            img.set({
              left: 80 + index * 20,
              top: 80 + index * 20,
              scaleX: scale,
              scaleY: scale,
            });
            canvas.add(img);
            canvas.setActiveObject(img);
            canvas.requestRenderAll();
          });
        };
        if (typeof file === "string") {
          load(file);
        } else {
          const reader = new FileReader();
          reader.onload = () => {
            const url = reader.result as string;
            load(url);
          };
          reader.readAsDataURL(file);
        }
      });
    };

    /**
     * Apply a gradient to all selected objects.  Supports linear
     * gradients oriented by an angle.  Additional types can be
     * implemented by extending the switch below.
     */
    const applyGradient = (options: {
      type: string;
      c1: string;
      c2: string;
      mid?: number;
      angle?: number;
      opacity?: number;
    }) => {
      const engine = engineRef.current;
      if (!engine) return;
      const canvas = engine.canvas;
      const active = canvas.getActiveObjects();
      if (!active.length) return;

      // Helper to convert hex colour to RGB components
      const hexToRgb = (hex: string) => {
        let h = hex.replace('#', '');
        if (h.length === 3) {
          h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        }
        const bigint = parseInt(h, 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return { r, g, b };
      };
      // Helper to convert RGB and alpha to an rgba() string
      const toRgba = (hex: string, alpha: number) => {
        const { r, g, b } = hexToRgb(hex);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      };
      // Mix two hex colours linearly in RGB space
      const mixColor = (aHex: string, bHex: string, t: number) => {
        const a = hexToRgb(aHex);
        const b = hexToRgb(bHex);
        const r = Math.round(a.r + (b.r - a.r) * t);
        const g = Math.round(a.g + (b.g - a.g) * t);
        const blue = Math.round(a.b + (b.b - a.b) * t);
        const mixed = `#${[r, g, blue]
          .map((v) => v.toString(16).padStart(2, '0'))
          .join('')}`;
        return mixed;
      };

      active.forEach((obj: fabric.Object) => {
        const bounds = obj.getBoundingRect(true, true);
        const width = bounds.width;
        const height = bounds.height;
        // Default values with sensible fallbacks
        const type = (options.type || 'linear').toLowerCase();
        const midPct = options.mid != null ? options.mid : 50;
        const mid = midPct / 100;
        const angleVal = options.angle != null ? options.angle : 0;
        const opacityVal = options.opacity != null ? options.opacity : 100;
        const alpha = opacityVal / 100;
        const c1Rgba = toRgba(options.c1, alpha);
        const c2Rgba = toRgba(options.c2, alpha);
        // Precompute mixed colours used for mid-point and multi-point stops
        const mixedMidHex = mixColor(options.c1, options.c2, mid);
        const mixedMidRgba = toRgba(mixedMidHex, alpha);

        // Determine gradient configuration based on type
        let grad: fabric.Gradient;
        if (type === 'radial' || type === 'conic') {
          // Radial gradient from centre to outer edge
          const r2 = Math.max(width, height) / 2;
          grad = new fabric.Gradient({
            type: 'radial',
            coords: {
              x1: width / 2,
              y1: height / 2,
              r1: 0,
              x2: width / 2,
              y2: height / 2,
              r2,
            },
            colorStops: [
              { offset: 0, color: c1Rgba },
              { offset: mid, color: mixedMidRgba },
              { offset: 1, color: c2Rgba },
            ],
          });
        } else if (type === 'diamond') {
          // Approximate a diamond gradient using a radial gradient with a smaller radius
          const r2 = Math.min(width, height) / 2;
          grad = new fabric.Gradient({
            type: 'radial',
            coords: {
              x1: width / 2,
              y1: height / 2,
              r1: 0,
              x2: width / 2,
              y2: height / 2,
              r2,
            },
            colorStops: [
              { offset: 0, color: c1Rgba },
              { offset: mid, color: mixedMidRgba },
              { offset: 1, color: c2Rgba },
            ],
          });
        } else {
          // All linear variants (linear, reflected, conic, multi-point and unknown)
          const rad = (angleVal * Math.PI) / 180;
          // Compute vector for linear gradient
          const x2 = Math.cos(rad) * width;
          const y2 = Math.sin(rad) * height;
          let colorStops: { offset: number; color: string }[] = [];
          if (type === 'reflected') {
            // Mirror around mid-point: c1 -> mix -> c2 -> mix -> c1
            const mixStartHex = mixColor(options.c1, options.c2, mid);
            const mixStartRgba = toRgba(mixStartHex, alpha);
            const mirroredMid = 1 - mid;
            colorStops = [
              { offset: 0, color: c1Rgba },
              { offset: mid, color: mixStartRgba },
              { offset: mirroredMid, color: mixStartRgba },
              { offset: 1, color: c1Rgba },
            ];
          } else if (type === 'multi-point' || type === 'multi') {
            // Multi-point gradient: stops at 0, 0.35, 0.7, 1
            const mix35Hex = mixColor(options.c1, options.c2, 0.35);
            const mix70Hex = mixColor(options.c1, options.c2, 0.7);
            colorStops = [
              { offset: 0, color: c1Rgba },
              { offset: 0.35, color: toRgba(mix35Hex, alpha) },
              { offset: 0.7, color: toRgba(mix70Hex, alpha) },
              { offset: 1, color: c2Rgba },
            ];
          } else {
            // Default linear or unsupported types: treat as simple linear with optional midpoint
            colorStops = [
              { offset: 0, color: c1Rgba },
              { offset: mid, color: mixedMidRgba },
              { offset: 1, color: c2Rgba },
            ];
          }
          grad = new fabric.Gradient({
            type: 'linear',
            coords: { x1: 0, y1: 0, x2, y2 },
            colorStops,
          });
        }
        (obj as any).set({ fill: grad });
      });
      canvas.requestRenderAll();
    };

    /**
     * Insert a simple template.  You can expand this switch to add
     * further templates with more complex arrangements.  Templates
     * consist of a group of objects added at once.
     */
    const insertTemplate = (id: string) => {
      const engine = engineRef.current;
      if (!engine) return;
      const canvas = engine.canvas;
      if (id === "tpl-1" || id === "1") {
        // Create a light background card
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
        const group = new fabric.Group([bg, title, subtitle], { left: 80, top: 80 });
        canvas.add(group);
        canvas.setActiveObject(group);
        canvas.requestRenderAll();
        return;
      }
      if (id === "tpl-2" || id === "2") {
        // A second template with a large circle and centred text
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
        return;
      }
    };

    /**
     * Finalise cropping manually.  If a crop is in progress this
     * function will perform the same steps as releasing the mouse in
     * cropping mode.
     */
    const finalizeCrop = () => {
      const engine = engineRef.current;
      if (!engine) return;
      if (!croppingFlagRef.current || !cropRectRef.current) return;
      const canvas = engine.canvas;
      // Simulate mouse up behaviour
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
        if (!(o as any).excludeFromExport) {
          canvas.remove(o);
        }
      });
      fabric.Image.fromURL(dataUrl, (img) => {
        img.set({ left, top });
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.requestRenderAll();
      });
    };

    /**
     * Expose the imperative API via useImperativeHandle.  The parent
     * component can call these methods on the ref returned by
     * useRef().
     */
    useImperativeHandle(ref, () => ({
      setFillColor(hex: string) {
        fillColourRef.current = hex;
        // Update brush colour if drawing
        const engine = engineRef.current;
        if (engine && engine.canvas.isDrawingMode) {
          const brush = engine.canvas.freeDrawingBrush as fabric.PencilBrush;
          brush.color = hex;
        }
        // Apply to active objects
        const canvas = engineRef.current?.canvas;
        if (canvas) {
          const active = canvas.getActiveObjects();
          active.forEach((o) => {
            (o as any).set({ fill: hex });
          });
          if (active.length) canvas.requestRenderAll();
        }
      },
      applyGradient(options) {
        applyGradient(options);
      },
      insertTemplate(id) {
        insertTemplate(id);
      },
      addImages(filesOrUrls) {
        addImages(filesOrUrls);
      },
      finalizeCrop() {
        finalizeCrop();
      },
      getCanvas() {
        return engineRef.current?.canvas ?? null;
      },
    }));

    return (
      <div ref={wrapRef} className="relative w-full h-full bg-neutral-50 overflow-hidden">
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
        {/* Hidden file input for uploads */}
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