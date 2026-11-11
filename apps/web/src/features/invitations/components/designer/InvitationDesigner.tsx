"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./InvitationDesigner.module.css";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { Segmented } from "@/features/seating/hall/studio-ui";
import { uploadInvitationImageAction } from "../../actions";
import { optimizeImageForUpload } from "../../image-compressor";
import { IMPORT_ACCEPT, toRasterPicture } from "../../import-formats";
import {
  normaliseDesign,
  constrainEntrySeals,
  createLayerOfKind,
  createInvitationDesign,
  staleEventFacts,
  applyEventFacts,
} from "../../design";
import {
  addImage,
  addLayerOfKind,
  addShape,
  align as alignViaEngine,
  alignSelection as alignSelectionViaEngine,
  distributeLayers as distributeLayersViaEngine,
  groupLayers as groupLayersViaEngine,
  ungroupLayers as ungroupLayersViaEngine,
  duplicate as duplicateViaEngine,
  importCard,
  removeCard,
  resizeCanvasPxFast,
  stack as stackViaEngine,
  startDesignEngine,
  withEntrySeal,
} from "../../engine";
import {
  designDimensionsPx,
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
import { ContextualOptionsBar, type StudioTool } from "./ContextualOptionsBar";
import { StudioMenuBar, type MenuGroup } from "./StudioMenuBar";
import { StudioBottomDock } from "./StudioBottomDock";
import { useDesignerDoc } from "./useDesignerDoc";
import { ExportModal } from "./ExportModal";
import { HelpDialog } from "./HelpDialog";
import { CommandPalette } from "./CommandPalette";
import { QuickTour } from "./QuickTour";
import { ColorSwatchesPanel } from "./ColorSwatchesPanel";
import { HistoryPanel } from "./HistoryPanel";
import { NavigatorPanel } from "./NavigatorPanel";

type Mode = "simple" | "pro";
type Upload =
  | { purpose: "layer" }
  | { purpose: "replace"; id: string }
  | { purpose: "background" }
  | { purpose: "card" };

const COALESCE_MS = 900;
const ZOOMS = [0.05, 0.1, 0.125, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];

/**
 * Text and some other layers have no stored height: the browser lays them out. Vertical alignment
 * and distribution must use how tall they actually are, so measure the rendered boxes, run the
 * operation, then remove the heights again so those layers stay automatically sized.
 */
function withRenderedHeights(
  design: InvitationDesign,
  operate: (measured: InvitationDesign) => InvitationDesign
): InvitationDesign {
  const canvas = document.querySelector<HTMLElement>(
    "[data-invitation-canvas]"
  );
  const total = canvas?.offsetHeight ?? 0;
  const autoSized = new Set<string>();
  const measured: InvitationDesign = {
    ...design,
    layers: design.layers.map((layer) => {
      if (layer.height != null || !canvas || total <= 0) return layer;
      const element = canvas.querySelector<HTMLElement>(
        `[data-layer-id="${CSS.escape(layer.id)}"]`
      );
      if (!element) return layer;
      autoSized.add(layer.id);
      return {
        ...layer,
        height: Math.round((element.offsetHeight / total) * 10000) / 100,
      };
    }),
  };
  const result = operate(measured);
  return {
    ...result,
    layers: result.layers.map((layer) => {
      if (!autoSized.has(layer.id)) return layer;
      const { height, ...rest } = layer;
      void height;
      return rest;
    }),
  };
}

/** Cancel/undo also restores pass geometry adjusted by the temporary paper dimensions. */
function beforeCanvasResize(
  current: InvitationDesign,
  before: InvitationDesign
): InvitationDesign {
  const passes = new Map(
    before.layers
      .filter((layer) => layer.kind === "code")
      .map((layer) => [layer.id, layer])
  );
  return constrainEntrySeals({
    ...current,
    canvas: before.canvas,
    layers: current.layers.map((layer) => {
      const previous = passes.get(layer.id);
      return layer.kind === "code" && previous
        ? { ...layer, x: previous.x, y: previous.y, width: previous.width }
        : layer;
    }),
  });
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
  initialRevision,
  coupleName,
  backHref,
  requireAccessCard,
  settingsHref,
}: {
  eventId: string;
  eventTitle: string;
  content: InvitationEventContent;
  initialDesign: InvitationDesign;
  initialRevision?: string;
  coupleName: string;
  backHref: string;
  /** The host has switched the access pass on, so every accepted guest's card carries a seal. */
  requireAccessCard: boolean;
  /** Where the access pass is switched on and off. */
  settingsHref: string;
}) {
  const doc = useDesignerDoc(eventId, initialDesign, initialRevision);
  const {
    design,
    commit,
    recordSnapshot,
    undo: rawUndo,
    redo: rawRedo,
    past,
    future,
    restoreState,
  } = doc;

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedId = selectedIds[selectedIds.length - 1] ?? null;

  const setSelectedId = useCallback((id: string | null) => {
    setSelectedIds(id ? [id] : []);
  }, []);

  const toggleSelectedId = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }, []);

  const [mode, setModeRaw] = useState<Mode>("simple");
  const [dark, setDark] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [topTab, setTopTab] = useState<"properties" | "swatches">("properties");
  const [bottomTab, setBottomTab] = useState<
    "layers" | "history" | "navigator"
  >("layers");
  const [activeShapeKind, setActiveShapeKind] = useState<
    "rect" | "ellipse" | "arch" | "line" | "star"
  >("rect");
  const [sheetTab, setSheetTabRaw] = useState<
    "layers" | "properties" | "swatches" | "history" | "navigator"
  >("layers");

  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [fitRequest, setFitRequest] = useState(0);
  const [viewport, setViewport] = useState({ x: 0, y: 0, width: 1, height: 1 });
  const [navigationTarget, setNavigationTarget] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const fitView = useCallback(() => setFitRequest((n) => n + 1), []);

  const setSheetTab = (
    tab: "layers" | "properties" | "swatches" | "history" | "navigator"
  ) => {
    setSheetTabRaw(tab);
    setMobilePanelOpen(true);
    if (tab === "properties" || tab === "swatches") setTopTab(tab);
    else setBottomTab(tab);
  };
  const [activeTool, setActiveTool] = useState<StudioTool>("select");
  const cropSession = useRef<{
    design: InvitationDesign;
    changed: boolean;
  } | null>(null);
  const [activeColor, setActiveColor] = useState("#dfba73");
  const [sidebarWidth, setSidebarWidth] = useState(360);
  // How much of the side panel the Properties half takes; the rest is Layers/History/Navigator.
  const [panelSplit, setPanelSplit] = useState(60);
  const startPanelSplit = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const column = e.currentTarget.parentElement;
    if (!column) return;
    e.preventDefault();
    const box = column.getBoundingClientRect();
    const move = (ev: PointerEvent) =>
      setPanelSplit(
        Math.min(75, Math.max(25, ((ev.clientY - box.top) / box.height) * 100))
      );
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      window.removeEventListener("blur", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    window.addEventListener("blur", stop);
  }, []);

  const [fontsLoaded, setFontsLoaded] = useState(false);
  const isResizingSidebar = useRef(false);
  const sidebarCleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => sidebarCleanup.current?.(), []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleWindowResize = () => {
        if (window.innerWidth < 1200) {
          setSidebarWidth((w) => Math.min(w, 290));
        }
      };
      handleWindowResize();
      window.addEventListener("resize", handleWindowResize);
      return () => window.removeEventListener("resize", handleWindowResize);
    }
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined" && "fonts" in document) {
      document.fonts.ready
        .then(() => setFontsLoaded(true))
        .catch(() => setFontsLoaded(true));
    } else {
      setFontsLoaded(true);
    }
  }, []);

  const handleResizeCanvasPx = useCallback(
    (widthPx: number, heightPx: number) => {
      if (cropSession.current) cropSession.current.changed = true;
      commit(
        (d) => resizeCanvasPxFast(d, widthPx, heightPx),
        !cropSession.current
      );
    },
    [commit]
  );

  const addLayerWithGeometry = useCallback(
    (
      kind: "text" | "rect" | "ellipse" | "arch" | "line" | "star",
      geom: { x: number; y: number; width: number; height?: number }
    ) => {
      if (kind === "text") {
        const textLayer = createLayerOfKind("text", design.layers.length);
        textLayer.x = geom.x;
        textLayer.y = geom.y;
        textLayer.width = Math.max(15, geom.width);
        if (geom.height) textLayer.height = geom.height;
        textLayer.text = "Your words";
        commit(
          (d) => ({
            ...d,
            layers: [...d.layers, textLayer],
          }),
          true
        );
        setSelectedId(textLayer.id);
        setSelectedIds([textLayer.id]);
        setTopTab("properties");
      } else {
        const shapeResult = addShape(design, kind);
        if (shapeResult) {
          const newLayers = shapeResult.design.layers.map((l) =>
            l.id === shapeResult.id
              ? {
                  ...l,
                  x: geom.x,
                  y: geom.y,
                  width: Math.max(8, geom.width),
                  height: geom.height ? Math.max(5, geom.height) : l.height,
                }
              : l
          );
          commit(
            (d) => ({
              ...d,
              layers: newLayers,
            }),
            true
          );
          setSelectedId(shapeResult.id);
          setSelectedIds([shapeResult.id]);
          setTopTab("properties");
        }
      }
      setActiveTool("select");
    },
    [commit, design, setSelectedId, setSelectedIds]
  );

  const addLayerAt = useCallback(
    (kind: "text" | "rect" | "line", x: number, y: number) => {
      addLayerWithGeometry(kind, { x, y, width: kind === "text" ? 50 : 60 });
    },
    [addLayerWithGeometry]
  );

  const startSidebarResize = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    sidebarCleanup.current?.();
    isResizingSidebar.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onPointerMove = (ev: PointerEvent) => {
      if (!isResizingSidebar.current) return;
      const maxW = Math.max(260, Math.min(600, window.innerWidth - 400));
      const newWidth = Math.min(
        maxW,
        Math.max(260, window.innerWidth - ev.clientX)
      );
      setSidebarWidth(newWidth);
    };

    const onPointerUp = () => {
      isResizingSidebar.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("blur", onPointerUp);
    };

    sidebarCleanup.current = onPointerUp;
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("blur", onPointerUp);
  }, []);

  // Rulers start on in Pro and off in Simple; once the host picks, their choice stands.
  const [rulersChoice, setRulersChoice] = useState<boolean | null>(null);
  const proRef = useRef(false);
  proRef.current = mode === "pro";
  const showRulers = rulersChoice ?? mode === "pro";
  const [showGrid, setShowGrid] = useState(false);
  const [showPrintGuides, setShowPrintGuides] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [guidesLocked, setGuidesLocked] = useState(false);
  const [clearGuidesRequest, setClearGuidesRequest] = useState(0);
  const [busy, setBusy] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [online, setOnline] = useState(true);
  const [notice, setNotice] = useState<{
    tone: "ok" | "bad";
    text: string;
    action?: { label: string; ariaLabel?: string; onClick: () => void };
  } | null>(null);
  // Live position and size while a layer is dragged or resized (L3). Cleared a moment after the
  // last move so it never lingers over the card.
  const [readout, setReadout] = useState<string | null>(null);
  const readoutTimer = useRef<number | null>(null);
  const undo = useCallback(() => {
    if (!doc.canUndo) return;
    rawUndo();
    setNotice({
      tone: "ok",
      text: "Undone",
      action: {
        label: "Redo",
        ariaLabel: "Redo this change",
        onClick: () => redoRef.current(),
      },
    });
  }, [doc.canUndo, rawUndo]);
  const redo = useCallback(() => {
    if (!doc.canRedo) return;
    rawRedo();
    setNotice({
      tone: "ok",
      text: "Redone",
      action: {
        label: "Undo",
        ariaLabel: "Undo this change",
        onClick: () => undoRef.current(),
      },
    });
  }, [doc.canRedo, rawRedo]);
  const undoRef = useRef(undo);
  undoRef.current = undo;
  const redoRef = useRef(redo);
  redoRef.current = redo;
  useEffect(() => {
    if (!notice || notice.tone !== "ok") return;
    const t = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(t);
  }, [notice]);
  // Lines of a saved card that no longer match the event, judged once when the designer opens so
  // the host's own edits during this visit are never second-guessed. The card keeps the host's
  // words until they choose to update it; "Keep my wording" hides the offer for these exact changes.
  const [staleFacts, setStaleFacts] = useState(() =>
    staleEventFacts(initialDesign, content)
  );
  const factsKey = `ariya-keep-card:${eventId}:${staleFacts
    .map((f) => `${f.id}=${f.fresh}`)
    .join("|")}`;
  const [keptKey, setKeptKey] = useState<string | null>(null);
  useEffect(() => {
    try {
      setKeptKey(localStorage.getItem(factsKey) ? factsKey : null);
    } catch {
      setKeptKey(null);
    }
  }, [factsKey]);
  const offerFacts = staleFacts.length > 0 && keptKey !== factsKey;

  const fileRef = useRef<HTMLInputElement>(null);
  const backupRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<Upload>({ purpose: "layer" });
  const clipboardRef = useRef<InvitationLayer[]>([]);
  const lastEdit = useRef({ key: "", at: 0 });
  const designRef = useRef(design);
  designRef.current = design;
  const applyCanvasResize = useCallback(() => {
    const session = cropSession.current;
    cropSession.current = null;
    if (session?.changed)
      recordSnapshot(beforeCanvasResize(designRef.current, session.design));
    setActiveTool("select");
  }, [recordSnapshot]);
  const cancelCanvasResize = useCallback(() => {
    const session = cropSession.current;
    cropSession.current = null;
    if (session?.changed)
      commit((d) => beforeCanvasResize(d, session.design), false);
    setActiveTool("select");
  }, [commit]);
  useEffect(() => {
    if (activeTool === "crop" && !cropSession.current)
      cropSession.current = { design: designRef.current, changed: false };
    if (activeTool !== "crop" && cropSession.current) {
      const session = cropSession.current;
      cropSession.current = null;
      if (session.changed)
        recordSnapshot(beforeCanvasResize(designRef.current, session.design));
    }
  }, [activeTool, recordSnapshot]);

  // The Rust design engine loads in the background. Until it is ready, the TypeScript twin of
  // every operation answers, so nothing waits on it.
  useEffect(() => {
    void startDesignEngine();
  }, []);

  // A pass that is on belongs on the card. Show the host the seal, in its house place, so they can
  // move it; guests get one even if this never runs.
  useEffect(() => {
    if (!requireAccessCard) return;
    if (designRef.current.layers.some((l) => l.kind === "code")) return;
    commit((d) => withEntrySeal(d), false);
  }, [requireAccessCard, commit]);

  const canDelete = useCallback(
    (l: InvitationLayer) =>
      !l.locked && !(requireAccessCard && l.kind === "code"),
    [requireAccessCard]
  );

  // Preferences live on this device only.
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search).get("mode");
      if (p === "pro" || p === "simple") {
        setModeRaw(p);
      } else if (localStorage.getItem("ariya:invite-mode") === "pro") {
        setModeRaw("pro");
      }
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
      const target = designRef.current.layers.find((l) => l.id === id);
      if (
        requireAccessCard &&
        target?.kind === "code" &&
        patch.visible === false
      )
        return;
      if (target?.locked) {
        const safeOnly = Object.keys(patch).every(
          (k) => k === "locked" || k === "visible" || k === "name"
        );
        if (!safeOnly) return;
      }
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
    [commit, requireAccessCard]
  );

  const dragLayer = useCallback(
    (
      id: string,
      patch: Partial<InvitationLayer>,
      options?: { commit?: boolean }
    ) => {
      const target = designRef.current.layers.find((l) => l.id === id);
      if (target?.locked) return;
      if (target && !options?.commit) {
        const dims = designDimensionsPx(designRef.current);
        const next = { ...target, ...patch };
        const parts = [
          `X ${Math.round((next.x / 100) * dims.width)}`,
          `Y ${Math.round((next.y / 100) * dims.height)}`,
          `W ${Math.round((next.width / 100) * dims.width)}`,
        ];
        if (next.height != null)
          parts.push(`H ${Math.round((next.height / 100) * dims.height)}`);
        setReadout(`${parts.join(" · ")} px`);
        if (readoutTimer.current) window.clearTimeout(readoutTimer.current);
        readoutTimer.current = window.setTimeout(() => setReadout(null), 900);
      }
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

  const dragBatch = useCallback(
    (
      patches: Record<string, Partial<InvitationLayer>>,
      options?: { commit?: boolean }
    ) => {
      commit(
        (d) => ({
          ...d,
          layers: d.layers.map((l) =>
            patches[l.id] && !l.locked ? { ...l, ...patches[l.id] } : l
          ),
        }),
        options?.commit ?? false
      );
    },
    [commit]
  );

  const add = useCallback(
    (kind: AddKind) => {
      const d = designRef.current;
      if (kind === "code" && d.layers.some((l) => l.kind === "code")) return;
      const isShape =
        kind === "rect" ||
        kind === "ellipse" ||
        kind === "line" ||
        kind === "arch" ||
        kind === "star" ||
        kind === "diamond" ||
        kind === "crest" ||
        kind === "triangle";
      const out = isShape ? addShape(d, kind) : addLayerOfKind(d, kind);
      if (!out) {
        setNotice({
          tone: "bad",
          text: "That is the most layers a card can hold.",
        });
        return;
      }
      commit(out.design);
      setSelectedId(out.id);
      setSheetTab("properties");
    },
    [commit]
  );

  const deleteLayer = useCallback(
    (id: string) => {
      const target = designRef.current.layers.find((l) => l.id === id);
      if (!target || !canDelete(target)) return;
      commit((d) => ({ ...d, layers: d.layers.filter((l) => l.id !== id) }));
      setSelectedIds((cur) => cur.filter((i) => i !== id));
    },
    [commit, canDelete]
  );

  const duplicate = useCallback(
    (id: string) => {
      const out = duplicateViaEngine(designRef.current, id);
      if (!out) return;
      commit(out.design);
      setSelectedId(out.id);
    },
    [commit]
  );

  const stack = useCallback(
    (id: string, move: StackMove) => {
      if (
        designRef.current.layers.find((layer) => layer.id === id)?.kind ===
        "code"
      ) {
        setNotice({
          tone: "ok",
          text: "The entry seal stays in front so it can be scanned. You can still move or resize it.",
        });
        return;
      }
      commit((d) => stackViaEngine(d, id, move));
    },
    [commit]
  );
  const align = useCallback(
    (id: string, how: Alignment) =>
      commit((d) => withRenderedHeights(d, (m) => alignViaEngine(m, id, how))),
    [commit]
  );

  // ---------------------------------------------------------------- images

  const choose = (u: Upload) => {
    uploadRef.current = u;
    fileRef.current?.click();
  };

  const dropImageFile = (file: File) => {
    uploadRef.current = { purpose: "layer" };
    void onFile(file);
  };

  async function onFile(file: File | undefined) {
    if (!file) return;
    const purpose = uploadRef.current;
    if (
      (purpose.purpose === "layer" || purpose.purpose === "card") &&
      designRef.current.layers.length >= 60 &&
      !(
        purpose.purpose === "card" &&
        designRef.current.layers.some((l) => l.name === "Your card")
      )
    ) {
      setNotice({
        tone: "bad",
        text: "An invitation can contain up to 60 layers. Remove one before importing another picture.",
      });
      return;
    }
    setBusy(true);
    setNotice(null);
    let optimized;
    let importNote: string | undefined;
    try {
      const raster = await toRasterPicture(file);
      importNote = raster.note;
      optimized = await optimizeImageForUpload(raster.file);
    } catch (err: unknown) {
      setBusy(false);
      setNotice({
        tone: "bad",
        text: err instanceof Error ? err.message : "Failed to process image.",
      });
      return;
    }

    const form = new FormData();
    form.set("file", optimized.file);
    let result: { ok: boolean; url?: string; error?: string } = { ok: false };
    try {
      const res = await fetch(`/api/events/${eventId}/invitations/upload`, {
        method: "POST",
        body: form,
      });
      if (res.ok) {
        result = await res.json();
      } else {
        const errJson = await res.json().catch(() => ({}));
        result = {
          ok: false,
          error: errJson.error || `Upload failed with HTTP ${res.status}`,
        };
      }
    } catch {
      result = await uploadInvitationImageAction(eventId, form);
    }
    setBusy(false);
    if (!result.ok || !result.url) {
      setNotice({
        tone: "bad",
        text: result.error || "Failed to upload image.",
        action: {
          label: "Try again",
          onClick: () => {
            uploadRef.current = purpose;
            void onFile(file);
          },
        },
      });
      return;
    }
    const url = result.url;
    const ratio = optimized.ratio;
    const d = designRef.current;
    if (purpose.purpose === "card") {
      commit(importCard(d, url, ratio));
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
      const out = addImage(d, url, ratio);
      if (!out) {
        setNotice({
          tone: "bad",
          text: "That is the most layers a card can hold.",
        });
        return;
      }
      commit(out.design);
      setSelectedId(out.id);
      setSheetTab("properties");
    }
    if (importNote) setNotice({ tone: "ok", text: importNote });
  }

  function exportDesign() {
    setExportOpen(true);
  }

  async function importDesignFile(file: File) {
    if (file.size > 2 * 1024 * 1024) {
      setNotice({
        tone: "bad",
        text: "Design backups must be smaller than 2 MB.",
      });
      return;
    }
    try {
      const imported = normaliseDesign(await file.text());
      if (!imported) {
        setNotice({
          tone: "bad",
          text: "That file is not an Àríyá invitation design.",
        });
        return;
      }
      if (
        requireAccessCard &&
        !imported.layers.some((layer) => layer.kind === "code") &&
        imported.layers.length >= 60
      ) {
        setNotice({
          tone: "bad",
          text: "Leave one layer free for this event's required entry seal before importing a 60-layer design.",
        });
        return;
      }
      commit(requireAccessCard ? withEntrySeal(imported) : imported);
      setSelectedId(null);
      setNotice({ tone: "ok", text: "Opened the design file." });
    } catch {
      setNotice({
        tone: "bad",
        text: "That file could not be read. Your current design has been kept.",
      });
    }
  }

  const sampleColor = useCallback(async () => {
    setActiveTool("eyedropper");
    if (!("EyeDropper" in window)) {
      setActiveTool("select");
      setSheetTab("swatches");
      setNotice({
        tone: "ok",
        text: "Your browser does not support screen sampling. Choose a colour from the colour panel instead.",
      });
      return;
    }
    try {
      const EyeDropper = (
        window as unknown as {
          EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> };
        }
      ).EyeDropper;
      const result = await new EyeDropper().open();
      setActiveColor(result.sRGBHex);
      if (selectedId)
        patchLayer(selectedId, {
          fill: result.sRGBHex,
          color: result.sRGBHex,
          colorRole: "custom",
        });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setSheetTab("swatches");
        setNotice({
          tone: "bad",
          text: "Screen sampling could not start. Choose a colour from the colour panel instead.",
        });
      }
    } finally {
      setActiveTool("select");
    }
  }, [selectedId, patchLayer]);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

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
      if (
        e.defaultPrevented ||
        document.querySelector(
          '[role="dialog"]:not([hidden]), [role="menu"]:not([hidden])'
        )
      )
        return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (!mod && e.key === "?") {
        e.preventDefault();
        setHelpOpen(true);
        return;
      }
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
      if (mod && e.key.toLowerCase() === "c" && selectedIds.length) {
        e.preventDefault();
        const selLayers = designRef.current.layers.filter((l) =>
          selectedIds.includes(l.id)
        );
        clipboardRef.current = selLayers;
        setNotice({
          tone: "ok",
          text: `Copied ${selLayers.length === 1 ? `"${selLayers[0].name || selLayers[0].kind}"` : `${selLayers.length} layers`}`,
        });
        return;
      }
      if (mod && e.key.toLowerCase() === "v" && clipboardRef.current.length) {
        e.preventDefault();
        let hasCode = designRef.current.layers.some((l) => l.kind === "code");
        const groups = new Map<string, string>();
        const copies = clipboardRef.current
          .filter((src) => {
            if (src.kind === "code") {
              if (hasCode) return false;
              hasCode = true;
            }
            return true;
          })
          .map((src) => {
            const freshId = "layer_" + crypto.randomUUID();
            if (src.groupId && !groups.has(src.groupId))
              groups.set(src.groupId, "group_" + crypto.randomUUID());
            return {
              ...src,
              id: freshId,
              groupId: src.groupId ? groups.get(src.groupId) : undefined,
              locked: undefined,
              name: `${src.name || src.kind} copy`,
              x: Math.min(92, src.x + 2),
              y: Math.min(92, src.y + 2),
            };
          });
        if (designRef.current.layers.length + copies.length > 60) {
          setNotice({
            tone: "bad",
            text: "An invitation can contain up to 60 layers. Remove a layer before pasting.",
          });
          return;
        }
        if (!copies.length) {
          setNotice({
            tone: "bad",
            text: "Each card carries at most one guest entry pass seal.",
          });
          return;
        }
        commit((cur) => ({
          ...cur,
          layers: [...cur.layers, ...copies],
        }));
        setSelectedIds(copies.map((c) => c.id));
        setNotice({ tone: "ok", text: `Pasted ${copies.length} layer(s)` });
        return;
      }
      if (
        mod &&
        !e.shiftKey &&
        e.key.toLowerCase() === "g" &&
        selectedIds.length >= 2
      ) {
        e.preventDefault();
        const groupId = "group_" + Math.random().toString(36).slice(2, 9);
        commit((cur) => groupLayersViaEngine(cur, selectedIds, groupId));
        setNotice({ tone: "ok", text: `Grouped ${selectedIds.length} layers` });
        return;
      }
      if (
        mod &&
        e.shiftKey &&
        e.key.toLowerCase() === "g" &&
        selectedIds.length
      ) {
        e.preventDefault();
        commit((cur) => ungroupLayersViaEngine(cur, selectedIds));
        setNotice({ tone: "ok", text: "Ungrouped layers" });
        return;
      }
      if (mod && e.key.toLowerCase() === "e") {
        e.preventDefault();
        setExportOpen(true);
        return;
      }
      if (mod && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setSelectedIds(designRef.current.layers.map((l) => l.id));
        return;
      }
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setSelectedIds([]);
        return;
      }
      if (mod && e.key.toLowerCase() === "j" && selectedIds.length) {
        e.preventDefault();
        let next = designRef.current;
        const newIds: string[] = [];
        for (const sid of selectedIds) {
          const out = duplicateViaEngine(next, sid);
          if (out) {
            next = out.design;
            newIds.push(out.id);
          }
        }
        commit(next);
        if (newIds.length) setSelectedIds(newIds);
        return;
      }
      if (mod && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        stepZoom(1);
        return;
      }
      if (mod && (e.key === "-" || e.key === "_")) {
        e.preventDefault();
        stepZoom(-1);
        return;
      }
      if (mod && e.key === "1") {
        e.preventDefault();
        setZoom(1);
        return;
      }
      if (mod && e.key === "0") {
        e.preventDefault();
        fitView();
        return;
      }
      if (mod && e.key.toLowerCase() === "u") {
        e.preventDefault();
        choose({ purpose: "layer" });
        return;
      }
      if (mod && e.key.toLowerCase() === "r") {
        e.preventDefault();
        setRulersChoice((c) => !(c ?? proRef.current));
        return;
      }
      if (mod && e.shiftKey && (e.key === "'" || e.key === '"')) {
        e.preventDefault();
        setSnapToGrid((s) => !s);
        return;
      }
      if (mod && e.key === "'") {
        e.preventDefault();
        setShowGrid((g) => !g);
        return;
      }
      if (mod && (e.key === "[" || e.key === "]") && selectedId) {
        e.preventDefault();
        stack(selectedId, e.key === "]" ? "front" : "back");
        return;
      }
      if (mod) return;
      if (activeTool === "crop" && e.key === "Escape") {
        e.preventDefault();
        cancelCanvasResize();
        return;
      }
      if (activeTool === "crop" && e.key === "Enter") {
        e.preventDefault();
        applyCanvasResize();
        return;
      }
      if (e.key === "Escape") return setSelectedIds([]);
      if (mode === "pro" && !e.altKey) {
        const k = e.key.toLowerCase();
        if (k === "v") {
          e.preventDefault();
          setActiveTool("select");
          return;
        }
        if (k === "m") {
          e.preventDefault();
          choose({ purpose: "card" });
          return;
        }
        if (k === "c") {
          e.preventDefault();
          setActiveTool("crop");
          return;
        }
        if (k === "t") {
          e.preventDefault();
          setActiveTool("text");
          return;
        }
        if (k === "u") {
          e.preventDefault();
          setActiveTool("shape");
          return;
        }
        if (k === "r" || k === "o" || k === "l" || k === "a" || k === "s") {
          e.preventDefault();
          const map: Record<
            string,
            "rect" | "ellipse" | "line" | "arch" | "star"
          > = {
            r: "rect",
            o: "ellipse",
            l: "line",
            a: "arch",
            s: "star",
          };
          setActiveShapeKind(map[k]);
          setActiveTool("shape");
          return;
        }
        if (k === "g") {
          e.preventDefault();
          setActiveTool("gradient");
          return;
        }
        if (k === "h") {
          e.preventDefault();
          setActiveTool((cur) => (cur === "hand" ? "select" : "hand"));
          return;
        }
        if (k === "z") {
          e.preventDefault();
          setActiveTool("zoom");
          return;
        }
        if (k === "i") {
          e.preventDefault();
          if (e.shiftKey) {
            return choose({ purpose: "layer" });
          }
          void sampleColor();
          return;
        }
      }
      if (!selectedIds.length) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        commit((cur) => ({
          ...cur,
          layers: cur.layers.filter(
            (l) => !selectedIds.includes(l.id) || !canDelete(l)
          ),
        }));
        setSelectedIds([]);
        return;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    selectedId,
    selectedIds,
    activeTool,
    applyCanvasResize,
    cancelCanvasResize,
    mode,
    undo,
    redo,
    add,
    deleteLayer,
    duplicate,
    patchLayer,
    sampleColor,
    setActiveTool,
    commit,
    canDelete,
    fitView,
  ]);

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

  const status = busy
    ? "Uploading picture…"
    : !online
      ? "offline · will save when you reconnect"
      : doc.isDirty
        ? doc.saveState === "error"
          ? "not saved"
          : "saving…"
        : initialRevision || doc.saveState === "saved"
          ? "saved"
          : "";

  const menuGroups: MenuGroup[] = [
    {
      title: "File",
      items: [
        {
          label: "Export Invitation…",
          shortcut: "Cmd+E",
          icon: <Icon name="download" size={14} />,
          onClick: () => setExportOpen(true),
        },
        "separator",
        {
          label: "Upload Image…",
          shortcut: "Cmd+U",
          icon: <Icon name="image" size={14} />,
          onClick: () => choose({ purpose: "layer" }),
        },
        {
          label: "Open Design Backup…",
          icon: <Icon name="upload" size={14} />,
          onClick: () => backupRef.current?.click(),
        },
        {
          label: "Import Card Design…",
          icon: <Icon name="upload" size={14} />,
          onClick: () => choose({ purpose: "card" }),
        },
        {
          label: "Upload Background…",
          icon: <Icon name="image" size={14} />,
          onClick: () => choose({ purpose: "background" }),
        },
        "separator",
        {
          label: "Reset to Template",
          danger: true,
          onClick: () => {
            if (
              window.confirm(
                "Restore the event’s invitation template? You can undo this change."
              )
            ) {
              commit(
                () =>
                  requireAccessCard
                    ? withEntrySeal(createInvitationDesign(content))
                    : createInvitationDesign(content),
                true
              );
              setSelectedId(null);
            }
          },
        },
      ],
    },
    {
      title: "Edit",
      items: [
        {
          label: "Undo",
          shortcut: "Cmd+Z",
          disabled: !doc.canUndo,
          icon: <Icon name="undo" size={14} />,
          onClick: undo,
        },
        {
          label: "Redo",
          shortcut: "Cmd+Shift+Z",
          disabled: !doc.canRedo,
          icon: <Icon name="redo" size={14} />,
          onClick: redo,
        },
        "separator",
        {
          label: "Duplicate Layer",
          shortcut: "Cmd+J",
          disabled: !selectedId || selected?.kind === "code",
          onClick: () => {
            if (selectedId) duplicate(selectedId);
          },
        },
        {
          label: "Delete Layer",
          shortcut: "Delete",
          disabled: !selectedId || !selected || !canDelete(selected),
          danger: true,
          icon: <Icon name="delete" size={14} />,
          onClick: () => {
            if (selectedId) deleteLayer(selectedId);
          },
        },
        "separator",
        {
          label: "Group Selection",
          shortcut: "Cmd+G",
          disabled: selectedIds.length < 2,
          onClick: () => {
            const gid = "group_" + Math.random().toString(36).slice(2, 9);
            commit((d) => groupLayersViaEngine(d, selectedIds, gid));
            setNotice({
              tone: "ok",
              text: `Grouped ${selectedIds.length} layers`,
            });
          },
        },
        {
          label: "Ungroup Selection",
          shortcut: "Cmd+Shift+G",
          disabled: selectedIds.length === 0,
          onClick: () => {
            commit((d) => ungroupLayersViaEngine(d, selectedIds));
            setNotice({ tone: "ok", text: "Ungrouped layers" });
          },
        },
      ],
    },
    {
      title: "Insert",
      items: [
        {
          label: "Add Text Layer",
          shortcut: "T",
          onClick: () => add("text"),
        },
        "separator",
        {
          label: "Rectangle",
          shortcut: "R",
          onClick: () => add("rect"),
        },
        {
          label: "Circle / Oval",
          shortcut: "O",
          onClick: () => add("ellipse"),
        },
        {
          label: "Line / Divider",
          shortcut: "L",
          onClick: () => add("line"),
        },
        {
          label: "Cathedral Arch",
          shortcut: "A",
          onClick: () => add("arch"),
        },
        {
          label: "Star / Sparkle",
          shortcut: "S",
          onClick: () => add("star"),
        },
        {
          label: "Diamond",
          onClick: () => add("diamond"),
        },
        "separator",
        {
          label: "Wax Seal / Stamp",
          icon: <Icon name="celebration" size={14} />,
          onClick: () => add("seal"),
        },
      ],
    },
    {
      title: "Arrange",
      items: [
        {
          label: "Bring to Front",
          shortcut: "Cmd+]",
          disabled: !selectedId || selected?.kind === "code",
          onClick: () => selectedId && stack(selectedId, "front"),
        },
        {
          label: "Bring Forward",
          disabled: !selectedId || selected?.kind === "code",
          onClick: () => selectedId && stack(selectedId, "up"),
        },
        {
          label: "Send Backward",
          disabled: !selectedId || selected?.kind === "code",
          onClick: () => selectedId && stack(selectedId, "down"),
        },
        {
          label: "Send to Back",
          shortcut: "Cmd+[",
          disabled: !selectedId || selected?.kind === "code",
          onClick: () => selectedId && stack(selectedId, "back"),
        },
        "separator",
        {
          label: "Align Left",
          disabled: !selectedId,
          onClick: () => selectedId && align(selectedId, "left"),
        },
        {
          label: "Align Center",
          disabled: !selectedId,
          onClick: () => selectedId && align(selectedId, "centre"),
        },
        {
          label: "Align Right",
          disabled: !selectedId,
          onClick: () => selectedId && align(selectedId, "right"),
        },
        {
          label: "Align Top",
          disabled: !selectedId,
          onClick: () => selectedId && align(selectedId, "top"),
        },
        {
          label: "Align Middle",
          disabled: !selectedId,
          onClick: () => selectedId && align(selectedId, "middle"),
        },
        {
          label: "Align Bottom",
          disabled: !selectedId,
          onClick: () => selectedId && align(selectedId, "bottom"),
        },
      ],
    },
    {
      title: "View",
      items: [
        {
          label: "Fit invitation",
          shortcut: "Cmd+0",
          onClick: fitView,
        },
        {
          label: "Actual size (100%)",
          shortcut: "Cmd+1",
          onClick: () => setZoom(1),
        },
        {
          label: "Zoom In",
          shortcut: "Cmd++",
          onClick: () => stepZoom(1),
        },
        {
          label: "Zoom Out",
          shortcut: "Cmd+-",
          onClick: () => stepZoom(-1),
        },
        "separator",
        {
          label: showRulers ? "Hide Rulers" : "Show Rulers",
          shortcut: "Cmd+R",
          onClick: () => setRulersChoice((c) => !(c ?? proRef.current)),
        },
        {
          label: showPrintGuides
            ? "Hide print guides"
            : "Show print guides (safe area and bleed)",
          onClick: () => setShowPrintGuides((g) => !g),
        },
        {
          label: showGrid ? "Hide Grid" : "Show Grid",
          shortcut: "Cmd+'",
          onClick: () => setShowGrid((g) => !g),
        },
        "separator",
        {
          label: snapToGrid ? "Disable grid snapping" : "Snap to grid (100 px)",
          shortcut: "Cmd+Shift+'",
          onClick: () => setSnapToGrid((s) => !s),
        },
        {
          label: guidesLocked ? "Unlock guides" : "Lock guides",
          onClick: () => setGuidesLocked((s) => !s),
        },
        {
          label: "Clear guides",
          disabled: guidesLocked,
          onClick: () => setClearGuidesRequest((n) => n + 1),
        },
        {
          label: dark ? "Switch to Light Mode" : "Switch to Dark Mode",
          icon: <Icon name="swatch" size={14} />,
          onClick: toggleDark,
        },
      ],
    },
    {
      title: "Help",
      items: [
        {
          label: "Help and shortcuts…",
          shortcut: "?",
          onClick: () => setHelpOpen(true),
        },
        {
          label: "Find a command…",
          shortcut: "Cmd+K",
          onClick: () => setPaletteOpen(true),
        },
        {
          label: "Show the quick tour",
          onClick: () => setTourOpen(true),
        },
      ],
    },
  ];

  return (
    <section
      aria-label="Invitation designer"
      data-testid="invitation-designer"
      data-mode={mode}
      data-panel={sheetTab}
      data-panel-open={mobilePanelOpen}
      data-has-selection={selectedIds.length > 0}
      style={
        { "--studio-sidebar-width": `${sidebarWidth}px` } as React.CSSProperties
      }
      onClickCapture={(e) => {
        const anchor = (e.target as HTMLElement).closest("a[href]");
        if (
          !anchor ||
          !doc.isDirty ||
          e.metaKey ||
          e.ctrlKey ||
          e.shiftKey ||
          e.altKey
        )
          return;
        const href = anchor.getAttribute("href");
        if (!href || href.startsWith("#")) return;
        e.preventDefault();
        e.stopPropagation();
        void doc.flushSave().then((ok) => {
          if (ok) window.location.assign(href);
        });
      }}
      className={cn(
        styles.studio,
        "relative h-dvh overflow-hidden select-none",
        dark
          ? "dark studio-dark text-[var(--studio-cream)]"
          : "text-[var(--studio-ink)]"
      )}
    >
      <input
        ref={backupRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        tabIndex={-1}
        aria-label="Choose an invitation design backup"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void importDesignFile(file);
          event.target.value = "";
        }}
      />
      <input
        ref={fileRef}
        type="file"
        accept={IMPORT_ACCEPT}
        className="sr-only"
        aria-label="Choose a picture"
        tabIndex={-1}
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <header
        data-testid="studio-top-header"
        aria-label="Invitation studio navigation"
        className={styles.header}
      >
        <div className={styles.identity}>
          <Link
            href={backHref}
            aria-label="Back to invitations"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-hairline text-night hover:bg-burgundy/10"
          >
            <Icon name="arrow_back" size={18} />
          </Link>
          <div className={styles.desktopMenus}>
            <StudioMenuBar menus={menuGroups} dark={dark} />
          </div>
        </div>
        <div className={styles.document}>
          <h1 className={styles.documentTitle} title={eventTitle}>
            {eventTitle}
          </h1>
          <p role="status" className={styles.documentStatus}>
            {status ||
              (doc.recovered
                ? "Recovered unsaved changes"
                : "Your invitation template")}
            {!fontsLoaded ? " · Loading fonts…" : ""}
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            aria-label="Help and shortcuts"
            title="Help and shortcuts (?)"
            onClick={() => setHelpOpen(true)}
            className="hidden h-11 w-11 place-items-center rounded-full text-sm font-bold text-night hover:bg-burgundy/10 sm:grid"
          >
            ?
          </button>
          <button
            type="button"
            aria-label={
              dark
                ? "Switch to the light interface"
                : "Switch to the dark interface"
            }
            title={dark ? "Light interface" : "Dark interface"}
            aria-pressed={dark}
            onClick={toggleDark}
            className="grid h-10 w-10 place-items-center rounded-full text-night hover:bg-burgundy/10"
          >
            <Icon name="swatch" size={18} />
          </button>
          <div className="w-[7.5rem] shrink-0">
            <Segmented
              dark={dark}
              label="Mode"
              value={mode}
              options={[
                { key: "simple", label: "Simple" },
                { key: "pro", label: "Pro" },
              ]}
              onPick={setMode}
            />
          </div>
          <Link href="/" aria-label="Àríyá home" className={styles.wordmark}>
            <Image
              src="/icons/icon-maskable-512.png"
              alt="Àríyá"
              width={36}
              height={36}
              className="rounded-xl"
            />
          </Link>
        </div>
      </header>
      {pro && (
        <div className={styles.mobileMenus}>
          <StudioMenuBar menus={menuGroups} dark={dark} />
        </div>
      )}

      {/* The card's stage fills the screen with brand matte studio workspace */}
      <div
        className={cn(
          "fixed inset-0 z-0 transition-colors",
          dark ? "bg-[var(--studio-night)]" : "bg-[#ede6da]"
        )}
      >
        <div className={cn(styles.stage, !pro && styles.stageSimple)}>
          <DesignerCanvas
            dark={dark}
            design={design}
            coupleName={coupleName}
            selectedId={selectedId}
            selectedIds={selectedIds}
            zoom={zoom}
            fitRequest={fitRequest}
            onViewportChange={setViewport}
            navigationTarget={navigationTarget}
            onZoomChange={setZoom}
            showHandles={pro}
            activeTool={activeTool}
            showRulers={showRulers}
            showGrid={showGrid}
            showPrintGuides={showPrintGuides}
            snapToGrid={snapToGrid}
            guidesLocked={guidesLocked}
            clearGuidesRequest={clearGuidesRequest}
            onSelect={setSelectedId}
            onToggleSelect={toggleSelectedId}
            onSelectBatch={setSelectedIds}
            onUpdate={dragLayer}
            onBatchUpdate={dragBatch}
            onRecord={(snapshot) => {
              if (activeTool !== "crop") recordSnapshot(snapshot);
            }}
            onRestoreSnapshot={restoreState}
            onDropImageFile={dropImageFile}
            onEditText={editText}
            onResizeCanvasPx={handleResizeCanvasPx}
            onAddLayerAt={addLayerAt}
            onAddLayerWithGeometry={addLayerWithGeometry}
            activeShapeKind={activeShapeKind}
          />
          {!design.layers.some(
            (layer) => layer.visible && layer.kind !== "code"
          ) && (
            <div
              data-testid="studio-empty-state"
              className="pointer-events-none absolute inset-0 z-10 grid place-items-center p-6"
            >
              <div className="pointer-events-auto max-w-xs rounded-2xl border border-hairline bg-ivory/95 p-5 text-center shadow-lg dark:bg-[#1a1118]/95 dark:text-ivory">
                <p className="font-serif text-lg font-bold text-night dark:text-ivory">
                  Your card is empty
                </p>
                <p className="mt-1 text-xs leading-relaxed text-label-2">
                  Add some text to begin, or upload a picture.
                </p>
                <button
                  type="button"
                  onClick={() => add("text")}
                  className="mt-3 inline-flex min-h-11 items-center rounded-full bg-burgundy px-5 text-sm font-semibold text-ivory hover:bg-burgundy/90"
                >
                  Add text
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {offerFacts && (
        <div
          role="region"
          aria-label="Event details changed"
          data-testid="event-facts-banner"
          className={cn(
            "pointer-events-auto fixed bottom-16 left-1/2 z-40 w-[min(34rem,calc(100%-1.5rem))] -translate-x-1/2 rounded-2xl border p-3 text-[13px] shadow-xl",
            dark
              ? "border-[#5e384c] bg-[#2a1b23] text-[var(--studio-cream)]"
              : "border-[var(--studio-gold)] bg-[#fffaf0] text-[#3b2b31]"
          )}
        >
          <p className="font-semibold">
            The event&rsquo;s details have changed since this card was saved.
          </p>
          <ul className="mt-1 space-y-0.5 text-[12px] opacity-80">
            {staleFacts.map((fact) => (
              <li key={fact.id}>
                <b>{fact.label}:</b> {fact.current || "(empty)"} &rarr;{" "}
                {fact.fresh || "(empty)"}
              </li>
            ))}
          </ul>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                commit((d) => applyEventFacts(d, staleFacts));
                setStaleFacts([]);
                setNotice({
                  tone: "ok",
                  text: "Card updated from the event details. You can undo this.",
                });
              }}
              className="rounded-full bg-[var(--studio-wine)] px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-[#6e1426]"
            >
              Update the card
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.setItem(factsKey, "1");
                } catch {
                  /* the offer comes back next time */
                }
                setKeptKey(factsKey);
              }}
              className="rounded-full border px-4 py-1.5 text-[12px] font-semibold hover:bg-black/5"
            >
              Keep my wording
            </button>
          </div>
        </div>
      )}

      {readout && (
        <div
          data-testid="drag-readout"
          aria-hidden="true"
          className="pointer-events-none fixed bottom-[72px] left-1/2 z-40 -translate-x-1/2 rounded-full bg-night/90 px-3 py-1 font-mono text-[12px] font-semibold text-ivory shadow-lg"
        >
          {readout}
        </div>
      )}

      {notice && (
        <div className="pointer-events-auto fixed top-[100px] left-1/2 -translate-x-1/2 z-50 flex w-fit max-w-[calc(100%-1.5rem)] items-center gap-2">
          <p
            role="status"
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold shadow-xl border",
              notice.tone === "ok"
                ? dark
                  ? "bg-emerald-950/90 text-emerald-200 border-emerald-800"
                  : "bg-emerald-50 text-emerald-900 border-emerald-200"
                : dark
                  ? "bg-red-950/90 text-red-200 border-red-800"
                  : "bg-red-50 text-red-900 border-red-200"
            )}
          >
            {notice.text}
            {notice.action && (
              <button
                type="button"
                aria-label={notice.action.ariaLabel ?? notice.action.label}
                onClick={() => {
                  const run = notice.action!.onClick;
                  run();
                }}
                className="min-h-8 rounded-full px-3 text-[13px] font-bold underline hover:bg-black/10 dark:hover:bg-white/10"
              >
                {notice.action.label}
              </button>
            )}
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setNotice(null)}
              className="grid h-6 w-6 place-items-center rounded-full hover:bg-black/10 dark:hover:bg-white/10"
            >
              <Icon name="close" size={14} />
            </button>
          </p>
        </div>
      )}

      {doc.saveState === "error" && (
        <div
          role="alert"
          data-testid="studio-error-alert"
          className="pointer-events-auto fixed bottom-14 left-4 z-50 flex max-w-sm items-center gap-2 rounded-2xl bg-red-600/95 text-white px-4 py-2 text-[12px] font-semibold shadow-lg"
        >
          <span className="flex-1">
            {doc.saveError ?? "Your last change was not saved."}
          </span>
          <button
            type="button"
            onClick={doc.retrySave}
            className="shrink-0 rounded-lg bg-white/20 px-2.5 py-1 text-xs font-bold hover:bg-white/30 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {pro ? (
        <>
          {/* Photoshop style Contextual Tool Options Bar */}
          <div className={styles.options}>
            <ContextualOptionsBar
              dark={dark}
              activeTool={activeTool}
              onSelectTool={setActiveTool}
              onApplyCrop={applyCanvasResize}
              onCancelCrop={cancelCanvasResize}
              design={design}
              selectedLayer={selected}
              selectedIds={selectedIds}
              onPatchLayer={patchLayer}
              onAlignSelection={(ids, how) =>
                commit((d) =>
                  withRenderedHeights(d, (m) =>
                    alignSelectionViaEngine(m, ids, how)
                  )
                )
              }
              onDistribute={(ids, h) =>
                commit((d) =>
                  withRenderedHeights(d, (m) =>
                    distributeLayersViaEngine(m, ids, h)
                  )
                )
              }
              onGroupSelection={() => {
                if (selectedIds.length >= 2) {
                  const gid = "group_" + Math.random().toString(36).slice(2, 9);
                  commit((d) => groupLayersViaEngine(d, selectedIds, gid));
                }
              }}
              onUngroupSelection={() => {
                if (selectedIds.length > 0) {
                  commit((d) => ungroupLayersViaEngine(d, selectedIds));
                  setNotice({ tone: "ok", text: "Ungrouped layers" });
                }
              }}
              activeShapeKind={activeShapeKind}
              onSelectShapeKind={setActiveShapeKind}
              onAddLayer={add}
              onResizeCanvasPx={handleResizeCanvasPx}
              onResetView={fitView}
              zoom={zoom}
              onZoomChange={setZoom}
              activeColor={activeColor}
              onColorChange={(c) => {
                setActiveColor(c);
                if (selected?.id) {
                  patchLayer(selected.id, {
                    fill: c,
                    color: c,
                    colorRole: "custom",
                  });
                }
              }}
              showRulers={showRulers}
              onToggleRulers={() => setRulersChoice(!showRulers)}
              showGrid={showGrid}
              onToggleGrid={() => setShowGrid(!showGrid)}
              snapToGrid={snapToGrid}
              onToggleSnapToGrid={() => setSnapToGrid((s) => !s)}
            />
          </div>

          {/* Left Vertical Tool Rail */}
          <div
            className={cn(
              styles.tools,
              "transition-colors",
              dark
                ? "bg-[#23181e] border-r border-[#382630]"
                : "bg-[#fcfbfa] border-r border-[var(--studio-line)]",
              "max-lg:bottom-[calc(44dvh+0.5rem)] max-lg:left-3 max-lg:right-3 max-lg:h-12 max-lg:rounded-2xl max-lg:border",
              "lg:left-0 lg:top-[92px] lg:bottom-0 lg:w-12"
            )}
          >
            <ToolRail
              onSampleColor={() => void sampleColor()}
              dark={dark}
              activeTool={activeTool}
              onSelectTool={setActiveTool}
              activeShapeKind={activeShapeKind}
              onSelectShapeKind={setActiveShapeKind}
              onAdd={add}
              onPickImage={() => choose({ purpose: "layer" })}
              onImportCard={() => choose({ purpose: "card" })}
              hasEntrySeal={design.layers.some((l) => l.kind === "code")}
              busy={busy}
              activeColor={activeColor}
              onColorChange={(c) => {
                setActiveColor(c);
                if (selected?.id) {
                  patchLayer(selected.id, {
                    fill: c,
                    color: c,
                    colorRole: "custom",
                  });
                }
              }}
              onOpenColorPicker={() => setSheetTab("swatches")}
            />
          </div>

          {/* Right Studio Sidebar (Layers & Properties) */}
          <aside
            aria-label="Studio Sidebar"
            className={cn(
              styles.sidebar,
              "flex min-h-0 flex-col overflow-hidden transition-colors",
              dark
                ? "bg-[#23181e] text-[var(--studio-cream)] border-l border-[#382630]"
                : "bg-[#fcfbfa] text-[var(--studio-ink)] border-l border-[var(--studio-line)]",
              "max-lg:inset-x-0 max-lg:bottom-0 max-lg:h-[44dvh] max-lg:rounded-t-2xl max-lg:border-t max-lg:!w-full",
              "lg:bottom-0 lg:right-0 lg:top-[92px]"
            )}
          >
            <div className={styles.mobileTabs} aria-label="Studio panels">
              {(
                [
                  ["properties", "Properties"],
                  ["swatches", "Colours"],
                  ["layers", "Layers"],
                  ["history", "History"],
                  ["navigator", "View"],
                ] as const
              ).map(([tab, label]) => (
                <button
                  key={tab}
                  type="button"
                  aria-expanded={mobilePanelOpen && sheetTab === tab}
                  onClick={() => {
                    if (mobilePanelOpen && sheetTab === tab)
                      setMobilePanelOpen(false);
                    else setSheetTab(tab);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {/* Draggable Resizer Edge */}
            <div
              role="separator"
              aria-label="Properties panel width"
              aria-orientation="vertical"
              aria-valuemin={260}
              aria-valuemax={600}
              aria-valuenow={sidebarWidth}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
                e.preventDefault();
                e.stopPropagation();
                setSidebarWidth((w) =>
                  Math.max(
                    260,
                    Math.min(
                      600,
                      window.innerWidth - 400,
                      w + (e.key === "ArrowLeft" ? 20 : -20)
                    )
                  )
                );
              }}
              onPointerDown={startSidebarResize}
              className={cn(
                "hidden lg:block absolute left-0 inset-y-0 w-2.5 -translate-x-1/2 cursor-col-resize z-40 transition-colors group",
                dark
                  ? "hover:bg-[var(--studio-gold)]/40 active:bg-[var(--studio-gold)]"
                  : "hover:bg-[var(--studio-wine)]/30 active:bg-[var(--studio-wine)]"
              )}
              title="Drag to resize studio panel"
            >
              <div className="h-full w-0.5 mx-auto opacity-0 group-hover:opacity-100 bg-[var(--studio-gold)]" />
            </div>

            {/* Top Half of Studio Sidebar: Properties / Color & Swatches */}
            <div
              style={
                { "--studio-split": `${panelSplit}%` } as React.CSSProperties
              }
              className={cn(
                styles.panelTop,
                "flex flex-col h-[52%] lg:h-[var(--studio-split)] min-h-[160px] border-b border-[var(--studio-gold)]/20"
              )}
            >
              {/* Top Tab Bar */}
              <div
                className={cn(
                  styles.panelTabs,
                  "flex items-center gap-1 px-2 py-1.5 border-b select-none transition-colors",
                  dark
                    ? "bg-[#1d1419] border-[#382630]"
                    : "bg-[#f4efe8] border-[var(--studio-line)]"
                )}
              >
                <button
                  type="button"
                  onClick={() => setTopTab("properties")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all",
                    topTab === "properties"
                      ? dark
                        ? "bg-[var(--studio-gold)]/20 text-[var(--studio-gold)] border border-[var(--studio-gold)]/40 shadow-xs"
                        : "bg-[var(--studio-wine)] text-white shadow-xs"
                      : dark
                        ? "text-zinc-400 hover:text-[var(--studio-cream)] hover:bg-white/[0.04]"
                        : "text-[var(--studio-mauve)] hover:text-[var(--studio-wine)] hover:bg-black/5"
                  )}
                >
                  <Icon name="styler" size={13} />
                  <span>Properties</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTopTab("swatches")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all",
                    topTab === "swatches"
                      ? dark
                        ? "bg-[var(--studio-gold)]/20 text-[var(--studio-gold)] border border-[var(--studio-gold)]/40 shadow-xs"
                        : "bg-[var(--studio-wine)] text-white shadow-xs"
                      : dark
                        ? "text-zinc-400 hover:text-[var(--studio-cream)] hover:bg-white/[0.04]"
                        : "text-[var(--studio-mauve)] hover:text-[var(--studio-wine)] hover:bg-black/5"
                  )}
                >
                  <Icon name="swatch" size={13} />
                  <span>Color & Swatches</span>
                </button>
              </div>

              {/* Top Content */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                {topTab === "properties" ? (
                  <Inspector
                    dark={dark}
                    design={design}
                    layer={selected}
                    selectedIds={selectedIds}
                    onPatch={patchLayer}
                    onDesign={(fn) => commit(fn)}
                    onAlign={align}
                    onAlignSelection={(ids, how) =>
                      commit((d) =>
                        withRenderedHeights(d, (m) =>
                          alignSelectionViaEngine(m, ids, how)
                        )
                      )
                    }
                    onDistribute={(ids, horizontal) =>
                      commit((d) =>
                        withRenderedHeights(d, (m) =>
                          distributeLayersViaEngine(m, ids, horizontal)
                        )
                      )
                    }
                    onGroup={(ids) => {
                      const gid =
                        "group_" + Math.random().toString(36).slice(2, 9);
                      commit((d) => groupLayersViaEngine(d, ids, gid));
                      setNotice({
                        tone: "ok",
                        text: `Grouped ${ids.length} layers`,
                      });
                    }}
                    onUngroup={(ids) => {
                      commit((d) => ungroupLayersViaEngine(d, ids));
                      setNotice({ tone: "ok", text: "Ungrouped layers" });
                    }}
                    onDeleteBatch={(ids) => {
                      commit((cur) => ({
                        ...cur,
                        layers: cur.layers.filter(
                          (l) => !ids.includes(l.id) || !canDelete(l)
                        ),
                      }));
                      setSelectedIds([]);
                    }}
                    onStack={stack}
                    onDuplicate={duplicate}
                    onDelete={deleteLayer}
                    canDelete={canDelete}
                    onPickImage={(id) => choose({ purpose: "replace", id })}
                    onUploadBackground={() => choose({ purpose: "background" })}
                    onExport={exportDesign}
                    onOpenImport={() => backupRef.current?.click()}
                  />
                ) : (
                  <ColorSwatchesPanel
                    dark={dark}
                    design={design}
                    selectedLayer={selected}
                    onPatchLayer={patchLayer}
                    onDesign={(fn) => commit(fn)}
                    activeColor={activeColor}
                    onColorChange={setActiveColor}
                  />
                )}
              </div>
            </div>

            <div
              role="separator"
              aria-label="Resize Properties and Layers"
              aria-orientation="horizontal"
              aria-valuemin={25}
              aria-valuemax={75}
              aria-valuenow={Math.round(panelSplit)}
              tabIndex={0}
              title="Drag to give Properties or Layers more room"
              onPointerDown={startPanelSplit}
              onDoubleClick={() => setPanelSplit(60)}
              onKeyDown={(e) => {
                if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
                e.preventDefault();
                setPanelSplit((v) =>
                  Math.min(75, Math.max(25, v + (e.key === "ArrowUp" ? -4 : 4)))
                );
              }}
              className={cn(
                "relative z-10 hidden h-2 shrink-0 cursor-row-resize lg:block",
                dark
                  ? "hover:bg-[var(--studio-gold)]/30"
                  : "hover:bg-[var(--studio-wine)]/20"
              )}
            >
              <div className="mx-auto mt-[3px] h-0.5 w-10 rounded-full bg-[var(--studio-gold)]/60" />
            </div>

            {/* Bottom Half of Studio Sidebar: Layers / History / Navigator */}
            <div
              className={cn(styles.panelBottom, "flex flex-col flex-1 min-h-0")}
            >
              {/* Bottom Tab Bar */}
              <div
                className={cn(
                  styles.panelTabs,
                  "flex items-center gap-1 px-2 py-1.5 border-b select-none transition-colors",
                  dark
                    ? "bg-[#1d1419] border-[#382630]"
                    : "bg-[#f4efe8] border-[var(--studio-line)]"
                )}
              >
                <button
                  type="button"
                  onClick={() => setBottomTab("layers")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all",
                    bottomTab === "layers"
                      ? dark
                        ? "bg-[var(--studio-gold)]/20 text-[var(--studio-gold)] border border-[var(--studio-gold)]/40 shadow-xs"
                        : "bg-[var(--studio-wine)] text-white shadow-xs"
                      : dark
                        ? "text-zinc-400 hover:text-[var(--studio-cream)] hover:bg-white/[0.04]"
                        : "text-[var(--studio-mauve)] hover:text-[var(--studio-wine)] hover:bg-black/5"
                  )}
                >
                  <Icon name="table_chart_view" size={13} />
                  <span>Layers</span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.2 text-xs font-mono",
                      bottomTab === "layers"
                        ? dark
                          ? "bg-black/40 text-[var(--studio-gold)]"
                          : "bg-white/20 text-white"
                        : dark
                          ? "bg-black/30 text-zinc-400"
                          : "bg-black/5 text-[var(--studio-mauve)]"
                    )}
                  >
                    {design.layers.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setBottomTab("history")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all",
                    bottomTab === "history"
                      ? dark
                        ? "bg-[var(--studio-gold)]/20 text-[var(--studio-gold)] border border-[var(--studio-gold)]/40 shadow-xs"
                        : "bg-[var(--studio-wine)] text-white shadow-xs"
                      : dark
                        ? "text-zinc-400 hover:text-[var(--studio-cream)] hover:bg-white/[0.04]"
                        : "text-[var(--studio-mauve)] hover:text-[var(--studio-wine)] hover:bg-black/5"
                  )}
                >
                  <Icon name="schedule" size={13} />
                  <span>History</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBottomTab("navigator")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all",
                    bottomTab === "navigator"
                      ? dark
                        ? "bg-[var(--studio-gold)]/20 text-[var(--studio-gold)] border border-[var(--studio-gold)]/40 shadow-xs"
                        : "bg-[var(--studio-wine)] text-white shadow-xs"
                      : dark
                        ? "text-zinc-400 hover:text-[var(--studio-cream)] hover:bg-white/[0.04]"
                        : "text-[var(--studio-mauve)] hover:text-[var(--studio-wine)] hover:bg-black/5"
                  )}
                >
                  <Icon name="search" size={13} />
                  <span>Navigator</span>
                </button>
              </div>

              {/* Bottom Content */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                {bottomTab === "layers" ? (
                  <LayersDock
                    dark={dark}
                    layers={design.layers}
                    background={design.background}
                    selectedId={selectedId}
                    selectedIds={selectedIds}
                    onSelect={(id) => {
                      setSelectedId(id);
                      setSelectedIds(id ? [id] : []);
                      if (id === "background") {
                        setTopTab("properties");
                      }
                    }}
                    onToggleSelect={toggleSelectedId}
                    onPatch={patchLayer}
                    onStack={stack}
                    onReorder={(nextLayers) =>
                      commit((d) => ({ ...d, layers: nextLayers }))
                    }
                    onDuplicate={duplicate}
                    onDelete={deleteLayer}
                    canDelete={canDelete}
                    onOpenFx={() => setTopTab("properties")}
                    onGroup={() => {
                      if (selectedIds.length >= 2) {
                        const gid =
                          "group_" + Math.random().toString(36).slice(2, 9);
                        commit((d) =>
                          groupLayersViaEngine(d, selectedIds, gid)
                        );
                      }
                    }}
                  />
                ) : bottomTab === "history" ? (
                  <HistoryPanel
                    dark={dark}
                    past={past}
                    present={design}
                    future={future}
                    onUndo={undo}
                    onRedo={redo}
                    onRestoreState={restoreState}
                  />
                ) : (
                  <NavigatorPanel
                    coupleName={coupleName}
                    viewport={viewport}
                    onNavigate={(x, y) => setNavigationTarget({ x, y })}
                    dark={dark}
                    design={design}
                    zoom={zoom}
                    onZoomChange={setZoom}
                    onResetView={fitView}
                  />
                )}
              </div>
            </div>
          </aside>
        </>
      ) : (
        <aside
          aria-label="Invitation questions"
          className={cn(
            styles.simplePanel,
            "fixed z-20 flex min-h-0 flex-col overflow-y-auto transition-colors shadow-2xl",
            dark
              ? "bg-[#23181e] text-[var(--studio-cream)] border-l border-[#382630]"
              : "bg-[#fcfbfa] text-[var(--studio-ink)] border-l border-[var(--studio-line)]",
            "max-lg:inset-x-0 max-lg:bottom-0 max-lg:h-[44dvh] max-lg:rounded-b-none",
            "lg:bottom-0 lg:right-0 lg:top-[52px] lg:w-96"
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
            onRemoveCard={() => commit((d) => removeCard(d))}
            onAddPhoto={() => choose({ purpose: "layer" })}
            onAddText={() => add("text")}
            onDeleteLayer={deleteLayer}
            passRequired={requireAccessCard}
            settingsHref={settingsHref}
          />
        </aside>
      )}

      {/* Floating Bottom Center Studio Control Dock: Undo, Redo, Zoom, Fit, Dimensions & Export */}
      <StudioBottomDock
        dark={dark}
        canUndo={doc.canUndo}
        canRedo={doc.canRedo}
        onUndo={undo}
        onRedo={redo}
        zoom={zoom}
        onZoomChange={setZoom}
        onFit={fitView}
        dimensions={designDimensionsPx(design)}
        onExport={() => setExportOpen(true)}
      />

      <CommandPalette
        dark={dark}
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        menus={menuGroups}
      />
      <QuickTour
        dark={dark}
        forceOpen={tourOpen}
        onForceClose={() => setTourOpen(false)}
      />
      <HelpDialog
        dark={dark}
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
      />

      <ExportModal
        dark={dark}
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        onExported={(format) =>
          // A success message never replaces an error the host has not dismissed yet.
          setNotice((current) =>
            current?.tone === "bad"
              ? current
              : {
                  tone: "ok",
                  text: `Exported as ${format === "json" ? "a design backup" : format === "whatsapp" ? "a small WhatsApp picture" : format.toUpperCase()}. Check your downloads.`,
                }
          )
        }
        design={design}
        eventId={eventId}
        coupleName={coupleName}
        getCardElement={() =>
          document.querySelector<HTMLElement>(
            '[data-testid="designer-stage"] [data-invitation-canvas]'
          )
        }
      />
    </section>
  );
}
