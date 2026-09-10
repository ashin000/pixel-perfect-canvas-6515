import type { Attempt, Quiz } from "@/lib/types";

/**
 * Single source of truth for AITHERA QUIZ scoring, timing and ranking.
 * Ranking order: score desc → time taken asc → submitted at asc → role number asc.
 */

export interface QuizResultStats {
  score: number;
  correct: number;
  wrong: number;
  unanswered: number;
  totalQuestions: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Score/correct/wrong/unanswered, calculated question by question. */
export function calculateQuizResult(quiz: Quiz, attempt: Pick<Attempt, "answers">): QuizResultStats {
  let correct = 0;
  let wrong = 0;
  let unanswered = 0;
  let score = 0;

  for (const q of quiz.questions) {
    const a = attempt.answers?.[q.id];
    if (!a || a.selectedIndex === null || a.selectedIndex === undefined) {
      unanswered++;
      continue;
    }
    if (a.selectedIndex === q.correctIndex) {
      correct++;
      score += Number(q.marks) || 0;
    } else {
      wrong++;
      if (quiz.settings?.enableNegativeMarks) score -= Number(q.negativeMarks) || 0;
    }
  }

  score = round2(Math.max(0, score));
  const totalQuestions = quiz.questions.length;
  const totalMarks =
    quiz.questions.reduce((s, q) => s + (Number(q.marks) || 0), 0) || Number(quiz.totalMarks) || 0;
  const percentage = totalMarks > 0 ? round2((score / totalMarks) * 100) : 0;

  return { score, correct, wrong, unanswered, totalQuestions, totalMarks, percentage, passed: score > 0 };
}

/** Numeric elapsed milliseconds between the original start and the submission. */
export function calculateTimeTaken(startTime?: string | number, endTime?: string | number): number {
  if (!startTime || !endTime) return 0;
  const start = typeof startTime === "number" ? startTime : new Date(startTime).getTime();
  const end = typeof endTime === "number" ? endTime : new Date(endTime).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, end - start);
}

export interface RankableResult {
  score?: number;
  timeTaken?: number;
  startTime?: string;
  endTime?: string;
  roleNumber?: string;
  registerNumber?: string;
}

function timeTakenOf(r: RankableResult) {
  if (typeof r.timeTaken === "number" && r.timeTaken > 0) return r.timeTaken;
  return calculateTimeTaken(r.startTime, r.endTime);
}

function submittedAtOf(r: RankableResult) {
  const t = r.endTime ? new Date(r.endTime).getTime() : NaN;
  return Number.isFinite(t) ? t : Number.MAX_SAFE_INTEGER;
}

function roleOf(r: RankableResult) {
  return String(r.roleNumber ?? r.registerNumber ?? "");
}

export type Ranked<T> = T & { rank: number; timeTaken: number };

/** Sorts by the competition rules and assigns unique ranks. */
export function rankResults<T extends RankableResult>(results: T[]): Ranked<T>[] {
  return [...results]
    .sort((a, b) => {
      const sa = a.score ?? 0;
      const sb = b.score ?? 0;
      if (sb !== sa) return sb - sa;

      const ta = timeTakenOf(a);
      const tb = timeTakenOf(b);
      if (ta !== tb) return ta - tb;

      const ea = submittedAtOf(a);
      const eb = submittedAtOf(b);
      if (ea !== eb) return ea - eb;

      return roleOf(a).localeCompare(roleOf(b));
    })
    .map((result, index) => ({ ...result, rank: index + 1, timeTaken: timeTakenOf(result) }));
}

/** MM:SS, or HH:MM:SS past an hour. */
export function formatQuizTime(ms: number) {
  const total = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** Clean score display: 24.25 not 24.250000, 28 not 28.00. */
export function formatScore(score?: number) {
  const n = Number(score ?? 0);
  if (!Number.isFinite(n)) return "0";
  return String(round2(n));
}

export const LEADERBOARD_RULE_TEXT =
  "Ranking is based on the highest score. If two participants have the same score, the participant who completes the quiz in less time will be ranked higher.";

export const LEADERBOARD_RULE_TEXT_SECONDARY =
  "If both score and completion time are equal, earlier submission time is used.";
