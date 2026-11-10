# Àríyá Invitation Designer — Photopea comparison and functionality checklist

Live verification checklist for `feat/studio-pro-designer`, started 10 November 2026. Checked boxes mean verified acceptance checks; partial checks remain unchecked. See [the test matrix](designer-test-matrix.csv) for evidence and limitations.

**Progress:** 78 verified, 13 partial, 191 not tested, 1 not applicable. [Verification scope, checks and screenshots](designer-verification.md).

## How to use this checklist

This is a functional acceptance checklist, not a claim that Àríyá already passes these tests or must become a complete photo editor. Photopea’s live workspace was opened and its official documentation reviewed. Individual checklist items have not all been exercised in Photopea. Detailed behaviours, particularly corner-radius widgets, are acceptance targets; exact current Photopea parity for those widgets is not established here.

Your pasted Pro Studio inventory is an input of claimed capabilities, not verified test evidence. The available checkout’s ToolRail differs from that inventory, so compare against the precise Àríyá branch/build you intend to release.

Use **Pass / Partial / Fail / Not available / Not applicable / Not tested**. Start with every item Not tested. Record build, browser, device, steps, expected result, actual result and evidence. A visible button or source-code implementation is not a pass. A feature can exist and still fail persistence or export.

Priorities: **Core** = invitation-editor baseline; **Useful** = deliberate enhancement; **Optional** = broad Photopea functionality that needs a product decision. Priority is a proposed recommendation, not a claim about launch readiness.

## Test fixture and repeatable routine

Create a 1200×1800 design with text “Àríyá — Ada & Kunle”, a long guest name, an ivory rectangle, a transparent PNG, two overlapping shapes, an image frame, a grouped pair and a demonstration pass. Include one locked and one hidden layer. Test at 25%, 100% and 400% zoom; desktop and phone; mouse and keyboard, with touch/stylus where supported.

For each relevant edit: perform it, inspect numeric values, undo, redo, save, reload and compare independent PNG/PDF output. Exercise failure states too. Keep real guest links and production tokens out of screenshots and shared reports.

## What the little controls are

- **Corner/edge squares:** resize handles.
- **Small inset corner circles/diamonds:** corner-radius widgets, where provided.
- **Rotation cursor/control:** rotation rather than rounding.
- **Vector knots and tangent handles:** path-anchor/Bézier editing, a different operation from live rounding.
- **Crop handles:** image or document crop, depending on the active mode.

A rounded-rectangle insertion preset or a single Radius input does not establish four independent draggable live corners. Shape layers and rounded image clipping need separate checks.

## Workspace and document

- [ ] **DES-001 · Core** — Create a blank design. Expected: Correct dimensions, background and orientation appear. **Not applicable** — Invitation opens from the event template; no required blank document or paper selection step. Evidence: `User requirement`.
- [ ] **DES-002 · Core** — Choose a preset. Expected: Preset dimensions are accurate and remain editable.
- [ ] **DES-003 · Core** — Change document width and height. Expected: Canvas dimensions and saved metadata agree.
- [ ] **DES-004 · Core** — Change aspect ratio. Expected: Defined resize/crop behaviour; no silent distortion.
- [ ] **DES-005 · Core** — Change background. Expected: Colour, texture and image appear in preview and export.
- [ ] **DES-006 · Core** — Open another document. Expected: Unsaved work is protected.
- [x] **DES-007 · Core** — Switch Simple and Pro modes. Expected: Supported content survives; unsupported edits are explained. **Pass** — Simple/Pro and light/dark round trips preserve the invitation. Evidence: `Chromium functional fixture`.
- [x] **DES-008 · Core** — Switch light and dark themes. Expected: Artwork colours stay unchanged. **Pass** — Simple/Pro and light/dark round trips preserve the invitation. Evidence: `Chromium functional fixture`.
- [x] **DES-009 · Core** — Open or collapse panels. Expected: Canvas viewport recalculates without changing artwork. **Pass** — 375, 390, 768, 1024, 1440, 1920 and 844×390 layouts checked; panels collapse and no horizontal page overflow. Evidence: `Chromium responsive fixture`.
- [x] **DES-010 · Core** — Resize the browser. Expected: Controls remain reachable; canvas does not jump. **Pass** — 375, 390, 768, 1024, 1440, 1920 and 844×390 layouts checked; panels collapse and no horizontal page overflow. Evidence: `Chromium responsive fixture`.
- [ ] **DES-011 · Core** — View contextual options. Expected: Options match the active tool and selected object.
- [x] **DES-012 · Core** — Inspect empty selection. Expected: Properties do not misleadingly edit the previous selection. **Pass** — Layer-list selection and deselection switch the inspector between the selected layer and document properties. Evidence: `Chromium detailed controls fixture`.
- [ ] **DES-013 · Core** — Use disabled actions. Expected: Disabled state and reason are understandable.
- [ ] **DES-014 · Core** — Inspect tooltips. Expected: Tool name, shortcut and purpose are discoverable.

## Selection and movement

- [x] **DES-015 · Core** — Select an object on canvas. Expected: Correct visible object and layer highlight together. **Pass** — Canvas selection updates the inspector; arrow nudge saves the changed coordinate. Evidence: `Chromium functional fixture`.
- [x] **DES-016 · Core** — Select from Layers. Expected: Canvas selection and inspector update together. **Pass** — Layer-list selection and deselection switch the inspector between the selected layer and document properties. Evidence: `Chromium detailed controls fixture`.
- [ ] **DES-017 · Core** — Click empty canvas. Expected: Selection clears predictably.
- [ ] **DES-018 · Core** — Select overlapping objects. Expected: Defined frontmost/deeper-selection behaviour works.
- [ ] **DES-019 · Core** — Shift-select objects. Expected: Adds or removes items without losing other selections.
- [ ] **DES-020 · Core** — Drag a selection marquee. Expected: Defined containment/intersection rule is consistent.
- [ ] **DES-021 · Core** — Move a selected object. Expected: Visual position and numeric coordinates agree.
- [ ] **DES-022 · Core** — Move multiple objects. Expected: Relative spacing is preserved.
- [x] **DES-023 · Core** — Select a locked object. Expected: It cannot accidentally move or edit. **Pass** — Locked rectangle ignores keyboard nudges, hides corner handles, and becomes editable after unlocking. Evidence: `guard-results.json`.
- [ ] **DES-024 · Core** — Select a hidden object in Layers. Expected: Visibility and selection rules are clear.
- [ ] **DES-025 · Core** — Drag over a transparent area. Expected: Hit testing follows the documented bounds or visible pixels.
- [x] **DES-026 · Core** — Nudge with arrow keys. Expected: Predictable documented movement increment. **Pass** — Canvas selection updates the inspector; arrow nudge saves the changed coordinate. Evidence: `Chromium functional fixture`.
- [ ] **DES-027 · Core** — Shift-nudge. Expected: Larger documented increment.
- [ ] **DES-028 · Core** — Alt/Option-drag duplicate. Expected: Original stays; copy has independent identity, if offered.
- [ ] **DES-029 · Core** — Move partly outside canvas. Expected: Selection remains recoverable.
- [ ] **DES-030 · Core** — Release pointer outside canvas. Expected: Drag ends; editor does not stay stuck.
- [ ] **DES-031 · Core** — Cancel a move. Expected: Original position is restored.
- [ ] **DES-032 · Core** — Undo a move. Expected: One deliberate drag is one undoable operation.

