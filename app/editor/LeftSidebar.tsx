"use client";

import React from "react";
import { createPortal } from "react-dom";
import {
  Move,
  Brush,
  Palette,
  Layers as LayersIcon,
  Zap,
  Star,
  Grid3X3,
  Type,
  Upload,
  Crop,
  Trash2,
  GripVertical,
  ChevronDown,
  Search,
} from "lucide-react";

/* ================== Color helpers ================== */
const clamp = (n: number, min = 0, max = 1) => Math.min(max, Math.max(min, n));

function cmykToRgb(c: number, m: number, y: number, k: number) {
  const C = c / 100,
    M = m / 100,
    Y = y / 100,
    K = k / 100;
  const r = Math.round(255 * (1 - C) * (1 - K));
  const g = Math.round(255 * (1 - M) * (1 - K));
  const b = Math.round(255 * (1 - Y) * (1 - K));
  return { r, g, b };
}
function rgbToHex(r: number, g: number, b: number) {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}
function hexToRgb(hex: string) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return null;
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16),
  };
}
function rgbToCmyk(r: number, g: number, b: number) {
  const R = r / 255,
    G = g / 255,
    B = b / 255;
  const K = 1 - Math.max(R, G, B);
  const C = K === 1 ? 0 : (1 - R - K) / (1 - K);
  const M = K === 1 ? 0 : (1 - G - K) / (1 - K);
  const Y = K === 1 ? 0 : (1 - B - K) / (1 - K);
  return {
    c: Math.round(clamp(C) * 100),
    m: Math.round(clamp(M) * 100),
    y: Math.round(clamp(Y) * 100),
    k: Math.round(clamp(K) * 100),
  };
}

/* quick color mix (linear in RGB space) */
function mix(aHex: string, bHex: string, t: number) {
  const a = hexToRgb(aHex)!,
    b = hexToRgb(bHex)!;
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const b2 = Math.round(a.b + (b.b - a.b) * t);
  return rgbToHex(r, g, b2);
}

type ToolId =
  | "move"
  | "brush"
  | "color"
  | "layers"
  | "gradient"
  | "shapes"
  | "templates"
  | "text"
  | "upload"
  | "crop"
  // shape-specific tool ids
  | "rectangle"
  | "square"
  | "circle"
  | "polygon"
  | "line"
  | "arrow"
  | "star";

interface LeftSidebarProps {
  selectedTool: ToolId;
  /* existing panel flags */
  showColorPicker?: boolean;
  showGradientPanel?: boolean;
  showShapeMenu?: boolean;
  showTemplatesPanel?: boolean;
  showTextPanel?: boolean;
  showLayersPanel?: boolean;
  showUploadsPanel?: boolean;
  /* NEW: brush strip flag */
  showBrushPanel?: boolean;

  onSelectTool?: (id: ToolId) => void;
  onToggleColor?: () => void;
  onToggleGradient?: () => void;
  onToggleShapes?: () => void;
  onToggleTemplates?: () => void;
  onToggleText?: () => void;
  onToggleLayers?: () => void;
  onToggleUploads?: () => void;
  /* NEW: brush toggle */
  onToggleBrush?: () => void;

  /** Callback when the colour changes.  Invoked with a hex string. */
  onColorChange?: (hex: string) => void;
  /** Callback when the user applies a gradient.  Provides gradient parameters. */
  onGradientApply?: (opts: {
    type: string;
    c1: string;
    c2: string;
    mid?: number;
    angle?: number;
    opacity?: number;
    preview?: boolean;
  }) => void;
  /** Callback when a shape is selected from the shapes panel.  Provides a tool id representing the shape. */
  onShapeSelect?: (shapeId: string) => void;
  /** Callback when a template is selected.  The template id is passed. */
  onTemplateSelect?: (templateId: string) => void;

  offsetTopPx?: number;
}

/* === constants for sidebar sizing === */
const RAIL_W = 80; // sidebar width
const RAIL_GUTTER = 1; // gutter for spacing
const PANEL_GAP = 12; // gap between panels if multiple are open

/* === brush strip constants === */
const BRUSH_PANEL_WIDTH = 72;
const BRUSH_PANEL_TOP_OFFSET = 64; // fixed offset below the rail top

