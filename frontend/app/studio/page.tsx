import type { Metadata } from "next";
import LearningStudio from "../../components/studio/LearningStudio";

export const metadata: Metadata = {
  title: "Learning Studio — Animind AI",
  description: "An interactive scientific notebook. Ask, explore, and find another way to see projectile motion.",
};

export default function StudioPage() {
  return <LearningStudio />;
}
