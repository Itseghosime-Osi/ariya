# Heuristic review of the invitation studio (Nielsen's 10)

An expert review done by reading the code and looking at screenshots and browser checks in `docs/quality/evidence` and `screenshots`. It is not a user test and it covers Chromium at desktop and phone width only. Severity: 1 cosmetic, 2 minor, 3 major.

| #   | Heuristic                       | What works                                                                       | Finding                                                                                                                                                       | Sev | Checklist  |
| --- | ------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ---------- |
| 1   | Visibility of system status     | Status under the title says saved, saving, offline; drag readout; export summary | The status reads "saving…" for as long as a save is pending, with no spinner or time                                                                          | 1   | L7         |
| 2   | Match with the real world       | Simple mode uses plain words; Pro keeps tool names                               | Pro labels such as "Distribute", "Blend", "See-through" are designer jargon                                                                                   | 2   | D3, L13    |
| 3   | User control and freedom        | Undo and redo with a toast; Escape cancels text and crop                         | Restoring the event's template asks first, but "Keep my wording" on the event-facts banner is not an undo step                                                | 2   | L10        |
| 4   | Consistency and standards       | One palette (now CSS variables); 12px minimum text                               | Two message styles: a top pill for notices and a separate red box for save errors; −/+ zoom buttons are 28px but the header toggle is 40px and tools are 44px | 2   | L7, L9, K8 |
| 5   | Error prevention                | Layer limit message, entry-seal protection, file-type checks on import           | Import of an unreadable file explains the problem but offers no retry button                                                                                  | 2   | F2         |
| 6   | Recognition over recall         | Command palette (⌘/Ctrl K); every control has an accessible name                 | Shortcuts are listed in one sheet but not on every tooltip                                                                                                    | 1   | D3         |
| 7   | Flexibility and efficiency      | Shortcuts, palette, zoom presets, Simple and Pro modes                           | Simple/Pro choice is remembered, but there is no "More tools" middle step                                                                                     | 1   | D1, L6     |
| 8   | Aesthetic and minimalist design | Calm surround; inspector sections fold                                           | The Pro inspector is long: Position, Words, Colour and Effects all stack; the options bar and the inspector repeat some controls                              | 3   | K1, K3, K5 |
| 9   | Help users recover from errors  | Plain error text; retry on failed saves; offline queue                           | Upload and export failures show a message but not what to do next                                                                                             | 2   | F2, L9     |
| 10  | Help and documentation          | Help dialog, quick tour, shortcut sheet, support email                           | Help is general; no tip next to a tool when it is used                                                                                                        | 1   | D7         |

## Ranked fixes

1. (Sev 3) Shorten the Pro inspector: group by task, put the most used controls first, fold the rest by default (K1, K4 follow-up, K5).
2. (Sev 2) One message pattern for notices and save errors (L7, L9).
3. (Sev 2) Plain wording pass for Pro labels, with a tooltip that carries the shortcut (D3, L13).
4. (Sev 2) A retry or next step on upload and export errors (F2).
5. (Sev 2) Raise the zoom buttons to 44px on touch screens (I1).

## Not covered

Screen readers, real devices, Firefox and Safari, long sessions, and anyone other than the reviewer. See `designer-usability-test.md`.