## Transform box and edge handles

- [ ] **DES-033 · Core** — Select an editable object. Expected: Four corner and four edge resize handles appear where applicable.
- [ ] **DES-034 · Core** — Drag each corner handle. Expected: Object resizes around the expected opposite anchor.
- [ ] **DES-035 · Core** — Drag each side handle. Expected: Width or height changes independently as intended.
- [ ] **DES-036 · Core** — Lock aspect ratio. Expected: Proportions remain stable. **Partial** — Numeric aspect lock persists on reload. Rust side/corner aspect constraints pass unit/parity tests; exhaustive canvas-handle combinations remain to be exercised. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [ ] **DES-037 · Core** — Toggle the chain icon. Expected: Numeric and canvas resizing follow the same rule. **Partial** — Numeric aspect lock persists on reload. Rust side/corner aspect constraints pass unit/parity tests; exhaustive canvas-handle combinations remain to be exercised. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [ ] **DES-038 · Core** — Resize from centre. Expected: Supported modifier or option preserves the centre.
- [ ] **DES-039 · Core** — Rotate with the rotation control. Expected: Object and selection box rotate together.
- [ ] **DES-040 · Core** — Rotate outside bounds. Expected: Behaviour is deliberate and discoverable if supported.
- [ ] **DES-041 · Core** — Snap rotation. Expected: Supported angle increments are consistent.
- [ ] **DES-042 · Core** — Edit X and Y numerically. Expected: Position updates accurately.
- [x] **DES-043 · Core** — Edit width and height numerically. Expected: Dimensions match the canvas result. **Pass** — Real Next.js/local Supabase save, reload, geometry, independent corners, offline recovery, tab conflict and backup checks passed. See authenticated acceptance evidence for the specific operations. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [x] **DES-044 · Core** — Edit angle numerically. Expected: Rotation matches the displayed value. **Pass** — Real Next.js/local Supabase save, reload, geometry, independent corners, offline recovery, tab conflict and backup checks passed. See authenticated acceptance evidence for the specific operations. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [ ] **DES-045 · Core** — Change transform origin. Expected: Subsequent rotation/scaling uses the new anchor if supported.
- [ ] **DES-046 · Core** — Flip horizontally and vertically. Expected: Artwork mirrors correctly; properties remain valid. **Partial** — Horizontal flip state verified; vertical flip remains untested. Evidence: `guard-results.json`.
- [ ] **DES-047 · Core** — Rotate 90 or 180 degrees. Expected: Exact result without cumulative drift.
- [x] **DES-048 · Core** — Resize an already rotated object. Expected: Handles follow its local axes without jumping. **Pass** — A 90-degree rotated rectangle resizes along its local side axis, keeps height, and preserves the opposite visual edge. Evidence: `resize-transform.test.ts + Chromium corner fixture`.
- [ ] **DES-049 · Core** — Resize a group. Expected: Child transforms and relative placement follow the documented rule.
- [ ] **DES-050 · Core** — Test negative, zero and very large sizes. Expected: Invalid values are blocked or safely normalized.
- [ ] **DES-051 · Core** — Cross a resize handle over its opposite edge. Expected: Defined flip/clamp behaviour; no broken geometry.
- [ ] **DES-052 · Core** — Resize at minimum dimensions. Expected: Object does not disappear or become unselectable.
- [ ] **DES-053 · Core** — Apply a transform. Expected: Result commits once.
- [ ] **DES-054 · Core** — Cancel a transform with Escape. Expected: Previous state returns.
- [ ] **DES-055 · Core** — Inspect cursor directions. Expected: Resize/rotate cursors match the handle orientation.
- [ ] **DES-056 · Core** — Compare zoom levels. Expected: Handle hit areas remain usable without altering document units.

## Corner-radius widgets and live corners

