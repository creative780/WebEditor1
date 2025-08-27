"use client";

import React, { useState } from "react";
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
  Sparkles,
  Home,
} from "lucide-react";
// Use our fully featured CanvasStage instead of the simple CanvasLive.  The
// CanvasStage exposes an imperative API via a ref so we can set colours,
// apply gradients, insert templates and more from the parent component.
import CanvasStage, { CanvasStageRef } from "./components/Stage/CanvasStage";

/* ───────── Header sizing ───────── */
const HEADER_TOPBAR_PX = 48;
const HEADER_FORMATBAR_PX = 48;
const TOTAL_HEADER_OFFSET = HEADER_TOPBAR_PX + HEADER_FORMATBAR_PX;

/* ───────── Top bar ───────── */
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

/* ───────── Format toolbar (updated: only Font Name + "10" are boxed) ───────── */
const BTN =
  "grid h-9 w-9 place-items-center rounded-md text-zinc-700 hover:bg-zinc-200 transition";
const SEP = <div className="mx-2 h-6 w-px bg-zinc-300/70" />;

const FormatBar = () => (
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
        {/* Font name (narrower) */}
        <select className="h-8 min-w-[110px] rounded-md border border-zinc-300 bg-white px-2 text-xs outline-none">
          <option>Font Name</option>
          <option>Inter</option>
          <option>Poppins</option>
          <option>Montserrat</option>
        </select>

        {/* + 10 – */}
        <div className="ml-1 flex items-center gap-[1px]">
          <button className={`${BTN} h-8 w-8 text-sm`}>+</button>
          <div className="grid h-8 w-10 place-items-center rounded-md border border-zinc-300 bg-white text-xs">
            10
          </div>
          <button className={`${BTN} h-8 w-8 text-sm`}>–</button>
        </div>

        {/* Aa color */}
        <button
          className="relative grid h-8 w-10 place-items-center rounded-md text-xs font-semibold hover:bg-zinc-200"
          title="Text color"
        >
          <span className="leading-none">Aa</span>
          <span className="absolute bottom-1 h-[2px] w-5 rounded-full bg-red-600" />
        </button>

        {SEP}

        {/* Rest of the icons with smaller buttons */}
        <button className={`${BTN} h-8 w-8`} title="Bold">
          <Bold size={14} />
        </button>
        <button className={`${BTN} h-8 w-8`} title="Italic">
          <Italic size={14} />
        </button>
        <button className={`${BTN} h-8 w-8`} title="Underline">
          <Underline size={14} />
        </button>

        {SEP}

        <button className={`${BTN} h-8 w-8`} title="Align left">
          <AlignLeft size={14} />
        </button>
        <button className={`${BTN} h-8 w-8`} title="Align center">
          <AlignCenter size={14} />
        </button>
        <button className={`${BTN} h-8 w-8`} title="Align right">
          <AlignRight size={14} />
        </button>
        <button className={`${BTN} h-8 w-8`} title="Justify">
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

/* ───────── Rulers (exact like mock) ───────── */
const RULER_STEP = 6; // px between minor ticks

const RulerH = () => (
  <div className="relative h-11 w-full rounded-t-xl bg-white shadow-[inset_0_-1px_0_rgba(0,0,0,0.08)]">
    {/* minor ticks every 6px */}
    <div
      className="absolute inset-0"
      style={{
        backgroundSize: `${RULER_STEP}px 100%`,
        backgroundImage: `repeating-linear-gradient(90deg, rgba(0,0,0,.18) 0 1px, transparent 1px ${RULER_STEP}px)`,
      }}
    />
    {/* medium ticks every 30px */}
    <div
      className="absolute inset-x-0 bottom-0 h-3"
      style={{
        backgroundSize: `30px 100%`,
        backgroundImage: `repeating-linear-gradient(90deg, rgba(0,0,0,.26) 0 1px, transparent 1px 30px)`,
      }}
    />
    {/* major ticks every 60px */}
    <div
      className="absolute inset-x-0 bottom-0 h-[18px]"
      style={{
        backgroundSize: `60px 100%`,
        backgroundImage: `repeating-linear-gradient(90deg, rgba(0,0,0,.34) 0 1px, transparent 1px 60px)`,
      }}
    />
    {/* red center indicator */}
    <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2">
      <div className="mx-auto h-[18px] w-[2px] bg-[#cc1111]" />
      <div className="mx-auto -mt-[4px] h-0 w-0 border-x-[6px] border-b-[8px] border-x-transparent border-b-[#cc1111]" />
    </div>
  </div>
);

const RulerV = () => (
  <div className="relative w-11 rounded-l-xl bg-white shadow-[inset_-1px_0_0_rgba(0,0,0,0.08)]">
    {/* minor ticks every 6px */}
    <div
      className="absolute inset-0"
      style={{
        backgroundSize: `100% ${RULER_STEP}px`,
        backgroundImage: `repeating-linear-gradient(0deg, rgba(0,0,0,.18) 0 1px, transparent 1px ${RULER_STEP}px)`,
      }}
    />
    {/* medium ticks every 30px */}
    <div
      className="absolute right-0 top-0 w-3"
      style={{
        backgroundSize: `100% 30px`,
        backgroundImage: `repeating-linear-gradient(0deg, rgba(0,0,0,.26) 0 1px, transparent 1px 30px)`,
      }}
    />
    {/* major ticks every 60px */}
    <div
      className="absolute right-0 top-0 w-[18px]"
      style={{
        backgroundSize: `100% 60px`,
        backgroundImage: `repeating-linear-gradient(0deg, rgba(0,0,0,.34) 0 1px, transparent 1px 60px)`,
      }}
    />
    {/* red center indicator */}
    <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2">
      <div className="mr-[calc(18px-2px)] h-[2px] w-[18px] bg-[#cc1111]" />
      <div className="absolute -right-[6px] top-1/2 -translate-y-1/2 -rotate-90 h-0 w-0 border-x-[6px] border-b-[8px] border-x-transparent border-b-[#cc1111]" />
    </div>
  </div>
);

/* ───────── Canvas dashed margin + markers ───────── */
const Canvas = () => (
  <center>
    <div className="ml-92 rounded-xl border border-zinc-200 bg-white shadow-sm">
      <RulerH />
      <div className="flex">
        <RulerV />
        <div className="relative flex-1 bg-zinc-50">
          <div className="mx-auto my-10 w-[720px] max-w-[calc(100vw-560px)]">
            <div className="relative rounded-[12px] p-3">
              {/* dashed red margin (12px inset) */}
              <div className="pointer-events-none absolute inset-3 rounded-[12px] border-2 border-dashed border-[#ff3b3b]/90" />
              {/* artboard */}
              <div className="rounded-[8px] bg-[url('https://www.transparenttextures.com/patterns/leather.png')] bg-zinc-300 ring-1 ring-zinc-400/40 h-[440px]" />
              {/* toolbar (unchanged) */}
              <div className="mx-auto mt-5 flex w-[560px] max-w-full items-center gap-3 rounded-full bg-zinc-200 px-2 py-2 shadow">
                <button className="grid h-8 w-8 place-items-center rounded-md bg-black text-white text-xs">
                  ■
                </button>
                <button className="grid h-8 w-8 place-items-center rounded-md border border-zinc-300 bg-white text-xs">
                  □
                </button>
                <div className="ml-1 flex items-center overflow-hidden rounded-md border border-zinc-300 bg-white">
                  <button className="h-8 w-8 text-lg">–</button>
                  <div className="grid h-8 w-12 place-items-center text-sm">
                    100
                  </div>
                  <button className="h-8 w-8 text-lg">+</button>
                </div>
                <input
                  type="range"
                  defaultValue={50}
                  className="h-2 flex-1 appearance-none rounded-full bg-zinc-300 accent-zinc-700"
                />
              </div>

              {/* red side markers aligned to dashed box midpoints */}
              <span className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 text-[#c01919]">
                ▼
              </span>
              <span className="pointer-events-none absolute left-1/2 bottom-3 -translate-x-1/2 rotate-180 text-[#c01919]">
                ▲
              </span>
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 -rotate-90 text-[#c01919]">
                ▲
              </span>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-[#c01919]">
                ▲
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </center>
);

/* ───────── Right preview ───────── */
const PreviewSidebar = () => (
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

        <div className="mt-auto" />
      </div>
    </div>
  </aside>
);

/* ───────── Page ───────── */
export default function Page() {
  // Track the currently active tool (move, brush, text, etc.).  Shape
  // identifiers like "rectangle" are treated as tools when inserted.
  const [selectedTool, setSelectedTool] = useState<string>("move");
  // UI panel visibility flags
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showGradientPanel, setShowGradientPanel] = useState(false);
  const [showShapeMenu, setShowShapeMenu] = useState(false);
  const [showTemplatesPanel, setShowTemplatesPanel] = useState(false);
  const [showTextPanel, setShowTextPanel] = useState(false);
  const [showLayersPanel, setShowLayersPanel] = useState(false);
  const [showUploadsPanel, setShowUploadsPanel] = useState(false);
  const [showBrushPanel, setShowBrushPanel] = useState(false);

  // Current fill colour and gradient.  When these values change we
  // propagate the update to the canvas via the ref API.  Default
  // colour matches the Tailwind primary used in the mockup.
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

  // Ref to interact with the CanvasStage imperatively
  const stageRef = React.useRef<CanvasStageRef>(null);

  return (
    <div className="min-h-screen w-full bg-white text-zinc-900">
      <TopBar />
      <FormatBar />

      {/* Fixed left rail */}
      <LeftSidebar
        offsetTopPx={50} // Reduced from TOTAL_HEADER_OFFSET (96) to move sidebar up
        selectedTool={selectedTool as any}
        showColorPicker={showColorPicker}
        showGradientPanel={showGradientPanel}
        showShapeMenu={showShapeMenu}
        showTemplatesPanel={showTemplatesPanel}
        showTextPanel={showTextPanel}
        showLayersPanel={showLayersPanel}
        showUploadsPanel={showUploadsPanel}
        showBrushPanel={showBrushPanel}
        onSelectTool={(id) => {
          // When a tool (e.g. move, text, crop) is selected we close
          // any open panels and brush strip.  Shape ids are treated
          // similarly.
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
        }}
        onToggleBrush={() => {
          // Open or close the brush strip and activate the brush tool
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
        // Colour picker callback applies colour to the canvas and updates state
        onColorChange={(hex) => {
          setCurrentColor(hex);
          // Immediately apply to the canvas via ref
          stageRef.current?.setFillColor(hex);
        }}
        // Gradient apply callback uses the ref to apply gradient and store
        onGradientApply={(opts) => {
          // The gradient panel may include a "preview" flag; we
          // strip it before saving because the CanvasStage does not
          // recognise this property.  Only the remaining fields are
          // stored and applied to the canvas.
          const { preview, ...rest } = opts;
          setCurrentGradient(rest);
          stageRef.current?.applyGradient(rest as any);
        }}
        // Shape selection inserts a shape by updating the active tool
        onShapeSelect={(shapeId) => {
          setSelectedTool(shapeId as any);
          setShowShapeMenu(false);
        }}
        // Template selection inserts a template group
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
    pl-[64px]   /* ← match LeftSidebar width */
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
            />
          </div>
        </div>
        <PreviewSidebar />
      </main>
    </div>
  );
}
