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
import { ChapterMark } from "./chapter-mark";
import { StorySpine } from "./story-spine";
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
        <StorySpine />
        <div id={CHAPTERS[0].id}>
          <Hero />
        </div>
        <div id={CHAPTERS[1].id}>
          <ChapterMark index={1} />
          <Noise />
        </div>
        <div id={CHAPTERS[2].id}>
          <ChapterMark index={2} />
          <Fan />
        </div>
        <div id={CHAPTERS[3].id}>
          <ChapterMark index={3} />
          <Invitation />
        </div>
        <div id={CHAPTERS[4].id}>
          <ChapterMark index={4} />
          <Hall />
        </div>
        <div id={CHAPTERS[5].id}>
          <ChapterMark index={5} />
          <Door />
        </div>
        <div id={CHAPTERS[6].id}>
          <ChapterMark index={6} />
          <YesScene />
          <Finale />
        </div>
      </main>
      <BurstCanvas />
    </>
  );
}