- [x] **DES-057 · Core** — Select a rectangle. Expected: Small radius widgets are distinguishable from resize handles. **Pass** — Four radius handles present; inward drag, rotated drag, undo/redo and Escape restoration verified. Evidence: `Chromium corner fixture + corner-radius.test.ts`.
- [x] **DES-058 · Core** — Locate all four radius controls. Expected: Top-left, top-right, bottom-right and bottom-left map correctly. **Pass** — Four radius handles present; inward drag, rotated drag, undo/redo and Escape restoration verified. Evidence: `Chromium corner fixture + corner-radius.test.ts`.
- [ ] **DES-059 · Core** — Hover a radius widget. Expected: Appropriate cursor, highlight or tooltip identifies its purpose.
- [x] **DES-060 · Core** — Drag a widget inward. Expected: Corner becomes progressively rounder without moving/resizing the object. **Pass** — Four radius handles present; inward drag, rotated drag, undo/redo and Escape restoration verified. Evidence: `Chromium corner fixture + corner-radius.test.ts`.
- [x] **DES-061 · Core** — Drag outward to zero. Expected: Returns to a square corner cleanly. **Pass** — Numeric radius, independent top-left edit, relink using top-left value, and outward zero clamp exercised. Evidence: `Chromium detailed controls fixture`.
- [ ] **DES-062 · Core** — Read the live value. Expected: Tooltip or inspector reports radius in declared units.
- [x] **DES-063 · Core** — Enter a radius numerically. Expected: Canvas widget and property field update together. **Pass** — Real Next.js/local Supabase save, reload, geometry, independent corners, offline recovery, tab conflict and backup checks passed. See authenticated acceptance evidence for the specific operations. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [x] **DES-064 · Core** — Link all corners. Expected: One change updates all four radii equally. **Pass** — Numeric radius, independent top-left edit, relink using top-left value, and outward zero clamp exercised. Evidence: `Chromium detailed controls fixture`.
- [x] **DES-065 · Core** — Unlink corners. Expected: Editing one corner leaves the other three unchanged. **Pass** — Numeric radius, independent top-left edit, relink using top-left value, and outward zero clamp exercised. Evidence: `Chromium detailed controls fixture`.
- [x] **DES-066 · Core** — Relink unequal corners. Expected: Defined equalization rule; no surprising silent reset. **Pass** — Numeric radius, independent top-left edit, relink using top-left value, and outward zero clamp exercised. Evidence: `Chromium detailed controls fixture`.
- [x] **DES-067 · Core** — Type an invalid radius. Expected: Rejects or normalizes negative, nonnumeric and excessive values. **Pass** — Real Next.js/local Supabase save, reload, geometry, independent corners, offline recovery, tab conflict and backup checks passed. See authenticated acceptance evidence for the specific operations. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [ ] **DES-068 · Core** — Reach geometric limits. Expected: Adjacent radii cannot create invalid or self-intersecting corners.
- [ ] **DES-069 · Core** — Change width or height after rounding. Expected: Radii follow the documented absolute/scaled rule and remain valid.
- [ ] **DES-070 · Core** — Resize with proportions unlocked. Expected: Corner geometry stays consistent with the chosen rule.
- [x] **DES-071 · Core** — Rotate a rounded shape. Expected: Widgets remain attached to the correct local corners. **Pass** — Live radius drag leaves geometry fixed; local corners follow rotation; Escape, undo and redo restore radius state. Evidence: `Chromium corner fixture`.
- [ ] **DES-072 · Core** — Change zoom to 25, 100 and 400 percent. Expected: Same drag produces the correct document-unit change.
- [ ] **DES-073 · Core** — Pan while an object is selected. Expected: Widgets remain aligned with the artwork.
- [ ] **DES-074 · Core** — Round a very small object. Expected: Widget hit targets do not become unusably tiny or overlap resize handles.
- [ ] **DES-075 · Core** — Round a large object. Expected: No lag, jumps or inconsistent value rounding.
- [ ] **DES-076 · Core** — Use a rounded image. Expected: Image pixels clip cleanly; original image remains available for later edits.
- [ ] **DES-077 · Core** — Inspect an image border and shadow. Expected: Effects follow the rounded boundary.
- [ ] **DES-078 · Core** — Select an ellipse, line, text or unsupported shape. Expected: Inapplicable radius widgets are hidden or clearly disabled.
- [ ] **DES-079 · Core** — Select multiple objects. Expected: Shared/mixed radius values are shown honestly.
- [x] **DES-080 · Core** — Lock an object. Expected: Radius dragging cannot edit it. **Pass** — Locked rectangle ignores keyboard nudges, hides corner handles, and becomes editable after unlocking. Evidence: `guard-results.json`.
- [x] **DES-081 · Core** — Start on a radius widget. Expected: Drag does not start a marquee, move or resize operation. **Pass** — Live radius drag leaves geometry fixed; local corners follow rotation; Escape, undo and redo restore radius state. Evidence: `Chromium corner fixture`.
- [ ] **DES-082 · Core** — Release pointer outside canvas. Expected: Radius edit ends safely.
- [x] **DES-083 · Core** — Press Escape during a radius drag. Expected: Original radii return under the chosen cancellation rule. **Pass** — Live radius drag leaves geometry fixed; local corners follow rotation; Escape, undo and redo restore radius state. Evidence: `Chromium corner fixture`.
- [x] **DES-084 · Core** — Undo one radius drag. Expected: One undo restores all radii affected by that gesture. **Pass** — Live radius drag leaves geometry fixed; local corners follow rotation; Escape, undo and redo restore radius state. Evidence: `Chromium corner fixture`.
- [x] **DES-085 · Core** — Redo the radius edit. Expected: Exact final values return. **Pass** — Live radius drag leaves geometry fixed; local corners follow rotation; Escape, undo and redo restore radius state. Evidence: `Chromium corner fixture`.
- [x] **DES-086 · Core** — Save, reload and restore a backup. Expected: Independent corner values survive. **Pass** — Real Next.js/local Supabase save, reload, geometry, independent corners, offline recovery, tab conflict and backup checks passed. See authenticated acceptance evidence for the specific operations. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [ ] **DES-087 · Core** — Export rounded artwork. Expected: Preview, PNG, JPEG and PDF agree at the edges.
- [ ] **DES-088 · Core** — Use a keyboard alternative. Expected: Inspector fields allow the same edit without precise dragging.
- [ ] **DES-089 · Core** — Test touch and stylus. Expected: Usable hit targets and pointer capture; page scrolling does not steal the edit.

## Shapes, paths and geometry

- [ ] **DES-090 · Core** — Create rectangle, ellipse and line. Expected: Correct geometry is inserted and selected.
- [ ] **DES-091 · Core** — Draw by dragging. Expected: Shape follows pointer and commits on release.
- [ ] **DES-092 · Core** — Constrain a square or circle. Expected: Supported proportion modifier works.
- [ ] **DES-093 · Core** — Create from the centre. Expected: Supported modifier or option works.
- [ ] **DES-094 · Core** — Insert arch, crest, diamond and triangle. Expected: Each advertised preset is distinct and editable.
- [ ] **DES-095 · Core** — Edit a star. Expected: Point count and inner radius work if offered.
- [ ] **DES-096 · Core** — Edit line endpoints. Expected: Position and length update correctly.
- [ ] **DES-097 · Core** — Set solid, gradient or no fill. Expected: Fill state persists across selection and export.
- [ ] **DES-098 · Core** — Set stroke colour and width. Expected: Inspector, canvas and export agree.
- [ ] **DES-099 · Core** — Change stroke alignment. Expected: Inside/centre/outside behaves as documented if offered.
- [ ] **DES-100 · Core** — Change line caps and joins. Expected: Butt/round/square and join options render accurately if offered.
- [ ] **DES-101 · Core** — Change dash pattern. Expected: Pattern and dash offset remain consistent after scaling.
- [ ] **DES-102 · Core** — Duplicate a shape. Expected: Geometry and styling copy without shared-edit bugs.
- [ ] **DES-103 · Core** — Edit vector anchors. Expected: Direct selection moves the intended knot only if supported.
- [ ] **DES-104 · Core** — Edit Bézier handles. Expected: Smooth/corner and linked/unlinked rules work if supported.
- [ ] **DES-105 · Core** — Close a path. Expected: Final segment joins correctly.
- [ ] **DES-106 · Core** — Combine or subtract shapes. Expected: Boolean results remain editable if supported.
- [ ] **DES-107 · Core** — Inspect vector export. Expected: Shapes stay sharp; supported vector structure is preserved.

