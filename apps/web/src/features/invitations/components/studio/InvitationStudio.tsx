"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import {
  saveInvitationDesignAction,
  uploadInvitationArtAction,
} from "../../actions";
import {
  applyInvitationTheme,
  createLayerOfKind,
  normaliseDesign,
} from "../../design";
import type {
  InvitationBackground,
  InvitationDesign,
  InvitationEventContent,
  InvitationLayer,
  InvitationPalette,
  InvitationTheme,
} from "../../types";
import { DesignPanel } from "./DesignPanel";
import { ImportPanel } from "./ImportPanel";
import { LayersPanel } from "./LayersPanel";
import { PromptPanel } from "./PromptPanel";
import { StudioCanvas } from "./StudioCanvas";
import { TextPanel } from "./TextPanel";
import type { StudioApi, StudioImportState, StudioTab } from "./types";

const TABS: { id: StudioTab; label: string }[] = [
  { id: "design", label: "Design" },
  { id: "layers", label: "Layers" },
  { id: "text", label: "Text" },
  { id: "prompt", label: "Prompt" },
  { id: "import", label: "Import" },
];

const SAVE_DELAY_MS = 700;

interface StudioDocument {
  past: InvitationDesign[];
  present: InvitationDesign;
  future: InvitationDesign[];
}

/**
 * The studio: one design document, direct manipulation on the canvas, and an undo stack. Every
 * change saves itself, so there is no save button to forget.
 */
