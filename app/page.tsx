"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  MousePointer2,
  Type,
  Square,
  Circle,
  Layers,
  Trash2,
  Download,
  Lock,
  Unlock,
  PaintBucket,
  Grid2X2,
} from "lucide-react";

/**
 * Enhanced Welcome Page with a built‑in lightweight "on‑the‑spot" editor preview
 * — tailored to the idea of a Canva‑class editor.
 *
 * No external libs beyond `lucide-react`. Pure React + Tailwind CSS.
 *
 * Editor capabilities (mini demo):
 * - Add Text / Rectangle / Circle elements
 * - Drag to move (snap to 8px grid)
 * - Select to recolor (picker)
 * - Bring Forward / Send Backward (layer order)
 * - Lock / Unlock element
 * - Delete selected (button or Del / Backspace)
 * - Toggle grid background
 *
 * Notes:
 * - This is a playful preview; your full page at /editor can host the pro features.
 */

// Types for mini editor elements
 type ElementBase = {
  id: string;
  x: number; // top-left
  y: number; // top-left
  rotation?: number;
  fill: string;
  locked?: boolean;
};

type TextEl = ElementBase & {
  kind: "text";
  text: string;
  w: number;
  h: number;
};

type RectEl = ElementBase & {
  kind: "rect";
  w: number;
  h: number;
  radius?: number;
};

type CircleEl = ElementBase & {
  kind: "circle";
  r: number; // radius
};

type EditorEl = TextEl | RectEl | CircleEl;

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

const GRID = 8;
const snap = (v: number) => Math.round(v / GRID) * GRID;

