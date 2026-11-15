import type { Metadata } from "next";
import SubjectStudio from "../../components/studio/SubjectStudio";

export const metadata: Metadata = {
  title: "Learning Studio — Animind AI",
  description: "An interactive scientific notebook. Ask, explore, and find another way to see projectile motion.",
};

export default function StudioPage() {
  return <SubjectStudio />;
}
