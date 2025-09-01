"use client";

import React, { createContext, useContext } from "react";

interface CanvasContextValue {
  canvasEditor: any | null;
}

const CanvasContext = createContext<CanvasContextValue>({
  canvasEditor: null,
});

export const CanvasProvider: React.FC<{
  canvasEditor?: any | null;
  children: React.ReactNode;
}> = ({ canvasEditor = null, children }) => {
  // JSX-free so .ts parses cleanly
  return React.createElement(
    CanvasContext.Provider,
    { value: { canvasEditor } },
    children
  );
};

export function useCanvasHook(): CanvasContextValue {
  return useContext(CanvasContext);
}
