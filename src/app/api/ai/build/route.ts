import { aiRoute } from "@/lib/ai/auth";
import { AIError, chatJson } from "@/lib/ai/llm";
import type { FieldType, ModuleField, ModuleSchema, ModuleView } from "@/lib/ai/types";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

type Body = { prompt?: string; previous?: ModuleSchema };

const TYPES: FieldType[] = ["text", "longtext", "number", "select", "checkbox", "date", "progress", "url"];
const VIEWS: ModuleView[] = ["table", "board", "cards"];
const ICONS = ["table", "globe", "translate", "bug", "users", "calendar", "chart", "list", "flag", "music", "palette", "sword", "trophy", "megaphone", "cube"];

const slug = (s: string, i: number) => (String(s).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 32) || `field_${i}`);

function coerce(field: ModuleField, v: unknown): unknown {
  switch (field.type) {
    case "number":
      return Number.isFinite(Number(v)) ? Number(v) : 0;
    case "progress":
      return Math.max(0, Math.min(100, Number(v) || 0));
    case "checkbox":
      return v === true || v === "true";
    case "select":
      return field.options?.includes(String(v)) ? String(v) : field.options?.[0] ?? "";
    default:
      return String(v ?? "").slice(0, 500);
  }
}

/** Validate the model's design so the renderer never sees anything unexpected. */
function sanitize(raw: any): ModuleSchema {
  const used = new Set<string>();
  const fields: ModuleField[] = (Array.isArray(raw?.fields) ? raw.fields : [])
    .slice(0, 14)
    .map((f: any, i: number) => {
      let key = slug(f?.key || f?.label, i);
      while (used.has(key)) key = `${key}_${i}`;
      used.add(key);
      const type: FieldType = TYPES.includes(f?.type) ? f.type : "text";
      const options = type === "select" ? Array.from(new Set((Array.isArray(f?.options) ? f.options : []).map((o: unknown) => String(o).slice(0, 40)))).slice(0, 12) as string[] : undefined;
      return { key, label: String(f?.label || key).slice(0, 48), type: type === "select" && !options?.length ? "text" : type, ...(options?.length ? { options } : {}) };
    });
  if (!fields.length) throw new AIError("The model didn't design any fields. Try describing the tool in more detail.", 502);

  let view: ModuleView = VIEWS.includes(raw?.view) ? raw.view : "table";
  let groupBy = fields.find((f) => f.key === raw?.groupBy && f.type === "select")?.key;
  if (view === "board" && !groupBy) groupBy = fields.find((f) => f.type === "select")?.key;
  if (view === "board" && !groupBy) view = "table";

  const sampleRows = (Array.isArray(raw?.sampleRows) ? raw.sampleRows : []).slice(0, 6).map((r: any) =>
    Object.fromEntries(fields.map((f) => [f.key, coerce(f, r?.[f.key])]))
  );

  return {
    name: String(raw?.name || "New module").slice(0, 60),
    description: String(raw?.description || "").slice(0, 200),
    icon: ICONS.includes(raw?.icon) ? raw.icon : "table",
    view,
    ...(groupBy ? { groupBy } : {}),
    fields,
    sampleRows,
  };
}

export const POST = aiRoute<Body>(async ({ prompt = "", previous }) => {
  const ask = prompt.trim().slice(0, 1000);
  if (!ask) throw new AIError("Describe the tool you need.", 400);

  const raw = await chatJson<unknown>(
    "large",
    `You design small data tools ("modules") that live inside a game studio's project workspace.
Given a request, design the module: its fields, a default view and 3-6 realistic sample rows for a game studio.
Field types: ${TYPES.join(", ")}. Use "select" with options for statuses/categories, "progress" for 0-100 percentages,
"longtext" for notes. Keep it to the fields the request actually needs (usually 4-10).
View: "table" for lists, "board" for status workflows (set groupBy to a select field key), "cards" for galleries.
Icon is one of: ${ICONS.join(", ")}.
Return {"name":"","description":"one sentence","icon":"","view":"","groupBy":"field key or omit","fields":[{"key":"snake_case","label":"","type":"","options":[]}],"sampleRows":[{"field_key":value}]}`,
    previous ? `CURRENT DESIGN:\n${JSON.stringify(previous)}\n\nCHANGE REQUEST: ${ask}` : ask,
    3000
  );
  return { schema: sanitize(raw) };
});
