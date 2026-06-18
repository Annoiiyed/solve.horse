import "./tau-bootstrap";
import pl from "tau-prolog";
import loadPromises from "tau-prolog/modules/promises.js";

loadPromises(pl);

const STEP_LIMIT = 1_000_000;

/** A safety cap so a goal with infinitely many solutions can't hang the page. */
const MAX_ANSWERS = 1000;

/** Tau's parser requires a goal to be terminated like a clause. */
const asClause = (goal: string): string => {
  const trimmed = goal.trim();
  return trimmed.endsWith(".") ? trimmed : `${trimmed}.`;
};

/**
 * Run `goal` against `program` and return every answer as text, one per line.
 * Rejects (with a Tau error term) on a syntax or runtime error; callers handle
 * that at their boundary.
 */
export const runProlog = async (program: string, goal: string): Promise<string> => {
  const session = pl.create(STEP_LIMIT);
  await session.promiseConsult(program);
  await session.promiseQuery(asClause(goal));

  const answers: string[] = [];
  for await (const answer of session.promiseAnswers()) {
    answers.push(session.format_answer(answer));
    if (answers.length >= MAX_ANSWERS) break;
  }

  return answers.length > 0 ? answers.join("\n") : "false.";
};
