import "@/styles/site/about.css";
import { pageMetadata } from "@/lib/site-metadata";
import { AboutEngines } from "./about-engines";
import { BurstCanvas, Invitation } from "./invitation";
import { Fan } from "./fan";
import { Finale } from "./finale";
import { Hall } from "./hall";
import { Hero } from "./hero";
import { MusicToggle } from "./music-toggle";
import { Noise } from "./noise";
import { YesScene } from "./yes-scene";

export const metadata = pageMetadata({
  title: "About",
  description:
    "Àríyá by OwambePlan: personal invitations, live RSVPs and seating for Nigerian weddings and owambes.",
  path: "/about",
  socialTitle: "Àríyá by OwambePlan",
  socialDescription:
    "Personal invitations, live RSVPs and seating for Nigerian weddings, introductions and owambes.",
});

export default function AboutPage() {
  return (
    <>
      <AboutEngines />
      <MusicToggle />
      <main id="main" className="about-page">
        <Hero />
        <Noise />
        <Invitation />
        <YesScene />
        <Hall />
        <Fan />
        <Finale />
      </main>
      <BurstCanvas />
    </>
  );
}