export default function WelcomePage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-neutral-950 text-white">
      {/* --- BACKGROUND LAYERS --- */}
      {/* gradient base */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_0%,#1f2937_0%,#0a0a0a_60%)]" />

      {/* subtle grid */}
      <svg className="pointer-events-none absolute inset-0 opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* floating blobs */}
      <div className="pointer-events-none absolute -left-24 top-24 h-80 w-80 rounded-full bg-rose-700/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-purple-600/30 blur-3xl" />

      {/* grain overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-soft-light"
        style={{
          backgroundImage:
            "url('data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 100 100\\'><filter id=\\'n\\'><feTurbulence type=\\'fractalNoise\\' baseFrequency=\\'0.8\\' numOctaves=\\'4\\' stitchTiles=\\'stitch\\'/></filter><rect width=\\'100%\\' height=\\'100%\\' filter=\\'url(%23n)\\' opacity=\\'0.5\\'/></svg>')",
        }}
      />

      {/* --- CONTENT --- */}
      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center px-6 text-center">
        {/* badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs text-neutral-200 backdrop-blur">
          <Sparkles className="h-3.5 w-3.5 text-rose-400" />
          <span>Next-gen Web Design Studio</span>
        </div>

        {/* headline */}
        <h1 className="max-w-3xl text-5xl font-black leading-tight tracking-tight md:text-6xl">
          Create. Collaborate.{" "}
          <span className="bg-gradient-to-r from-rose-400 to-rose-600 bg-clip-text text-transparent">
            Elevate
          </span>
          .
        </h1>
        <p className="mt-4 max-w-2xl text-base text-neutral-300 md:text-lg">
          A sleek, blazing-fast, Canva-class editor with pro features — templates, layers, live
          collaboration, and pixel-perfect export.
        </p>

        {/* CTA card */}
        <div className="mt-10 w-full max-w-xl rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col items-center gap-5 md:flex-row md:justify-between">
            <div className="text-left">
              <div className="text-sm text-neutral-300">Start a new design</div>
              <div className="text-lg font-semibold">1080×1080 • Social Square</div>
            </div>
            <Link
              href="/editor"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-rose-800 px-6 py-3 text-base font-semibold shadow-lg shadow-rose-900/40 transition-all duration-300 hover:scale-105 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500/60"
            >
              Start Designing
              <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        {/* --- Live Mini Editor Preview --- */}
        <section className="mt-14 grid w-full max-w-6xl grid-cols-1 gap-6 md:grid-cols-5">
          {/* Left: editor */}
          <div className="md:col-span-3">
            <EditorPreview />
          </div>

          {/* Right: feature highlights */}
          <div className="md:col-span-2 flex flex-col gap-3">
            <FeatureCard
              icon={<Layers className="h-5 w-5" />}
              title="True Layers"
              desc="Bring forward/backward, lock items, and organize like a pro."
            />
            <FeatureCard
              icon={<MousePointer2 className="h-5 w-5" />}
              title="Direct Manipulation"
              desc="Drag on canvas with grid snapping for pixel-perfect alignment."
            />
            <FeatureCard
              icon={<PaintBucket className="h-5 w-5" />}
              title="Brand‑ready Colors"
              desc="Quickly experiment with fills and save palettes (full editor)."
            />
            <FeatureCard
              icon={<Grid2X2 className="h-5 w-5" />}
              title="Smart Guides"
              desc="Snap to an 8px system for tidy, consistent layouts."
            />
            <p className="mt-1 text-left text-xs text-neutral-400">
              Tip: Select an element to unlock contextual tools. Press <kbd className="rounded bg-white/10 px-1">Del</kbd> to remove.
            </p>
          </div>
        </section>

        {/* marquee features */}
        <div className="mt-12 w-full overflow-hidden">
          <div className="animate-[marquee_18s_linear_infinite] whitespace-nowrap text-neutral-600 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
            <span className="mx-6 text-sm">Templates</span>
            <span className="mx-6 text-sm">Layers</span>
            <span className="mx-6 text-sm">Smart Guides</span>
            <span className="mx-6 text-sm">Brand Kits</span>
            <span className="mx-6 text-sm">Realtime</span>
            <span className="mx-6 text-sm">Exports</span>
            <span className="mx-6 text-sm">AI Tools</span>
            <span className="mx-6 text-sm">Templates</span>
            <span className="mx-6 text-sm">Layers</span>
            <span className="mx-6 text-sm">Smart Guides</span>
            <span className="mx-6 text-sm">Brand Kits</span>
            <span className="mx-6 text-sm">Realtime</span>
            <span className="mx-6 text-sm">Exports</span>
            <span className="mx-6 text-sm">AI Tools</span>
          </div>
        </div>

        <footer className="mt-14 text-xs text-neutral-500">
          © {new Date().getFullYear()} Creative Connect Advertising L.L.C.
        </footer>
      </main>

      {/* custom keyframes without Tailwind config */}
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

/** ----------------------------------------------
 * Components
 * ---------------------------------------------- */

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="group rounded-2xl border border-white/10 bg-white/5 p-4 text-left shadow-2xl backdrop-blur transition hover:bg-white/10">
      <div className="mb-2 inline-flex items-center gap-2 text-rose-300">
        {icon}
        <span className="text-xs uppercase tracking-wider">Feature</span>
      </div>
      <div className="text-base font-semibold">{title}</div>
      <p className="mt-1 text-sm text-neutral-300">{desc}</p>
    </div>
  );
}