export default function LeftSidebar({
  selectedTool,
  showColorPicker,
  showGradientPanel,
  showShapeMenu,
  showTemplatesPanel,
  showTextPanel,
  showLayersPanel,
  showUploadsPanel,
  showBrushPanel,
  onSelectTool,
  onToggleColor,
  onToggleGradient,
  onToggleShapes,
  onToggleTemplates,
  onToggleText,
  onToggleLayers,
  onToggleUploads,
  onToggleBrush,
  offsetTopPx = 96,
  onColorChange,
  onGradientApply,
  onShapeSelect,
  onTemplateSelect,
}: LeftSidebarProps) {
  const items: Array<{
    id: ToolId;
    label: string;
    icon: any;
    kind: "panel" | "tool";
  }> = [
    { id: "move", label: "MOVE", icon: Move, kind: "tool" },
    { id: "brush", label: "BRUSH", icon: Brush, kind: "panel" }, // treat brush as panel
    { id: "color", label: "COLOR", icon: Palette, kind: "panel" },
    { id: "layers", label: "LAYERS", icon: LayersIcon, kind: "panel" },
    { id: "gradient", label: "GRADIENT", icon: Zap, kind: "panel" },
    { id: "shapes", label: "SHAPES", icon: Star, kind: "panel" },
    { id: "templates", label: "TEMPLATES", icon: Grid3X3, kind: "panel" },
    { id: "text", label: "TEXT", icon: Type, kind: "panel" },
    { id: "upload", label: "UPLOAD", icon: Upload, kind: "panel" },
    { id: "crop", label: "CROP", icon: Crop, kind: "tool" },
  ];

  const isActive = (id: ToolId) =>
    selectedTool === id ||
    (id === "brush" && showBrushPanel) || // NEW
    (id === "layers" && showLayersPanel) ||
    (id === "color" && showColorPicker) ||
    (id === "gradient" && showGradientPanel) ||
    (id === "shapes" && showShapeMenu) ||
    (id === "templates" && showTemplatesPanel) ||
    (id === "text" && showTextPanel) ||
    (id === "upload" && showUploadsPanel);

  // anchor for panel (page coords)
  const [panelTopAnchor, setPanelTopAnchor] = React.useState<number | null>(
    null
  );

  const handleClick = (
    e: React.MouseEvent<HTMLButtonElement>,
    id: ToolId,
    kind: "panel" | "tool"
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = Math.round(rect.top + window.scrollY);
    if (kind === "panel") setPanelTopAnchor(y);

    switch (id) {
      case "brush":
        onToggleBrush?.();
        return; // NEW
      case "color":
        onToggleColor?.();
        return;
      case "gradient":
        onToggleGradient?.();
        return;
      case "shapes":
        onToggleShapes?.();
        return;
      case "templates":
        onToggleTemplates?.();
        return;
      case "text":
        onToggleText?.();
        return;
      case "layers":
        onToggleLayers?.();
        return;
      case "upload":
        onToggleUploads?.();
        return;
      default:
        if (kind === "tool") onSelectTool?.(id);
    }
  };

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // clamp + drag so floating panels stay visible
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const [panelY, setPanelY] = React.useState<number | null>(null);

  const clampToViewport = React.useCallback(() => {
    const h = panelRef.current?.offsetHeight ?? 0;
    const gutter = 12;
    const minY = window.scrollY + offsetTopPx + 8;
    const maxY = window.scrollY + window.innerHeight - h - gutter;
    const anchor = (panelTopAnchor ?? window.scrollY + offsetTopPx) + 8;
    setPanelY(Math.max(minY, Math.min(anchor, maxY)));
  }, [panelTopAnchor, offsetTopPx]);

  const anyPanelOpen = !!(
    showTextPanel ||
    showShapeMenu ||
    showColorPicker ||
    showLayersPanel ||
    showGradientPanel ||
    showUploadsPanel ||
    showTemplatesPanel ||
    showBrushPanel
  );

  React.useEffect(() => {
    if (!mounted || !anyPanelOpen) return;
    requestAnimationFrame(clampToViewport);
    const onResize = () => clampToViewport();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, { passive: true });
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize);
    };
  }, [mounted, anyPanelOpen, clampToViewport]);

  const [dragStart, setDragStart] = React.useState<number | null>(null);
  const onDragStart = (e: React.MouseEvent) => {
    setDragStart(e.clientY);
    e.preventDefault();
  };
  React.useEffect(() => {
    if (dragStart == null) return;
    const startY = dragStart;
    const startPanelY = panelY ?? 0;
    const move = (ev: MouseEvent) => {
      const h = panelRef.current?.offsetHeight ?? 0;
      const gutter = 12;
      const minY = window.scrollY + offsetTopPx + 8;
      const maxY = window.scrollY + window.innerHeight - h - gutter;
      setPanelY(
        Math.max(minY, Math.min(startPanelY + (ev.clientY - startY), maxY))
      );
    };
    const up = () => setDragStart(null);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [dragStart, panelY, offsetTopPx]);

  // Calculate which panels are open to determine vertical stacking
  const openPanels = [
    showBrushPanel && "brush", // include brush for stacking order reference
    showColorPicker && "color",
    showLayersPanel && "layers",
    showTextPanel && "text",
    showGradientPanel && "gradient",
    showShapeMenu && "shapes",
  ].filter(Boolean) as ToolId[];

  // Adjust panelY for each panel based on its index to stack with spacing
  const getPanelTop = (panelIndex: number) => {
    if (panelY == null) {
      return (
        (panelTopAnchor ?? window.scrollY + offsetTopPx) +
        8 +
        panelIndex * (300 + PANEL_GAP)
      );
    }
    return panelY + panelIndex * (300 + PANEL_GAP);
  };

  // ===== Local state for COLOR panel =====
  const [useRGB, setUseRGB] = React.useState(false);
  const [cmyk, setCMYK] = React.useState({ c: 30, m: 30, y: 30, k: 30 });
  const [rgb, setRGB] = React.useState({ r: 255, g: 0, b: 128 });

  const currentRgb = useRGB ? rgb : cmykToRgb(cmyk.c, cmyk.m, cmyk.y, cmyk.k);
  const currentHex = rgbToHex(currentRgb.r, currentRgb.g, currentRgb.b);

  // When the RGB/CMYK values change and the colour picker is visible
  // notify the parent through onColorChange.  We only fire when
  // showColorPicker is true so that initialising the sidebar does not
  // override external state.
  React.useEffect(() => {
    if (showColorPicker && onColorChange) {
      onColorChange(currentHex);
    }
  }, [showColorPicker, currentHex]);

  const demoLayers = Array.from({ length: 9 }, (_, i) => `Layer ${i + 1}`);

  return (
    <>
      {/* fixed rail */}
      <aside
        className="
          fixed left-0 z-40
          border-r border-[#b4b4b4] bg-[#e8e8e8]
          flex flex-col items-center py-2 gap-2
        "
        style={{
          width: RAIL_W,
          top: offsetTopPx,
          height: `calc(100vh - ${offsetTopPx}px)`,
        }}
      >
        <img src="/logo.png" alt="" width="44px" style={{ margin: "-5px" }} />

        <div className="flex flex-col gap-2">
          {items.map(({ id, label, icon: Icon, kind }) => {
            const active = isActive(id);
            return (
              <button
                key={id}
                onClick={(e) => handleClick(e, id, kind)}
                className={[
                  "flex flex-col items-center gap-1 py-1 rounded-md",
                  "text-[10px] font-semibold tracking-wide",
                  "border transition-colors",
                  active
                    ? "bg-[#dcdcdc] border-2 border-[#8B0000]"
                    : "border-transparent hover:bg-[#d9d9d9]",
                ].join(" ")}
                style={{ width: RAIL_W - 4 }}
                title={label}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ===== BRUSH strip (fixed position, same place always) ===== */}
      {mounted &&
        showBrushPanel &&
        createPortal(
          <div
            className="fixed z-[70] bg-transparent pointer-events-none"
            style={{
              left: RAIL_W + RAIL_GUTTER,
              top: offsetTopPx + BRUSH_PANEL_TOP_OFFSET,
              width: BRUSH_PANEL_WIDTH,
            }}
          >
            <div className="relative h-[220px] w-[72px]">
              <div className="absolute left-0 top-0 flex flex-col gap-4 pointer-events-auto">
                <BrushChip kind="marker" />
                <BrushChip kind="paint" />
                <BrushChip kind="pencil" />
                <BrushChip kind="crayon" />
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ===== COLOR panel ===== */}
      {mounted &&
        showColorPicker &&
        createPortal(
          <div
            ref={panelRef}
            className="
              fixed z-[70]
              bg-[#e8e8e8] border border-[#b4b4b4]
              shadow-[0_1px_0_rgba(0,0,0,0.08),0_12px_28px_rgba(0,0,0,0.12)]
              rounded-[20px]
              text-black
              overflow-hidden
            "
            style={{
              left: RAIL_W + RAIL_GUTTER,
              top: getPanelTop(openPanels.indexOf("color")),
              width: 280,
            }}
          >
            <div className="p-4">
              {/* Header / drag handle */}
              <div
                className="flex items-center justify-between mb-3 cursor-grab active:cursor-grabbing min-w-0"
                onMouseDown={onDragStart}
              >
                <div className="text-[12px] font-semibold tracking-wide">
                  COLOR
                </div>
                <div className="flex items-center gap-2 text-[12px] text-zinc-700">
                  <span>RGB</span>
                  <button
                    onClick={() => setUseRGB((v) => !v)}
                    className={[
                      "h-4 w-8 rounded-full transition-colors",
                      useRGB ? "bg-[#8B0000]" : "bg-zinc-400",
                    ].join(" ")}
                    aria-label="Toggle RGB/CMYK"
                  >
                    <span
                      className={[
                        "block h-4 w-4 rounded-full bg-white shadow",
                        "transition-transform",
                        useRGB ? "translate-x-4" : "translate-x-0",
                      ].join(" ")}
                    />
                  </button>
                </div>
              </div>

              <div className="text-[12px] text-zinc-700 mb-2">
                {useRGB ? "RGB – Screen Mode" : "CMYK – Print Mode"}
              </div>

              <div
                className="rounded-lg h-40 mb-3 relative overflow-hidden"
                style={{
                  background: `linear-gradient(0deg, rgba(0,0,0,1), rgba(0,0,0,0)),
                               linear-gradient(90deg, #ffffff, ${currentHex})`,
                }}
              >
                <div className="absolute left-1 bottom-1 h-3 w-3 rounded-full border border-white" />
              </div>

              {!useRGB ? (
                <div className="space-y-3">
                  <SliderRow
                    label="Cyan"
                    value={cmyk.c}
                    onChange={(v) => {
                      setCMYK((s) => ({ ...s, c: v }));
                      const next = { ...cmyk, c: v };
                      const rgbVal = cmykToRgb(next.c, next.m, next.y, next.k);
                      onColorChange?.(rgbToHex(rgbVal.r, rgbVal.g, rgbVal.b));
                    }}
                    colorHex={currentHex}
                  />
                  <SliderRow
                    label="Magenta"
                    value={cmyk.m}
                    onChange={(v) => {
                      setCMYK((s) => ({ ...s, m: v }));
                      const next = { ...cmyk, m: v };
                      const rgbVal = cmykToRgb(next.c, next.m, next.y, next.k);
                      onColorChange?.(rgbToHex(rgbVal.r, rgbVal.g, rgbVal.b));
                    }}
                    colorHex={currentHex}
                  />
                  <SliderRow
                    label="Yellow"
                    value={cmyk.y}
                    onChange={(v) => {
                      setCMYK((s) => ({ ...s, y: v }));
                      const next = { ...cmyk, y: v };
                      const rgbVal = cmykToRgb(next.c, next.m, next.y, next.k);
                      onColorChange?.(rgbToHex(rgbVal.r, rgbVal.g, rgbVal.b));
                    }}
                    colorHex={currentHex}
                  />
                  <SliderRow
                    label="Black"
                    value={cmyk.k}
                    onChange={(v) => {
                      setCMYK((s) => ({ ...s, k: v }));
                      const next = { ...cmyk, k: v };
                      const rgbVal = cmykToRgb(next.c, next.m, next.y, next.k);
                      onColorChange?.(rgbToHex(rgbVal.r, rgbVal.g, rgbVal.b));
                    }}
                    colorHex={currentHex}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <SliderRow
                    label="Red"
                    min={0}
                    max={255}
                    value={rgb.r}
                    onChange={(v) => {
                      setRGB((s) => ({ ...s, r: v }));
                      const next = { ...rgb, r: v };
                      onColorChange?.(rgbToHex(next.r, next.g, next.b));
                    }}
                    colorHex={currentHex}
                  />
                  <SliderRow
                    label="Green"
                    min={0}
                    max={255}
                    value={rgb.g}
                    onChange={(v) => {
                      setRGB((s) => ({ ...s, g: v }));
                      const next = { ...rgb, g: v };
                      onColorChange?.(rgbToHex(next.r, next.g, next.b));
                    }}
                    colorHex={currentHex}
                  />
                  <SliderRow
                    label="Blue"
                    min={0}
                    max={255}
                    value={rgb.b}
                    onChange={(v) => {
                      setRGB((s) => ({ ...s, b: v }));
                      const next = { ...rgb, b: v };
                      onColorChange?.(rgbToHex(next.r, next.g, next.b));
                    }}
                    colorHex={currentHex}
                  />
                </div>
              )}

              <hr className="my-3 border-t border-[#cfcfcf]" />

              <div className="text-[12px] font-medium text-zinc-700 mb-2">
                Project Colors
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {[
                  "#3a3a3a",
                  "#b1322b",
                  "#1b3e82",
                  "#d43724",
                  "#2b7a78",
                  "#40c463",
                  "#6da7dd",
                ].map((c) => (
                  <Swatch
                    key={c}
                    color={c}
                    onPick={(hex) => {
                      const rgbVal = hexToRgb(hex)!;
                      if (useRGB) setRGB(rgbVal);
                      else setCMYK(rgbToCmyk(rgbVal.r, rgbVal.g, rgbVal.b));
                      onColorChange?.(hex);
                    }}
                  />
                ))}
              </div>

              <div className="text-[12px] font-medium text-zinc-700 mb-2">
                Standard Print Colors
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  "#000000",
                  "#00a2ff",
                  "#5b5bff",
                  "#ff2aa1",
                  "#15d13b",
                  "#ff7b00",
                  "#ffd400",
                ].map((c) => (
                  <Swatch
                    key={c}
                    color={c}
                    onPick={(hex) => {
                      const rgbVal = hexToRgb(hex)!;
                      if (useRGB) setRGB(rgbVal);
                      else setCMYK(rgbToCmyk(rgbVal.r, rgbVal.g, rgbVal.b));
                      onColorChange?.(hex);
                    }}
                  />
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ===== LAYERS panel ===== */}
      {mounted &&
        showLayersPanel &&
        createPortal(
          <div
            ref={panelRef}
            className="
              fixed z-[70]
              bg-[#e8e8e8] border border-[#b4b4b4]
              shadow-[0_1px_0_rgba(0,0,0,0.08),0_12px_28px_rgba(0,0,0,0.12)]
              rounded-[20px]
              text-black
              overflow-hidden
            "
            style={{
              left: RAIL_W + RAIL_GUTTER,
              top: getPanelTop(openPanels.indexOf("layers")),
              width: 340,
            }}
          >
            <div className="p-4">
              <div
                className="flex items-center justify-between mb-2 cursor-grab active:cursor-grabbing"
                onMouseDown={onDragStart}
              >
                <div className="text-[13px] font-semibold tracking-wide">
                  LAYERS
                </div>
              </div>

              <div className="mt-2 rounded-xl bg-[#e3e3e3] overflow-hidden">
                {demoLayers.map((name, idx) => (
                  <div key={name}>
                    {idx !== 0 && <div className="mx-4 h-px bg-[#d0d0d0]" />}
                    <div className="flex items-center justify-between px-6 py-3">
                      <div className="h-[18px] flex-1 rounded-sm bg-transparent" />
                      <div className="flex items-center gap-5">
                        <button
                          className="p-1 rounded hover:bg-[#d9d9d9]"
                          title="Delete layer"
                          aria-label="Delete layer"
                        >
                          <Trash2 className="w-4 h-4 text-black" />
                        </button>
                        <GripVertical className="w-5 h-5 text-[#a8a8a8]" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ===== TEXT panel ===== */}
      {mounted &&
        showTextPanel &&
        createPortal(
          <div
            ref={panelRef}
            className="
              fixed z-[70]
              bg-[#e8e8e8] border border-[#b4b4b4]
              shadow-[0_1px_0_rgba(0,0,0,0.08),0_12px_28px_rgba(0,0,0,0.12)]
              rounded-br-[18px]
              overflow-hidden
            "
            style={{
              left: RAIL_W + RAIL_GUTTER,
              top: getPanelTop(openPanels.indexOf("text")),
              width: 260,
            }}
          >
            <div className="p-3">
              <div
                className="text-[12px] font-semibold tracking-wide text-zinc-800 mb-2 cursor-grab active:cursor-grabbing"
                onMouseDown={onDragStart}
              >
                TEXT LAYOUT
              </div>

              <div className="grid grid-cols-4 gap-3 text-zinc-900">
                <Tile
                  icon={<PointTextIcon />}
                  labelTop="POINT"
                  labelBottom="TEXT"
                />
                <Tile icon={<AreaTextIcon />} labelTop="AREA" />
                <Tile icon={<PathTextIcon />} labelTop="PATH" />
                <Tile
                  icon={<WrapTextIcon />}
                  labelTop="WRAP"
                  labelBottom="TEXT"
                />
              </div>

              <div className="mt-3 text-[12px] font-semibold tracking-wide text-zinc-800">
                OTHER
              </div>

              <div className="mt-2 grid gap-2 text-[12px] text-zinc-800">
                {[
                  "Bring Text Above Objects",
                  "Hyphenate",
                  "Align to Baseline Grid",
                  "Link Text Boxes",
                  "Follow same font family",
                ].map((label) => (
                  <label
                    key={label}
                    className="flex items-center gap-2 min-w-0"
                  >
                    <input
                      type="checkbox"
                      className="h-[14px] w-[14px] rounded-[3px] border border-zinc-900 accent-zinc-900 shrink-0"
                    />
                    <span className="break-words leading-tight">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ===== GRADIENT panel ===== */}
      {mounted &&
        showGradientPanel &&
        createPortal(
          <div
            ref={panelRef}
            className="
              fixed z-[70]
              bg-[#eaeaea] border border-[#bfbfbf]
              shadow-[0_1px_0_rgba(0,0,0,0.08),0_12px_28px_rgba(0,0,0,0.12)]
              rounded-[20px] rounded-br-[22px]
              text-black
              overflow-hidden
            "
            style={{
              left: RAIL_W + RAIL_GUTTER,
              top: getPanelTop(openPanels.indexOf("gradient")),
              width: 320,
            }}
          >
            <GradientPanelExact
              onDragStart={onDragStart}
              onGradientApply={onGradientApply}
            />
          </div>,
          document.body
        )}

      {/* ===== SHAPES panel ===== */}
      {mounted &&
        showShapeMenu &&
        createPortal(
          <div
            ref={panelRef}
            className="
              fixed z-[70]
              bg-[#e8e8e8] border border-[#b4b4b4]
              shadow-[0_1px_0_rgba(0,0,0,0.08),0_12px_28px_rgba(0,0,0,0.12)]
              rounded-[20px] rounded-br-[22px]
              text-black overflow-hidden
            "
            style={{
              left: RAIL_W + RAIL_GUTTER,
              top: getPanelTop(openPanels.indexOf("shapes")),
              width: 220,
            }}
          >
            <div className="p-4">
              {/* Header / drag handle */}
              <div
                className="cursor-grab active:cursor-grabbing select-none"
                onMouseDown={onDragStart}
              >
                <div className="text-[26px] leading-none font-semibold tracking-wide text-[#8d8d8d]">
                  Shapes
                </div>
                <div className="mt-2 w-14 h-[2px] bg-white/70 rounded-full" />
              </div>

              {/* Items */}
              <div className="mt-3 grid gap-3">
                <ShapeItem
                  icon={<LineGlyph />}
                  label="Line Tool"
                  onSelect={onShapeSelect}
                />
                <ShapeItem
                  icon={<SquareGlyph />}
                  label="Square Tool"
                  onSelect={onShapeSelect}
                />
                <ShapeItem
                  icon={<RectGlyph />}
                  label="Rectangle Tool"
                  onSelect={onShapeSelect}
                />
                <ShapeItem
                  icon={<CircleGlyph />}
                  label="Circle Tool"
                  onSelect={onShapeSelect}
                />
                <ShapeItem
                  icon={<PolygonGlyph />}
                  label="Polygon Tool"
                  onSelect={onShapeSelect}
                />
                <ShapeItem
                  icon={<ArrowGlyph />}
                  label="Arrow Tool"
                  onSelect={onShapeSelect}
                />
                <ShapeItem
                  icon={<StarGlyph />}
                  label="Custom Shape"
                  onSelect={onShapeSelect}
                />
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ===== TEMPLATES docked panel ===== */}
      {mounted &&
        showTemplatesPanel &&
        createPortal(
          <div
            className="
              fixed z-[60]
              bg-[#e8e8e8] border-l border-[#bdbdbd]
              text-black
              flex flex-col
            "
            style={{
              left: RAIL_W + RAIL_GUTTER,
              top: offsetTopPx,
              width: 270,
              height: `calc(100vh - ${offsetTopPx}px)`,
              marginLeft: showUploadsPanel ? PANEL_GAP : 0,
            }}
          >
            <TemplatesPanelDocked onTemplateSelect={onTemplateSelect} />
          </div>,
          document.body
        )}

      {/* ===== UPLOADS docked panel ===== */}
      {mounted &&
        showUploadsPanel &&
        createPortal(
          <div
            className="
              fixed z-[60]
              bg-[#e8e8e8] border-l border-[#bdbdbd]
              text-black
              flex flex-col
            "
            style={{
              left:
                RAIL_W +
                RAIL_GUTTER +
                (showTemplatesPanel ? 270 + PANEL_GAP : 0),
              top: offsetTopPx,
              width: 270,
              height: `calc(100vh - ${offsetTopPx}px)`,
            }}
          >
            <UploadsPanelDocked />
          </div>,
          document.body
        )}
    </>
  );
}

/* ===================== Docked Panels ===================== */

function TemplatesPanelDocked({
  onTemplateSelect,
}: {
  onTemplateSelect?: (id: string) => void;
}) {
  const [q, setQ] = React.useState("");

  const items = React.useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        id: i + 1,
        title: `Template ${i + 1}`,
      })),
    []
  );
  const filtered = items.filter((x) =>
    x.title.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 pt-3">
        <div className="relative">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search Here"
            className="
              w-full h-8 rounded-full pl-8 pr-8
              bg-white/70 border border-[#cfcfcf]
              text-[13px] outline-none
            "
          />
          <div className="absolute left-2 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full grid place-items-center">
            <span className="text-[10px] font-bold text-[#8B0000]">C</span>
          </div>
          <svg
            viewBox="0 0 24 24"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-black/80"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7"></circle>
            <path d="M21 21l-3.5-3.5"></path>
          </svg>
        </div>
      </div>

      <div className="px-3 pt-2 pb-1">
        <div className="text-[18px] font-semibold text-[#8a8a8a] text-center">
          Templates
        </div>
      </div>

      <div className="mt-1 flex-1 overflow-y-auto px-3 pb-3">
        <div className="space-y-4">
          {filtered.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onTemplateSelect?.(String(item.id));
              }}
              className="w-full rounded-md bg-[#e3e3e3] p-3 text-left hover:bg-[#dedede] transition"
            >
              <div className="mx-10 h-[2px] rounded-full bg-[#e0e0e0]" />
              <div className="mt-2 h-[120px] rounded-[6px] bg-white border border-[#d6d6d6]" />
              <div className="mt-2 mx-10 h-[2px] rounded-full bg-[#e0e0e0]" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function UploadsPanelDocked() {
  const [files, setFiles] = React.useState<Array<{ id: string; url?: string }>>(
    Array.from({ length: 12 }, (_, i) => ({ id: `slot-${i + 1}` }))
  );
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []);
    if (!list.length) return;

    const next: Array<{ id: string; url?: string }> = [...files];
    for (const f of list) {
      const url = URL.createObjectURL(f);
      const idx = next.findIndex((x) => !x.url);
      if (idx >= 0) next[idx] = { id: next[idx].id, url };
      else next.push({ id: crypto.randomUUID(), url });
    }
    setFiles(next);
    e.target.value = "";
  };

  const removeAt = (id: string) => {
    setFiles((prev) => prev.map((x) => (x.id === id ? { id } : x)));
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 pt-3 pb-2">
        <div className="text-[18px] font-semibold text-[#7b7b7b] text-center">
          Uploads
        </div>
      </div>

      <div className="px-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-8 rounded-[6px] text-white text-[12px] font-semibold shadow-sm"
          style={{ background: "#8B0000" }}
        >
          UPLOAD NEW FILE
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onPickFiles}
        />
      </div>

      <div className="mt-3 flex-1 overflow-y-auto px-3 pb-3">
        <div className="grid grid-cols-2 gap-3">
          {files.map((item) => (
            <div
              key={item.id}
              className="relative rounded-[6px] bg-white border border-[#d6d6d6] h-[108px] overflow-hidden"
              title={item.url ? "Uploaded file" : "Empty slot"}
            >
              <label className="absolute left-2 top-2">
                <input
                  type="checkbox"
                  className="h-[14px] w-[14px] rounded-[3px] border border-black/70 accent-black"
                />
              </label>
              <button
                onClick={() => removeAt(item.id)}
                className="absolute right-2 top-2 p-1 rounded hover:bg-[#f1f1f1]"
                title="Delete"
                aria-label="Delete"
              >
                <Trash2 className="w-4 h-4 text-black" />
              </button>
              {item.url ? (
                <img
                  src={item.url}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center">
                  <div className="h-6 w-6 rounded bg-[#efefef]" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ===================== Templates Panel (floating version) ===================== */

function TemplatesPanel({
  onDragStart,
  onTemplateSelect,
}: {
  onDragStart: (e: React.MouseEvent) => void;
  onTemplateSelect?: (id: string) => void;
}) {
  const categories = [
    "Popular",
    "Business Cards",
    "Flyers",
    "Posters",
    "Social Posts",
    "Logos",
    "Invitations",
    "Banners",
    "Certificates",
    "Invoices",
    "ID Cards",
    "Menus",
    "Presentations",
    "Resumes",
    "Gift Vouchers",
  ];

  const [openCat, setOpenCat] = React.useState(false);
  const [cat, setCat] = React.useState<string>("Popular");
  const [q, setQ] = React.useState("");

  const templates = React.useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        id: `tpl-${i + 1}`,
        name: `Template ${i + 1}`,
        category: categories[i % categories.length],
        bg: `linear-gradient(135deg, hsl(${(i * 23) % 360} 80% 70%), #fff)`,
      })),
    []
  );

  const filtered = templates.filter(
    (t) =>
      (cat === "Popular" || t.category === cat) &&
      t.name.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="p-4">
      <div
        className="flex items-center justify-between mb-3 cursor-grab active:cursor-grabbing"
        onMouseDown={onDragStart}
      >
        <div className="text-[13px] font-semibold tracking-wide">TEMPLATES</div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search templates"
            className="w-full pl-8 pr-3 py-2 rounded-md border border-[#cfcfcf] bg-white text-sm outline-none"
          />
        </div>

        <div className="relative">
          <button
            onClick={() => setOpenCat((v) => !v)}
            className="flex items-center gap-1 px-3 py-2 rounded-md border border-[#cfcfcf] bg-white text-sm"
            aria-haspopup="listbox"
            aria-expanded={openCat}
          >
            <span className="max-w-[130px] truncate">{cat}</span>
            <ChevronDown className="h-4 w-4" />
          </button>

          {openCat && (
            <div
              className="absolute right-0 mt-1 w-56 rounded-md border border-[#d0d0d0] bg-white shadow-lg z-10"
              role="listbox"
            >
              <div className="max-h-56 overflow-y-auto py-1">
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setCat(c);
                      setOpenCat(false);
                    }}
                    className={[
                      "w-full text-left px-3 py-2 text-sm hover:bg-zinc-100",
                      c === cat ? "bg-zinc-100 font-medium" : "",
                    ].join(" ")}
                    role="option"
                    aria-selected={c === cat}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3">
        <div className="text-[12px] text-[#6b6b6b] mb-2">
          Showing {filtered.length} templates
        </div>

        <div className="rounded-xl bg-[#eeeeee] p-3 max-h-[420px] overflow-y-auto">
          <div className="grid grid-cols-3 gap-3">
            {filtered.map((t) => (
              <button
                key={t.id}
                className="group rounded-md border border-[#d0d0d0] bg-white overflow-hidden hover:shadow transition"
                onClick={() => {
                  onTemplateSelect?.(t.id);
                }}
                title={t.name}
              >
                <div
                  className="aspect-[4/3] w-full"
                  style={{ background: t.bg }}
                />
                <div className="px-2 py-1 text-[11px] text-left truncate">
                  {t.name}
                </div>
                <div className="px-2 pb-2">
                  <span className="inline-block text-[10px] px-2 py-[2px] rounded-full bg-zinc-200">
                    {t.category}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          className="px-3 py-1.5 rounded-md border border-[#cfcfcf] bg-white text-[12px]"
          onClick={() => {
            setQ("");
            setCat("Popular");
          }}
        >
          Reset
        </button>
        <button
          className="px-4 py-2 rounded-[10px] text-white text-[12px] font-semibold shadow-sm"
          style={{ background: "linear-gradient(180deg, #9aa0ff, #7C7FF5)" }}
          onClick={() => console.log("Create from blank")}
        >
          Create from Blank
        </button>
      </div>
    </div>
  );
}

/* ===== helper pieces ===== */

function Swatch({
  color,
  onPick,
}: {
  color: string;
  onPick?: (hex: string) => void;
}) {
  return (
    <button
      onClick={() => onPick?.(color)}
      className="h-6 w-6 rounded-full border border-black/20"
      style={{ backgroundColor: color }}
      title={color}
    />
  );
}

function SliderRow({
  label,
  min = 0,
  max = 100,
  value,
  onChange,
  colorHex = "#7C7FF5",
}: {
  label: string;
  min?: number;
  max?: number;
  value: number;
  onChange: (v: number) => void;
  colorHex?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  const filled = `linear-gradient(to right, ${colorHex} 0%, ${colorHex} ${pct}%, #bdbdbd ${pct}%, #bdbdbd 100%)`;

  return (
    <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-16 text-[12px] text-zinc-700">{label}</span>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="cc-range"
          style={{ background: filled }}
        />
      </div>
      <span className="text-[12px] text-zinc-700 tabular-nums">
        {max === 255 ? value : `${value}%`}
      </span>

      <style jsx>{`
        .cc-range {
          -webkit-appearance: none;
          appearance: none;
          width: 160px;
          height: 4px;
          border-radius: 9999px;
          outline: none;
          background: #bdbdbd;
        }
        .cc-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 9999px;
          background: ${colorHex};
          border: 0;
          box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
          margin-top: -4px;
          cursor: pointer;
        }
        .cc-range::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 9999px;
          background: ${colorHex};
          border: 0;
          cursor: pointer;
        }
        .cc-range::-webkit-slider-runnable-track {
          height: 4px;
          border-radius: 9999px;
          background: transparent;
        }
        .cc-range::-moz-range-track {
          height: 4px;
          border-radius: 9999px;
          background: transparent;
        }
      `}</style>
    </div>
  );
}

function Tile({
  icon,
  labelTop,
  labelBottom,
}: {
  icon: React.ReactNode;
  labelTop: string;
  labelBottom?: string;
}) {
  return (
    <button
      className="group grid justify-items-center gap-1 rounded-md px-1 py-2 hover:bg.white/60 transition"
      title={`${labelTop}${labelBottom ? ` ${labelBottom}` : ""}`}
    >
      <div className="text-zinc-900">{icon}</div>
      <div className="leading-[10px] text-[10px] font-semibold tracking-wide text-zinc-800 text-center">
        {labelTop}
        {labelBottom ? (
          <>
            <br />
            {labelBottom}
          </>
        ) : null}
      </div>
    </button>
  );
}

function PointTextIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6">
      <path d="M5 6h14" stroke="currentColor" strokeWidth="1.6" fill="none" />
      <path
        d="M12 6v12M7 18h10"
        stroke="currentColor"
        strokeWidth="1.4"
        fill="none"
      />
    </svg>
  );
}
function AreaTextIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6">
      <rect
        x="4.5"
        y="6.5"
        width="15"
        height="11"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M7.5 9.5h9M7.5 12.5h9M7.5 15.5h9"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}
function PathTextIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6">
      <path
        d="M4 17c3-8 13-8 16-2"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M9.5 13.8l.6-1.7h1.8l.6 1.7m-2.1-1.7l-.7 2m2.8-2l.7 2"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
}
function WrapTextIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6">
      <path
        d="M4 8h8a4 4 0 1 1 0 8H4"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <circle
        cx="16.5"
        cy="12"
        r="3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  );
}

function ShapeItem({
  icon,
  label,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  onSelect?: (id: string) => void;
}) {
  // Map the human readable label to an internal tool id
  const mapLabel = (lbl: string): string => {
    const lower = lbl.toLowerCase();
    if (lower.includes("line")) return "line";
    if (lower.includes("square")) return "square";
    if (lower.includes("rectangle")) return "rectangle";
    if (lower.includes("circle")) return "circle";
    if (lower.includes("polygon")) return "polygon";
    if (lower.includes("arrow")) return "arrow";
    if (lower.includes("custom")) return "star";
    return lower;
  };
  return (
    <button
      onClick={() => {
        const id = mapLabel(label);
        onSelect?.(id);
      }}
      className="
        w-full flex items-center gap-3
        px-2 py-1.5 rounded-md
        hover:bg-[#dddddd] transition
        text-[13px] text-zinc-900 text-left
      "
      title={label}
    >
      <span className="inline-grid place-items-center h-5 w-5">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

/* === tiny glyphs that mimic the reference === */
function LineGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5">
      <path
        d="M3 16 L17 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
function SquareGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5">
      <rect x="4" y="4" width="12" height="12" fill="currentColor" rx="2" />
    </svg>
  );
}
function RectGlyph() {
  return (
    <svg viewBox="0 0 24 18" className="h-5 w-5">
      <rect x="3" y="3" width="18" height="12" fill="currentColor" rx="2" />
    </svg>
  );
}
function CircleGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5">
      <circle cx="10" cy="10" r="6" fill="currentColor" />
    </svg>
  );
}
function PolygonGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5">
      <path d="M10 3 15 7.2 13 15H7L5 7.2 10 3Z" fill="currentColor" />
    </svg>
  );
}
function ArrowGlyph() {
  return (
    <svg viewBox="0 0 24 20" className="h-5 w-5">
      <path
        d="M3 10h14"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M13 5l6 5-6 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function StarGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5">
      <path
        d="M10 2.8l2.2 4.5 5 .7-3.6 3.5.9 5.1L10 14.7 5.5 16.6l.9-5.1L2.8 8l5-.7L10 2.8z"
        fill="currentColor"
      />
    </svg>
  );
}

/* ================== GRADIENT PANEL ================== */

type GType =
  | "Linear"
  | "Radial"
  | "Conic"
  | "Diamond"
  | "Reflected"
  | "Multi-Point";

function GradientPanelExact({
  onDragStart,
  onGradientApply,
}: {
  onDragStart: (e: React.MouseEvent) => void;
  onGradientApply?: (opts: {
    type: string;
    c1: string;
    c2: string;
    mid: number;
    angle: number;
    opacity: number;
    preview: boolean;
  }) => void;
}) {
  const [t, setT] = React.useState<GType>("Linear");
  const [c1, setC1] = React.useState("#7c7ff5");
  const [c2, setC2] = React.useState("#ffffff");
  const [mid, setMid] = React.useState(50);
  const [angle, setAngle] = React.useState(238);
  const [opacity, setOpacity] = React.useState(97);
  const [preview, setPreview] = React.useState(false);

  // ---- LIVE PREVIEW WIRING (rAF-throttled) ----
  const rafId = React.useRef<number | null>(null);

  const pushPreview = React.useCallback(() => {
    if (!onGradientApply) return;
    onGradientApply({
      type: t,
      c1,
      c2,
      mid,
      angle,
      opacity,
      preview: true,
    });
  }, [onGradientApply, t, c1, c2, mid, angle, opacity]);

  React.useEffect(() => {
    if (!preview) return;
    if (rafId.current != null) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(pushPreview);
    return () => {
      if (rafId.current != null) cancelAnimationFrame(rafId.current);
      rafId.current = null;
    };
    // Fires on toggle + any param change while preview is ON
  }, [preview, t, c1, c2, mid, angle, opacity, pushPreview]);

  // ---------------------------------------------

  const base =
    t === "Radial"
      ? `radial-gradient(${c1} 0%, ${mix(
          c1,
          c2,
          mid / 100
        )} ${mid}%, ${c2} 100%)`
      : t === "Conic"
      ? `conic-gradient(from ${angle}deg, ${c1} 0%, ${mix(
          c1,
          c2,
          mid / 100
        )} ${mid}%, ${c2} 100%)`
      : t === "Diamond"
      ? `radial-gradient(closest-side at 50% 50%, ${c1} 0%, ${mix(
          c1,
          c2,
          mid / 100
        )} ${mid}%, ${c2} 100%)`
      : t === "Reflected"
      ? `linear-gradient(${angle}deg, ${c1} 0%, ${mix(
          c1,
          c2,
          mid / 100
        )} ${mid}%, ${c2} 100%, ${mix(c1, c2, mid / 100)} ${
          100 - mid
        }%, ${c1} 100%)`
      : t === "Multi-Point"
      ? `linear-gradient(${angle}deg, ${c1} 0%, ${mix(c1, c2, 0.35)} 35%, ${mix(
          c1,
          c2,
          0.7
        )} 70%, ${c2} 100%)`
      : `linear-gradient(${angle}deg, ${c1} 0%, ${mix(
          c1,
          c2,
          mid / 100
        )} ${mid}%, ${c2} 100%)`;

  const types: GType[] = [
    "Linear",
    "Radial",
    "Conic",
    "Diamond",
    "Reflected",
    "Multi-Point",
  ];

  return (
    <div className="p-4">
      <div
        className="cursor-grab active:cursor-grabbing"
        onMouseDown={onDragStart}
      >
        <div className="text-center text-[18px] font-semibold text-[#747474] tracking-wide">
          Gradients
        </div>
        <div className="mt-2 h-[1px] bg-[#d6d6d6]" />
      </div>

      <div className="mt-3 grid grid-cols-6 gap-2">
        {types.map((gt) => (
          <button
            key={gt}
            onClick={() => setT(gt)}
            className={[
              "rounded-md border bg-white/90 hover:bg-white transition grid justify-items-center",
              "px-1 py-1 w-[48px] h-[56px]",
              t === gt
                ? "border-[#8B0000] ring-2 ring-[#8B0000]/25"
                : "border-[#cfcfcf]",
            ].join(" ")}
            title={gt}
          >
            <span
              className="h-[22px] w-[36px] rounded-[6px]"
              style={{ background: demoChip(gt, c1, c2, angle) }}
            />
            <span className="mt-1 text-[10px] leading-[11px] text-[#5e5e5e] text-center">
              {gt.replace("-", " ")}
            </span>
          </button>
        ))}
      </div>

      <div className="text-[12px] text-[#8a8a8a] mt-4">Gradient Bar</div>
      <SingleGradientBar
        c1={c1}
        c2={c2}
        mid={mid}
        setMid={setMid}
        background={base}
      />

      <div className="text-[12px] text-[#8a8a8a] mt-4">Color Picker</div>
      <div className="mt-2 flex items-center gap-3">
        <SquareColor value={c1} onChange={setC1} />
        <MiniSlash />
        <SquareColor value={c2} onChange={setC2} />
        <button
          className="ml-auto h-8 w-8 rounded-md bg-white border border-[#d0d0d0] grid place-items-center"
          title="Add stop"
        >
          <span className="text-[18px] leading-none text-[#6b6b6b]">+</span>
        </button>
      </div>

      <div className="text-[12px] text-[#8a8a8a] mt-5">Angle Slider</div>
      <RowSlider
        value={angle}
        min={0}
        max={360}
        onChange={setAngle}
        bubble={`${angle}°`}
      />

      <div className="text-[12px] text-[#8a8a8a] mt-3">Opacity</div>
      <RowSlider
        value={opacity}
        min={0}
        max={100}
        onChange={setOpacity}
        bubble={`${opacity}%`}
      />

      <div className="mt-4 h-[1px] bg-[#d6d6d6]" />

      <div className="mt-3 flex items-center justify-between">
        <label className="flex items-center gap-2 text-[12px] text-[#7b7b7b]">
          <input
            type="checkbox"
            className="h-[14px] w-[14px] rounded-[3px] border border-zinc-900 accent-zinc-900"
            checked={preview}
            onChange={(e) => setPreview(e.target.checked)}
          />
          Preview Live
        </label>

        {/* Commit-only: always preview: false on apply */}
        <button
          className="px-4 py-2 rounded-[10px] text-white text-[12px] font-semibold shadow-sm"
          style={{ background: "linear-gradient(180deg, #9aa0ff, #7C7FF5)" }}
          onClick={() => {
            onGradientApply?.({
              type: t,
              c1,
              c2,
              mid,
              angle,
              opacity,
              preview: false,
            });
          }}
        >
          Apply Button
        </button>
      </div>
    </div>
  );
}

function SingleGradientBar({
  c1,
  c2,
  mid,
  setMid,
  background,
}: {
  c1: string;
  c2: string;
  mid: number;
  setMid: (n: number) => void;
  background: string;
}) {
  const barRef = React.useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = React.useState(false);

  const pctFromEvent = (clientX: number) => {
    const rect = barRef.current!.getBoundingClientRect();
    const x = clampNum(clientX - rect.left, 0, rect.width);
    return Math.round((x / rect.width) * 100);
  };

  React.useEffect(() => {
    if (!dragging) return;
    const move = (e: MouseEvent) => setMid(pctFromEvent(e.clientX));
    const up = () => setDragging(false);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [dragging, setMid]);

  return (
    <div className="mt-2">
      <div
        ref={barRef}
        className="h-[8px] rounded-full relative border border-[#d0d0d0]"
        style={{ background }}
        onMouseDown={(e) => setMid(pctFromEvent(e.clientX))}
      >
        <Handle leftPct={0} color={c1} />
        <Handle leftPct={100} color={c2} />
        <div
          className="absolute -top-[6px] h-4 w-4 rounded-full border border-white shadow cursor-pointer"
          style={{
            left: `calc(${mid}% - 8px)`,
            background: mix(c1, c2, mid / 100),
          }}
          onMouseDown={() => setDragging(true)}
        />
      </div>
    </div>
  );
}

const clampNum = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

function RowSlider({
  value,
  onChange,
  min,
  max,
  bubble,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  bubble: string;
}) {
  return (
    <div className="mt-2 flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 h-[6px] rounded-full outline-none"
        style={{ WebkitAppearance: "none" as any, background: "#bdbdbd" }}
      />
      <div className="w-[50px] text-[11px] text-[#5b5b5b] px-2 py-1 rounded-md bg-white border border-[#d0d0d0] text-center">
        {bubble}
      </div>
      <style jsx>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 9999px;
          background: #7c7ff5;
          border: 0;
          box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
          margin-top: -4px;
          cursor: pointer;
        }
        input[type="range"]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 9999px;
          background: #7c7ff5;
          border: 0;
          cursor: pointer;
        }
        input[type="range"]::-webkit-slider-runnable-track {
          height: 6px;
          border-radius: 9999px;
          background: transparent;
        }
        input[type="range"]::-moz-range-track {
          height: 6px;
          border-radius: 9999px;
          background: transparent;
        }
      `}</style>
    </div>
  );
}

function Handle({ leftPct, color }: { leftPct: number; color: string }) {
  return (
    <div
      className="absolute -top-[6px] h-4 w-4 rounded-full border border-white shadow"
      style={{ left: `calc(${leftPct}% - 8px)`, background: color }}
      aria-hidden
    />
  );
}

function SquareColor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="relative h-10 w-10 rounded-md overflow-hidden border border-[#d0d0d0] bg-white">
      <input
        type="color"
        className="absolute inset-0 opacity-0 cursor-pointer"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <span
        className="absolute inset-0 rounded-md"
        style={{ background: value }}
      />
    </label>
  );
}

function MiniSlash() {
  return (
    <div className="relative h-10 w-[1px] bg-[#d5d5d5] mx-1">
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        className="absolute -left-8 top-1/2 -translate-y-1/2 text-[#7c7ff5]"
      >
        <path
          d="M2 12 L6 4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function demoChip(t: GType, c1: string, c2: string, angle: number) {
  switch (t) {
    case "Radial":
      return `radial-gradient(${c1}, ${c2})`;
    case "Conic":
      return `conic-gradient(from ${angle}deg, ${c1}, ${c2})`;
    case "Diamond":
      return `radial-gradient(closest-side, ${c1}, ${c2})`;
    case "Reflected":
      return `linear-gradient(${angle}deg, ${c1}, ${c2}, ${c1})`;
    case "Multi-Point":
      return `linear-gradient(${angle}deg, ${c1}, ${mix(c1, c2, 0.5)}, ${c2})`;
    default:
      return `linear-gradient(${angle}deg, ${c1}, ${c2})`;
  }
}

/* =========== Brush chip (compact SVGs; fixed-position strip) =========== */
function BrushChip({
  kind,
}: {
  kind: "marker" | "paint" | "pencil" | "crayon";
}) {
  const shape = {
    marker: { w: 54, h: 22, r: 6, accent: true, label: "Marker" },
    paint: { w: 50, h: 20, r: 10, accent: true, label: "Brush" },
    pencil: { w: 52, h: 16, r: 3, accent: false, label: "Pencil" },
    crayon: { w: 48, h: 22, r: 6, accent: false, label: "Crayon" },
  }[kind];

  return (
    <button
      onClick={() => console.log("Picked brush:", kind)}
      className="relative flex items-center"
      title={shape.label}
      style={{ width: 72, height: 36 }}
    >
      <svg width="72" height="36">
        {/* body */}
        <rect
          x={10}
          y={(36 - shape.h) / 2}
          width={shape.w}
          height={shape.h}
          rx={shape.r}
          fill="#ff4d4d"
        />
        {/* tip / accent for visual */}
        {shape.accent ? (
          <rect
            x={10 + shape.w - 8}
            y={(36 - shape.h) / 2}
            width={8}
            height={shape.h}
            rx={shape.r}
            fill="#ffffff"
            opacity="0.7"
          />
        ) : (
          <rect
            x={10 + shape.w - 6}
            y={(36 - shape.h) / 2}
            width={6}
            height={shape.h}
            rx={shape.r}
            fill="#d83a3a"
            opacity="0.9"
          />
        )}
      </svg>
    </button>
  );
}
