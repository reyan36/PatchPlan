import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const notifyTaskCompleted = async (scopeId: string, taskTitle: string, authorName: string) => {
  if (!scopeId) return;
  try {
    const docSnap = await getDoc(doc(db, "integrations", scopeId));
    if (!docSnap.exists() || !docSnap.data().discordWebhookUrl) return;
    
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
    if (!docSnap.exists() || !docSnap.data().discordWebhookUrl) return;
    
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
    if (!docSnap.exists() || !docSnap.data().discordWebhookUrl) return;
    
    const webhookUrl = docSnap.data().discordWebhookUrl;
    
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [{
          title: "?? New Article Published",
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
