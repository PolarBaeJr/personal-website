import type { CSSProperties } from "react";

// Placeholder for a content hole while the DB copy streams in. Holds no
// content at all (hidden items must never reach the static shell), only
// empty bars that reserve roughly the space.
export function Skeleton({
  lines = 3,
  minHeight,
  className,
}: {
  lines?: number;
  minHeight?: string;
  className?: string;
}) {
  const style: CSSProperties | undefined = minHeight ? { minHeight } : undefined;
  return (
    <div
      className={className ? `skeleton ${className}` : "skeleton"}
      style={style}
      aria-hidden="true"
    >
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} className="skeleton-line" />
      ))}
    </div>
  );
}
