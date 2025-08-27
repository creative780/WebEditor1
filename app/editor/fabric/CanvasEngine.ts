"use client";

import * as fabric from "fabric";
import { Rulers } from "./rulers/Ruler";

export type Bleed = { top: number; right: number; bottom: number; left: number };
export type EngineOpts = {
  canvasEl: HTMLCanvasElement;
  wrapEl: HTMLElement;
  rulers: {
    top: HTMLCanvasElement;
    left: HTMLCanvasElement;
    right: HTMLCanvasElement;
    bottom: HTMLCanvasElement;
  };
  initialWidth: number;
  initialHeight: number;
  bleed: Bleed; // in canvas units
  minZoom?: number;
  maxZoom?: number;
};

export class CanvasEngine {
  public canvas: fabric.Canvas;
  private rulers: Rulers;
  private bleedRect: fabric.Rect;
  private bleed: Bleed;
  private wrapEl: HTMLElement;
  private minZoom: number;
  private maxZoom: number;

  constructor(opts: EngineOpts) {
    const {
      canvasEl,
      wrapEl,
      rulers,
      initialWidth,
      initialHeight,
      bleed,
      minZoom = 0.1,
      maxZoom = 8,
    } = opts;

    this.wrapEl = wrapEl;
    this.bleed = bleed;
    this.minZoom = minZoom;
    this.maxZoom = maxZoom;

    this.canvas = new fabric.Canvas(canvasEl, {
      backgroundColor: "rgba(0,0,0,0)",
      width: initialWidth,
      height: initialHeight,
      preserveObjectStacking: true,
      stopContextMenu: true,
      fireRightClick: true,
      selection: true,
    });

    // Keep strokes visually constant
    (fabric.Object.prototype as any).strokeUniform = true;
    (fabric.Object.prototype as any).transparentCorners = false;
    (fabric.Object.prototype as any).cornerStyle = "circle";
    (fabric.Object.prototype as any).cornerSize = 8;
    (fabric.Object.prototype as any).cornerColor = "#c01919";
    (fabric.Object.prototype as any).borderColor = "#c01919";
    (fabric.Object.prototype as any).borderDashArray = [4, 4];

    this.rulers = new Rulers({
      canvas: this.canvas,
      top: rulers.top,
      left: rulers.left,
      right: rulers.right,
      bottom: rulers.bottom,
      wrapEl: this.wrapEl,
    });

    // Bleed inset (dashed red)
    this.bleedRect = new fabric.Rect({
      left: bleed.left,
      top: bleed.top,
      width: initialWidth - bleed.left - bleed.right,
      height: initialHeight - bleed.top - bleed.bottom,
      fill: "rgba(0,0,0,0)",
      stroke: "#ff3b3b",
      strokeDashArray: [10, 8],
      selectable: false,
      evented: false,
      excludeFromExport: true,
      objectCaching: false,
    });
    this.canvas.add(this.bleedRect);

    this.canvas.on("after:render", () => this.rulers.render());

    this.bindEvents();
    this.resizeToWrap();
    this.updateBleed();
    this.rulers.render();
  }

