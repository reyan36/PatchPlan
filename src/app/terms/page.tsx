import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL, LegalPage, Section } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service · PatchPlan",
  description: "The rules for using PatchPlan: your content, your players' data, acceptable use and our responsibilities.",
};

const SECTIONS = [
  { id: "agreement", title: "Agreement" },
  { id: "accounts", title: "Accounts" },
  { id: "studios", title: "Studios and roles" },
  { id: "content", title: "Your content" },
  { id: "players", title: "Player data and email" },
  { id: "use", title: "Acceptable use" },
  { id: "ai", title: "AI features" },
  { id: "third-party", title: "Connected services" },
  { id: "availability", title: "Availability and changes" },
  { id: "termination", title: "Suspension and closing your account" },
  { id: "disclaimers", title: "Disclaimers and liability" },
  { id: "law", title: "Governing law" },
  { id: "contact", title: "Changes and contact" },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      crumb="Terms"
      sections={SECTIONS}
      summary={
        <ul>
          <li>You own everything you create in PatchPlan. We only use it to run the service for you.</li>
          <li>If you collect player emails or beta testers, you&apos;re responsible for having their permission.</li>
          <li>Don&apos;t misuse PatchPlan: no spam, no attacks, no accessing other studios&apos; data.</li>
          <li>PatchPlan is in early access and provided as is. We&apos;ll announce maintenance and changes on the status page.</li>
        </ul>
      }
    >
      <Section id="agreement" title="1. Agreement">
        <p>
          These terms are an agreement between you and PatchPlan (&ldquo;we&rdquo;, &ldquo;us&rdquo;) for using patchplan.net and its public pages. By
          creating an account or using PatchPlan, you agree to them and to our <Link href="/privacy">Privacy Policy</Link>. If you use PatchPlan for a
          studio or company, you confirm you&apos;re allowed to accept these terms for it.
        </p>
        <p>PatchPlan is in early access and currently free. If we introduce paid plans, we&apos;ll tell you before anything is charged.</p>
      </Section>

      <Section id="accounts" title="2. Accounts">
        <ul>
          <li>You must be at least 13 years old (or 16 where local law requires) to create an account.</li>
          <li>Keep your sign-in secure. You&apos;re responsible for what happens in your account.</li>
          <li>Give accurate information, and don&apos;t share an account between several people.</li>
        </ul>
      </Section>

      <Section id="studios" title="3. Studios and roles">
        <ul>
          <li>The person who creates a studio is its owner. Owners can invite members, transfer ownership and delete the studio.</li>
          <li>Work created in a studio belongs to that studio&apos;s workspace; members leaving doesn&apos;t remove it.</li>
          <li>Deleting a studio permanently deletes all of its data. Export it first if you need a copy.</li>
        </ul>
      </Section>

      <Section id="content" title="4. Your content">
        <p>
          You keep all rights to what you create and upload: game designs, docs, whiteboards, tasks, art, posts and more. You give us permission to
          store, process, copy and display your content only as needed to run PatchPlan for you, including publishing the roadmap, news and sign-up
          pages you choose to make public. This permission ends when you delete the content, except for copies kept briefly in backups and logs.
        </p>
        <p>You&apos;re responsible for having the rights to what you upload and publish.</p>
      </Section>

      <Section id="players" title="5. Player data and email">
        <p>When you use PatchPlan to collect player emails, run a beta, or keep contacts, you control that data and are responsible for it. You agree to:</p>
        <ul>
          <li>Only email people who signed up or otherwise gave you permission. No bought or scraped lists.</li>
          <li>Keep the unsubscribe link PatchPlan adds and never re-add people who unsubscribed.</li>
          <li>Give accurate sender details, including a valid postal address where the law requires it (for example the US CAN-SPAM Act).</li>
          <li>Follow privacy laws that apply to your players, including rules for children such as COPPA.</li>
        </ul>
        <p>We may pause a studio&apos;s sending if it causes spam complaints or high bounce rates, to protect deliverability for everyone.</p>
      </Section>

      <Section id="use" title="6. Acceptable use">
        <p>Don&apos;t use PatchPlan to:</p>
        <ul>
          <li>Break the law, infringe others&apos; rights, or publish hateful, harassing or sexually explicit content involving minors.</li>
          <li>Send spam or phishing, or spread malware.</li>
          <li>Try to access other studios&apos; data or accounts, probe for vulnerabilities, or get around limits and security measures.</li>
          <li>Overload the service, scrape it, or automate access beyond normal use.</li>
          <li>Resell or copy PatchPlan itself.</li>
        </ul>
        <p>
          Found a security issue? Please tell us at <a href={`mailto:${LEGAL.contact}`}>{LEGAL.contact}</a> instead of testing it on real data.
        </p>
      </Section>

      <Section id="ai" title="7. AI features">
        <p>
          AI results can be wrong or incomplete. Review drafts, patch notes and summaries before you publish or act on them. When you use an AI
          feature, the content you select is sent to our AI provider to produce the result. Fair-use limits apply per account per day.
        </p>
      </Section>

      <Section id="third-party" title="8. Connected services">
        <p>
          If you connect Discord, use Google sign-in or link other services, their own terms apply to them. We&apos;re not responsible for services we
          don&apos;t run.
        </p>
      </Section>

      <Section id="availability" title="9. Availability and changes">
        <p>
          We work to keep PatchPlan fast and online, and announce planned maintenance on the <Link href="/status">status page</Link>. We may add,
          change or remove features as the product grows. If we remove something important, we&apos;ll give notice and a way to export your data
          where possible.
        </p>
      </Section>

      <Section id="termination" title="10. Suspension and closing your account">
        <p>
          You can stop using PatchPlan at any time and delete your account in Settings. We may suspend or close accounts that break these terms or
          put other users or the service at risk. Where we can, we&apos;ll tell you first and give you a chance to export your data.
        </p>
      </Section>

      <Section id="disclaimers" title="11. Disclaimers and liability">
        <p>
          PatchPlan is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, without warranties of any kind, to the extent the law allows. Keep
          your own copies of anything critical (Settings → Workspace → Export data).
        </p>
        <p>
          To the extent the law allows, we&apos;re not liable for indirect or consequential losses such as lost profits, revenue or data, and our total
          liability for any claim is limited to the amount you paid us in the 12 months before it (or USD 50 if you haven&apos;t paid anything).
          Nothing in these terms limits liability that can&apos;t be limited by law.
        </p>
      </Section>

      <Section id="law" title="12. Governing law">
        <p>
          These terms are governed by the laws of the country where PatchPlan&apos;s operator is based, without regard to conflict-of-law rules. If
          you&apos;re a consumer, you keep any protections the laws of your own country give you.
        </p>
      </Section>

      <Section id="contact" title="13. Changes and contact">
        <p>
          We may update these terms. We&apos;ll change the date at the top, and for important changes we&apos;ll tell you in the app or by email before
          they take effect. Continuing to use PatchPlan after that means you accept the new terms. Questions:{" "}
          <a href={`mailto:${LEGAL.contact}`}>{LEGAL.contact}</a>.
        </p>
      </Section>
    </LegalPage>
  );
}