export function InvitationStudio({
  eventId,
  content,
  initialDesign,
  coupleName,
}: {
  eventId: string;
  content: InvitationEventContent;
  initialDesign: InvitationDesign;
  coupleName: string;
}) {
  const [doc, setDoc] = useState<StudioDocument>({
    past: [],
    present: initialDesign,
    future: [],
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<StudioTab>("design");
  const [importState, setImportState] = useState<StudioImportState>({
    busy: false,
    error: null,
    message: null,
  });
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const savedRef = useRef(JSON.stringify(initialDesign));
  const latestRef = useRef(savedRef.current);

  const commit = useCallback(
    (
      next: InvitationDesign | ((design: InvitationDesign) => InvitationDesign),
      record = true
    ) => {
      setDoc((state) => {
        const updated = typeof next === "function" ? next(state.present) : next;
        if (updated === state.present) return state;
        return record
          ? {
              past: [...state.past, state.present],
              present: updated,
              future: [],
            }
          : { ...state, present: updated };
      });
    },
    []
  );

  const undo = useCallback(() => {
    setDoc((state) => {
      if (!state.past.length) return state;
      return {
        past: state.past.slice(0, -1),
        present: state.past[state.past.length - 1],
        future: [state.present, ...state.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setDoc((state) => {
      if (!state.future.length) return state;
      return {
        past: [...state.past, state.present],
        present: state.future[0],
        future: state.future.slice(1),
      };
    });
  }, []);

  const recordSnapshot = useCallback((snapshot: InvitationDesign) => {
    setDoc((state) => ({
      past: [...state.past, snapshot],
      present: state.present,
      future: [],
    }));
  }, []);

  const replaceDesign = useCallback(
    (next: InvitationDesign, options?: { commit?: boolean }) => {
      commit(next, options?.commit ?? true);
    },
    [commit]
  );

  const updateLayer = useCallback(
    (
      id: string,
      patch: Partial<InvitationLayer>,
      options?: { commit?: boolean }
    ) => {
      commit(
        (design) => ({
          ...design,
          layers: design.layers.map((layer) =>
            layer.id === id ? { ...layer, ...patch } : layer
          ),
        }),
        options?.commit ?? true
      );
    },
    [commit]
  );

  const layerCount = doc.present.layers.length;

  const addLayer = useCallback(
    (kind: "text" | "seal" | "divider") => {
      const layer = createLayerOfKind(kind, layerCount);
      commit((design) => ({ ...design, layers: [...design.layers, layer] }));
      setSelectedId(layer.id);
    },
    [commit, layerCount]
  );

  const deleteLayer = useCallback(
    (id: string) => {
      commit((design) => ({
        ...design,
        layers: design.layers.filter((layer) => layer.id !== id),
      }));
      setSelectedId((current) => (current === id ? null : current));
    },
    [commit]
  );

  const moveLayer = useCallback(
    (id: string, direction: -1 | 1) => {
      commit((design) => {
        const index = design.layers.findIndex((layer) => layer.id === id);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= design.layers.length) {
          return design;
        }
        const layers = [...design.layers];
        const [moved] = layers.splice(index, 1);
        layers.splice(target, 0, moved);
        return { ...design, layers };
      });
    },
    [commit]
  );

  const applyTheme = useCallback(
    (theme: InvitationTheme) => {
      commit((design) => applyInvitationTheme(design, theme));
    },
    [commit]
  );

  const setBackground = useCallback(
    (patch: Partial<InvitationBackground>) => {
      commit((design) => ({
        ...design,
        background: { ...design.background, ...patch },
      }));
    },
    [commit]
  );

  const setPaletteColour = useCallback(
    (key: keyof InvitationPalette, value: string) => {
      commit((design) => ({
        ...design,
        palette: { ...design.palette, [key]: value },
      }));
    },
    [commit]
  );

  useEffect(() => {
    const serialised = JSON.stringify(doc.present);
    latestRef.current = serialised;
    if (serialised === savedRef.current) return;

    setSaveState("saving");
    const timer = setTimeout(async () => {
      const result = await saveInvitationDesignAction(eventId, doc.present);
      if (latestRef.current !== serialised) return;
      if (result.ok) {
        savedRef.current = serialised;
        setSaveState("saved");
        setSaveError(null);
      } else {
        setSaveState("error");
        setSaveError(result.error);
      }
    }, SAVE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [doc.present, eventId]);

  async function handleImportFile(file: File) {
    setImportState({ busy: true, error: null, message: null });

    if (file.type === "application/json" || file.name.endsWith(".json")) {
      const imported = normaliseDesign(await file.text());
      if (!imported) {
        setImportState({
          busy: false,
          error: "That file is not an Àríyá invitation design.",
          message: null,
        });
        return;
      }
      replaceDesign(imported);
      setImportState({
        busy: false,
        error: null,
        message: "Imported the design file.",
      });
      return;
    }

    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadInvitationArtAction(eventId, formData);
    if (!result.ok) {
      setImportState({ busy: false, error: result.error, message: null });
      return;
    }
    setBackground({ kind: "image", imageUrl: result.url });
    setImportState({
      busy: false,
      error: null,
      message: "Imported your art as the card background.",
    });
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(doc.present, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ariya-invitation-${eventId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const api: StudioApi = {
    design: doc.present,
    content,
    selectedId,
    select: setSelectedId,
    replaceDesign,
    updateLayer,
    addLayer,
    deleteLayer,
    moveLayer,
    applyTheme,
    setBackground,
    setPaletteColour,
    recordSnapshot,
    undo,
    redo,
    canUndo: doc.past.length > 0,
    canRedo: doc.future.length > 0,
  };

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <StudioCanvas api={api} coupleName={coupleName} />
      </div>

      <div className="space-y-3 lg:col-span-5">
        <div
          role="tablist"
          aria-label="Studio panels"
          className="flex flex-wrap gap-1 rounded-full border border-gold-ink/25 bg-white/45 p-1"
        >
          {TABS.map((entry) => (
            <button
              key={entry.id}
              role="tab"
              type="button"
              aria-selected={tab === entry.id}
              onClick={() => setTab(entry.id)}
              className={`inline-flex min-h-9 flex-1 items-center justify-center rounded-full px-3 text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy ${
                tab === entry.id
                  ? "bg-burgundy text-white"
                  : "text-label-2 hover:text-night"
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-gold-ink/20 bg-white/45 p-4">
          {tab === "design" && <DesignPanel api={api} />}
          {tab === "layers" && <LayersPanel api={api} />}
          {tab === "text" && <TextPanel api={api} />}
          {tab === "prompt" && <PromptPanel api={api} />}
          {tab === "import" && (
            <ImportPanel
              api={api}
              state={importState}
              onImportFile={handleImportFile}
              onExport={handleExport}
            />
          )}
        </div>

        <p
          role="status"
          aria-live="polite"
          className="flex items-center gap-1.5 px-1 text-[11px] font-medium"
        >
          {saveState === "saving" && (
            <>
              <Icon name="refresh" size={13} className="animate-spin" />
              <span className="text-label-2">Saving…</span>
            </>
          )}
          {saveState === "saved" && (
            <>
              <Icon name="check" size={13} className="text-emerald-700" />
              <span className="text-emerald-700">Design saved</span>
            </>
          )}
          {saveState === "error" && (
            <>
              <Icon name="error" size={13} className="text-[#9e2a2b]" />
              <span className="text-[#9e2a2b]">{saveError}</span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
