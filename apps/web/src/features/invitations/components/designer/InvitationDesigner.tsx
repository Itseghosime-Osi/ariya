"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { Segmented } from "@/features/seating/hall/studio-ui";
import { WorkspaceBar } from "@/features/seating/hall/WorkspaceBar";
import { uploadInvitationImageAction } from "../../actions";
import {
  createLayerOfKind,
  ensureEntrySeal,
  normaliseDesign,
} from "../../design";
import {
  alignLayer,
  applyImportedCard,
  createImageLayer,
  createShapeLayer,
  designRatio,
  duplicateLayer,
  isEditable,
  moveLayerStack,
  removeImportedCard,
  type Alignment,
  type StackMove,
} from "../../layer-ops";
import type {
  InvitationDesign,
  InvitationEventContent,
  InvitationLayer,
} from "../../types";
import { DesignerCanvas } from "./DesignerCanvas";
import { Inspector } from "./Inspector";
import { LayersDock } from "./LayersDock";
import { SimplePanel } from "./SimplePanel";
import { ToolRail, type AddKind } from "./ToolRail";
import { useDesignerDoc } from "./useDesignerDoc";

type Mode = "simple" | "pro";
type Upload =
  | { purpose: "layer" }
  | { purpose: "replace"; id: string }
  | { purpose: "background" }
  | { purpose: "card" };

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const COALESCE_MS = 900;
const ZOOMS = [0.5, 0.75, 1, 1.5, 2, 3];

const GLASS =
  "rounded-[28px] border border-black/[0.06] bg-white/95 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_10px_30px_-12px_rgba(28,7,13,0.35)] backdrop-blur";

function readImageRatio(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(1);
    };
    img.src = url;
  });
}

function PillButton({
  label,
  onClick,
  disabled,
  pressed,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className="grid h-11 min-w-11 place-items-center rounded-full px-2 text-night hover:bg-burgundy/10 disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-burgundy aria-pressed:bg-burgundy/10"
    >
      {children}
    </button>
  );
}

function SheetTabs({
  tab,
  onTab,
}: {
  tab: "layers" | "properties";
  onTab: (t: "layers" | "properties") => void;
}) {
  return (
    <div className="px-3 pb-1 pt-3 lg:hidden">
      <Segmented
        label="Panel"
        value={tab}
        options={[
          { key: "layers", label: "Layers" },
          { key: "properties", label: "Properties" },
        ]}
        onPick={onTab}
      />
    </div>
  );
}

/**
 * The invitation designer: a full-screen workspace like the seating studio. Simple mode asks
 * plain questions; Pro puts every tool in reach. Both edit one document, which saves itself.
 */
