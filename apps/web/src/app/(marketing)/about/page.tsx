import "@/styles/site/about.css";
import { pageMetadata } from "@/lib/site-metadata";
import { AboutEngines } from "./about-engines";
import { BurstCanvas, Invitation } from "./invitation";
import { Fan } from "./fan";
import { Finale } from "./finale";
import { Hall } from "./hall";
import { Hero } from "./hero";
import { Noise } from "./noise";
import { YesScene } from "./yes-scene";
import { Door } from "./door";
import { ChapterMark } from "@/components/site/chapter-mark";
import { StorySpine } from "@/components/site/story-spine";
import "@/styles/site/story.css";
import { CHAPTERS } from "./chapters";

export const metadata = pageMetadata({
  title: "About",
  description:
    "A Nigerian wedding in seven chapters, from the first yes to the last dance: personal invitations, live RSVPs, seating and a door with no queue.",
  path: "/about",
  socialTitle: "Àríyá: a wedding in seven chapters",
  socialDescription:
    "Scroll through one wedding, from the first yes to the last dance.",
});

export default function AboutPage() {
  return (
    <>
      <AboutEngines />
      <main id="main" className="about-page">
        <StorySpine chapters={CHAPTERS} mode="days" />
        <div id={CHAPTERS[0].id}>
          <Hero />
        </div>
        <div id={CHAPTERS[1].id}>
          <ChapterMark chapter={CHAPTERS[1]} />
          <Noise />
        </div>
        <div id={CHAPTERS[2].id}>
          <ChapterMark chapter={CHAPTERS[2]} />
          <Fan />
        </div>
        <div id={CHAPTERS[3].id}>
          <ChapterMark chapter={CHAPTERS[3]} />
          <Invitation />
        </div>
        <div id={CHAPTERS[4].id}>
          <ChapterMark chapter={CHAPTERS[4]} />
          <Hall />
        </div>
        <div id={CHAPTERS[5].id}>
          <ChapterMark chapter={CHAPTERS[5]} />
          <Door />
        </div>
        <div id={CHAPTERS[6].id}>
          <ChapterMark chapter={CHAPTERS[6]} />
          <YesScene />
          <Finale />
        </div>
      </main>
      <BurstCanvas />
    </>
  );
}
