import { Flask, Kanban, Lightbulb, Megaphone, RocketLaunch } from "@phosphor-icons/react/dist/ssr";

/**
 * The PatchPlan loop as a quest line: checkpoints light up one after another when the section scrolls
 * in (CSS transitions driven by the page's reveal observer), and a spark travels the path.
 */
const STEPS = [
  { Icon: Lightbulb, tag: "Idea", title: "Sketch it", text: "Write the GDD and draw the level on an infinite whiteboard." },
  { Icon: Kanban, tag: "Plan", title: "Break it down", text: "Turn the doc into Art, Code, Audio and Bug tasks on the board." },
  { Icon: Flask, tag: "Playtest", title: "Test it", text: "Beta testers send bug reports with screenshots, straight to the board." },
  { Icon: RocketLaunch, tag: "Ship", title: "Ship it", text: "Move it to Done. Your Discord hears about it right away." },
  { Icon: Megaphone, tag: "Tell", title: "Tell players", text: "Patch notes, roadmap and an email to every subscriber." },
];

export function QuestLine() {
  return (
    <section className="py-16 sm:py-24 px-4 max-w-6xl mx-auto">
      <div data-reveal className="text-center mb-14 sm:mb-16">
        <p className="font-mono text-[11px] tracking-[0.3em] text-neutral-500 mb-4">THE LOOP</p>
        <h2 className="text-[clamp(2rem,5vw,3.25rem)] font-bold tracking-[-0.03em] text-white leading-[1.05]">
          From first idea <span className="text-neutral-500">to patch notes.</span>
        </h2>
      </div>

      <div data-reveal className="pp-quest relative">
        {/* Path (desktop): base line, a fill that draws in, and a travelling spark */}
        <div aria-hidden className="hidden md:block absolute left-[10%] right-[10%] top-7 h-px">
          <div className="absolute inset-0 bg-white/[0.08]" />
          <div className="pp-quest-fill absolute inset-0 bg-gradient-to-r from-[#c8ff00]/0 via-[#c8ff00]/60 to-[#c8ff00]" />
          <span className="pp-quest-spark absolute -top-[3px] w-[7px] h-[7px] -ml-[3px] rounded-full bg-[#eaff9e] shadow-[0_0_12px_3px_rgba(200,255,0,0.55)]" />
        </div>
        {/* Path (phones): vertical line beside the checkpoints */}
        <div aria-hidden className="md:hidden absolute left-7 top-7 bottom-7 w-px bg-gradient-to-b from-[#c8ff00]/60 to-white/[0.06]" />

        <ol className="relative grid md:grid-cols-5 gap-8 md:gap-4">
          {STEPS.map(({ Icon, tag, title, text }, i) => (
            <li key={tag} className="flex md:flex-col md:items-center md:text-center gap-4 md:gap-0">
              <span
                className="pp-quest-node relative z-[1] shrink-0 w-14 h-14 rounded-2xl grid place-items-center border border-[#c8ff00]/40 bg-[#171a0c] text-[#c8ff00] shadow-[0_0_24px_rgba(200,255,0,0.12)]"
                style={{ ["--i" as string]: i }}
              >
                <Icon size={22} weight="duotone" />
              </span>
              <div className="md:mt-5 min-w-0">
                <p className="font-mono text-[10px] tracking-[0.22em] text-neutral-500">
                  {String(i + 1).padStart(2, "0")} · {tag.toUpperCase()}
                </p>
                <h3 className="mt-1.5 text-[16px] font-semibold tracking-tight text-white">{title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-500 md:max-w-[200px] md:mx-auto">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