## Typography and text editing

- [ ] **DES-108 · Core** — Click with Type tool. Expected: Creates point text at the chosen origin.
- [ ] **DES-109 · Core** — Drag with Type tool. Expected: Creates a paragraph text box.
- [x] **DES-110 · Core** — Enter existing text. Expected: Correct layer enters editing; other tools do not interfere. **Pass** — Actual inline editing retains focus, commits and cancels, preserves accented/multiline text, and supports document undo/redo. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [ ] **DES-111 · Core** — Select part of a sentence. Expected: Character edits affect only the selected range where supported.
- [x] **DES-112 · Core** — Double-click to edit. Expected: Text cursor appears at a sensible location. **Pass** — Actual inline editing retains focus, commits and cancels, preserves accented/multiline text, and supports document undo/redo. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [x] **DES-113 · Core** — Commit text editing. Expected: Content and formatting persist. **Pass** — Actual inline editing retains focus, commits and cancels, preserves accented/multiline text, and supports document undo/redo. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [x] **DES-114 · Core** — Cancel text editing. Expected: Defined prior state returns without losing unrelated changes. **Pass** — Actual inline editing retains focus, commits and cancels, preserves accented/multiline text, and supports document undo/redo. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [ ] **DES-115 · Core** — Paste plain and formatted text. Expected: Supported formatting is retained or stripped predictably.
- [x] **DES-116 · Core** — Enter multiline text. Expected: Line breaks survive saving and exporting. **Pass** — Actual inline editing retains focus, commits and cancels, preserves accented/multiline text, and supports document undo/redo. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [ ] **DES-117 · Core** — Resize a paragraph box. Expected: Text reflows without unintended font scaling.
- [ ] **DES-118 · Core** — Change family, size, weight and italic. Expected: Actual available font style is rendered.
- [ ] **DES-119 · Core** — Use a missing font. Expected: Clear fallback; no silent disappearance.
- [ ] **DES-120 · Core** — Load fonts slowly. Expected: Layout settles before preview/export is declared ready.
- [ ] **DES-121 · Core** — Set left, centre, right and justified alignment. Expected: Paragraph layout follows the setting.
- [ ] **DES-122 · Core** — Change tracking and line height. Expected: Numeric value and visual spacing agree.
- [ ] **DES-123 · Core** — Apply underline, strike or case options. Expected: Available options work consistently.
- [ ] **DES-124 · Core** — Set text colour or gradient. Expected: Text and selection show the correct style.
- [x] **DES-125 · Core** — Test Àríyá and Yoruba tone marks. Expected: Accents are intact and not clipped. **Pass** — Actual inline editing retains focus, commits and cancels, preserves accented/multiline text, and supports document undo/redo. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [ ] **DES-126 · Core** — Test long Nigerian names. Expected: Wrapping and overflow are handled clearly.
- [ ] **DES-127 · Core** — Use emoji and mixed scripts. Expected: Supported fallback rendering remains stable.
- [ ] **DES-128 · Core** — Delete text while editing. Expected: Deletes characters, not the entire layer.
- [ ] **DES-129 · Core** — Use shortcuts while typing. Expected: Tool hotkeys do not replace the active text tool accidentally.
- [x] **DES-130 · Core** — Undo text edits. Expected: Useful edit grouping; caret and content recover correctly. **Pass** — Actual inline editing retains focus, commits and cancels, preserves accented/multiline text, and supports document undo/redo. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [ ] **DES-131 · Core** — Export text. Expected: No clipped descenders, missing accents or substituted fonts.
- [ ] **DES-132 · Core** — Edit text on a path. Expected: Start/end and direction work if deliberately supported.

## Images, crop and replacement

- [x] **DES-133 · Core** — Place PNG, JPEG and WebP. Expected: Image imports at a sensible size and remains editable. **Pass** — PNG/JPEG/WebP uploads, frame-preserving replacement, contain/cover, focal position, reload and damaged-file rejection passed through local storage. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [ ] **DES-134 · Core** — Place a transparent PNG. Expected: Alpha is preserved. **Partial** — Transparent PNG and EXIF-oriented JPEG uploaded and decoded in the app; dedicated alpha-pixel and orientation assertions remain. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [ ] **DES-135 · Core** — Drag a file onto the canvas. Expected: Inserts at the expected position without navigating away.
- [x] **DES-136 · Core** — Replace an image. Expected: Defined frame, crop and style preservation. **Pass** — PNG/JPEG/WebP uploads, frame-preserving replacement, contain/cover, focal position, reload and damaged-file rejection passed through local storage. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [x] **DES-137 · Core** — Use contain versus cover. Expected: Correct fit without unintended stretching. **Pass** — PNG/JPEG/WebP uploads, frame-preserving replacement, contain/cover, focal position, reload and damaged-file rejection passed through local storage. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [x] **DES-138 · Core** — Move the focal point. Expected: Crop updates while the frame stays fixed. **Pass** — PNG/JPEG/WebP uploads, frame-preserving replacement, contain/cover, focal position, reload and damaged-file rejection passed through local storage. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [ ] **DES-139 · Core** — Enter crop mode. Expected: Crop controls are distinct from object transforms.
- [ ] **DES-140 · Core** — Drag crop edges and corners. Expected: Correct image region is retained.
- [ ] **DES-141 · Core** — Lock a crop aspect ratio. Expected: Ratio remains exact.
- [ ] **DES-142 · Core** — Preview a rule-of-thirds overlay. Expected: Overlay assists editing and stays out of exports.
- [ ] **DES-143 · Core** — Apply crop. Expected: Defined nondestructive/destructive behaviour is respected.
- [ ] **DES-144 · Core** — Cancel crop. Expected: Original crop returns.
- [ ] **DES-145 · Core** — Distinguish image crop from canvas resize. Expected: One does not accidentally perform the other.
- [ ] **DES-146 · Core** — Import a large image. Expected: Responsive progress and usable final resolution.
- [x] **DES-147 · Core** — Import a damaged or unsupported file. Expected: Clear error; existing work remains intact. **Pass** — PNG/JPEG/WebP uploads, frame-preserving replacement, contain/cover, focal position, reload and damaged-file rejection passed through local storage. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [ ] **DES-148 · Core** — Handle image orientation. Expected: Portrait EXIF orientation is respected. **Partial** — Transparent PNG and EXIF-oriented JPEG uploaded and decoded in the app; dedicated alpha-pixel and orientation assertions remain. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [ ] **DES-149 · Core** — Remove the image background. Expected: Works only if offered; original can be recovered.
- [x] **DES-150 · Core** — Save and reload image assets. Expected: No missing-image placeholders or broken references. **Pass** — PNG/JPEG/WebP uploads, frame-preserving replacement, contain/cover, focal position, reload and damaged-file rejection passed through local storage. Evidence: `Authenticated designer-acceptance.spec.ts`.

