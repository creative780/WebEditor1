// =============================================
// editor-store.tsx
// Tiny shared editor store using React Context
// =============================================
"use client";

import React from "react";

export type Align = "left" | "center" | "right" | "justify";
export type ElType = "rect" | "text";

export type BaseEl = {
  id: string;
  type: ElType;
  x: number; y: number;
  w: number; h: number;
  fill?: string;
  opacity?: number;
};

export type TextEl = BaseEl & {
  type: "text";
  text: string;
  fontSize: number;
  fontFamily: string;
  fontStyle?: "normal" | "bold" | "italic" | "bold italic";
  underline?: boolean;
  align?: Align;
};

export type RectEl = BaseEl & { type: "rect"; radius?: number };
export type EditorEl = RectEl | TextEl;

export type ToolId = "move" | "rect" | "rectangle" | "text" | "crop" | "brush";

export type EditorStyle = {
  fill: string;
  opacity: number;
  fontFamily: string;
  fontSize: number;
  align: Align;
};

export type ApplyPatch = (patch: Partial<EditorEl>) => void;

export type EditorStore = {
  tool: ToolId;
  setTool: (t: ToolId) => void;
  style: EditorStyle;
  setStyle: (p: Partial<EditorStyle>) => void;
  /** Apply a patch to the currently selected element */
  applyToSelection: ApplyPatch;
  /** Canvas registers its mutator here so the sidebar can call into it */
  registerApply: (fn: ApplyPatch) => void;
};

export const EditorCtx = React.createContext<EditorStore | null>(null);

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [tool, setTool] = React.useState<ToolId>("move");
  const [style, setStyleState] = React.useState<EditorStyle>({
    fill: "#111827",
    opacity: 1,
    fontFamily: "Inter",
    fontSize: 24,
    align: "left",
  });

  const setStyle = (p: Partial<EditorStyle>) =>
    setStyleState((s) => ({ ...s, ...p }));

  const applyRef = React.useRef<ApplyPatch>(() => {});
  const registerApply = (fn: ApplyPatch) => { applyRef.current = fn; };
  const applyToSelection: ApplyPatch = (patch) => applyRef.current?.(patch);

  const value: EditorStore = {
    tool,
    setTool,
    style,
    setStyle,
    applyToSelection,
    registerApply,
  };

  return <EditorCtx.Provider value={value}>{children}</EditorCtx.Provider>;
}
