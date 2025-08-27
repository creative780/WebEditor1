"use client";

import * as fabric from "fabric";

type RulerOpts = {
  canvas: fabric.Canvas;
  top: HTMLCanvasElement;
  left: HTMLCanvasElement;
  right: HTMLCanvasElement;
  bottom: HTMLCanvasElement;
  wrapEl: HTMLElement;
};

// Ticks-only (no labels). Color spec
const COLOR_BASELINE = "#d8dde2";
const COLOR_MAJOR = "#cfd4d9";
const COLOR_MINOR = "#e8ebee";

export class Rulers {
  private fabricCanvas: fabric.Canvas;
  private top: HTMLCanvasElement;
  private left: HTMLCanvasElement;
  private right: HTMLCanvasElement;
  private bottom: HTMLCanvasElement;
  private ctxTop: CanvasRenderingContext2D;
  private ctxLeft: CanvasRenderingContext2D;
  private ctxRight: CanvasRenderingContext2D;
  private ctxBottom: CanvasRenderingContext2D;
  private zoom = 1;
  private pointerX = 0;
  private pointerY = 0;

  constructor(opts: RulerOpts) {
    this.fabricCanvas = opts.canvas;
    this.top = opts.top;
    this.left = opts.left;
    this.right = opts.right;
    this.bottom = opts.bottom;
    this.ctxTop = this.top.getContext("2d")!;
    this.ctxLeft = this.left.getContext("2d")!;
    this.ctxRight = this.right.getContext("2d")!;
    this.ctxBottom = this.bottom.getContext("2d")!;
    this.resize();
  }

  public setZoom(z: number) {
    this.zoom = z;
    this.render();
  }
  public resize() {
    const w = this.fabricCanvas.getWidth();
    const h = this.fabricCanvas.getHeight();
    const dpr = window.devicePixelRatio || 1;
    const availW = Math.max(0, w - 48);
    const availH = Math.max(0, h - 48);
    [this.top, this.bottom].forEach((c) => {
      c.width = Math.floor(availW * dpr);
      c.height = Math.floor(24 * dpr);
      c.style.width = `${availW}px`;
      c.style.height = `24px`;
    });
    [this.left, this.right].forEach((c) => {
      c.width = Math.floor(24 * dpr);
      c.height = Math.floor(availH * dpr);
      c.style.width = `24px`;
      c.style.height = `${availH}px`;
    });
    [this.ctxTop, this.ctxBottom, this.ctxLeft, this.ctxRight].forEach((ctx) =>
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    );
  }

  /** Update pointer follower from native event */
  public updatePointer(e: MouseEvent) {
    this.pointerX = e.offsetX;
    this.pointerY = e.offsetY;
    this.render();
  }

  /** Draw rulers + follower triangles */
  public render() {
    const w = this.fabricCanvas.getWidth();
    const h = this.fabricCanvas.getHeight();
    const availW = Math.max(0, w - 48);
    const availH = Math.max(0, h - 48);
    const vpt = this.fabricCanvas.viewportTransform!;
    const originX = -vpt[4] / this.zoom; // canvas units at left edge
    const originY = -vpt[5] / this.zoom;

    const unit = this.chooseUnit();

    // TOP / BOTTOM
    [this.ctxTop, this.ctxBottom].forEach((ctx, idx) => {
      const isTop = idx === 0;
      const canvas = isTop ? this.top : this.bottom;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = COLOR_BASELINE;
      ctx.beginPath();
      ctx.moveTo(0, 23.5);
      ctx.lineTo(availW, 23.5);
      ctx.stroke();

      const start = Math.floor(originX / unit) * unit;
      for (let x = start; x < originX + availW / this.zoom; x += unit) {
        const px = (x - originX) * this.zoom;
        // major tick
        ctx.strokeStyle = COLOR_MAJOR;
        ctx.beginPath();
        ctx.moveTo(px + 0.5, 0);
        ctx.lineTo(px + 0.5, 16);
        ctx.stroke();
        // minor ticks
        const minorStep = unit / 10;
        for (let j = 1; j < 10; j++) {
          const mx = (x + j * minorStep - originX) * this.zoom + 0.5;
          ctx.strokeStyle = COLOR_MINOR;
          ctx.beginPath();
          ctx.moveTo(mx, 0);
          ctx.lineTo(mx, 10);
          ctx.stroke();
        }
      }

      // follower triangle
      ctx.fillStyle = "#ff3b3b";
      const tx = Math.max(0, Math.min(availW, this.pointerX));
      if (isTop) {
        ctx.beginPath();
        ctx.moveTo(tx, 0);
        ctx.lineTo(tx - 6, 8);
        ctx.lineTo(tx + 6, 8);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(tx, 24);
        ctx.lineTo(tx - 6, 16);
        ctx.lineTo(tx + 6, 16);
        ctx.closePath();
        ctx.fill();
      }
    });

    // LEFT / RIGHT
    [this.ctxLeft, this.ctxRight].forEach((ctx, idx) => {
      const isLeft = idx === 0;
      const canvas = isLeft ? this.left : this.right;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = COLOR_BASELINE;
      ctx.beginPath();
      ctx.moveTo(23.5, 0);
      ctx.lineTo(23.5, availH);
      ctx.stroke();

      const start = Math.floor(originY / unit) * unit;
      for (let y = start; y < originY + availH / this.zoom; y += unit) {
        const py = (y - originY) * this.zoom;
        ctx.strokeStyle = COLOR_MAJOR;
        ctx.beginPath();
        ctx.moveTo(0, py + 0.5);
        ctx.lineTo(16, py + 0.5);
        ctx.stroke();

        const minorStep = unit / 10;
        for (let j = 1; j < 10; j++) {
          const my = (y + j * minorStep - originY) * this.zoom + 0.5;
          ctx.strokeStyle = COLOR_MINOR;
          ctx.beginPath();
          ctx.moveTo(0, my);
          ctx.lineTo(10, my);
          ctx.stroke();
        }
      }

      // follower triangle
      ctx.fillStyle = "#ff3b3b";
      const ty = Math.max(0, Math.min(availH, this.pointerY));
      if (isLeft) {
        ctx.beginPath();
        ctx.moveTo(0, ty);
        ctx.lineTo(8, ty - 6);
        ctx.lineTo(8, ty + 6);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(24, ty);
        ctx.lineTo(16, ty - 6);
        ctx.lineTo(16, ty + 6);
        ctx.closePath();
        ctx.fill();
      }
    });
  }

  private chooseUnit(): number {
    // Keep ~80-120px between major ticks
    const pxTarget = 100;
    const raw = pxTarget / this.zoom;
    const bases = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
    let best = bases[0];
    for (const b of bases) {
      if (b >= raw) {
        best = b;
        break;
      }
    }
    return best;
  }
}