## Colour, gradient and sampling

- [ ] **DES-151 · Core** — Use foreground and background swatches. Expected: Clearly identified active colour target.
- [ ] **DES-152 · Core** — Swap and reset swatches. Expected: Values change predictably; artwork changes only when intended.
- [x] **DES-153 · Core** — Enter HEX and RGB values. Expected: Correct colour and input validation. **Pass** — House text accepts colour edits. HEX and all RGB channels stay synchronized; keyboard operation of saturation/brightness passed. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [x] **DES-154 · Core** — Adjust hue and saturation/value field. Expected: Controls stay synchronized. **Pass** — House text accepts colour edits. HEX and all RGB channels stay synchronized; keyboard operation of saturation/brightness passed. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [ ] **DES-155 · Core** — Set alpha. Expected: Opacity preview matches the final colour.
- [x] **DES-156 · Core** — Apply a brand palette swatch. Expected: Correct selected property changes. **Pass** — House text accepts colour edits. HEX and all RGB channels stay synchronized; keyboard operation of saturation/brightness passed. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [ ] **DES-157 · Core** — Keep recent or saved colours. Expected: Values persist under the promised scope.
- [ ] **DES-158 · Core** — Use linear and radial gradients. Expected: Direction and interpolation are correct.
- [ ] **DES-159 · Core** — Drag gradient start and end. Expected: Canvas controls and property values agree.
- [ ] **DES-160 · Core** — Add, remove and reorder gradient stops. Expected: Stop selection and resulting gradient are correct.
- [ ] **DES-161 · Core** — Adjust a stop position or opacity. Expected: Smooth, reproducible result.
- [ ] **DES-162 · Core** — Use eyedropper. Expected: Samples the intended pixel and property.
- [ ] **DES-163 · Core** — Cancel or deny eyedropper permission. Expected: Graceful fallback without changing colour.
- [ ] **DES-164 · Core** — Use eyedropper in an unsupported browser. Expected: Accessible manual alternative.
- [ ] **DES-165 · Core** — Check colour after export. Expected: No unexpected shifts relative to the supported colour workflow.

## Layers, groups and stacking

- [ ] **DES-166 · Core** — Insert any object. Expected: New layer is visible, named and selected.
- [ ] **DES-167 · Core** — Rename via Layers. Expected: Name persists; artwork content is unaffected.
- [x] **DES-168 · Core** — Toggle layer visibility. Expected: Canvas, thumbnail and export agree. **Pass** — Hide removes the selected rectangle from the canvas; Show restores it. Evidence: `guard-results.json`.
- [x] **DES-169 · Core** — Lock and unlock a layer. Expected: Canvas gestures and keyboard actions respect lock. **Pass** — Locked rectangle ignores keyboard nudges, hides corner handles, and becomes editable after unlocking. Evidence: `guard-results.json`.
- [ ] **DES-170 · Core** — Reorder by dragging. Expected: Canvas stacking and layer order match.
- [ ] **DES-171 · Core** — Bring forward, send backward, front and back. Expected: Exact predictable order changes.
- [x] **DES-172 · Core** — Duplicate a layer. Expected: Independent editable copy with unique identity. **Pass** — Duplicate creates a new layer; both Rust and fallback copies preserve effects and have an independent group identity. Evidence: `detail-results.json + engine.parity.test.ts`.
- [ ] **DES-173 · Core** — Delete a layer. Expected: Correct item removed; undo restores it.
- [ ] **DES-174 · Core** — Group and ungroup. Expected: Membership, positions and order survive.
- [ ] **DES-175 · Core** — Move or transform a group. Expected: Child layout is retained.
- [ ] **DES-176 · Core** — Nest groups. Expected: Selection and editing remain understandable if supported.
- [ ] **DES-177 · Core** — Select several rows. Expected: Multi-selection matches the canvas.
- [ ] **DES-178 · Core** — Change opacity. Expected: All supported layer kinds render consistently.
- [ ] **DES-179 · Core** — Set blend modes. Expected: Preview and export agree for every offered mode.
- [ ] **DES-180 · Core** — Identify selected, locked and hidden states. Expected: Indicators remain legible in both themes.
- [ ] **DES-181 · Core** — Edit the background row. Expected: Follows a clear separate layer policy.

## Alignment, guides and navigation

