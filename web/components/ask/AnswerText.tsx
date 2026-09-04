import { Fragment } from "react";

/**
 * The runtime's answers are "markdown-lite": paragraphs, `**bold**` runs, and
 * occasional numbered or bulleted lists. That is the whole grammar, so it is
 * parsed here instead of adding a markdown dependency for three constructs.
 *
 * Everything becomes React elements — never `dangerouslySetInnerHTML` — so
 * model output cannot inject markup no matter what it contains.
 */

/** Split a line into plain and bolded runs. */
function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
      <strong key={i} className="font-semibold text-ink">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

const ORDERED = /^\s*(\d+)[.)]\s+/;
const BULLETED = /^\s*[-*•]\s+/;

export function AnswerText({ text }: { text: string }) {
  // Blank lines separate blocks; a run of list lines is one block of its own.
  const blocks = text.trim().split(/\n{2,}/);

  return (
    <div className="flex flex-col gap-2.5">
      {blocks.map((block, bi) => {
        const lines = block.split("\n").filter((l) => l.trim());
        if (lines.length === 0) return null;

        const ordered = lines.every((l) => ORDERED.test(l));
        const bulleted = !ordered && lines.every((l) => BULLETED.test(l));

        if (ordered || bulleted) {
          const ListTag = ordered ? "ol" : "ul";
          return (
            <ListTag
              key={bi}
              className={[
                "flex flex-col gap-1.5 pl-[1.15rem] text-[13.5px]/relaxed",
                ordered ? "list-decimal" : "list-disc",
                "marker:text-monoink",
              ].join(" ")}
            >
              {lines.map((l, li) => (
                <li key={li} className="pl-0.5 text-pretty">
                  {inline(l.replace(ordered ? ORDERED : BULLETED, ""))}
                </li>
              ))}
            </ListTag>
          );
        }

        return (
          <p key={bi} className="text-[13.5px]/relaxed text-pretty">
            {/* A single newline inside a paragraph is a soft wrap, not a break. */}
            {inline(lines.join(" "))}
          </p>
        );
      })}
    </div>
  );
}
