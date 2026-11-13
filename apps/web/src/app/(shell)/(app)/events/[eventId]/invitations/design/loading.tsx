import { SealOutline } from "@/features/invitations/components/designer/SealOutline";

/**
 * Shown straight away while the studio's data loads. It draws the studio's own frame (header, tool
 * rail, card and side panel) in quiet blocks, so the screen is never blank and nothing jumps when
 * the real studio arrives.
 */
export default function InvitationDesignLoading() {
  const block = "rounded-(--studio-radius-control) bg-black/[0.06]";
  return (
    <div
      role="status"
      aria-label="Loading the invitation studio"
      data-testid="studio-loading"
      className="fixed inset-0 z-(--studio-z-overlay) bg-[#ede6da]"
    >
      <span className="sr-only">Loading the invitation studio…</span>
      <div
        aria-hidden="true"
        className="flex h-16 items-center gap-4 border-b border-hairline bg-ivory px-4"
      >
        <div className="size-10 animate-pulse rounded-full bg-black/[0.06] motion-reduce:animate-none" />
        <div
          className={`${block} h-4 w-40 animate-pulse motion-reduce:animate-none`}
        />
        <div className="ml-auto flex items-center gap-3">
          <div className="size-10 animate-pulse rounded-full bg-black/[0.06] motion-reduce:animate-none" />
          <div
            className={`${block} h-10 w-[7.5rem] animate-pulse motion-reduce:animate-none`}
          />
        </div>
      </div>
      <div aria-hidden="true" className="flex h-[calc(100%-4rem)]">
        <div className="hidden w-14 flex-col items-center gap-3 border-r border-hairline bg-ivory py-4 sm:flex">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className={`${block} size-10 animate-pulse motion-reduce:animate-none`}
            />
          ))}
        </div>
        <div className="grid flex-1 place-items-center p-6">
          <div className="grid aspect-[5/7] h-[min(70vh,34rem)] animate-pulse place-items-center rounded-sm bg-white/70 shadow-(--studio-shadow-stage) motion-reduce:animate-none">
            <SealOutline
              size={72}
              className="text-(--studio-wine) opacity-15"
            />
          </div>
        </div>
        <div className="hidden w-[360px] flex-col gap-4 border-l border-hairline bg-ivory p-4 lg:flex">
          <div
            className={`${block} h-5 w-32 animate-pulse motion-reduce:animate-none`}
          />
          <div
            className={`${block} h-24 animate-pulse motion-reduce:animate-none`}
          />
          <div
            className={`${block} h-24 animate-pulse motion-reduce:animate-none`}
          />
        </div>
      </div>
    </div>
  );
}