  private bindEvents() {
    // Zoom on wheel (ctrl+wheel for pinch on some devices)
    this.canvas.on("mouse:wheel", (opt: any) => {
      const e: WheelEvent = opt.e as WheelEvent;
      const delta = e.deltaY;
      let zoom = this.canvas.getZoom();
      zoom *= Math.pow(0.999, delta);
      zoom = Math.min(this.maxZoom, Math.max(this.minZoom, zoom));
      this.canvas.zoomToPoint({ x: e.offsetX, y: e.offsetY } as any, zoom);
      this.rulers.setZoom(zoom);
      e.preventDefault();
      e.stopPropagation();
    });

    // Panning with spacebar held
    let isPanning = false;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") isPanning = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") isPanning = false;
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);

    this.canvas.on("mouse:down", (e: any) => {
      if (isPanning) this.canvas.setCursor("grabbing");
    });
    this.canvas.on("mouse:move", (opt: any) => {
      const ev = opt.e as MouseEvent;
      this.rulers.updatePointer(ev);
      if (isPanning && ev.buttons === 1) {
        const vpt = this.canvas.viewportTransform!;
        vpt[4] += (ev as any).movementX || 0;
        vpt[5] += (ev as any).movementY || 0;
        this.canvas.setViewportTransform(vpt);
        this.canvas.requestRenderAll();
      }
    });
    this.canvas.on("mouse:up", () => this.canvas.setCursor("default"));

    // Keep bleed aligned on zoom/resize
    this.canvas.on("after:render", () => this.positionBleed());
    window.addEventListener("resize", () => this.resizeToWrap());

    // Keyboard helpers
    document.addEventListener("keydown", (e) => {
      const active = this.canvas.getActiveObjects();
      if ((e.key === "Delete" || e.key === "Backspace") && active.length) {
        e.preventDefault();
        active.forEach((o: fabric.Object) => this.canvas.remove(o));
        this.canvas.discardActiveObject();
        this.canvas.requestRenderAll();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        const sel = new (fabric as any).ActiveSelection(this.canvas.getObjects(), { canvas: this.canvas });
        this.canvas.setActiveObject(sel);
        this.canvas.requestRenderAll();
      }
      // Copy / paste
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        const activeObj = this.canvas.getActiveObject();
        if (activeObj) {
          (activeObj as any).clone((cloned: fabric.Object) => {
            (this as any)._clipboard = cloned;
          });
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        const clip = (this as any)._clipboard as fabric.Object | undefined;
        if (clip) {
          (clip as any).clone((clonedObj: fabric.Object) => {
            clonedObj.set({ left: (clonedObj.left || 0) + 10, top: (clonedObj.top || 0) + 10, evented: true });
            if ((clonedObj as any).type === "activeSelection") {
              (clonedObj as any).canvas = this.canvas;
              (clonedObj as any).forEachObject((o: fabric.Object) => this.canvas.add(o));
              (clonedObj as any).setCoords();
            } else {
              this.canvas.add(clonedObj);
            }
            this.canvas.setActiveObject(clonedObj);
            this.canvas.requestRenderAll();
          });
        }
      }
      // Bring forward / send backward
      if ((e.ctrlKey || e.metaKey) && e.key === "]") {
        const obj = this.canvas.getActiveObject();
        if (obj) { (this.canvas as any).bringForward(obj); this.canvas.requestRenderAll(); }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "[") {
        const obj = this.canvas.getActiveObject();
        if (obj) { (this.canvas as any).sendBackwards(obj); this.canvas.requestRenderAll(); }
      }
    });
  }

  /** Resize the drawing surface to the wrapper while preserving canvas units */
  public resizeToWrap() {
    const rect = this.wrapEl.getBoundingClientRect();
    this.canvas.setDimensions({ width: rect.width, height: rect.height });
    this.rulers.resize();
    this.positionBleed();
    this.canvas.requestRenderAll();
  }

  /** Recompute bleed rect from current bleed insets */
  private positionBleed() {
    const w = this.canvas.getWidth();
    const h = this.canvas.getHeight();
    this.bleedRect.set({
      left: this.bleed.left,
      top: this.bleed.top,
      width: Math.max(0, w - this.bleed.left - this.bleed.right),
      height: Math.max(0, h - this.bleed.top - this.bleed.bottom),
    });
    this.bleedRect.setCoords();
  }

  public setBleed(b: Partial<Bleed>) {
    this.bleed = { ...this.bleed, ...b } as Bleed;
    this.updateBleed();
  }

  private updateBleed() {
    this.positionBleed();
    this.canvas.requestRenderAll();
  }

  public zoomIn(step = 0.1) {
    this.setZoom(this.canvas.getZoom() * (1 + step));
  }
  public zoomOut(step = 0.1) {
    this.setZoom(this.canvas.getZoom() * (1 - step));
  }
  public zoomToFit(padding = 40) {
    const cw = this.canvas.getWidth() - padding * 2;
    const ch = this.canvas.getHeight() - padding * 2;
    const w = this.canvas.getWidth();
    const h = this.canvas.getHeight();
    const z = Math.min(cw / w, ch / h);
    this.setZoom(Math.max(this.minZoom, Math.min(this.maxZoom, z)));
    this.centerViewport();
  }
  public centerViewport() {
    const w = this.canvas.getWidth();
    const h = this.canvas.getHeight();
    const vp = this.canvas.getZoom();
    const dx = (this.canvas.getWidth() - w * vp) / 2;
    const dy = (this.canvas.getHeight() - h * vp) / 2;
    this.canvas.setViewportTransform([vp, 0, 0, vp, dx, dy]);
    this.canvas.requestRenderAll();
  }
  public setZoom(z: number) {
    z = Math.max(this.minZoom, Math.min(this.maxZoom, z));
    const center = new fabric.Point(this.canvas.getWidth() / 2, this.canvas.getHeight() / 2);
    this.canvas.zoomToPoint(center, z);
    this.rulers.setZoom(z);
  }

  public exportPNG(): string {
    // Temporarily force transparent background
    const bg = this.canvas.backgroundColor as any;
    this.canvas.backgroundColor = "rgba(0,0,0,0)" as any;
    this.canvas.requestRenderAll();
    const url = this.canvas.toDataURL({ format: "png", multiplier: 1, enableRetinaScaling: true } as any);
    this.canvas.backgroundColor = bg as any;
    this.canvas.requestRenderAll();
    return url;
  }
  public saveJSON() {
    return (this.canvas as any).toJSON(["excludeFromExport"]);
  }
  public loadJSON(json: any) {
    this.canvas.loadFromJSON(json, () => this.canvas.requestRenderAll());
  }
}


