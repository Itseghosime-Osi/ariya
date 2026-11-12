# Design review: competitor complaints mapped to the studio

Every item in `designer-redesign-checklist.md` sections A to L, with the screen or setting it lives on today (or why it does not exist yet). Status is read from the checklist, so it stays honest as items close.

| ID  | Item                                                           | Priority | Status | Where it lives in the studio                                                                                                      |
| --- | -------------------------------------------------------------- | -------- | ------ | --------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Ease of use for non-designers                                  | P0       | Open   | Not built or only partly built; see the checklist note                                                                            |
| A2  | Real-time feel and stability                                   | P0       | Closed | Status line under the title: saved / saving / offline; saves queue and sync (`useDesignerDoc.ts`)                                 |
| A3  | Auto layout and components idea                                | P1       | Open   | Not built or only partly built; see the checklist note                                                                            |
| A4  | Developer-style handoff, our version: print handoff            | P1       | Open   | Not built or only partly built; see the checklist note                                                                            |
| B1  | Consistent export                                              | P0       | Open   | Not built or only partly built; see the checklist note                                                                            |
| B2  | Show what you will get before you export                       | P0       | Closed | Export dialog: 'You will get…' line (`ExportModal.tsx`)                                                                           |
| B3  | Fonts never change on export                                   | P0       | Open   | Not built or only partly built; see the checklist note                                                                            |
| B4  | Editable source, not only flattened files                      | P1       | Closed | Picture import accepts SVG, PDF, .ai, .psd as flat pictures; JSON backup (`import-formats.ts`)                                    |
| B5  | Print-ready option                                             | P1       | Closed | View > Print guides; Export > PDF > bleed and crop marks                                                                          |
| B6  | Sensible file names                                            | P1       | Open   | Not built or only partly built; see the checklist note                                                                            |
| B7  | Transparent PNG and small-file option for WhatsApp sharing     | P2       | Closed | Export > Small for WhatsApp (JPEG, 1600 px, ≤ 400 KB)                                                                             |
| C1  | No surprise locks                                              | P0       | Closed | Not applicable: designer is fully included (owner decision)                                                                       |
| C2  | Free versus paid is stated in one place                        | P0       | Closed | Not applicable (owner decision)                                                                                                   |
| C3  | No seat tricks                                                 | P1       | Closed | Not applicable (owner decision)                                                                                                   |
| C4  | Gentle upgrade prompts                                         | P1       | Closed | Not applicable (owner decision)                                                                                                   |
| C5  | Premium filter clarity                                         | P2       | Closed | Not applicable (owner decision)                                                                                                   |
| D1  | Progressive tools                                              | P0       | Open   | Not built or only partly built; see the checklist note                                                                            |
| D2  | Guided first run                                               | P0       | Closed | Help > Show the quick tour (four steps, skippable)                                                                                |
| D3  | Plain names for tools                                          | P0       | Open   | Not built or only partly built; see the checklist note                                                                            |
| D4  | Find-anything search                                           | P1       | Closed | ⌘/Ctrl K command palette                                                                                                          |
| D5  | Clear folders and navigation (Canva and Figma both criticised) | P1       | Open   | Not built or only partly built; see the checklist note                                                                            |
| D6  | Shortcut help                                                  | P1       | Closed | `?` key, header `?` button, Help menu: shortcut sheet                                                                             |
| D7  | Short video or GIF help per tool in Help                       | P2       | Open   | Not built or only partly built; see the checklist note                                                                            |
| E1  | Performance budget                                             | P0       | Open   | Not built or only partly built; see the checklist note                                                                            |
| E2  | Heavy work off the main thread                                 | P1       | Open   | Not built or only partly built; see the checklist note                                                                            |
| E3  | Image size control                                             | P1       | Open   | Not built or only partly built; see the checklist note                                                                            |
| E4  | Fast open                                                      | P1       | Open   | Not built or only partly built; see the checklist note                                                                            |
| E5  | Offline-tolerant editing                                       | P2       | Closed | Same as A2                                                                                                                        |
| F1  | Visible help                                                   | P0       | Closed | Help button, Help menu, help@ariyaday.com in the Help dialog                                                                      |
| F2  | Clear error messages                                           | P1       | Open   | Not built or only partly built; see the checklist note                                                                            |
| F3  | Version history users can find                                 | P1       | Open   | Not built or only partly built; see the checklist note                                                                            |
| F4  | Account sharing clarity                                        | P2       | Open   | Not built or only partly built; see the checklist note                                                                            |
| G1  | Fresh Nigerian-wedding-first templates                         | P0       | Closed | All four layout presets plus the default card tested with long Yoruba/Igbo names; text lines shrink to fit (`InvitationCard.tsx`) |
| G2  | Template search and filters                                    | P1       | Open   | Not built or only partly built; see the checklist note                                                                            |
| G3  | One-click colour and font themes                               | P1       | Open   | Not built or only partly built; see the checklist note                                                                            |
| G4  | AI helper that is predictable (Canva AI "hit or miss")         | P2       | Closed | Not planned: no AI in the designer (owner decision)                                                                               |
| H1  | Reliable text editing                                          | P1       | Open   | Not built or only partly built; see the checklist note                                                                            |
| H2  | Text fit options                                               | P2       | Open   | Not built or only partly built; see the checklist note                                                                            |
| I1  | 44px targets and keyboard access everywhere                    | P0       | Open   | Not built or only partly built; see the checklist note                                                                            |
| I2  | Screen reader pass                                             | P1       | Open   | Not built or only partly built; see the checklist note                                                                            |
| I3  | Phone-first checks on real devices                             | P1       | Open   | Not built or only partly built; see the checklist note                                                                            |
| I4  | Stylus and trackpad checks                                     | P2       | Open   | Not built or only partly built; see the checklist note                                                                            |
| J1  | Baseline metrics:                                              | P0       | Open   | Not built or only partly built; see the checklist note                                                                            |
| J2  | Small user test                                                | P1       | Open   | Not built or only partly built; see the checklist note                                                                            |
| J3  | Re-check this list each release;                               | P1       | Open   | Not built or only partly built; see the checklist note                                                                            |
| K1  | Visual hierarchy audit                                         | P0       | Open   | Not built or only partly built; see the checklist note                                                                            |
| K2  | Header redesign                                                | P0       | Open   | Not built or only partly built; see the checklist note                                                                            |
| K3  | Tool rail redesign                                             | P0       | Open   | Not built or only partly built; see the checklist note                                                                            |
| K4  | Inspector redesign                                             | P0       | Closed | Inspector: every section folds and remembers its state                                                                            |
| K5  | Desktop options bar                                            | P1       | Open   | Not built or only partly built; see the checklist note                                                                            |
| K6  | Layers panel redesign                                          | P1       | Open   | Not built or only partly built; see the checklist note                                                                            |
| K7  | Canvas surround                                                | P1       | Closed | Bottom bar Zoom menu (Fit, 25–400%)                                                                                               |
| K8  | Design tokens                                                  | P1       | Open   | Not built or only partly built; see the checklist note                                                                            |
| K9  | Typography                                                     | P1       | Open   | Not built or only partly built; see the checklist note                                                                            |
| K10 | Dark and light themes polished                                 | P1       | Open   | Not built or only partly built; see the checklist note                                                                            |
| K11 | Iconography and brand touches                                  | P2       | Open   | Not built or only partly built; see the checklist note                                                                            |
| K12 | Motion                                                         | P2       | Open   | Not built or only partly built; see the checklist note                                                                            |
| L1  | Core journey map                                               | P0       | Open   | Not built or only partly built; see the checklist note                                                                            |
| L2  | Empty states that teach                                        | P0       | Closed | Empty-card prompt with an Add text button                                                                                         |
| L3  | Selection feedback                                             | P0       | Closed | Live X/Y/W/H readout while dragging                                                                                               |
| L4  | Undo safety net                                                | P0       | Closed | Undo and redo toast with a one-tap reverse                                                                                        |
| L5  | Phone Simple mode redesign                                     | P1       | Open   | Not built or only partly built; see the checklist note                                                                            |
| L6  | Progressive disclosure                                         | P1       | Open   | Not built or only partly built; see the checklist note                                                                            |
| L7  | Toasts and status                                              | P1       | Open   | Not built or only partly built; see the checklist note                                                                            |
| L8  | Loading states                                                 | P1       | Open   | Not built or only partly built; see the checklist note                                                                            |
| L9  | Error and recovery UX                                          | P1       | Open   | Not built or only partly built; see the checklist note                                                                            |
| L10 | Event-facts banner and saved-card policy                       | P1       | Open   | Not built or only partly built; see the checklist note                                                                            |
| L11 | Share and guest preview                                        | P1       | Open   | Not built or only partly built; see the checklist note                                                                            |
| L12 | Keyboard-first UX                                              | P2       | Closed | Tab order and visible focus ring checked in Pro and Simple mode                                                                   |
| L13 | Microcopy pass                                                 | P2       | Open   | Not built or only partly built; see the checklist note                                                                            |
| L14 | Localisation readiness                                         | P2       | Open   | Not built or only partly built; see the checklist note                                                                            |

**Totals (sections A to L):** 23 closed, 48 open of 71.

## Complaints that drove the list

**Canva (Capterra, Software Advice, GetApp):** limited and inconsistent export; paywalled features and upgrade prompts; slow or hard-to-reach support; clunky text and docs; dated templates; AI that is hit or miss; navigation harder than expected; account-sharing confusion.

**Figma (G2, Capterra, Trustpilot, PeerSpot):** price and seat pricing; sluggish large files; steep learning curve for beginners; free-plan limits; folder navigation.

The same list also keeps what reviewers praise: ease of use, collaboration and handoff (our version: print handoff), auto layout and components.