- [ ] **DES-182 · Core** — Align left, centre, right, top, middle and bottom. Expected: Correct relative-to-canvas or relative-to-selection target.
- [ ] **DES-183 · Core** — Switch alignment reference. Expected: Behaviour and label are unambiguous.
- [ ] **DES-184 · Core** — Distribute horizontally or vertically. Expected: Defined spacing or centre distribution is consistent.
- [ ] **DES-185 · Core** — Snap to canvas centres and edges. Expected: Guide appears and object lands accurately.
- [ ] **DES-186 · Core** — Snap to other objects. Expected: Guides represent genuine alignments.
- [ ] **DES-187 · Core** — Temporarily disable snapping. Expected: Modifier or toggle works during a drag.
- [x] **DES-188 · Core** — Toggle rulers. Expected: Units and zero points match document coordinates. **Pass** — Rulers toggle through the button and Cmd/Ctrl+R. Evidence: `guard-results.json`.
- [x] **DES-189 · Core** — Drag guides from rulers. Expected: Correct horizontal or vertical guide is created. **Pass** — Guide creation, locking, unlocking and clearing passed. Independent grid snapping moves layers to 100 px coordinates. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [x] **DES-190 · Core** — Move, delete and lock guides. Expected: Guides remain separate from artwork. **Pass** — Guide creation, locking, unlocking and clearing passed. Independent grid snapping moves layers to 100 px coordinates. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [x] **DES-191 · Core** — Toggle grid and snap-to-grid. Expected: Visibility and snapping are independently understandable. **Pass** — Guide creation, locking, unlocking and clearing passed. Independent grid snapping moves layers to 100 px coordinates. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [x] **DES-192 · Core** — Zoom in, out and fit. Expected: Artwork remains correctly positioned. **Pass** — Actual-size and Fit work at desktop; fit recalculates across tested viewport sizes. Evidence: `Chromium detailed controls fixture + responsive fixture`.
- [ ] **DES-193 · Core** — Zoom around pointer. Expected: Chosen point remains anchored if offered.
- [ ] **DES-194 · Core** — Pan with hand or Space. Expected: Viewport moves, artwork does not.
- [x] **DES-195 · Core** — Use navigator mini-map. Expected: Preview and viewport state stay synchronized. **Pass** — Navigator renders actual artwork, shows the viewport and pans the canvas when clicked; 25%/400% presets update the view. Evidence: `guard-results.json`.
- [x] **DES-196 · Core** — Return to 100 percent. Expected: Document-pixel scale follows the declared convention. **Pass** — Cmd/Ctrl+1 renders the 1080px-wide document at 1080 CSS pixels. Cmd/Ctrl+0 restores fit. Evidence: `Chromium detailed controls fixture`.
- [x] **DES-197 · Core** — Export with guides, handles and grid visible. Expected: Editing overlays are excluded. **Pass** — Live selection outline is absent from exported invitation; guides and transform handles remain outside exported card. Evidence: `Chromium PNG export inspection`.

## Effects and nondestructive editing

- [ ] **DES-198 · Useful** — Add drop shadow. Expected: Offset, blur, spread, colour and opacity work.
- [ ] **DES-199 · Useful** — Apply inner shadow or glow. Expected: Bounds, blending and clipping are correct.
- [ ] **DES-200 · Useful** — Apply a border or stroke effect. Expected: Follows the object and corner geometry.
- [ ] **DES-201 · Useful** — Apply foil or metallic treatment. Expected: Stable appearance across zoom, reload and export.
- [ ] **DES-202 · Useful** — Adjust brightness, contrast or saturation. Expected: Original image can be recovered where promised.
- [ ] **DES-203 · Useful** — Apply blur. Expected: Blur radius and export bounds are correct.
- [ ] **DES-204 · Useful** — Toggle an effect. Expected: Returns to the exact original state.
- [ ] **DES-205 · Useful** — Copy and paste styles. Expected: Compatible styles transfer without overwriting content.
- [ ] **DES-206 · Useful** — Add a clipping mask. Expected: Image clips to the intended shape without destructive deletion.
- [ ] **DES-207 · Useful** — Edit a raster or vector mask. Expected: Visibility changes without editing original content if offered.
- [ ] **DES-208 · Useful** — Replace smart-object content. Expected: Layout and transforms are retained if offered.
- [ ] **DES-209 · Useful** — Resize after adding effects. Expected: Explicit policy for scaling strokes, radii and shadows.

## History, saving and recovery

- [ ] **DES-210 · Core** — Undo and redo each editing operation. Expected: Exact preceding/following state returns.
- [x] **DES-211 · Core** — Undo and then make a new edit. Expected: Redo branch is handled predictably. **Pass** — Undo followed by a new edit clears redo. Evidence: `useDesignerDoc.test.tsx`.
- [ ] **DES-212 · Core** — Restore a history entry. Expected: Layers, selection and properties recover coherently.
- [x] **DES-213 · Core** — Reach the history limit. Expected: Defined limit; current work remains stable. **Pass** — 80 edits retain a 50-operation history; undo returns to the oldest retained state without losing the current design. Evidence: `useDesignerDoc.test.tsx`.
- [x] **DES-214 · Core** — Autosave a design. Expected: Saving, saved and failed states are honest. **Pass** — Real Next.js/local Supabase save, reload, geometry, independent corners, offline recovery, tab conflict and backup checks passed. See authenticated acceptance evidence for the specific operations. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [x] **DES-215 · Core** — Refresh after saving. Expected: Content, geometry, fonts and assets return. **Pass** — Real Next.js/local Supabase save, reload, geometry, independent corners, offline recovery, tab conflict and backup checks passed. See authenticated acceptance evidence for the specific operations. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [ ] **DES-216 · Core** — Navigate away during save. Expected: No silent loss or false saved state. **Partial** — Unmount flush and serialized writes verified; real route navigation pending. Evidence: `useDesignerDoc.test.tsx`.
- [x] **DES-217 · Core** — Lose connection during save. Expected: Clear failure and a useful retry/recovery path. **Pass** — Real Next.js/local Supabase save, reload, geometry, independent corners, offline recovery, tab conflict and backup checks passed. See authenticated acceptance evidence for the specific operations. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [x] **DES-218 · Core** — Reload after a failed save. Expected: Previously saved version stays intact. **Pass** — Real Next.js/local Supabase save, reload, geometry, independent corners, offline recovery, tab conflict and backup checks passed. See authenticated acceptance evidence for the specific operations. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [x] **DES-219 · Core** — Edit in two tabs. Expected: Conflicts are handled without silent overwrites. **Pass** — Real Next.js/local Supabase save, reload, geometry, independent corners, offline recovery, tab conflict and backup checks passed. See authenticated acceptance evidence for the specific operations. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [x] **DES-220 · Core** — Export and re-import a design backup. Expected: Supported editable structure round-trips. **Pass** — Real Next.js/local Supabase save, reload, geometry, independent corners, offline recovery, tab conflict and backup checks passed. See authenticated acceptance evidence for the specific operations. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [x] **DES-221 · Core** — Import malformed JSON. Expected: Safe validation; current document survives. **Pass** — Real Next.js/local Supabase save, reload, geometry, independent corners, offline recovery, tab conflict and backup checks passed. See authenticated acceptance evidence for the specific operations. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [x] **DES-222 · Core** — Open an older backup. Expected: Supported migration or clear incompatibility message. **Pass** — Real Next.js/local Supabase save, reload, geometry, independent corners, offline recovery, tab conflict and backup checks passed. See authenticated acceptance evidence for the specific operations. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [x] **DES-223 · Core** — Recover after an error. Expected: Editor remains usable without resetting unrelated work. **Pass** — Real Next.js/local Supabase save, reload, geometry, independent corners, offline recovery, tab conflict and backup checks passed. See authenticated acceptance evidence for the specific operations. Evidence: `Authenticated designer-acceptance.spec.ts`.

