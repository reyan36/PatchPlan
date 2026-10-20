/** PatchPlan "P" mark (white on transparent, so place it on a dark tile). */
export function Logo({ size = 16, alt = "", className = "" }: { size?: number; alt?: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/patchplan-logo.png" alt={alt} width={size} height={size} draggable={false} className={`select-none scale-[1.35] ${className}`} />
  );
}
