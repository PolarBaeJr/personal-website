import type { Metadata } from "next";
import { JournalTrainer } from "@/components/JournalTrainer";

export const metadata: Metadata = {
  title: "Journal entry trainer",
};

export default function JournalEntriesPage() {
  return (
    <div className="flow">
      <h1 className="page-title">Journal entry trainer</h1>
      <JournalTrainer />
    </div>
  );
}
