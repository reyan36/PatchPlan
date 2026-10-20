import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type DiscordEvent = "taskCompleted" | "newIdea" | "newsPublished" | "patchNotes";

/** Events are on unless turned off in Settings → Notifications. */
const eventEnabled = (data: Record<string, any>, event: DiscordEvent) => data.discordEvents?.[event] !== false;

export const notifyTaskCompleted = async (scopeId: string, taskTitle: string, authorName: string) => {
  if (!scopeId) return;
  try {
    const docSnap = await getDoc(doc(db, "integrations", scopeId));
    if (!docSnap.exists() || !docSnap.data().discordWebhookUrl || !eventEnabled(docSnap.data(), "taskCompleted")) return;
    
    const webhookUrl = docSnap.data().discordWebhookUrl;
    
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [{
          title: "✅ Task Completed",
          description: `**${taskTitle}** has been moved to Done.`,
          color: 5763719, // Green
          fields: [
            { name: "Completed By", value: authorName || "Someone", inline: true }
          ],
          footer: { text: "PatchPlan Integration" },
          timestamp: new Date().toISOString()
        }]
      })
    });
  } catch (err) {
    console.error("Discord notifyTaskCompleted failed", err);
  }
};

export const notifyNewIdea = async (scopeId: string, ideaTitle: string, authorName: string) => {
  if (!scopeId) return;
  try {
    const docSnap = await getDoc(doc(db, "integrations", scopeId));
    if (!docSnap.exists() || !docSnap.data().discordWebhookUrl || !eventEnabled(docSnap.data(), "newIdea")) return;
    
    const webhookUrl = docSnap.data().discordWebhookUrl;
    
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [{
          title: "💡 New Idea Submitted",
          description: `**${ideaTitle}**`,
          color: 16766720, // Yellow
          fields: [
            { name: "Submitted By", value: authorName || "Someone", inline: true }
          ],
          footer: { text: "PatchPlan Integration" },
          timestamp: new Date().toISOString()
        }]
      })
    });
  } catch (err) {
    console.error("Discord notifyNewIdea failed", err);
  }
};


export const notifyNewsPublished = async (scopeId: string, articleTitle: string, authorName: string) => {
  if (!scopeId) return;
  try {
    const docSnap = await getDoc(doc(db, "integrations", scopeId));
    if (!docSnap.exists() || !docSnap.data().discordWebhookUrl || !eventEnabled(docSnap.data(), "newsPublished")) return;
    
    const webhookUrl = docSnap.data().discordWebhookUrl;
    
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [{
          title: "📰 New Article Published",
          description: `**${articleTitle}** has just been posted.`,
          color: 3447003, // Blue
          fields: [
            { name: "Published By", value: authorName || "Someone", inline: true }
          ],
          footer: { text: "PatchPlan Integration" },
          timestamp: new Date().toISOString()
        }]
      })
    });
  } catch (err) {
    console.error("Discord notifyNewsPublished failed", err);
  }
};

export const notifyPatchNotes = async (
  scopeId: string,
  title: string,
  summary: string,
  articleUrl: string,
  credits: string[]
) => {
  if (!scopeId) return false;
  try {
    const docSnap = await getDoc(doc(db, "integrations", scopeId));
    if (!docSnap.exists() || !docSnap.data().discordWebhookUrl || !eventEnabled(docSnap.data(), "patchNotes")) return false;

    const names = Array.from(new Set(credits.filter(Boolean)));
    const res = await fetch(docSnap.data().discordWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [{
          title: `🛠️ ${title}`,
          description: summary,
          url: articleUrl,
          color: 5763719, // Green
          fields: names.length
            ? [{ name: "Thanks to the players who reported these", value: names.slice(0, 20).join(", ").slice(0, 1000) }]
            : [],
          footer: { text: "PatchPlan Player Signal" },
          timestamp: new Date().toISOString()
        }]
      })
    });
    return res.ok;
  } catch (err) {
    console.error("Discord notifyPatchNotes failed", err);
    return false;
  }
};
