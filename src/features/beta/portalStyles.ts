// Class strings for the public tester portal. Colours come from the studio's --pp-* theme vars.

export const portalInput =
  "w-full rounded-xl border border-[var(--pp-border)] bg-[var(--pp-bg)] px-3.5 py-2.5 text-sm text-[var(--pp-fg)] placeholder:text-[var(--pp-muted)] placeholder:opacity-70 outline-none focus:border-[var(--pp-accent)] transition-colors";

export const portalPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--pp-accent)] px-4 text-sm font-semibold text-[var(--pp-on-accent)] hover:opacity-90 active:scale-[0.99] transition disabled:opacity-50 disabled:pointer-events-none";

export const portalGhost =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--pp-border)] px-4 text-sm font-medium text-[var(--pp-fg)] hover:bg-[var(--pp-bg)] transition-colors disabled:opacity-50 disabled:pointer-events-none";

export const portalLabel = "block text-xs font-medium text-[var(--pp-muted)] mb-1.5";

export const chip = (on: boolean) =>
  `px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
    on
      ? "border-[var(--pp-accent)] bg-[var(--pp-accent)] text-[var(--pp-on-accent)]"
      : "border-[var(--pp-border)] text-[var(--pp-muted)] hover:text-[var(--pp-fg)]"
  }`;
