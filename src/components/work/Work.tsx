import { featured } from "@/content/projects";
import { WorkShowcase } from "./WorkShowcase";

/**
 * Selected work: a full-screen opening that takes over from the reel and
 * closes into a framed wheel of cards, then a panel for the card on top and
 * the same projects as a plain list.
 */
export function Work() {
  return <WorkShowcase projects={featured} backdrop="night" />;
}
