import { LandingPage } from "@/components/landing/LandingPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PatchPlan — The Project Manager for Game Developers",
  description: "Minimal sprint boards, living game design docs, public roadmaps, and automated Discord updates for indie game studios.",
};

export default function Page() {
  return <LandingPage />;
}
