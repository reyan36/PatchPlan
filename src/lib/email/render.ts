// Renders designer blocks to email-safe HTML (tables + inline styles).
// Pure function: the designer preview and the server send use the same output.

import type { EmailBlock, EmailTheme } from "./types";

export type RenderInput = {
  subject: string;
  preheader: string;
  blocks: EmailBlock[];
  theme: EmailTheme;
  studioName: string;
  address?: string;
  unsubscribeUrl: string;
  preferencesNote?: string;
};

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

/** Only http(s) and mailto links survive; everything else becomes "#". */
export function safeUrl(u: unknown) {
  const s = String(u ?? "").trim();
  return /^(https?:\/\/|mailto:)/i.test(s) ? esc(s) : "#";
}

const safeColor = (c: string) => (/^#[0-9a-f]{3,8}$/i.test(c) ? c : "#c8ff00");

/** Escapes text, then allows **bold**, *italic*, [label](https://url) and line breaks. */
function inline(text: string, linkColor: string) {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => `<a href="${safeUrl(url.replace(/&amp;/g, "&"))}" style="color:${linkColor};text-decoration:underline">${label}</a>`)
    .replace(/\n/g, "<br>");
}

/** Readable text on the accent colour (black on bright accents, white on dark ones). */
function onAccent(hex: string) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6);
  const n = parseInt(full, 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? "#0a0a0a" : "#ffffff";
}

