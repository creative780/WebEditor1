"use client";
import React, { useEffect, useRef, useState } from "react";
import { Canvas } from "fabric";

interface Params {
  DesignInfo : any
}

function CanvasEditor() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [canvas, setCanvas] = useState<Canvas | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const initCanvas = new Canvas(canvasRef.current, {
        width: 1280 / 1.5,
        height: 720 / 1.5,
        backgroundColor: "#ffffff",
      });

      // Set High Resolution Canvas
      const scaleFactor = window.devicePixelRatio || 1;

      initCanvas.set({
        width: 1280 * scaleFactor,
        height: 720 * scaleFactor,
        zoom: 1 / scaleFactor,
      });
      initCanvas.renderAll();
      setCanvas(initCanvas);

      return () => {
        initCanvas.dispose();
      };
    }
  }, []);

  return (
    <div>
      <canvas ref={canvasRef} />
    </div>
  );
}

export default CanvasEditor;
