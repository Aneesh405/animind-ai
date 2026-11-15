import type { Metadata } from "next";
import LearningStudio from "../../components/studio/LearningStudio";

export const metadata: Metadata = {
  title: "Curiosity Lab — Animind AI",
  description: "A tactile visual learning lab. Ask, explore, and find another way to see projectile motion.",
};

export default function StudioPage() {
  return <LearningStudio />;
}
