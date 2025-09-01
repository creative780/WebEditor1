"use client";

import React, { useState, useRef } from "react";
import dynamic from "next/dynamic";
import LeftSidebar from "@/app/editor/LeftSidebar";

import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Undo2,
  Redo2,
  Home,
} from "lucide-react";

// ✅ Load CanvasStage strictly on the client to avoid SSR/hydration crashes
const CanvasStage = dynamic(() => import("./components/Stage/CanvasStage"), {
  ssr: false,
});
// Type-only import (erased at runtime)
import type { CanvasStageRef } from "./components/Stage/CanvasStage";

/* ───────── Header sizing ───────── */
const HEADER_TOPBAR_PX = 48;
const HEADER_FORMATBAR_PX = 48;
const TOTAL_HEADER_OFFSET = HEADER_TOPBAR_PX + HEADER_FORMATBAR_PX;

/* ───────── Top bar (unchanged) ───────── */
const TopBar = () => (
  <div className="sticky top-0 z-50 w-full bg-[#8e0f14] text-white">
    <div className="mx-auto flex max-w-[1600px] items-center justify-between px-3 py-2">
      <div className="flex items-center gap-3">
        <div className="grid h-8 w-8 place-items-center rounded-full bg-white/15 ring-1 ring-white/25">
          <Home className="w-5 h-5" />
        </div>
        <nav className="flex items-center gap-6 text-sm">
          <a className="hover:underline" href="#">
            File
          </a>
          <a className="hover:underline" href="#">
            Edit
          </a>
          <a className="hover:underline" href="#">
            Share
          </a>
          <a className="hover:underline" href="#">
            Resize
          </a>
        </nav>
      </div>

      <img src={"/logowhite.png"} alt="Logo" className="h-8 w-auto" />

      <select className="h-7 rounded-md bg-white/10 px-2 text-[11px] backdrop-blur outline-none ring-1 ring-white/25">
        <option>Inches</option>
        <option>Pixels</option>
        <option>CM</option>
      </select>
    </div>
  </div>
);

