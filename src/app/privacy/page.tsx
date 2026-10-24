import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL, LegalPage, Section } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy · PatchPlan",
  description: "What PatchPlan collects, why, who it's shared with, and how to export or delete your data.",
};

const SECTIONS = [
  { id: "who", title: "Who we are" },
  { id: "roles", title: "Your data vs. your players' data" },
  { id: "collect", title: "What we collect" },
  { id: "use", title: "How we use it" },
  { id: "providers", title: "Service providers" },
  { id: "sharing", title: "What's public and what's shared" },
  { id: "retention", title: "How long we keep data" },
  { id: "rights", title: "Your rights and choices" },
  { id: "email", title: "Emails to players" },
  { id: "cookies", title: "Cookies and browser storage" },
  { id: "security", title: "Security" },
  { id: "children", title: "Children" },
  { id: "transfers", title: "International transfers" },
  { id: "changes", title: "Changes and contact" },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      crumb="Privacy"
      sections={SECTIONS}
      summary={
        <ul>
          <li>We collect what PatchPlan needs to work: your account, your studio&apos;s content, and basic security logs.</li>
          <li>No ads, no selling data, no third-party tracking or analytics.</li>
          <li>Player emails and beta testers belong to the studio that collected them; we only process them for that studio.</li>
          <li>
            You can export everything (Settings → Workspace → Export data) and delete your studio or account any time.
          </li>
          <li>
            Questions or requests: <a href={`mailto:${LEGAL.contact}`}>{LEGAL.contact}</a>.
          </li>
        </ul>
      }
    >
      <Section id="who" title="1. Who we are">
        <p>
          PatchPlan (&ldquo;we&rdquo;, &ldquo;us&rdquo;) runs patchplan.net, a project manager for game developers and studios: boards, design docs, roadmaps,
          news, email updates for players, beta testing and AI tools. This policy explains how we handle personal data when you use PatchPlan or one of
          the public pages a studio publishes with it.
        </p>
      </Section>

      <Section id="roles" title="2. Your data vs. your players' data">
        <p>
          <strong>For your account and your studio&apos;s workspace</strong>, PatchPlan decides how the data is used, so we are the
          &ldquo;controller&rdquo;.
        </p>
        <p>
          <strong>For data a studio collects about its players and contacts</strong> (newsletter subscribers, beta testers and their bug reports,
          people in the Network list), the studio is the controller and PatchPlan processes that data on the studio&apos;s behalf. If you&apos;re a
          player, contact the studio first; if you can&apos;t reach them, write to us and we&apos;ll help.
        </p>
      </Section>

      <Section id="collect" title="3. What we collect">
        <h3>Account</h3>
        <ul>
          <li>Email address, display name and profile photo (from Google sign-in, or what you enter).</li>
          <li>Your account ID, which studios you belong to, and your role in each.</li>
        </ul>
        <h3>Workspace content</h3>
        <ul>
          <li>Everything you and your teammates create: tasks, docs and whiteboards, ideas, roadmap items, news posts, email campaigns, AI modules, settings and uploaded images.</li>
        </ul>
        <h3>Players and contacts (collected by studios)</h3>
        <ul>
          <li>Newsletter subscribers: email, optional name, which updates they chose, where they signed up, and subscription status.</li>
          <li>Beta testers: name, email, platforms and device, optional note and Discord name, and the bug reports, screenshots and logs they send.</li>
          <li>Network contacts: names, emails, links and notes that a studio adds about press, creators and partners.</li>
          <li>Player Signal: public feedback a studio chooses to pull in from Discord, Reddit or Steam, including usernames.</li>
        </ul>
        <h3>Technical and security data</h3>
        <ul>
          <li>IP address, browser type and approximate country, which our hosting provider records for every request.</li>
          <li>Security events, such as failed sign-ins, blocked requests and admin actions, with the IP address and account involved.</li>
          <li>Daily counts of AI requests per account, to enforce fair-use limits.</li>
        </ul>
        <p>We don&apos;t use advertising, third-party analytics or tracking pixels.</p>
      </Section>

      <Section id="use" title="4. How we use it">
        <ul>
          <li>
            <strong>To run PatchPlan</strong> for you and your team: storing, syncing and showing your workspace (contract).
          </li>
          <li>
            <strong>To send emails you or your studio ask for</strong>: tester approvals, studio newsletters and digests, and notices about your
            account (contract; for player newsletters, the subscriber&apos;s consent given to the studio).
          </li>
          <li>
            <strong>For AI features</strong>: when you use one, the relevant text (for example the tasks or feedback you select) is sent to our AI
            provider to produce the result. We don&apos;t use your content to train AI models (contract).
          </li>
          <li>
            <strong>To keep PatchPlan safe and reliable</strong>: detecting abuse and attacks, rate limits, debugging and service status (legitimate
            interests).
          </li>
          <li>
            <strong>To meet legal obligations</strong>, such as responding to valid legal requests.
          </li>
        </ul>
      </Section>

      <Section id="providers" title="5. Service providers">
        <p>We use these companies to run PatchPlan. Each only gets the data it needs for its job.</p>
        <table>
          <thead>
            <tr>
              <th>Provider</th>
              <th>What for</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Google Firebase</td>
              <td>Sign-in and the database that stores all workspace data</td>
            </tr>
            <tr>
              <td>Vercel</td>
              <td>Hosting the website and server functions, and request logs</td>
            </tr>
            <tr>
              <td>Resend</td>
              <td>Delivering emails (newsletters, digests, tester approvals, security alerts)</td>
            </tr>
            <tr>
              <td>Nebius</td>
              <td>Running AI features, only when you use them</td>
            </tr>
            <tr>
              <td>Tavily</td>
              <td>Web search for AI research features (search terms only)</td>
            </tr>
            <tr>
              <td>Discord</td>
              <td>Posting workspace events and reading a feedback channel, only if a studio connects it</td>
            </tr>
            <tr>
              <td>UptimeRobot</td>
              <td>Checking that PatchPlan is online (no personal data)</td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section id="sharing" title="6. What's public and what's shared">
        <ul>
          <li>Members of a studio can see that studio&apos;s workspace, including its subscribers, testers and contacts.</li>
          <li>Roadmaps, news posts, beta sign-up pages and newsletter sign-up pages are public once a studio publishes them.</li>
          <li>We don&apos;t sell personal data or share it for advertising.</li>
          <li>We may disclose data if the law requires it, to protect people from harm, or as part of a merger or sale (with notice to you).</li>
        </ul>
      </Section>

      <Section id="retention" title="7. How long we keep data">
        <ul>
          <li>Account and workspace data: until you delete it, delete the studio, or delete your account.</li>
          <li>Deleting a studio permanently removes all of its tasks, docs, subscribers, testers, reports and settings.</li>
          <li>Unsubscribed players stay marked as unsubscribed so they aren&apos;t emailed again, until the studio deletes them.</li>
          <li>Security events: 30 days. AI usage counts: reset daily.</li>
          <li>Our providers may keep logs and backups for a limited time under their own policies.</li>
        </ul>
      </Section>

      <Section id="rights" title="8. Your rights and choices">
        <p>Depending on where you live (for example under the GDPR or UK GDPR), you have the right to:</p>
        <ul>
          <li>
            <strong>Access and take your data</strong>: Settings → Workspace → Export data downloads everything in your workspace.
          </li>
          <li>
            <strong>Correct it</strong>: edit your profile and content in the app.
          </li>
          <li>
            <strong>Delete it</strong>: delete items, delete a studio (owners, in Teams), or delete your account (Settings → Account).
          </li>
          <li>
            <strong>Object to or restrict</strong> some processing, and <strong>withdraw consent</strong> (players can unsubscribe from any email).
          </li>
          <li>Complain to your local data protection authority.</li>
        </ul>
        <p>
          For anything you can&apos;t do in the app, email <a href={`mailto:${LEGAL.contact}`}>{LEGAL.contact}</a>. We reply within 30 days.
        </p>
      </Section>

      <Section id="email" title="9. Emails to players">
        <p>
          Studios use PatchPlan to email players who signed up. Every newsletter includes a one-click unsubscribe link and the studio&apos;s sender
          details. Studios are responsible for having permission to email their players and for giving accurate sender information, including a
          postal address where the law requires it (for example the US CAN-SPAM Act). Messages about your account, like a beta tester approval,
          aren&apos;t marketing and don&apos;t have an unsubscribe link.
        </p>
      </Section>

      <Section id="cookies" title="10. Cookies and browser storage">
        <p>PatchPlan only uses storage that&apos;s needed for it to work. There are no advertising or tracking cookies.</p>
        <ul>
          <li>
            <strong>Sign-in</strong>: Firebase keeps you signed in using your browser&apos;s storage.
          </li>
          <li>
            <strong>Offline cache</strong>: a copy of your workspace is kept in your browser so pages load fast and work briefly offline.
          </li>
          <li>
            <strong>Preferences</strong>: small settings such as whether you&apos;ve seen the product tour, dismissed banners, your list/board view
            choice and your cookie choice.
          </li>
        </ul>
        <p>Clearing your browser&apos;s site data removes all of it and signs you out.</p>
      </Section>

      <Section id="security" title="11. Security">
        <p>
          All traffic is encrypted (HTTPS). Database rules keep each studio&apos;s data visible only to its members, and we monitor for suspicious
          activity, limit request rates and alert our team about attacks. No system is perfectly secure; if a breach affects your personal data,
          we&apos;ll notify you and the authorities as the law requires.
        </p>
      </Section>

      <Section id="children" title="12. Children">
        <p>
          PatchPlan accounts are not meant for children under 13 (or under 16 where local law requires). Studios whose players include children are
          responsible for following children&apos;s privacy laws, such as COPPA, before collecting their emails or bug reports. If you think a child
          has given us personal data, contact us and we&apos;ll delete it.
        </p>
      </Section>

      <Section id="transfers" title="13. International transfers">
        <p>
          Our providers may store and process data in the United States and other countries. Where required, transfers are covered by safeguards
          such as the European Commission&apos;s Standard Contractual Clauses.
        </p>
      </Section>

      <Section id="changes" title="14. Changes and contact">
        <p>
          We&apos;ll update this page when our practices change and change the date at the top. For important changes we&apos;ll also tell you in the
          app or by email. Questions, requests or complaints: <a href={`mailto:${LEGAL.contact}`}>{LEGAL.contact}</a>. See also our{" "}
          <Link href="/terms">Terms of Service</Link>.
        </p>
      </Section>
    </LegalPage>
  );
}