export function renderEmail(input: RenderInput): string {
  const dark = input.theme.mode === "dark";
  const accent = safeColor(input.theme.accent);
  const c = {
    page: dark ? "#0b0b0d" : "#f4f4f5",
    card: dark ? "#141418" : "#ffffff",
    text: dark ? "#e4e4e7" : "#27272a",
    muted: dark ? "#8b8b94" : "#71717a",
    heading: dark ? "#fafafa" : "#09090b",
    border: dark ? "#26262c" : "#e4e4e7",
    // Links need contrast against the card, so bright accents fall back on light backgrounds.
    link: dark ? accent : onAccent(accent) === "#0a0a0a" ? "#2563eb" : accent,
  };
  const font = input.theme.font === "serif" ? "Georgia,'Times New Roman',serif" : "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const row = (html: string, pad = "0 32px 16px") => `<tr><td style="padding:${pad}">${html}</td></tr>`;

  const body = input.blocks
    .map((b) => {
      switch (b.type) {
        case "heading":
          return row(`<h2 style="margin:0;font-size:22px;line-height:1.3;font-weight:700;color:${c.heading}">${esc(b.text)}</h2>`, "8px 32px 12px");
        case "text":
          return row(`<p style="margin:0;font-size:15px;line-height:1.65;color:${c.text}">${inline(b.text, c.link)}</p>`);
        case "image": {
          if (!b.url) return "";
          const img = `<img src="${safeUrl(b.url)}" alt="${esc(b.alt)}" width="536" style="display:block;width:100%;max-width:536px;height:auto;border-radius:10px;border:0">`;
          return row(b.href ? `<a href="${safeUrl(b.href)}">${img}</a>` : img);
        }
        case "button":
          return row(
            `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:${accent}"><a href="${safeUrl(b.url)}" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:600;color:${onAccent(accent)};text-decoration:none;border-radius:8px">${esc(b.label)}</a></td></tr></table>`,
            "4px 32px 20px"
          );
        case "divider":
          return row(`<div style="height:1px;background:${c.border};line-height:1px;font-size:1px">&nbsp;</div>`, "8px 32px 20px");
        case "spacer":
          return `<tr><td style="height:${Math.max(4, Math.min(80, Number(b.size) || 16))}px;line-height:1px;font-size:1px">&nbsp;</td></tr>`;
        case "articles":
          return b.items
            .map((a) =>
              row(
                `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${c.border};border-radius:10px"><tr>` +
                  (a.image ? `<td width="120" style="padding:12px 0 12px 12px;vertical-align:top"><img src="${safeUrl(a.image)}" alt="" width="108" style="display:block;width:108px;height:72px;object-fit:cover;border-radius:6px"></td>` : "") +
                  `<td style="padding:14px 16px;vertical-align:top"><a href="${safeUrl(a.url)}" style="font-size:15px;font-weight:600;color:${c.heading};text-decoration:none">${esc(a.title)}</a>` +
                  (a.excerpt ? `<p style="margin:4px 0 0;font-size:13px;line-height:1.5;color:${c.muted}">${esc(a.excerpt)}</p>` : "") +
                  `</td></tr></table>`,
                "0 32px 10px"
              )
            )
            .join("");
        case "changelog":
          return row(
            (b.title ? `<p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:${c.muted}">${esc(b.title)}</p>` : "") +
              `<ul style="margin:0;padding:0 0 0 18px;font-size:15px;line-height:1.6;color:${c.text}">${b.items.filter((i) => i.trim()).map((i) => `<li style="margin:0 0 4px">${inline(i, c.link)}</li>`).join("")}</ul>`
          );
        case "social": {
          const links = [
            ["Website", b.website],
            ["Discord", b.discord],
            ["X", b.x],
            ["Steam", b.steam],
          ].filter(([, u]) => u);
          if (!links.length) return "";
          return row(
            `<p style="margin:0;font-size:13px;color:${c.muted}">${links.map(([l, u]) => `<a href="${safeUrl(u)}" style="color:${c.link};text-decoration:none;font-weight:600">${l}</a>`).join(" &nbsp;·&nbsp; ")}</p>`,
            "4px 32px 20px"
          );
        }
        default:
          return "";
      }
    })
    .join("");

  const header = input.theme.logoUrl
    ? `<img src="${safeUrl(input.theme.logoUrl)}" alt="${esc(input.studioName)}" height="32" style="display:block;height:32px;width:auto;border:0">`
    : `<span style="font-size:16px;font-weight:700;color:${c.heading}">${esc(input.studioName)}</span>`;

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="${dark ? "dark" : "light"}"><title>${esc(input.subject)}</title></head>
<body style="margin:0;padding:0;background:${c.page};font-family:${font}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(input.preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.page}"><tr><td align="center" style="padding:32px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${c.card};border:1px solid ${c.border};border-radius:14px;font-family:${font}">
<tr><td style="height:4px;background:${accent};border-radius:14px 14px 0 0;line-height:4px;font-size:4px">&nbsp;</td></tr>
<tr><td style="padding:28px 32px 20px">${header}</td></tr>
${body}
<tr><td style="padding:12px 32px 28px"></td></tr>
</table>
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px"><tr><td style="padding:20px 32px;font-size:12px;line-height:1.6;color:${c.muted};text-align:center;font-family:${font}">
${input.preferencesNote ? `${esc(input.preferencesNote)}<br>` : ""}${input.address ? `${esc(input.address)}<br>` : ""}
<a href="${safeUrl(input.unsubscribeUrl)}" style="color:${c.muted};text-decoration:underline">Unsubscribe</a> · Sent with PatchPlan
</td></tr></table>
</td></tr></table></body></html>`;
}

/** Plain-text alternative (improves deliverability). */
export function renderText(input: RenderInput): string {
  const lines: string[] = [input.studioName, ""];
  input.blocks.forEach((b) => {
    if (b.type === "heading") lines.push(b.text.toUpperCase(), "");
    if (b.type === "text") lines.push(b.text.replace(/\*\*?|\[([^\]]+)\]\(([^)]+)\)/g, (m, l, u) => (l ? `${l} (${u})` : "")), "");
    if (b.type === "button") lines.push(`${b.label}: ${b.url}`, "");
    if (b.type === "articles") b.items.forEach((a) => lines.push(`- ${a.title}: ${a.url}`));
    if (b.type === "changelog") lines.push(b.title, ...b.items.map((i) => `- ${i}`), "");
  });
  lines.push("", input.address || "", `Unsubscribe: ${input.unsubscribeUrl}`);
  return lines.join("\n");
}