/* ───────── Text: Google Font loader ───────── */
const loadFont = (font: string) => {
  const formatted = font.replace(/\s+/g, "+");
  const id = `font-${formatted}`;
  if (typeof document !== "undefined" && document.getElementById(id)) return;

  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${formatted}:wght@100;200;300;400;500;600;700;800;900&display=swap`;
  document.head.appendChild(link);
};

/* ───────── Format toolbar (text-only enhancements) ───────── */
const BTN =
  "grid h-9 w-9 place-items-center rounded-md text-zinc-700 hover:bg-zinc-200 transition";
const SEP = <div className="mx-2 h-6 w-px bg-zinc-300/70" />;

const FONT_OPTIONS = [
  "Inter",
  "Poppins",
  "Montserrat",
  "Verdana",
  "Helvetica",
  "Tahoma",
  "Trebuchet MS",
  "Times New Roman",
  "Georgia",
  "Garamond",
  "Courier New",
  "Palatino",
  "Impact",
  "Geneva",
  "Bookman",
];

const FormatBar = ({
  textStyle,
  onTextStyleChange,
}: {
  textStyle: {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string | number;
    fontStyle?: string;
    underline?: boolean;
    textAlign?: string;
  } | null;
  onTextStyleChange: (style: Partial<NonNullable<typeof textStyle>>) => void;
}) => (
  <div className="sticky z-40" style={{ top: HEADER_TOPBAR_PX }}>
    <div className="mx-auto flex justify-center px-2 pt-1">
      <div
        className="
          inline-flex items-center
          rounded-[12px] bg-[#eeeeee]
          px-2 py-1
          shadow-[0_4px_12px_rgba(0,0,0,0.1)]
          ring-1 ring-black/5
          space-x-1
        "
      >
        {/* Font name (expanded) */}
        <select
          className="h-8 min-w-[160px] rounded-md border border-zinc-300 bg-white px-2 text-xs outline-none"
          value={textStyle?.fontFamily || "Inter"}
          onChange={(e) => onTextStyleChange({ fontFamily: e.target.value })}
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>

        {/* + 10 – */}
        <div className="ml-1 flex items-center gap-[1px]">
          <button
            className={`${BTN} h-8 w-8 text-sm`}
            onClick={() =>
              onTextStyleChange({ fontSize: (textStyle?.fontSize || 10) + 1 })
            }
          >
            +
          </button>
          <div className="grid h-8 w-10 place-items-center rounded-md border border-zinc-300 bg-white text-xs">
            {textStyle?.fontSize || 10}
          </div>
          <button
            className={`${BTN} h-8 w-8 text-sm`}
            onClick={() =>
              onTextStyleChange({
                fontSize: Math.max(1, (textStyle?.fontSize || 10) - 1),
              })
            }
          >
            –
          </button>
        </div>

        {/* Aa color (UI stub as before) */}
        <button
          className="relative grid h-8 w-10 place-items-center rounded-md text-xs font-semibold hover:bg-zinc-200"
          title="Text color"
        >
          <span className="leading-none">Aa</span>
          <span className="absolute bottom-1 h-[2px] w-5 rounded-full bg-red-600" />
        </button>

        {SEP}

        <button
          className={`${BTN} h-8 w-8`}
          title="Bold"
          onClick={() =>
            onTextStyleChange({
              fontWeight:
                textStyle?.fontWeight === "bold" ||
                textStyle?.fontWeight === 700
                  ? 400
                  : 700,
            })
          }
        >
          <Bold size={14} />
        </button>
        <button
          className={`${BTN} h-8 w-8`}
          title="Italic"
          onClick={() =>
            onTextStyleChange({
              fontStyle:
                textStyle?.fontStyle === "italic" ? "normal" : "italic",
            })
          }
        >
          <Italic size={14} />
        </button>
        <button
          className={`${BTN} h-8 w-8`}
          title="Underline"
          onClick={() =>
            onTextStyleChange({ underline: !textStyle?.underline })
          }
        >
          <Underline size={14} />
        </button>

        {SEP}

        <button
          className={`${BTN} h-8 w-8`}
          title="Align left"
          onClick={() => onTextStyleChange({ textAlign: "left" })}
        >
          <AlignLeft size={14} />
        </button>
        <button
          className={`${BTN} h-8 w-8`}
          title="Align center"
          onClick={() => onTextStyleChange({ textAlign: "center" })}
        >
          <AlignCenter size={14} />
        </button>
        <button
          className={`${BTN} h-8 w-8`}
          title="Align right"
          onClick={() => onTextStyleChange({ textAlign: "right" })}
        >
          <AlignRight size={14} />
        </button>
        <button
          className={`${BTN} h-8 w-8`}
          title="Justify"
          onClick={() => onTextStyleChange({ textAlign: "justify" })}
        >
          <AlignJustify size={14} />
        </button>

        {SEP}

        <button className={`${BTN} h-8 w-8`} title="Bulleted list">
          <List size={14} />
        </button>
        <button className={`${BTN} h-8 w-8`} title="Numbered list">
          <ListOrdered size={14} />
        </button>

        {SEP}

        <button className={`${BTN} h-8 w-8`} title="Clear formatting">
          <div className="h-3 w-3 bg-[repeating-linear-gradient(135deg,#000_0_1px,transparent_1px_4px)] rounded-[2px]" />
        </button>

        <button className={`${BTN} h-8 w-8`} title="Undo">
          <Undo2 size={14} />
        </button>
        <button className={`${BTN} h-8 w-8`} title="Redo">
          <Redo2 size={14} />
        </button>
      </div>
    </div>
  </div>
);

/* ───────── Right-sidebar: Text tools box (new) ───────── */
const TextToolsBox = () => {
  const tabs = [
    "Text Shape",
    "Text Shadow",
    "Transformation",
    "Decoration",
  ] as const;
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>(tabs[0]);

  return (
    <section className="mt-7 rounded-[20px] border border-zinc-200 bg-white p-4 shadow-sm overflow-auto max-h-[460px] max-w-full ">
      <h3 className="text-[13px] font-bold text-zinc-800 mb-3">TEXT</h3>

      <div className="flex flex-wrap gap-2 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`rounded-full px-3 py-1 text-[12px] font-medium transition whitespace-nowrap ${
              activeTab === tab
                ? "bg-zinc-800 text-white"
                : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300"
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="rounded-md bg-zinc-50 p-3 text-[12px] text-zinc-700 leading-relaxed space-y-3 overflow-auto max-h-[350px]">
        {activeTab === "Text Shape" && (
          <>
            <label className="block text-xs font-semibold">Shape Style</label>
            <select className="w-full rounded border border-zinc-300 px-2 py-1 text-sm">
              <option value="none">None</option>
              <option value="curve">Curve</option>
              <option value="arch">Arch</option>
              <option value="bulge">Bulge</option>
              <option value="wave">Wave</option>
            </select>
          </>
        )}

        {activeTab === "Text Shadow" && (
          <>
            <div>
              <label className="block text-xs font-semibold">
                Shadow Color
              </label>
              <input type="color" className="w-full h-8 rounded border" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold">Offset X</label>
                <input
                  type="number"
                  className="w-full rounded border px-2 py-1 text-sm"
                  defaultValue={0}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold">Offset Y</label>
                <input
                  type="number"
                  className="w-full rounded border px-2 py-1 text-sm"
                  defaultValue={0}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold">Blur Radius</label>
              <input type="range" min="0" max="20" className="w-full" />
            </div>
          </>
        )}

        {activeTab === "Transformation" && (
          <>
            <label className="block text-xs font-semibold">Text Case</label>
            <div className="grid grid-cols-2 gap-2">
              <button className="rounded bg-zinc-200 px-2 py-1 text-xs hover:bg-zinc-300">
                UPPERCASE
              </button>
              <button className="rounded bg-zinc-200 px-2 py-1 text-xs hover:bg-zinc-300">
                lowercase
              </button>
              <button className="rounded bg-zinc-200 px-2 py-1 text-xs hover:bg-zinc-300">
                Capitalize
              </button>
              <button className="rounded bg-zinc-200 px-2 py-1 text-xs hover:bg-zinc-300">
                None
              </button>
            </div>
          </>
        )}

        {activeTab === "Decoration" && (
          <>
            <label className="block text-xs font-semibold">
              Text Decoration
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button className="rounded bg-zinc-200 px-2 py-1 text-xs hover:bg-zinc-300">
                Underline
              </button>
              <button className="rounded bg-zinc-200 px-2 py-1 text-xs hover:bg-zinc-300">
                Overline
              </button>
              <button className="rounded bg-zinc-200 px-2 py-1 text-xs hover:bg-zinc-300">
                Strikethrough
              </button>
              <button className="rounded bg-zinc-200 px-2 py-1 text-xs hover:bg-zinc-300">
                Highlight
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

/* ───────── Right preview (now gates TextToolsBox) ───────── */
const PreviewSidebar = ({ showTextTools }: { showTextTools: boolean }) => (
  <aside className="hidden lg:block w-[340px] shrink-0 pl-13 -mr-10 -mt-17">
    <div className="sticky" style={{ top: TOTAL_HEADER_OFFSET }}>
      <div
        className="flex flex-col rounded-l-[26px] rounded-r-[12px] border border-zinc-200 bg-zinc-100 p-4 shadow-sm"
        style={{ height: `calc(94vh)` }}
      >
        <div className="px-2 text-[12px] font-semibold tracking-wide text-zinc-700">
          PREVIEW
        </div>

        <div className="mt-3 grid place-items-center rounded-md border border-zinc-300 bg-white p-3">
          <div className="h-[160px] w-full max-w-[280px] rounded-sm bg-zinc-200 ring-1 ring-zinc-300/60" />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 px-2">
          <button className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-[11px] font-medium shadow-sm">
            FRONT SIDE
          </button>
          <button className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-[11px] font-medium shadow-sm">
            BACK SIDE
          </button>
        </div>

        <div className="mt-5 space-y-4 px-4">
          <div className="relative h-1 w-full rounded bg-zinc-300">
            <span
              className="absolute -top-1 h-3 w-3 rounded-full bg-black"
              style={{ left: "28%" }}
            />
          </div>
          <div className="relative h-1 w-full rounded bg-zinc-300">
            <span
              className="absolute -top-1 h-3 w-3 rounded-full bg-zinc-800"
              style={{ left: "72%" }}
            />
          </div>
        </div>

        {/* Only render when left “TEXT” is open AND text tool is active */}
        {showTextTools ? <TextToolsBox /> : null}

        <div className="mt-auto" />
      </div>
    </div>
  </aside>
);

/* ───────── Page ───────── */
export default function Page() {
  // Tools & panels
  const [selectedTool, setSelectedTool] = useState<string>("move");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showGradientPanel, setShowGradientPanel] = useState(false);
  const [showShapeMenu, setShowShapeMenu] = useState(false);
  const [showTemplatesPanel, setShowTemplatesPanel] = useState(false);
  const [showTextPanel, setShowTextPanel] = useState(false);
  const [showLayersPanel, setShowLayersPanel] = useState(false);
  const [showUploadsPanel, setShowUploadsPanel] = useState(false);
  const [showBrushPanel, setShowBrushPanel] = useState(false);

  // Fill & gradient
  const [currentColor, setCurrentColor] = useState<string>("#111827");
  const [currentGradient, setCurrentGradient] = useState<{
    type: string;
    c1: string;
    c2: string;
    mid?: number;
    angle?: number;
    opacity?: number;
    preview?: boolean;
  } | null>(null);

  // Stage ref & text style
  const stageRef = useRef<CanvasStageRef>(null);
  const [textStyleUI, setTextStyleUI] = useState<{
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string | number;
    fontStyle?: string;
    underline?: boolean;
    textAlign?: string;
  } | null>(null);
  const [textMode, setTextMode] = useState<"point" | "area">("point");

  return (
    <div className="min-h-screen w-full bg-white text-zinc-900">
      <TopBar />

      <FormatBar
        textStyle={textStyleUI}
        onTextStyleChange={(style) => {
          const merged = { ...(textStyleUI || {}), ...style };

          // NEW: Load Google Font dynamically when changed
          if (style.fontFamily) {
            loadFont(style.fontFamily);
          }

          setTextStyleUI(merged);
          stageRef.current?.applyTextStyle(merged);
        }}
      />

      {/* Fixed left rail */}
      <LeftSidebar
        offsetTopPx={50}
        selectedTool={selectedTool as any}
        showColorPicker={showColorPicker}
        showGradientPanel={showGradientPanel}
        showShapeMenu={showShapeMenu}
        showTemplatesPanel={showTemplatesPanel}
        showTextPanel={showTextPanel}
        showLayersPanel={showLayersPanel}
        showUploadsPanel={showUploadsPanel}
        showBrushPanel={showBrushPanel}
        /* 🔗 keep uploads wired to canvas */
        onAddImages={(items: Array<File | string>) =>
          stageRef.current?.addImages(items)
        }
        onAddImagesAt={(x: number, y: number, items: Array<File | string>) =>
          stageRef.current?.addImagesAt(x, y, items)
        }
        onSelectTool={(id) => {
          setSelectedTool(id);
          setShowColorPicker(false);
          setShowShapeMenu(false);
          setShowLayersPanel(false);
          setShowGradientPanel(false);
          setShowTemplatesPanel(false);
          setShowTextPanel(false);
          setShowUploadsPanel(false);
          setShowBrushPanel(false);
        }}
        onToggleColor={() => {
          setShowColorPicker((s) => !s);
          setShowShapeMenu(false);
          setShowLayersPanel(false);
          setShowGradientPanel(false);
          setShowTemplatesPanel(false);
          setShowTextPanel(false);
          setShowUploadsPanel(false);
          setShowBrushPanel(false);
        }}
        onToggleGradient={() => {
          setShowGradientPanel((s) => !s);
          setShowColorPicker(false);
          setShowShapeMenu(false);
          setShowLayersPanel(false);
          setShowTemplatesPanel(false);
          setShowTextPanel(false);
          setShowUploadsPanel(false);
          setShowBrushPanel(false);
        }}
        onToggleShapes={() => {
          setShowShapeMenu((s) => !s);
          setShowColorPicker(false);
          setShowGradientPanel(false);
          setShowLayersPanel(false);
          setShowTemplatesPanel(false);
          setShowTextPanel(false);
          setShowUploadsPanel(false);
          setShowBrushPanel(false);
        }}
        onToggleTemplates={() => {
          setShowTemplatesPanel((s) => !s);
          setShowColorPicker(false);
          setShowShapeMenu(false);
          setShowLayersPanel(false);
          setShowGradientPanel(false);
          setShowTextPanel(false);
          setShowUploadsPanel(false);
          setShowBrushPanel(false);
        }}
        onToggleText={() => {
          setShowTextPanel((s) => !s);
          setShowColorPicker(false);
          setShowShapeMenu(false);
          setShowLayersPanel(false);
          setShowGradientPanel(false);
          setShowTemplatesPanel(false);
          setShowUploadsPanel(false);
          setShowBrushPanel(false);
        }}
        onTextLayoutChange={(mode) => {
          if (mode === "point" || mode === "area") {
            setSelectedTool("text");
            setTextMode(mode);
          }
          if (mode === "path" || mode === "wrap") {
            stageRef.current?.applyTextLayout(mode);
          }
        }}
        onToggleLayers={() => {
          setShowLayersPanel((s) => !s);
          setShowColorPicker(false);
          setShowShapeMenu(false);
          setShowGradientPanel(false);
          setShowTemplatesPanel(false);
          setShowTextPanel(false);
          setShowUploadsPanel(false);
          setShowBrushPanel(false);
        }}
        onToggleUploads={() => {
          setShowUploadsPanel((s) => !s);
          setShowColorPicker(false);
          setShowShapeMenu(false);
          setShowGradientPanel(false);
          setShowTemplatesPanel(false);
          setShowTextPanel(false);
          setShowLayersPanel(false);
          setShowBrushPanel(false);
          // Hint: you can also auto-select the upload tool if you want the file picker:
          // setSelectedTool("upload");
        }}
        onToggleBrush={() => {
          setShowBrushPanel((s) => !s);
          setSelectedTool("brush");
          setShowColorPicker(false);
          setShowShapeMenu(false);
          setShowLayersPanel(false);
          setShowGradientPanel(false);
          setShowTemplatesPanel(false);
          setShowTextPanel(false);
          setShowUploadsPanel(false);
        }}
        onColorChange={(hex) => {
          setCurrentColor(hex);
          stageRef.current?.setFillColor(hex);
        }}
        onGradientApply={(opts) => {
          const { preview, ...rest } = opts;
          setCurrentGradient(rest);
          stageRef.current?.applyGradient(rest as any);
        }}
        onShapeSelect={(shapeId) => {
          setSelectedTool(shapeId as any);
          setShowShapeMenu(false);
        }}
        onTemplateSelect={(tplId) => {
          stageRef.current?.insertTemplate(tplId);
          setShowTemplatesPanel(false);
        }}
      />

      {/* left padding equals rail width so content never hides under it */}
      <main
        className="
          flex w-full h-[calc(100vh-96px)]
          max-w-[1600px] mx-auto
          bg-gray-200 px-6 md:px-10 pb-24 pt-4
          pl-[64px]
        "
      >
        <div className="flex flex-1 items-center justify-center min-w-0">
          {/* Render the CanvasStage and provide imperative access via the ref */}
          <div className="w-full h-full max-h-[calc(100vh-96px)]">
            <CanvasStage
              ref={stageRef}
              selectedTool={selectedTool}
              currentColor={currentColor}
              currentGradient={currentGradient}
              textMode={textMode}
              onTextSelectionChange={(style) => setTextStyleUI(style)}
            />
          </div>
        </div>

        {/* NEW: show text tools only when TEXT panel is open and text tool is active */}
        <PreviewSidebar
          showTextTools={showTextPanel && selectedTool === "text"}
        />
      </main>
    </div>
  );
}