function EditorPreview() {
  const [els, setEls] = useState<EditorEl[]>(() => [
    { id: uid(), kind: "rect", x: 64, y: 64, w: 220, h: 120, radius: 16, fill: "#1f2937" },
    { id: uid(), kind: "circle", x: 320, y: 96, r: 60, fill: "#f43f5e" },
    { id: uid(), kind: "text", x: 88, y: 88, w: 180, h: 40, text: "Your Headline", fill: "#e5e7eb" },
  ]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [gridOn, setGridOn] = useState(true);
  const selected = useMemo(() => els.find((e) => e.id === selectedId) || null, [els, selectedId]);

  // Keyboard delete
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        setEls((prev) => prev.filter((p) => p.id !== selectedId));
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  const updateEl = useCallback((id: string, patch: Partial<EditorEl>) => {
    setEls((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } as EditorEl : p)));
  }, []);

  const bringForward = useCallback(() => {
    if (!selectedId) return;
    setEls((prev) => {
      const idx = prev.findIndex((p) => p.id === selectedId);
      if (idx === -1 || idx === prev.length - 1) return prev;
      const next = prev.slice();
      const [m] = next.splice(idx, 1);
      next.splice(idx + 1, 0, m);
      return next;
    });
  }, [selectedId]);

  const sendBackward = useCallback(() => {
    if (!selectedId) return;
    setEls((prev) => {
      const idx = prev.findIndex((p) => p.id === selectedId);
      if (idx <= 0) return prev;
      const next = prev.slice();
      const [m] = next.splice(idx, 1);
      next.splice(idx - 1, 0, m);
      return next;
    });
  }, [selectedId]);

  const toggleLock = useCallback(() => {
    if (!selected) return;
    updateEl(selected.id, { locked: !selected.locked });
  }, [selected, updateEl]);

  const onAddText = () => {
    const id = uid();
    setEls((prev) => [
      ...prev,
      { id, kind: "text", x: 40, y: 40, w: 180, h: 40, text: "Double‑click to edit", fill: "#e5e7eb" },
    ]);
    setSelectedId(id);
  };

  const onAddRect = () => {
    const id = uid();
    setEls((prev) => [...prev, { id, kind: "rect", x: 120, y: 60, w: 160, h: 100, radius: 16, fill: "#0ea5e9" }]);
    setSelectedId(id);
  };

  const onAddCircle = () => {
    const id = uid();
    setEls((prev) => [...prev, { id, kind: "circle", x: 240, y: 160, r: 56, fill: "#10b981" }]);
    setSelectedId(id);
  };

  const onDelete = () => {
    if (!selectedId) return;
    setEls((prev) => prev.filter((p) => p.id !== selectedId));
    setSelectedId(null);
  };

  const onColor = (val: string) => {
    if (!selected) return;
    updateEl(selected.id, { fill: val });
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 p-3 text-sm">
        <span className="mr-2 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs text-neutral-300">
          <Sparkles className="h-3.5 w-3.5 text-rose-300" /> Live Editor
        </span>
        <Tool onClick={onAddText} icon={<Type className="h-4 w-4" />} label="Text" />
        <Tool onClick={onAddRect} icon={<Square className="h-4 w-4" />} label="Rect" />
        <Tool onClick={onAddCircle} icon={<Circle className="h-4 w-4" />} label="Circle" />
        <div className="mx-2 h-5 w-px bg-white/10" />
        <Tool onClick={sendBackward} icon={<ArrowRight className="h-4 w-4 rotate-180" />} label="Back" />
        <Tool onClick={bringForward} icon={<ArrowRight className="h-4 w-4" />} label="Front" />
        <Tool onClick={toggleLock} icon={selected?.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />} label={selected?.locked ? "Locked" : "Lock"} />
        <Tool onClick={onDelete} icon={<Trash2 className="h-4 w-4" />} label="Delete" />
        <label className="ml-auto inline-flex items-center gap-2 text-xs text-neutral-300">
          <span>Color</span>
          <input
            type="color"
            className="h-6 w-6 cursor-pointer rounded border border-white/10 bg-transparent p-0"
            value={selected?.fill || "#f43f5e"}
            onChange={(e) => onColor(e.target.value)}
          />
        </label>
        <button
          onClick={() => setGridOn((g) => !g)}
          className="ml-2 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-neutral-300 hover:bg-white/10"
        >
          <Grid2X2 className="h-3.5 w-3.5" /> {gridOn ? "Grid On" : "Grid Off"}
        </button>
      </div>

      {/* Canvas */}
      <CanvasStage
        els={els}
        selectedId={selectedId}
        setSelectedId={setSelectedId}
        updateEl={updateEl}
        gridOn={gridOn}
      />

      {/* Footer actions */}
      <div className="flex items-center justify-between border-t border-white/10 p-3 text-xs text-neutral-400">
        <span>
          Drag elements. Double‑click text to edit. Snap: <code>8px</code>.
        </span>
        <Link href="/editor" className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 font-medium text-neutral-200 hover:bg-white/20">
          Open Full Editor <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

function Tool({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-neutral-200 shadow hover:bg-white/10"
    >
      {icon}
      {label}
    </button>
  );
}

function CanvasStage({
  els,
  selectedId,
  setSelectedId,
  updateEl,
  gridOn,
}: {
  els: EditorEl[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  updateEl: (id: string, patch: Partial<EditorEl>) => void;
  gridOn: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState<{ id: string; dx: number; dy: number } | null>(null);

  const onMouseDown = (
    e: React.MouseEvent,
    el: EditorEl
  ) => {
    e.stopPropagation();
    if (el.locked) return;
    setSelectedId(el.id);
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const dx = e.clientX - rect.left - el.x;
    const dy = e.clientY - rect.top - el.y;
    setDragging({ id: el.id, dx, dy });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const x = e.clientX - rect.left - dragging.dx;
    const y = e.clientY - rect.top - dragging.dy;
    const nx = gridOn ? snap(x) : Math.round(x);
    const ny = gridOn ? snap(y) : Math.round(y);
    updateEl(dragging.id, { x: nx, y: ny });
  };

  const onMouseUp = () => setDragging(null);

  return (
    <div
      className="relative h-[420px] w-full select-none overflow-hidden rounded-b-2xl bg-neutral-900"
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onMouseDown={() => setSelectedId(null)}
    >
      {/* Canvas wrap */}
      <div ref={wrapRef} className="absolute inset-0">
        {/* grid background */}
        {gridOn && (
          <div
            className="absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(255,255,255,.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.2) 1px, transparent 1px)",
              backgroundSize: `${GRID * 1}px ${GRID * 1}px`,
            }}
          />
        )}

        {/* elements */}
        {els.map((el) => (
          <ElementView
            key={el.id}
            el={el}
            selected={selectedId === el.id}
            onMouseDown={onMouseDown}
            setSelectedId={setSelectedId}
            updateEl={updateEl}
          />)
        )}
      </div>
    </div>
  );
}

function ElementView({
  el,
  selected,
  onMouseDown,
  setSelectedId,
  updateEl,
}: {
  el: EditorEl;
  selected: boolean;
  onMouseDown: (e: React.MouseEvent, el: EditorEl) => void;
  setSelectedId: (id: string) => void;
  updateEl: (id: string, patch: Partial<EditorEl>) => void;
}) {
  const common = {
    position: "absolute" as const,
    left: el.x,
    top: el.y,
    transform: `rotate(${el.rotation || 0}deg)`,
  };

  // Inline text edit
  const textRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (selected && el.kind === "text") {
      textRef.current?.focus();
    }
  }, [selected, el.kind]);

  if (el.kind === "rect") {
    return (
      <div
        style={{ ...common, width: (el as RectEl).w, height: (el as RectEl).h }}
        className={`group ${el.locked ? "cursor-not-allowed" : "cursor-move"}`}
        onMouseDown={(e) => onMouseDown(e, el)}
      >
        <div
          className="h-full w-full"
          style={{
            backgroundColor: el.fill,
            borderRadius: (el as RectEl).radius ?? 0,
            boxShadow: selected ? "0 0 0 2px rgba(244,63,94,.8) inset" : "none",
          }}
        />
        {el.locked && <LockBadge />}
      </div>
    );
  }

  if (el.kind === "circle") {
    const r = (el as CircleEl).r;
    return (
      <div
        style={{ ...common, width: r * 2, height: r * 2 }}
        className={`group ${el.locked ? "cursor-not-allowed" : "cursor-move"}`}
        onMouseDown={(e) => onMouseDown(e, el)}
      >
        <div
          className="h-full w-full rounded-full"
          style={{
            backgroundColor: el.fill,
            boxShadow: selected ? "0 0 0 2px rgba(244,63,94,.8) inset" : "none",
          }}
        />
        {el.locked && <LockBadge />}
      </div>
    );
  }

  // text
  return (
    <div
      style={{ ...common, width: (el as TextEl).w, minHeight: (el as TextEl).h }}
      className={`group ${el.locked ? "cursor-not-allowed" : "cursor-move"}`}
      onMouseDown={(e) => onMouseDown(e, el)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setSelectedId(el.id);
      }}
    >
      <div
        ref={textRef}
        contentEditable={!el.locked}
        suppressContentEditableWarning
        onBlur={(e) => updateEl(el.id, { ...(el as TextEl), text: e.currentTarget.innerText })}
        className="outline-none"
        style={{
          color: el.fill,
          fontWeight: 800,
          letterSpacing: "-0.02em",
          textShadow: selected ? "0 0 0 rgba(0,0,0,0)" : "none",
        }}
      >
        {(el as TextEl).text}
      </div>
      {selected && (
        <div className="pointer-events-none absolute -inset-2 rounded border border-rose-400/70" />
      )}
      {el.locked && <LockBadge />}
    </div>
  );
}

function LockBadge() {
  return (
    <div className="pointer-events-none absolute -top-2 -right-2 rounded-full border border-white/10 bg-neutral-800/80 p-1 text-white shadow">
      <Lock className="h-3.5 w-3.5" />
    </div>
  );
}
