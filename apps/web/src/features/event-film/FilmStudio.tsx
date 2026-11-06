"use client";

import React, { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  FILM_MAX_SECONDS,
  FILM_PALETTES,
  FINALE_SECONDS,
  GUEST_INTRO_SECONDS,
  MAX_PHOTOS,
  SCENES_MAX_SECONDS,
  SCENE_CATALOG,
  SCENE_MAX_SECONDS,
  SCENE_MIN_SECONDS,
  SCENE_TEXT_MAX,
  canAddScene,
  filmSeconds,
  makeScene,
  scenesSeconds,
  sceneInfo,
  type FilmDesign,
  type FilmScene,
  type SceneKind,
} from "./design";
import {
  saveFilmDesignAction,
  setInvitationLiveAction,
  uploadFilmPhotoAction,
  uploadFilmSongAction,
} from "./actions";
import { EventFilm, type FilmEvent } from "./EventFilm";
import { FilmFinale } from "./components/FilmFinale";

const CARD =
  "overflow-hidden rounded-3xl border border-hairline bg-white/40 backdrop-blur-sm";
const EYEBROW =
  "text-[11px] font-bold uppercase tracking-[0.16em] text-gold-ink";
const FIELD =
  "desk-field min-h-[44px] w-full rounded-2xl px-4 text-base text-night focus-visible:ring-2 focus-visible:ring-burgundy/30 focus-visible:outline-none sm:text-sm";
const ICON_BTN =
  "grid h-9 w-9 shrink-0 place-items-center rounded-full text-label-2 transition-colors hover:bg-burgundy/10 hover:text-burgundy disabled:opacity-35 disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy";

interface FilmStudioProps {
  eventId: string;
  initial: FilmDesign;
  initialLive: boolean;
  event: FilmEvent & {
    rsvpBy: string | null;
    theme: string | null;
    headline: string | null;
    subheadline: string | null;
    message: string | null;
  };
  slug: string;
}

