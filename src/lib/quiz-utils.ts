import type { Attempt, Quiz } from "./types";
import { calculateQuizResult, formatQuizTime } from "@/utils/leaderboard";

export function generateQuizCode(subject: string) {
  const letters = (subject.replace(/[^a-zA-Z]/g, "").toUpperCase() + "QUIZ").slice(0, 4);
  const digits = Math.floor(100 + Math.random() * 900);
  return `${letters}${digits}`;
}

export function uid() {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
  );
}

export function evaluate(quiz: Quiz, attempt: Attempt) {
  return calculateQuizResult(quiz, attempt);
}

export function formatClock(ms: number) {
  return formatQuizTime(ms);
}
