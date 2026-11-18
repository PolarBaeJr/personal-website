import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Playground",
};

// Add experiments as src/app/(site)/playground/<name>/page.tsx
export default function PlaygroundPage() {
  return (
    <div className="flow">
      <h1 className="page-title">Playground</h1>
      <p className="lede">Experiments go here.</p>
    </div>
  );
}