## Export and production output

- [x] **DES-224 · Core** — Export PNG. Expected: Exact declared pixel dimensions and alpha policy. **Pass** — Actual Next.js PNG/JPEG/PDF downloads contain local uploaded artwork. PNG/JPEG dimensions and PDF page size were inspected independently. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [x] **DES-225 · Core** — Export JPEG. Expected: Declared dimensions, background and quality settings. **Pass** — Actual Next.js PNG/JPEG/PDF downloads contain local uploaded artwork. PNG/JPEG dimensions and PDF page size were inspected independently. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [x] **DES-226 · Core** — Export PDF. Expected: Correct physical page dimensions and supported text/vector fidelity. **Pass** — Actual Next.js PNG/JPEG/PDF downloads contain local uploaded artwork. PNG/JPEG dimensions and PDF page size were inspected independently. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [ ] **DES-227 · Core** — Select output scale. Expected: Real pixel count matches the stated multiplier.
- [x] **DES-228 · Core** — Claim 300 DPI. Expected: Physical size and raster resolution actually justify that claim. **Pass** — Actual Next.js PNG/JPEG/PDF downloads contain local uploaded artwork. PNG/JPEG dimensions and PDF page size were inspected independently. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [ ] **DES-229 · Core** — Export fonts. Expected: Required glyphs render; PDF embedding/outline policy is clear. **Partial** — Representative uploaded-image/text exports pass; exhaustive glyph, blend-mode, rotated/rounded edge and transparency comparisons remain. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [x] **DES-230 · Core** — Export images. Expected: No low-resolution surprise or missing assets. **Pass** — Actual Next.js PNG/JPEG/PDF downloads contain local uploaded artwork. PNG/JPEG dimensions and PDF page size were inspected independently. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [ ] **DES-231 · Core** — Export effects and blend modes. Expected: Match supported canvas rendering. **Partial** — Representative uploaded-image/text exports pass; exhaustive glyph, blend-mode, rotated/rounded edge and transparency comparisons remain. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [ ] **DES-232 · Core** — Export rotated and rounded objects. Expected: No clipped shadows or corner artifacts. **Partial** — Representative uploaded-image/text exports pass; exhaustive glyph, blend-mode, rotated/rounded edge and transparency comparisons remain. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [ ] **DES-233 · Core** — Export overlapping transparent objects. Expected: Expected compositing preserved. **Partial** — Representative uploaded-image/text exports pass; exhaustive glyph, blend-mode, rotated/rounded edge and transparency comparisons remain. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [x] **DES-234 · Core** — Export after a fresh change. Expected: Uses current design, not a stale preview. **Pass** — Actual Next.js PNG/JPEG/PDF downloads contain local uploaded artwork. PNG/JPEG dimensions and PDF page size were inspected independently. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [ ] **DES-235 · Core** — Export while assets load. Expected: Waits or reports missing assets honestly.
- [ ] **DES-236 · Core** — Cancel or fail export. Expected: No blank download presented as successful.
- [x] **DES-237 · Core** — Inspect download name and format. Expected: Correct extension, MIME type and descriptive filename. **Pass** — Actual Next.js PNG/JPEG/PDF downloads contain local uploaded artwork. PNG/JPEG dimensions and PDF page size were inspected independently. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [x] **DES-238 · Core** — Reopen exported output. Expected: Independent viewer reproduces the design. **Pass** — Actual Next.js PNG/JPEG/PDF downloads contain local uploaded artwork. PNG/JPEG dimensions and PDF page size were inspected independently. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [ ] **DES-239 · Core** — Compare guest invitation with saved designer. Expected: Wording, layout and images remain consistent.

## Àríyá-specific invitation and pass rules

- [ ] **DES-240 · Core** — Insert the monogram seal. Expected: Correct initials and styling; movable under intended rules.
- [ ] **DES-241 · Core** — Insert the guest-entry seal. Expected: Enforces the permitted number of pass elements.
- [ ] **DES-242 · Core** — Duplicate or paste a pass element. Expected: Does not bypass the single-pass rule.
- [ ] **DES-243 · Core** — Remove and re-add the pass. Expected: Model and layer state remain consistent.
- [ ] **DES-244 · Core** — Preview guest personalization. Expected: Correct names and party-specific details appear.
- [ ] **DES-245 · Core** — Test very long guest and couple names. Expected: Safe wrapping with no hidden text.
- [ ] **DES-246 · Core** — Preview sample and real pass data. Expected: Demo tokens cannot be mistaken for production passes.
- [x] **DES-247 · Core** — Export and scan the QR code. Expected: Readable contrast, quiet zone and sufficient effective size. **Pass** — The actual exported PNG sample entry seal decoded successfully using the same ZXing decoder family used by check-in. Sample content only. Evidence: `ZXing independent PNG decode`.
- [ ] **DES-248 · Core** — Style the pass area. Expected: Required code information cannot be accidentally destroyed.
- [ ] **DES-249 · Core** — Edit event details. Expected: Designer and guest-facing output follow the intended update policy.
- [x] **DES-250 · Core** — Use Simple to Pro and back. Expected: Personalized fields and protected elements stay valid. **Pass** — Real Next.js/local Supabase save, reload, geometry, independent corners, offline recovery, tab conflict and backup checks passed. See authenticated acceptance evidence for the specific operations. Evidence: `Authenticated designer-acceptance.spec.ts`.
- [ ] **DES-251 · Core** — Apply a template. Expected: Clearly defines which content and styles will be replaced.
- [ ] **DES-252 · Core** — Save a reusable template. Expected: Does not retain private guest details or personal tokens.

