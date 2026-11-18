import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Playground",
};

// Add experiments as src/app/playground/<name>/page.tsx
export default function PlaygroundPage() {
  return (
    <div className="flow">
      <h1>Playground</h1>
      <p>Experiments go here.</p>
    </div>
  );
}