export function InvitationDesigner({
  eventId,
  eventTitle,
  content,
  initialDesign,
  coupleName,
  backHref,
  requireAccessCard,
  settingsHref,
}: {
  eventId: string;
  eventTitle: string;
  content: InvitationEventContent;
  initialDesign: InvitationDesign;
  coupleName: string;
  backHref: string;
  /** The host has switched the access pass on, so every accepted guest's card carries a seal. */
  requireAccessCard: boolean;
  /** Where the access pass is switched on and off. */
  settingsHref: string;
}) {
  const doc = useDesignerDoc(eventId, initialDesign);
  const { design, commit, recordSnapshot, undo, redo } = doc;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setModeRaw] = useState<Mode>("simple");
  const [dark, setDark] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [layersOpen, setLayersOpen] = useState(true);
  const [sheetTab, setSheetTab] = useState<"layers" | "properties">(
    "properties"
  );
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{
    tone: "ok" | "bad";
    text: string;
  } | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<Upload>({ purpose: "layer" });
  const lastEdit = useRef({ key: "", at: 0 });
  const designRef = useRef(design);
  designRef.current = design;

  // A pass that is on belongs on the card. Show the host the seal, in its house place, so they can
  // move it; guests get one even if this never runs.
  useEffect(() => {
    if (!requireAccessCard) return;
    if (designRef.current.layers.some((l) => l.kind === "code")) return;
    commit((d) => ensureEntrySeal(d), false);
  }, [requireAccessCard, commit]);

  const canDelete = useCallback(
    (l: InvitationLayer) =>
      !l.locked && !(requireAccessCard && l.kind === "code"),
    [requireAccessCard]
  );

  // Preferences live on this device only.
  useEffect(() => {
    try {
      if (localStorage.getItem("ariya:invite-mode") === "pro")
        setModeRaw("pro");
      if (localStorage.getItem("ariya:hall-theme") === "dark") setDark(true);
    } catch {
      /* private mode: the defaults are fine */
    }
  }, []);
  useEffect(() => {
    const html = document.documentElement;
    if (dark) html.dataset.studioTheme = "dark";
    else delete html.dataset.studioTheme;
    return () => {
      delete html.dataset.studioTheme;
    };
  }, [dark]);

  const setMode = (m: Mode) => {
    setModeRaw(m);
    try {
      localStorage.setItem("ariya:invite-mode", m);
    } catch {
      /* ignore */
    }
  };
  const toggleDark = () =>
    setDark((d) => {
      try {
        localStorage.setItem("ariya:hall-theme", d ? "light" : "dark");
      } catch {
        /* ignore */
      }
      return !d;
    });

  // ----------------------------------------------------------------- edits

  /** Typing in a field is one undo step, not one per letter. */
  const patchLayer = useCallback(
    (id: string, patch: Partial<InvitationLayer>) => {
      const key = `${id}:${Object.keys(patch).sort().join(",")}`;
      const now = Date.now();
      const same =
        lastEdit.current.key === key && now - lastEdit.current.at < COALESCE_MS;
      lastEdit.current = { key, at: now };
      commit(
        (d) => ({
          ...d,
          layers: d.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)),
        }),
        !same
      );
    },
    [commit]
  );

  const dragLayer = useCallback(
    (
      id: string,
      patch: Partial<InvitationLayer>,
      options?: { commit?: boolean }
    ) => {
      commit(
        (d) => ({
          ...d,
          layers: d.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)),
        }),
        options?.commit ?? false
      );
    },
    [commit]
  );

  const addLayer = useCallback(
    (layer: InvitationLayer) => {
      commit((d) => ({ ...d, layers: [...d.layers, layer] }));
      setSelectedId(layer.id);
      setSheetTab("properties");
    },
    [commit]
  );

  const add = useCallback(
    (kind: AddKind) => {
      const d = designRef.current;
      const n = d.layers.length;
      if (d.layers.length >= 60) {
        setNotice({
          tone: "bad",
          text: "That is the most layers a card can hold.",
        });
        return;
      }
      if (kind === "text") return addLayer(createLayerOfKind("text", n));
      if (kind === "seal") return addLayer(createLayerOfKind("seal", n));
      if (kind === "code") {
        if (d.layers.some((l) => l.kind === "code")) return;
        return addLayer(createLayerOfKind("code", n));
      }
      addLayer(createShapeLayer(kind, n, designRatio(d)));
    },
    [addLayer]
  );

  const deleteLayer = useCallback(
    (id: string) => {
      const target = designRef.current.layers.find((l) => l.id === id);
      if (!target || !canDelete(target)) return;
      commit((d) => ({ ...d, layers: d.layers.filter((l) => l.id !== id) }));
      setSelectedId((cur) => (cur === id ? null : cur));
    },
    [commit, canDelete]
  );

  const duplicate = useCallback(
    (id: string) => {
      const out = duplicateLayer(designRef.current, id);
      if (!out) return;
      commit(out.design);
      setSelectedId(out.id);
    },
    [commit]
  );

  const stack = useCallback(
    (id: string, move: StackMove) => commit((d) => moveLayerStack(d, id, move)),
    [commit]
  );
  const align = useCallback(
    (id: string, how: Alignment) => commit((d) => alignLayer(d, id, how)),
    [commit]
  );

  // ---------------------------------------------------------------- images

  const choose = (u: Upload) => {
    uploadRef.current = u;
    fileRef.current?.click();
  };

  async function onFile(file: File | undefined) {
    if (!file) return;
    const purpose = uploadRef.current;
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
      setNotice({
        tone: "bad",
        text: "Please choose a PNG, JPG or WebP picture.",
      });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setNotice({
        tone: "bad",
        text: "That picture is over 5 MB. Please use a smaller one.",
      });
      return;
    }
    setBusy(true);
    setNotice(null);
    const [ratio, result] = await Promise.all([
      readImageRatio(file),
      (async () => {
        const form = new FormData();
        form.set("file", file);
        return uploadInvitationImageAction(eventId, form);
      })(),
    ]);
    setBusy(false);
    if (!result.ok) {
      setNotice({ tone: "bad", text: result.error });
      return;
    }
    const url = result.url;
    const d = designRef.current;
    if (purpose.purpose === "card") {
      commit(applyImportedCard(d, url, ratio));
      setSelectedId(null);
      setNotice({
        tone: "ok",
        text: "Your card is in. Turn on any words you want on top.",
      });
    } else if (purpose.purpose === "background") {
      commit((cur) => ({
        ...cur,
        background: { ...cur.background, kind: "image", imageUrl: url },
      }));
    } else if (purpose.purpose === "replace") {
      const id = purpose.id;
      commit((cur) => ({
        ...cur,
        layers: cur.layers.map((l) =>
          l.id === id ? { ...l, imageUrl: url } : l
        ),
      }));
    } else {
      addLayer(
        createImageLayer(url, d.layers.length, {
          ratio: designRatio(d),
          imageRatio: ratio,
        })
      );
    }
  }

  function exportDesign() {
    const blob = new Blob([JSON.stringify(design, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ariya-invitation-${eventId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importDesignFile(file: File) {
    const imported = normaliseDesign(await file.text());
    if (!imported) {
      setNotice({
        tone: "bad",
        text: "That file is not an Àríyá invitation design.",
      });
      return;
    }
    commit(imported);
    setSelectedId(null);
    setNotice({ tone: "ok", text: "Opened the design file." });
  }

  // -------------------------------------------------------------- keyboard

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable)
      ) {
        return;
      }
      const mod = e.metaKey || e.ctrlKey;
      const d = designRef.current;
      const sel = d.layers.find((l) => l.id === selectedId) ?? null;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if (mod && e.key.toLowerCase() === "d" && sel) {
        e.preventDefault();
        duplicate(sel.id);
        return;
      }
      if (mod) return;
      if (e.key === "Escape") return setSelectedId(null);
      if (mode === "pro" && !e.altKey) {
        const k = e.key.toLowerCase();
        const map: Record<string, AddKind> = {
          t: "text",
          r: "rect",
          o: "ellipse",
          l: "line",
        };
        if (map[k]) {
          e.preventDefault();
          return add(map[k]);
        }
        if (k === "i") {
          e.preventDefault();
          return choose({ purpose: "layer" });
        }
      }
      if (!sel) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        return deleteLayer(sel.id);
      }
      if (!isEditable(sel)) return;
      const step = e.shiftKey ? 5 : 0.5;
      const move: Record<string, Partial<InvitationLayer>> = {
        ArrowLeft: { x: Math.max(0, sel.x - step) },
        ArrowRight: { x: Math.min(100 - sel.width, sel.x + step) },
        ArrowUp: { y: Math.max(0, sel.y - step) },
        ArrowDown: { y: Math.min(98, sel.y + step) },
      };
      if (move[e.key]) {
        e.preventDefault();
        patchLayer(sel.id, move[e.key]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, mode, undo, redo, add, deleteLayer, duplicate, patchLayer]);

  // --------------------------------------------------------------- display

  const selected = design.layers.find((l) => l.id === selectedId) ?? null;
  const pro = mode === "pro";
  const stepZoom = (dir: 1 | -1) =>
    setZoom((z) =>
      dir > 0
        ? (ZOOMS.find((v) => v > z + 0.001) ?? z)
        : ([...ZOOMS].reverse().find((v) => v < z - 0.001) ?? z)
    );

  const editText = (id: string) => {
    setSelectedId(id);
    setSheetTab("properties");
    window.setTimeout(() => {
      const el = document.getElementById(
        pro ? "designer-text-input" : `simple-${id}`
      );
      (el as HTMLInputElement | null)?.focus();
    }, 60);
  };

  const status =
    doc.saveState === "saving"
      ? "saving…"
      : doc.saveState === "saved"
        ? "saved"
        : doc.saveState === "error"
          ? "not saved"
          : "";

  return (
    <section
      aria-label="Invitation designer"
      data-testid="invitation-designer"
      className={cn(
        "relative h-dvh overflow-hidden text-night",
        dark && "dark studio-dark"
      )}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        aria-label="Choose a picture"
        tabIndex={-1}
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {/* The card's stage fills the screen; every panel floats over it. */}
      <div
        className={cn("fixed inset-0 z-0 bg-[#e9e3d7]", dark && "bg-[#140c10]")}
      >
        <div
          className={cn(
            "absolute inset-0 transition-[left,right,top,bottom] duration-300 motion-reduce:transition-none",
            pro
              ? "max-lg:bottom-[calc(44dvh+3.5rem)]"
              : "max-lg:bottom-[44dvh]",
            "max-lg:top-[124px] lg:top-[72px]",
            pro
              ? cn(
                  "lg:right-[21rem]",
                  layersOpen ? "lg:left-[21.5rem]" : "lg:left-[4.75rem]"
                )
              : "lg:right-[27rem]"
          )}
        >
          <DesignerCanvas
            design={design}
            coupleName={coupleName}
            selectedId={selectedId}
            zoom={zoom}
            showHandles={pro}
            onSelect={setSelectedId}
            onUpdate={dragLayer}
            onRecord={recordSnapshot}
            onEditText={editText}
          />
        </div>
      </div>

      {/* Back, the page's name, and where the card stands. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20">
        <div className="pointer-events-auto absolute left-3 top-3 max-w-[calc(100%-1.5rem)] lg:max-w-[calc(100%-31rem)]">
          <WorkspaceBar
            backHref={backHref}
            title="Invitation Designer"
            eventTitle={eventTitle}
            detail={status}
          />
        </div>

        {/* Undo, zoom, theme and the mode switch. */}
        <div className="pointer-events-auto absolute right-3 top-[68px] flex max-lg:left-3 max-lg:justify-center lg:top-3">
          <div
            className={cn(
              GLASS,
              "flex items-center gap-0.5 rounded-full p-1 max-lg:max-w-full max-lg:overflow-x-auto"
            )}
          >
            <PillButton label="Undo" onClick={undo} disabled={!doc.canUndo}>
              <Icon name="undo" size={18} />
            </PillButton>
            <PillButton label="Redo" onClick={redo} disabled={!doc.canRedo}>
              <Icon name="redo" size={18} />
            </PillButton>
            <div className="flex items-center gap-0.5 max-sm:hidden">
              <span aria-hidden="true" className="mx-1 h-6 w-px bg-hairline" />
              <PillButton
                label="Zoom out"
                disabled={zoom <= ZOOMS[0]}
                onClick={() => stepZoom(-1)}
              >
                <span className="text-lg leading-none">−</span>
              </PillButton>
              <button
                type="button"
                aria-label="Fit the card to the screen"
                onClick={() => setZoom(1)}
                className="min-h-11 min-w-12 rounded-full px-1 text-xs font-semibold tabular-nums text-night hover:bg-burgundy/10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-burgundy"
              >
                {Math.round(zoom * 100)}%
              </button>
              <PillButton
                label="Zoom in"
                disabled={zoom >= ZOOMS[ZOOMS.length - 1]}
                onClick={() => stepZoom(1)}
              >
                <span className="text-lg leading-none">+</span>
              </PillButton>
              <span aria-hidden="true" className="mx-1 h-6 w-px bg-hairline" />
              <PillButton
                label={
                  dark
                    ? "Switch to the light interface"
                    : "Switch to the dark interface"
                }
                pressed={dark}
                onClick={toggleDark}
              >
                <Icon name="swatch" size={18} />
              </PillButton>
              {pro && (
                <PillButton
                  label={
                    layersOpen
                      ? "Hide the layers panel"
                      : "Show the layers panel"
                  }
                  pressed={layersOpen}
                  onClick={() => {
                    setLayersOpen((v) => !v);
                    setSheetTab("layers");
                  }}
                >
                  <Icon name="layers" size={18} />
                </PillButton>
              )}
            </div>
            <span aria-hidden="true" className="mx-1 h-6 w-px bg-hairline" />
            <div className="w-36 shrink-0">
              <Segmented
                label="Mode"
                value={mode}
                options={[
                  { key: "simple", label: "Simple" },
                  { key: "pro", label: "Pro" },
                ]}
                onPick={setMode}
              />
            </div>
          </div>
        </div>

        {notice && (
          <div className="pointer-events-auto absolute inset-x-0 top-[124px] mx-auto flex w-fit max-w-[calc(100%-1.5rem)] items-center gap-2 lg:top-[68px]">
            <p
              role="status"
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold shadow-lg",
                notice.tone === "ok"
                  ? "bg-emerald-50 text-emerald-900"
                  : "bg-red-50 text-red-900"
              )}
            >
              {notice.text}
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => setNotice(null)}
                className="grid h-8 w-8 place-items-center rounded-full hover:bg-black/5"
              >
                <Icon name="close" size={14} />
              </button>
            </p>
          </div>
        )}
        {doc.saveState === "error" && (
          <p
            role="alert"
            className="pointer-events-auto absolute bottom-3 left-3 z-30 max-w-sm rounded-2xl bg-red-50 px-4 py-2.5 text-[13px] font-semibold text-red-900 shadow-lg max-lg:hidden"
          >
            {doc.saveError ?? "Your last change was not saved."}
          </p>
        )}
      </div>

      {pro ? (
        <>
          <div
            className={cn(
              "absolute z-20",
              "max-lg:bottom-[calc(44dvh+0.5rem)] max-lg:left-3 max-lg:right-3",
              "lg:left-3 lg:top-1/2 lg:-translate-y-1/2"
            )}
          >
            <ToolRail
              onAdd={add}
              onPickImage={() => choose({ purpose: "layer" })}
              onImportCard={() => choose({ purpose: "card" })}
              hasEntrySeal={design.layers.some((l) => l.kind === "code")}
              busy={busy}
            />
          </div>

          <aside
            aria-label="Layers"
            className={cn(
              GLASS,
              "absolute z-20 flex min-h-0 flex-col",
              "max-lg:inset-x-0 max-lg:bottom-0 max-lg:h-[44dvh] max-lg:rounded-b-none",
              "lg:bottom-3 lg:left-[4.75rem] lg:top-[68px] lg:w-64",
              sheetTab !== "layers" && "max-lg:hidden",
              !layersOpen && "lg:hidden"
            )}
          >
            <SheetTabs tab={sheetTab} onTab={setSheetTab} />
            <h2 className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-label-2 max-lg:hidden">
              Layers
            </h2>
            <LayersDock
              layers={design.layers}
              selectedId={selectedId}
              onSelect={(id) => {
                setSelectedId(id);
              }}
              onPatch={patchLayer}
              onStack={stack}
              onDuplicate={duplicate}
              onDelete={deleteLayer}
              canDelete={canDelete}
            />
          </aside>

          <aside
            aria-label="Properties"
            className={cn(
              GLASS,
              "absolute z-20 flex min-h-0 flex-col overflow-y-auto",
              "max-lg:inset-x-0 max-lg:bottom-0 max-lg:h-[44dvh] max-lg:rounded-b-none",
              "lg:bottom-3 lg:right-3 lg:top-[68px] lg:w-80",
              sheetTab !== "properties" && "max-lg:hidden"
            )}
          >
            <SheetTabs tab={sheetTab} onTab={setSheetTab} />
            <Inspector
              design={design}
              layer={selected}
              onPatch={patchLayer}
              onDesign={(fn) => commit(fn)}
              onAlign={align}
              onStack={stack}
              onDuplicate={duplicate}
              onDelete={deleteLayer}
              canDelete={canDelete}
              onPickImage={(id) => choose({ purpose: "replace", id })}
              onUploadBackground={() => choose({ purpose: "background" })}
              onExport={exportDesign}
              onImportFile={(f) => void importDesignFile(f)}
            />
          </aside>
        </>
      ) : (
        <aside
          aria-label="Invitation questions"
          className={cn(
            GLASS,
            "absolute z-20 flex min-h-0 flex-col overflow-y-auto",
            "max-lg:inset-x-0 max-lg:bottom-0 max-lg:h-[44dvh] max-lg:rounded-b-none",
            "lg:bottom-3 lg:right-3 lg:top-[68px] lg:w-96"
          )}
        >
          <SimplePanel
            design={design}
            content={content}
            busy={busy}
            onPatch={patchLayer}
            onDesign={(fn) => commit(fn)}
            onReplaceDesign={(d) => {
              commit(d);
              setSelectedId(null);
            }}
            onImportCard={() => choose({ purpose: "card" })}
            onRemoveCard={() => commit((d) => removeImportedCard(d))}
            onAddPhoto={() => choose({ purpose: "layer" })}
            onAddText={() => add("text")}
            onDeleteLayer={deleteLayer}
            passRequired={requireAccessCard}
            settingsHref={settingsHref}
          />
        </aside>
      )}
    </section>
  );
}