## Small controls, accessibility and input safety

- [ ] **DES-253 · Core** — Use every icon-only button. Expected: Accessible name and visible tooltip describe the action.
- [ ] **DES-254 · Core** — Tab through toolbars and panels. Expected: Logical order and visible focus.
- [ ] **DES-255 · Core** — Use menus and flyouts by keyboard. Expected: Arrow/Enter/Escape behaviour is predictable. **Partial** — File menu supports arrow selection and Escape; shape flyout keyboard coverage remains open. Evidence: `Chromium keyboard menu check`.
- [x] **DES-256 · Core** — Open and close a modal. Expected: Focus is contained and returns to its trigger. **Pass** — Tab remains inside export dialog; Escape closes it; focus returns to Export. Mobile PDF download also restores focus. Evidence: `Chromium detailed controls and mobile fixtures`.
- [ ] **DES-257 · Core** — Use transform and radius numeric fields. Expected: Full keyboard alternative to dragging.
- [ ] **DES-258 · Core** — Test tool shortcut collisions. Expected: Each shortcut is unique or has documented context.
- [ ] **DES-259 · Core** — Test I for image and eyedropper. Expected: No ambiguous simultaneous activation. **Partial** — I uses screen sampling; Shift+I imports a picture. Native sampler interaction is not automated. Evidence: `Shortcut implementation + browser fixture`.
- [ ] **DES-260 · Core** — Press shortcuts while editing an input. Expected: No accidental tool switch, deletion or select-all of artwork.
- [ ] **DES-261 · Core** — Use Cmd/Ctrl+Z in text and document modes. Expected: Correct undo scope.
- [ ] **DES-262 · Core** — Release Space or a modifier outside the window. Expected: No stuck pan/resize/duplicate state.
- [ ] **DES-263 · Core** — Switch tabs during a drag. Expected: Pointer capture and modifier state recover safely.
- [ ] **DES-264 · Core** — Test touch scrolling near handles. Expected: No accidental page pan or unwanted artwork edit. **Partial** — Native emulated touch drag updates a layer and Undo restores its position. Handle/stylus and physical-device checks remain open. Evidence: `Chromium mobile touch fixture`.
- [ ] **DES-265 · Core** — Test stylus input. Expected: Pointer coordinates and pressure options work only where supported.
- [ ] **DES-266 · Core** — Use browser zoom and high-DPI display. Expected: Controls remain aligned and legible.
- [ ] **DES-267 · Core** — Use reduced motion. Expected: Essential editing feedback remains available.
- [x] **DES-268 · Core** — Test 390px and tablet widths. Expected: Every essential tool remains reachable; no offscreen dialogs. **Pass** — 375, 390, 768, 1024, 1440, 1920 and 844×390 layouts checked; panels collapse and no horizontal page overflow. Evidence: `Chromium responsive fixture`.

## Advanced Photopea breadth

- [ ] **DES-269 · Optional** — Brush, pencil and eraser. Expected: Brush size, hardness and opacity controls work if introduced.
- [ ] **DES-270 · Optional** — Marquee, lasso and magic-wand selection. Expected: Add/subtract/intersect modes work if introduced.
- [ ] **DES-271 · Optional** — Quick selection and refine edge. Expected: Accurate selection refinement if introduced.
- [ ] **DES-272 · Optional** — Clone, healing and patch tools. Expected: Predictable retouching if introduced.
- [ ] **DES-273 · Optional** — Gradient and paint bucket on raster data. Expected: Correct selection and layer scope if introduced.
- [ ] **DES-274 · Optional** — Levels, curves and colour balance. Expected: Nondestructive adjustment workflow if introduced.
- [ ] **DES-275 · Optional** — Channels and channel editing. Expected: Correct composite and per-channel display if introduced.
- [ ] **DES-276 · Optional** — Perspective, distort and warp. Expected: Control points, apply and cancel work if introduced.
- [ ] **DES-277 · Optional** — Liquify and puppet warp. Expected: Reversible deformation with clear scope if introduced.
- [ ] **DES-278 · Optional** — PSD import and export. Expected: Layer/text/style compatibility is stated and tested if advertised.
- [ ] **DES-279 · Optional** — SVG import and export. Expected: Supported paths and appearance are preserved; untrusted content is handled safely.
- [ ] **DES-280 · Optional** — RAW camera-file development. Expected: Useful only if photographic editing becomes product scope.
- [ ] **DES-281 · Optional** — Artboards and multi-page projects. Expected: Independent sizing and export if introduced.
- [ ] **DES-282 · Optional** — Actions, scripts and batch processing. Expected: Safe, predictable scope if introduced.
- [ ] **DES-283 · Optional** — Animation and video timelines. Expected: Separate product scope, not needed for a static invitation studio.

## Minimum evidence for a pass

For each failure record: ID; Àríyá URL/build; browser/device; selected object and active tool; exact actions and modifiers; expected versus actual; screenshot/recording; whether undo, reload or export reproduces it. Classify data loss, corrupted exports and unreadable pass codes above visual polish issues.

## Suggested first testing order

1. Save/reload/export integrity and undo/redo.
2. Selection, transforms and all corner-radius checks.
3. Text, accents, image fitting and crop.
4. Invitation personalization and pass readability.
5. Layers, snapping, shortcuts, small controls and phone usability.
6. Deliberately selected advanced Photopea capabilities.

## Official reference sources

- Workspace: https://www.photopea.com/learn/workspace
- Transform handles, origin, modifiers, perspective and warp: https://www.photopea.com/learn/free-transform
- Shape layers, paths and vector masks: https://www.photopea.com/learn/vector-graphics
- Shape creation and modes: https://www.photopea.com/learn/vg-creating
- Path selection, anchors and Bézier handles: https://www.photopea.com/learn/vg-manipulation
- Point, paragraph and path text: https://www.photopea.com/learn/text
- Guides and snapping: https://www.photopea.com/learn/guides-grid-snapping

These sources support the feature families. They are not evidence that every detailed acceptance condition above is implemented in Photopea or Àríyá.
