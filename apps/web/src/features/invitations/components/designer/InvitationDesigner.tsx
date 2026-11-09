"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { Segmented } from "@/features/seating/hall/studio-ui";
import { uploadInvitationImageAction } from "../../actions";
import { optimizeImageForUpload } from "../../image-compressor";
import { normaliseDesign, createLayerOfKind } from "../../design";
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
  isEditable,
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
  const {
    design,
    commit,
    recordSnapshot,
    undo,
    redo,
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
  const [_sheetTab, setSheetTabRaw] = useState<
    "layers" | "properties" | "swatches" | "history" | "navigator"
  >("layers");

  const _setSheetTab = (
    tab: "layers" | "properties" | "swatches" | "history" | "navigator"
  ) => {
    setSheetTabRaw(tab);
    if (tab === "properties" || tab === "swatches") setTopTab(tab);
    else setBottomTab(tab);
  };
  const [activeTool, setActiveTool] = useState<StudioTool>("select");
  const [activeColor, setActiveColor] = useState("#dfba73");
  const [sidebarWidth, setSidebarWidth] = useState(360);
  const isResizingSidebar = useRef(false);

  const handleResizeCanvasPx = useCallback(
    (widthPx: number, heightPx: number) => {
      commit((d) => resizeCanvasPxFast(d, widthPx, heightPx));
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
        commit((d) => ({
          ...d,
          layers: [...d.layers, textLayer],
        }));
        setSelectedId(textLayer.id);
        setTopTab("properties");
      } else {
        const shape = addShape(design, kind);
        if (shape) {
          commit((d) => {
            const next = addShape(d, kind);
            if (!next) return d;
            return {
              ...next.design,
              layers: next.design.layers.map((l) =>
                l.id === next.id
                  ? {
                      ...l,
                      x: geom.x,
                      y: geom.y,
                      width: Math.max(5, geom.width),
                      height: geom.height ? Math.max(2, geom.height) : l.height,
                    }
                  : l
              ),
            };
          });
          setSelectedId(shape.id);
          setTopTab("properties");
        }
      }
      setActiveTool("select");
    },
    [commit, design, setSelectedId]
  );

  const addLayerAt = useCallback(
    (kind: "text" | "rect" | "line", x: number, y: number) => {
      addLayerWithGeometry(kind, { x, y, width: kind === "text" ? 50 : 60 });
    },
    [addLayerWithGeometry]
  );

  const startSidebarResize = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    isResizingSidebar.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onPointerMove = (ev: PointerEvent) => {
      if (!isResizingSidebar.current) return;
      const newWidth = Math.min(
        600,
        Math.max(280, window.innerWidth - ev.clientX)
      );
      setSidebarWidth(newWidth);
    };

    const onPointerUp = () => {
      isResizingSidebar.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }, []);

  // Global Tool Quick Keys: V, C, T, U/R/O/L, G, I, H, Z
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        target?.isContentEditable
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();
      if (key === "v") {
        setActiveTool("select");
      } else if (key === "c") {
        setActiveTool("crop");
      } else if (key === "t") {
        setActiveTool("text");
      } else if (key === "u" || key === "r" || key === "o" || key === "l") {
        setActiveTool("shape");
      } else if (key === "g") {
        setActiveTool("gradient");
      } else if (key === "i") {
        setActiveTool("eyedropper");
      } else if (key === "h") {
        setActiveTool("hand");
      } else if (key === "z") {
        setActiveTool("zoom");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const [showRulers, setShowRulers] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [notice, setNotice] = useState<{
    tone: "ok" | "bad";
    text: string;
  } | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<Upload>({ purpose: "layer" });
  const clipboardRef = useRef<InvitationLayer[]>([]);
  const lastEdit = useRef({ key: "", at: 0 });
  const designRef = useRef(design);
  designRef.current = design;

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

  const dragBatch = useCallback(
    (
      patches: Record<string, Partial<InvitationLayer>>,
      options?: { commit?: boolean }
    ) => {
      commit(
        (d) => ({
          ...d,
          layers: d.layers.map((l) =>
            patches[l.id] ? { ...l, ...patches[l.id] } : l
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
    (id: string, move: StackMove) => commit((d) => stackViaEngine(d, id, move)),
    [commit]
  );
  const align = useCallback(
    (id: string, how: Alignment) => commit((d) => alignViaEngine(d, id, how)),
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
    setBusy(true);
    setNotice(null);
    let optimized;
    try {
      optimized = await optimizeImageForUpload(file);
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
  }

  function exportDesign() {
    setExportOpen(true);
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
        const selLayers = d.layers.filter((l) => selectedIds.includes(l.id));
        clipboardRef.current = selLayers;
        setNotice({
          tone: "ok",
          text: `Copied ${selLayers.length === 1 ? `"${selLayers[0].name || selLayers[0].kind}"` : `${selLayers.length} layers`}`,
        });
        return;
      }
      if (mod && e.key.toLowerCase() === "v" && clipboardRef.current.length) {
        e.preventDefault();
        const copies = clipboardRef.current.map((src) => {
          const freshId = "layer_" + Math.random().toString(36).slice(2, 9);
          return {
            ...src,
            id: freshId,
            name: `${src.name || src.kind} copy`,
            x: Math.min(92, src.x + 2),
            y: Math.min(92, src.y + 2),
          };
        });
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
        setSelectedIds(d.layers.map((l) => l.id));
        return;
      }
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setSelectedIds([]);
        return;
      }
      if (mod && e.key.toLowerCase() === "j" && selectedIds.length) {
        e.preventDefault();
        let next = d;
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
      if (mod && e.key === "0") {
        e.preventDefault();
        setZoom(1);
        return;
      }
      if (mod) return;
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
          setActiveTool("select");
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
        if (k === "g") {
          e.preventDefault();
          setActiveTool("gradient");
          return;
        }
        if (k === "h") {
          e.preventDefault();
          setActiveTool("hand");
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
          setActiveTool("eyedropper");
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
      const arrowKeys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
      if (arrowKeys.includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 5 : 0.5;
        const dx =
          e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy =
          e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        commit((cur) => ({
          ...cur,
          layers: cur.layers.map((l) => {
            if (!selectedIds.includes(l.id) || !isEditable(l)) return l;
            return {
              ...l,
              x:
                Math.round(Math.max(-500, Math.min(500, l.x + dx)) * 100) / 100,
              y:
                Math.round(Math.max(-500, Math.min(500, l.y + dy)) * 100) / 100,
            };
          }),
        }));
        return;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    selectedId,
    selectedIds,
    mode,
    undo,
    redo,
    add,
    deleteLayer,
    duplicate,
    patchLayer,
    setActiveTool,
    commit,
    canDelete,
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

  const status =
    doc.saveState === "saving"
      ? "saving…"
      : doc.saveState === "saved"
        ? "saved"
        : doc.saveState === "error"
          ? "not saved"
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
                "Reset invitation to original template? Unsaved changes will be lost."
              )
            ) {
              commit(() => initialDesign, true);
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
          shortcut: "Cmd+D",
          disabled: !selectedId,
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
          disabled: !selectedId,
          onClick: () => selectedId && stack(selectedId, "front"),
        },
        {
          label: "Bring Forward",
          disabled: !selectedId,
          onClick: () => selectedId && stack(selectedId, "up"),
        },
        {
          label: "Send Backward",
          disabled: !selectedId,
          onClick: () => selectedId && stack(selectedId, "down"),
        },
        {
          label: "Send to Back",
          shortcut: "Cmd+[",
          disabled: !selectedId,
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
          label: "Zoom to 100%",
          shortcut: "Cmd+0",
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
          onClick: () => setShowRulers((r) => !r),
        },
        {
          label: showGrid ? "Hide Grid" : "Show Grid",
          shortcut: "Cmd+'",
          onClick: () => setShowGrid((g) => !g),
        },
        "separator",
        {
          label: dark ? "Switch to Light Mode" : "Switch to Dark Mode",
          icon: <Icon name="swatch" size={14} />,
          onClick: toggleDark,
        },
      ],
    },
  ];

  return (
    <section
      aria-label="Invitation designer"
      data-testid="invitation-designer"
      className={cn(
        "relative h-dvh overflow-hidden select-none",
        dark ? "dark studio-dark text-[#fff6dc]" : "text-[#2d1f24]"
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

      {/* Studio Top Header Bar: Clean, unboxed, brand aligned, no avatar collision */}
      <header
        role="banner"
        data-testid="studio-top-header"
        aria-label="Studio top navigation"
        className={cn(
          "fixed inset-x-0 top-0 z-40 flex h-13 items-center justify-between px-3 text-xs border-b backdrop-blur-md transition-colors",
          dark
            ? "border-[#382630] bg-[#23181e]/95 text-[#fff6dc]"
            : "border-[#e8e2d6] bg-[#fcfbfa]/95 text-[#2d1f24]"
        )}
      >
        {/* Left: Back button + Menus (Far Left) */}
        <div className="flex items-center gap-2 min-w-0 z-10">
          <Link
            href={backHref}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#dfba73]",
              dark
                ? "bg-white/5 text-[#fff6dc] hover:bg-white/10 hover:text-white"
                : "bg-black/5 text-[#4a0e17] hover:bg-[#4a0e17]/10"
            )}
          >
            <Icon name="arrow_back" size={13} />
            <span className="font-semibold text-xs">Back</span>
          </Link>

          <span
            aria-hidden="true"
            className={cn(
              "h-4 w-px mx-0.5",
              dark ? "bg-white/15" : "bg-black/10"
            )}
          />

          <StudioMenuBar menus={menuGroups} dark={dark} />
        </div>

        {/* Center: Design Name & Event Title + Live Status Indicator */}
        <div className="pointer-events-none absolute inset-x-0 flex items-center justify-center">
          <div className="pointer-events-auto flex items-center gap-2 max-w-[45%] truncate">
            <span className="font-serif text-sm font-semibold tracking-wide">
              Invitation Designer
            </span>
            <span aria-hidden="true" className="text-xs opacity-40">
              •
            </span>
            <span
              className={cn(
                "truncate text-xs font-medium",
                dark ? "text-zinc-400" : "text-[#7a5b67]"
              )}
            >
              {eventTitle}
            </span>
            <span
              className={cn(
                "h-2 w-2 rounded-full transition-all shrink-0 ml-1",
                doc.saveState === "saving" && "bg-amber-400 animate-pulse",
                doc.saveState === "saved" && "bg-emerald-500",
                doc.saveState === "error" && "bg-red-500"
              )}
              aria-hidden="true"
            />
            {status && (
              <span
                className={cn(
                  "text-[11px] font-medium transition-opacity",
                  dark ? "text-zinc-400" : "text-zinc-500"
                )}
              >
                · {status}
              </span>
            )}
          </div>
        </div>

        {/* Right: Theme Switch + Mode Toggle + Ariya Luxury Brand Logo (Far Right) */}
        <div className="flex items-center gap-2.5 z-10">
          <button
            type="button"
            aria-label={
              dark
                ? "Switch to the light interface"
                : "Switch to the dark interface"
            }
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
            aria-pressed={dark}
            onClick={toggleDark}
            className={cn(
              "grid h-8 w-8 place-items-center rounded-full transition-colors",
              dark
                ? "text-zinc-300 hover:bg-white/10 hover:text-white"
                : "text-[#4a0e17] hover:bg-[#4a0e17]/10"
            )}
          >
            <Icon name="swatch" size={16} />
          </button>

          <div className="w-32 shrink-0">
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

          <span
            aria-hidden="true"
            className={cn(
              "h-4 w-px mx-0.5",
              dark ? "bg-white/15" : "bg-black/10"
            )}
          />

          <Link
            href="/"
            className="flex items-center gap-2 pl-1 pr-0.5 transition hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#dfba73] rounded-full"
            title="Àríyá Home"
            aria-label="Àríyá Home"
          >
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-serif font-bold text-xs shadow-xs border transition-all",
                dark
                  ? "bg-gradient-to-br from-[#dfba73] to-[#9e7534] text-[#1c070d] border-[#dfba73]/40"
                  : "bg-gradient-to-br from-[#6b1e2e] to-[#4a0e17] text-[#dfba73] border-[#dfba73]/30"
              )}
            >
              À
            </span>
            <span
              className={cn(
                "font-serif font-bold text-sm tracking-wide hidden sm:inline",
                dark ? "text-[#dfba73]" : "text-[#4a0e17]"
              )}
            >
              Àríyá
            </span>
          </Link>
        </div>
      </header>

      {/* The card's stage fills the screen with brand matte studio workspace */}
      <div
        className={cn(
          "fixed inset-0 z-0 transition-colors",
          dark ? "bg-[#20161b]" : "bg-[#ede6da]"
        )}
      >
        <div
          className={cn(
            "absolute inset-0 transition-[left,top,bottom] duration-150 motion-reduce:transition-none",
            pro
              ? "max-lg:bottom-[calc(44dvh+3.5rem)] lg:left-12 max-lg:top-[132px] lg:top-[92px]"
              : "max-lg:bottom-[44dvh] lg:left-0 lg:right-96 max-lg:top-[124px] lg:top-[52px]"
          )}
          style={pro ? { right: `${sidebarWidth}px` } : undefined}
        >
          <DesignerCanvas
            dark={dark}
            design={design}
            coupleName={coupleName}
            selectedId={selectedId}
            selectedIds={selectedIds}
            zoom={zoom}
            onZoomChange={setZoom}
            showHandles={pro}
            activeTool={activeTool}
            onSelect={setSelectedId}
            onToggleSelect={toggleSelectedId}
            onSelectBatch={setSelectedIds}
            onUpdate={dragLayer}
            onBatchUpdate={dragBatch}
            onRecord={recordSnapshot}
            onEditText={editText}
            onResizeCanvasPx={handleResizeCanvasPx}
            onAddLayerAt={addLayerAt}
            onAddLayerWithGeometry={addLayerWithGeometry}
            activeShapeKind={activeShapeKind}
          />
        </div>
      </div>

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
        <p
          role="alert"
          className="pointer-events-auto fixed bottom-14 left-4 z-50 max-w-sm rounded-2xl bg-red-500/90 text-white px-4 py-2 text-[12px] font-semibold shadow-lg max-lg:hidden"
        >
          {doc.saveError ?? "Your last change was not saved."}
        </p>
      )}

      {pro ? (
        <>
          {/* Photoshop style Contextual Tool Options Bar */}
          <div className="fixed left-0 right-0 top-[52px] h-10 z-30">
            <ContextualOptionsBar
              dark={dark}
              activeTool={activeTool}
              onSelectTool={setActiveTool}
              design={design}
              selectedLayer={selected}
              selectedIds={selectedIds}
              onPatchLayer={patchLayer}
              onAlignSelection={(ids, how) =>
                commit((d) => alignSelectionViaEngine(d, ids, how))
              }
              onDistribute={(ids, h) =>
                commit((d) => distributeLayersViaEngine(d, ids, h))
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
              onResetView={() => setZoom(1)}
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
              onToggleRulers={() => setShowRulers(!showRulers)}
              showGrid={showGrid}
              onToggleGrid={() => setShowGrid(!showGrid)}
            />
          </div>

          {/* Left Vertical Tool Rail */}
          <div
            className={cn(
              "fixed z-30 shadow-xl transition-colors",
              dark
                ? "bg-[#23181e] border-r border-[#382630]"
                : "bg-[#fcfbfa] border-r border-[#e8e2d6]",
              "max-lg:bottom-[calc(44dvh+0.5rem)] max-lg:left-3 max-lg:right-3 max-lg:h-12 max-lg:rounded-2xl max-lg:border",
              "lg:left-0 lg:top-[92px] lg:bottom-0 lg:w-12"
            )}
          >
            <ToolRail
              dark={dark}
              activeTool={activeTool}
              onSelectTool={setActiveTool}
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
            style={{ width: `${sidebarWidth}px` }}
            className={cn(
              "fixed z-20 flex min-h-0 flex-col overflow-hidden transition-colors",
              dark
                ? "bg-[#23181e] text-[#fff6dc] border-l border-[#382630]"
                : "bg-[#fcfbfa] text-[#2d1f24] border-l border-[#e8e2d6]",
              "max-lg:inset-x-0 max-lg:bottom-0 max-lg:h-[44dvh] max-lg:rounded-t-2xl max-lg:border-t max-lg:!w-full",
              "lg:bottom-0 lg:right-0 lg:top-[92px]"
            )}
          >
            {/* Draggable Resizer Edge */}
            <div
              onPointerDown={startSidebarResize}
              className={cn(
                "hidden lg:block absolute left-0 inset-y-0 w-2.5 -translate-x-1/2 cursor-col-resize z-40 transition-colors group",
                dark
                  ? "hover:bg-[#dfba73]/40 active:bg-[#dfba73]"
                  : "hover:bg-[#4a0e17]/30 active:bg-[#4a0e17]"
              )}
              title="Drag to resize studio panel"
            >
              <div className="h-full w-0.5 mx-auto opacity-0 group-hover:opacity-100 bg-[#dfba73]" />
            </div>

            {/* Top Half of Studio Sidebar: Properties / Color & Swatches */}
            <div className="flex flex-col h-[52%] min-h-[220px] border-b border-[#dfba73]/20">
              {/* Top Tab Bar */}
              <div
                className={cn(
                  "flex items-center gap-1 px-2 py-1.5 border-b select-none transition-colors",
                  dark
                    ? "bg-[#1d1419] border-[#382630]"
                    : "bg-[#f4efe8] border-[#e8e2d6]"
                )}
              >
                <button
                  type="button"
                  onClick={() => setTopTab("properties")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all",
                    topTab === "properties"
                      ? dark
                        ? "bg-[#dfba73]/20 text-[#dfba73] border border-[#dfba73]/40 shadow-xs"
                        : "bg-[#4a0e17] text-white shadow-xs"
                      : dark
                        ? "text-zinc-400 hover:text-[#fff6dc] hover:bg-white/[0.04]"
                        : "text-[#7a5b67] hover:text-[#4a0e17] hover:bg-black/5"
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
                        ? "bg-[#dfba73]/20 text-[#dfba73] border border-[#dfba73]/40 shadow-xs"
                        : "bg-[#4a0e17] text-white shadow-xs"
                      : dark
                        ? "text-zinc-400 hover:text-[#fff6dc] hover:bg-white/[0.04]"
                        : "text-[#7a5b67] hover:text-[#4a0e17] hover:bg-black/5"
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
                      commit((d) => alignSelectionViaEngine(d, ids, how))
                    }
                    onDistribute={(ids, horizontal) =>
                      commit((d) =>
                        distributeLayersViaEngine(d, ids, horizontal)
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
                    onImportFile={(f) => void importDesignFile(f)}
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

            {/* Bottom Half of Studio Sidebar: Layers / History / Navigator */}
            <div className="flex flex-col flex-1 min-h-0">
              {/* Bottom Tab Bar */}
              <div
                className={cn(
                  "flex items-center gap-1 px-2 py-1.5 border-b select-none transition-colors",
                  dark
                    ? "bg-[#1d1419] border-[#382630]"
                    : "bg-[#f4efe8] border-[#e8e2d6]"
                )}
              >
                <button
                  type="button"
                  aria-label="Layers"
                  onClick={() => setBottomTab("layers")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all",
                    bottomTab === "layers"
                      ? dark
                        ? "bg-[#dfba73]/20 text-[#dfba73] border border-[#dfba73]/40 shadow-xs"
                        : "bg-[#4a0e17] text-white shadow-xs"
                      : dark
                        ? "text-zinc-400 hover:text-[#fff6dc] hover:bg-white/[0.04]"
                        : "text-[#7a5b67] hover:text-[#4a0e17] hover:bg-black/5"
                  )}
                >
                  <Icon name="table_chart_view" size={13} />
                  <span>Layers</span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.2 text-[10px] font-mono",
                      bottomTab === "layers"
                        ? dark
                          ? "bg-black/40 text-[#dfba73]"
                          : "bg-white/20 text-white"
                        : dark
                          ? "bg-black/30 text-zinc-400"
                          : "bg-black/5 text-[#7a5b67]"
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
                        ? "bg-[#dfba73]/20 text-[#dfba73] border border-[#dfba73]/40 shadow-xs"
                        : "bg-[#4a0e17] text-white shadow-xs"
                      : dark
                        ? "text-zinc-400 hover:text-[#fff6dc] hover:bg-white/[0.04]"
                        : "text-[#7a5b67] hover:text-[#4a0e17] hover:bg-black/5"
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
                        ? "bg-[#dfba73]/20 text-[#dfba73] border border-[#dfba73]/40 shadow-xs"
                        : "bg-[#4a0e17] text-white shadow-xs"
                      : dark
                        ? "text-zinc-400 hover:text-[#fff6dc] hover:bg-white/[0.04]"
                        : "text-[#7a5b67] hover:text-[#4a0e17] hover:bg-black/5"
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
                    dark={dark}
                    design={design}
                    zoom={zoom}
                    onZoomChange={setZoom}
                    onResetView={() => setZoom(1)}
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
            "fixed z-20 flex min-h-0 flex-col overflow-y-auto transition-colors shadow-2xl",
            dark
              ? "bg-[#23181e] text-[#fff6dc] border-l border-[#382630]"
              : "bg-[#fcfbfa] text-[#2d1f24] border-l border-[#e8e2d6]",
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
        onFit={() => setZoom(1)}
        dimensions={designDimensionsPx(design)}
        onExport={() => setExportOpen(true)}
      />

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        design={design}
        eventId={eventId}
        coupleName={coupleName}
        getCardElement={() =>
          document.querySelector<HTMLElement>("[data-invitation-canvas]")
        }
      />
    </section>
  );
}
