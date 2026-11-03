import type {
  InvitationBackground,
  InvitationDesign,
  InvitationEventContent,
  InvitationLayer,
  InvitationPalette,
  InvitationTheme,
} from "../../types";

export type StudioTab = "design" | "layers" | "text" | "prompt" | "import";

export interface StudioImportState {
  busy: boolean;
  error: string | null;
  message: string | null;
}

export interface StudioApi {
  design: InvitationDesign;
  content: InvitationEventContent;
  selectedId: string | null;
  select(id: string | null): void;
  replaceDesign(next: InvitationDesign, options?: { commit?: boolean }): void;
  updateLayer(
    id: string,
    patch: Partial<InvitationLayer>,
    options?: { commit?: boolean }
  ): void;
  addLayer(kind: "text" | "seal" | "divider"): void;
  deleteLayer(id: string): void;
  moveLayer(id: string, direction: -1 | 1): void;
  applyTheme(theme: InvitationTheme): void;
  setBackground(patch: Partial<InvitationBackground>): void;
  setPaletteColour(key: keyof InvitationPalette, value: string): void;
  /** Pushes a pre-drag snapshot so a drag can be undone in one step. */
  recordSnapshot(snapshot: InvitationDesign): void;
  undo(): void;
  redo(): void;
  canUndo: boolean;
  canRedo: boolean;
}