export function FilmStudio({
  eventId,
  initial,
  initialLive,
  event,
  slug,
}: FilmStudioProps) {
  const router = useRouter();
  const [design, setDesign] = useState<FilmDesign>(initial);
  const [saved, setSaved] = useState<string>(() => JSON.stringify(initial));
  const [live, setLive] = useState(initialLive);
  const [busy, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(
    null
  );
  const [preview, setPreview] = useState<"public" | "guest" | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const songInput = useRef<HTMLInputElement>(null);
  const photoInputs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const dirty = JSON.stringify(design) !== saved;
  const sceneTime = scenesSeconds(design.scenes);
  const left = SCENES_MAX_SECONDS - sceneTime;
  const total = filmSeconds(design);
  const totalGuest = filmSeconds(design, { personal: true });
  const pct = Math.min(100, Math.round((sceneTime / SCENES_MAX_SECONDS) * 100));

  const update = (patch: Partial<FilmDesign>) => {
    setDesign((d) => ({ ...d, ...patch }));
    setNotice(null);
  };

  const patchScene = (id: string, patch: Partial<FilmScene>) =>
    update({
      scenes: design.scenes.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    });

  const setSeconds = (scene: FilmScene, next: number) => {
    const clamped = Math.max(
      SCENE_MIN_SECONDS,
      Math.min(SCENE_MAX_SECONDS, next)
    );
    if (clamped > scene.seconds && clamped - scene.seconds > left) return;
    patchScene(scene.id, { seconds: clamped });
  };

  const move = (index: number, by: -1 | 1) => {
    const to = index + by;
    if (to < 0 || to >= design.scenes.length) return;
    const scenes = [...design.scenes];
    [scenes[index], scenes[to]] = [scenes[to], scenes[index]];
    update({ scenes });
  };

  const add = (kind: SceneKind) => {
    const scene = makeScene(kind, design);
    if (scene) update({ scenes: [...design.scenes, scene] });
  };

  const save = () => {
    setNotice(null);
    startTransition(async () => {
      const res = await saveFilmDesignAction(eventId, design);
      if (!res.ok) {
        setNotice({ ok: false, text: res.error });
        return;
      }
      setSaved(JSON.stringify(design));
      setNotice({ ok: true, text: "Film saved." });
      router.refresh();
    });
  };

  const toggleLive = (next: boolean) => {
    setLive(next);
    setNotice(null);
    startTransition(async () => {
      const res = await setInvitationLiveAction(eventId, next);
      if (!res.ok) {
        setLive(!next);
        setNotice({ ok: false, text: res.error });
        return;
      }
      setNotice({
        ok: true,
        text: next
          ? "The invitation is live. Guests can open it."
          : "Test mode on. Only your team can open the invitation.",
      });
      router.refresh();
    });
  };

  const upload = async (
    key: string,
    run: () => Promise<
      { ok: true; url: string; title?: string } | { ok: false; error: string }
    >,
    apply: (r: { url: string; title?: string }) => void
  ) => {
    setUploading(key);
    setNotice(null);
    const res = await run();
    setUploading(null);
    if (!res.ok) {
      setNotice({ ok: false, text: res.error });
      return;
    }
    apply(res);
  };

  const onSong = (file: File | undefined) => {
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    void upload(
      "song",
      () => uploadFilmSongAction(eventId, fd),
      (r) => update({ song: { url: r.url, title: r.title ?? "Your song" } })
    );
  };

  const onPhoto = (slot: number, file: File | undefined) => {
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    void upload(
      `photo-${slot}`,
      () => uploadFilmPhotoAction(eventId, slot, fd),
      (r) => {
        const photos = [...design.photos];
        photos[slot] = { url: r.url, caption: photos[slot]?.caption ?? "" };
        update({ photos: photos.filter(Boolean) });
      }
    );
  };

  const setCaption = (slot: number, caption: string) => {
    const photos = design.photos.map((p, i) =>
      i === slot ? { ...p, caption } : p
    );
    update({ photos });
  };

  const removePhoto = (slot: number) =>
    update({ photos: design.photos.filter((_, i) => i !== slot) });

  const finale = useMemo(
    () => (
      <FilmFinale
        event={{
          title: event.title,
          couple: event.couple,
          date: event.date,
          venue: event.venue,
          area: event.area,
          dressCode: event.dressCode,
          rsvpBy: event.rsvpBy,
          theme: event.theme,
          headline: event.headline,
          subheadline: event.subheadline,
          message: event.message,
        }}
      />
    ),
    [event]
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* The ledger: how long the film is, and whether guests can see it */}
      <section
        aria-label="The film"
        className="profile-card relative overflow-hidden rounded-[28px] p-4 text-champagne sm:p-6"
      >
        <span aria-hidden="true" className="profile-card__weave" />
        <div className="relative flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#f3d98f]">
              The film
            </p>
            <p className="mt-1 font-display text-xl text-[#f4e8cc]">
              <span className="mr-1.5 text-4xl font-bold tabular-nums text-[#fff6dc] sm:text-5xl">
                {total}
              </span>
              seconds
            </p>
          </div>
          <p className="pb-1 text-right text-[13px] text-[#f4e8cc]">
            {totalGuest}s on a guest&rsquo;s own link
            <span className="block text-[#f3d98f]">
              never more than {FILM_MAX_SECONDS}s
            </span>
          </p>
        </div>
        <div
          className="relative mt-3 h-2 overflow-hidden rounded-full bg-white/12"
          role="img"
          aria-label={`${sceneTime} of ${SCENES_MAX_SECONDS} seconds of scenes used`}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#e9c98a] to-[#f6e2ad] transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="relative mt-1.5 text-[12px] text-[#f4e8cc]">
          {sceneTime}s of {SCENES_MAX_SECONDS}s for your scenes, plus{" "}
          {GUEST_INTRO_SECONDS}s for the guest&rsquo;s name and {FINALE_SECONDS}
          s for the invitation card.
        </p>

        <div className="relative mt-4 divide-y divide-gold/15 rounded-2xl bg-black/20 ring-1 ring-inset ring-gold/15">
          <div className="flex items-center gap-3 px-3.5 py-3">
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold text-[#fff6dc]">
                Play the film for guests
              </span>
              <span className="block text-[13px] text-[#f4e8cc]">
                They tap to open, watch, then see the invitation.
              </span>
            </span>
            <Switch
              on={design.enabled}
              onChange={(on) => update({ enabled: on })}
              label="Play the film for guests"
            />
          </div>
          <div className="flex items-center gap-3 px-3.5 py-3">
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold text-[#fff6dc]">
                {live ? "Live" : "Test mode"}
              </span>
              <span className="block text-[13px] text-[#f4e8cc]">
                {live
                  ? "Guests can open the page and their own links."
                  : "Only your team can open it. Guests see “not open yet”."}
              </span>
            </span>
            <Switch
              on={live}
              onChange={toggleLive}
              disabled={busy}
              label="Invitation is live"
            />
          </div>
        </div>

        <div className="relative mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setPreview("public")}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-br from-[#f6e2ad] to-[#d4a85a] px-3 text-[13px] font-semibold text-night"
          >
            <Icon name="celebration" size={16} />
            Watch preview
          </button>
          <button
            type="button"
            onClick={() => setPreview("guest")}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-gold/40 px-3 text-[13px] font-semibold text-[#fff6dc]"
          >
            <Icon name="person" size={16} />
            As a guest
          </button>
        </div>
      </section>

      {notice && (
        <p
          role={notice.ok ? "status" : "alert"}
          className={cn(
            "rounded-2xl px-4 py-3 text-sm font-semibold",
            notice.ok
              ? "bg-secondary-container text-on-secondary-container"
              : "bg-error-container text-error"
          )}
        >
          {notice.text}
        </p>
      )}

      {/* Scenes */}
      <section aria-labelledby="film-scenes">
        <h2 id="film-scenes" className={`${EYEBROW} mb-2 px-1`}>
          Scenes
        </h2>
        <ol className={`${CARD} divide-y divide-hairline`}>
          {design.scenes.map((scene, i) => {
            const info = sceneInfo(scene.kind);
            return (
              <li key={scene.id} className="space-y-2.5 px-3.5 py-3 sm:px-5">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-burgundy/10 text-xs font-bold text-burgundy">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-night">
                      {info.label}
                    </span>
                    <span className="block text-[12px] leading-snug text-label-2">
                      {info.blurb}
                    </span>
                  </span>
                  <button
                    type="button"
                    className={ICON_BTN}
                    aria-label={`Move ${info.label} up`}
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                  >
                    <Icon name="expand_less" size={18} />
                  </button>
                  <button
                    type="button"
                    className={ICON_BTN}
                    aria-label={`Move ${info.label} down`}
                    disabled={i === design.scenes.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    <Icon name="expand_more" size={18} />
                  </button>
                  <button
                    type="button"
                    className={ICON_BTN}
                    aria-label={`Remove ${info.label}`}
                    disabled={design.scenes.length <= 1}
                    onClick={() =>
                      update({
                        scenes: design.scenes.filter((s) => s.id !== scene.id),
                      })
                    }
                  >
                    <Icon name="close" size={16} />
                  </button>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <div
                    role="group"
                    aria-label={`${info.label} length`}
                    className="desk-field flex min-h-[44px] items-center self-start rounded-full p-1"
                  >
                    <button
                      type="button"
                      className={ICON_BTN}
                      aria-label="Shorter"
                      disabled={scene.seconds <= SCENE_MIN_SECONDS}
                      onClick={() => setSeconds(scene, scene.seconds - 1)}
                    >
                      −
                    </button>
                    <span className="w-12 text-center text-sm font-semibold tabular-nums text-night">
                      {scene.seconds}s
                    </span>
                    <button
                      type="button"
                      className={ICON_BTN}
                      aria-label="Longer"
                      disabled={scene.seconds >= SCENE_MAX_SECONDS || left <= 0}
                      onClick={() => setSeconds(scene, scene.seconds + 1)}
                    >
                      +
                    </button>
                  </div>
                  {info.hasText && (
                    <input
                      type="text"
                      value={scene.text ?? ""}
                      maxLength={SCENE_TEXT_MAX}
                      placeholder={info.textPlaceholder}
                      aria-label={`${info.label}: your words`}
                      onChange={(e) =>
                        patchScene(scene.id, { text: e.target.value })
                      }
                      className={`${FIELD} min-w-0 flex-1`}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        <div
          role="group"
          aria-label="Add a scene"
          className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {SCENE_CATALOG.map((info) => (
            <button
              key={info.kind}
              type="button"
              onClick={() => add(info.kind)}
              disabled={
                !canAddScene(design, Math.min(info.seconds, SCENE_MIN_SECONDS))
              }
              className="desk-chip inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold text-burgundy disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Icon name="add_circle" size={15} />
              {info.label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 px-1 text-xs text-label-2">
          {left > 0
            ? `${left}s left for scenes.`
            : "The film is full. Shorten or remove a scene to add another."}
        </p>
      </section>

      {/* Look */}
      <section aria-labelledby="film-look">
        <h2 id="film-look" className={`${EYEBROW} mb-2 px-1`}>
          Colours
        </h2>
        <div className={`${CARD} space-y-3 p-4 sm:p-5`}>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
            {FILM_PALETTES.map((p) => {
              const on =
                design.colors.background === p.background &&
                design.colors.accent === p.accent;
              return (
                <button
                  key={p.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    update({
                      colors: { background: p.background, accent: p.accent },
                    })
                  }
                  className={cn(
                    "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-3.5 text-[13px] font-semibold transition-colors",
                    on
                      ? "border border-burgundy bg-burgundy text-ivory"
                      : "desk-chip text-night"
                  )}
                >
                  <span className="flex -space-x-1.5" aria-hidden="true">
                    <i
                      className="h-5 w-5 rounded-full ring-2 ring-white/70"
                      style={{ background: p.background }}
                    />
                    <i
                      className="h-5 w-5 rounded-full ring-2 ring-white/70"
                      style={{ background: p.accent }}
                    />
                  </span>
                  {p.label}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ["background", "Background"],
                ["accent", "Accent"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block">
                <span className="mb-1 block px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-label-2">
                  {label}
                </span>
                <span className="desk-field flex min-h-[44px] items-center gap-3 rounded-2xl px-3">
                  <input
                    type="color"
                    value={design.colors[key]}
                    onChange={(e) =>
                      update({
                        colors: { ...design.colors, [key]: e.target.value },
                      })
                    }
                    className="h-7 w-9 cursor-pointer rounded-md border-0 bg-transparent p-0"
                  />
                  <span className="font-mono text-sm uppercase text-night">
                    {design.colors[key]}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* Song */}
      <section aria-labelledby="film-song">
        <h2 id="film-song" className={`${EYEBROW} mb-2 px-1`}>
          Song
        </h2>
        <div className={`${CARD} space-y-3 p-4 sm:p-5`}>
          <div className="flex items-center gap-3.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-burgundy/[0.07] text-gold-ink">
              <Icon name="celebration" size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold text-night">
                {design.song.url
                  ? design.song.title || "Your song"
                  : "No song yet"}
              </span>
              <span className="block text-[12.5px] text-label-2">
                An MP3 up to 10 MB. It plays under the film.
              </span>
            </span>
            <input
              ref={songInput}
              type="file"
              accept="audio/mpeg,.mp3"
              className="sr-only"
              aria-label="Upload a song"
              onChange={(e) => {
                onSong(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={uploading === "song"}
              onClick={() => songInput.current?.click()}
              className="desk-chip inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-[13px] font-semibold text-burgundy disabled:opacity-50"
            >
              {uploading === "song"
                ? "Uploading…"
                : design.song.url
                  ? "Replace"
                  : "Upload"}
            </button>
          </div>
          {design.song.url && (
            <div className="flex items-center gap-2">
              <audio
                controls
                preload="none"
                src={design.song.url}
                className="h-10 min-w-0 flex-1"
              />
              <button
                type="button"
                className={ICON_BTN}
                aria-label="Remove the song"
                onClick={() => update({ song: { url: null, title: null } })}
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          )}
          <p className="text-[12px] leading-snug text-label-2">
            Only upload a song you have the right to use.
          </p>
        </div>
      </section>

      {/* Photos */}
      <section aria-labelledby="film-photos">
        <h2 id="film-photos" className={`${EYEBROW} mb-2 px-1`}>
          The celebrants
        </h2>
        <div className={`${CARD} divide-y divide-hairline`}>
          {Array.from({ length: MAX_PHOTOS }, (_, slot) => {
            const photo = design.photos[slot];
            return (
              <div
                key={slot}
                className="flex items-center gap-3 px-3.5 py-3 sm:px-5"
              >
                <span className="relative grid h-16 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-burgundy/[0.07] text-gold-ink">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photo.url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Icon name="camera" size={20} />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <input
                    type="text"
                    value={photo?.caption ?? ""}
                    maxLength={40}
                    disabled={!photo}
                    placeholder={photo ? "Their name" : "Add a photo first"}
                    aria-label={`Photo ${slot + 1} caption`}
                    onChange={(e) => setCaption(slot, e.target.value)}
                    className={FIELD}
                  />
                </span>
                <input
                  ref={photoInputs[slot]}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  aria-label={`Upload photo ${slot + 1}`}
                  onChange={(e) => {
                    onPhoto(slot, e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  disabled={
                    uploading === `photo-${slot}` ||
                    (!photo && slot > design.photos.length)
                  }
                  onClick={() => photoInputs[slot].current?.click()}
                  className="desk-chip inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-[13px] font-semibold text-burgundy disabled:opacity-50"
                >
                  {uploading === `photo-${slot}`
                    ? "…"
                    : photo
                      ? "Replace"
                      : "Add"}
                </button>
                {photo && (
                  <button
                    type="button"
                    className={ICON_BTN}
                    aria-label={`Remove photo ${slot + 1}`}
                    onClick={() => removePhoto(slot)}
                  >
                    <Icon name="close" size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <a
          href={`/e/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center justify-center gap-1.5 text-sm font-semibold text-burgundy hover:underline"
        >
          Open the public page
          <Icon name="arrow_forward" size={14} />
        </a>
        <button
          type="button"
          onClick={save}
          disabled={busy || !dirty}
          className="flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-burgundy px-6 text-sm font-semibold text-ivory shadow-sm transition-colors hover:bg-wine disabled:opacity-50"
        >
          <Icon name="check" size={18} />
          {busy ? "Saving…" : dirty ? "Save film" : "Saved"}
        </button>
      </div>

      {preview && (
        <EventFilm
          design={design}
          event={event}
          guestName={preview === "guest" ? "Ada Obi" : null}
          finale={finale}
          ctaLabel="Close the preview"
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}
