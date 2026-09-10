import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createDocument, getDocument } from "@/lib/firestore-rest.server";

/**
 * Participant submissions are not authenticated, so they are never written to
 * the database from the browser. This endpoint validates the payload, checks
 * the quiz exists, re-scores the answers against the stored answer key and
 * writes the record under the attempt id (so retries can never duplicate it).
 */

const answerSchema = z.object({
  questionId: z.string().min(1),
  selectedIndex: z.number().int().nullable(),
  markedForReview: z.boolean(),
  updatedAt: z.string(),
});

const attemptSchema = z.object({
  attemptId: z.string().min(8).max(64),
  quizId: z.string().min(1).max(64),
  quizCode: z.string().min(1).max(32),
  quizTitle: z.string().max(200),
  studentName: z.string().min(2).max(80),
  roleNumber: z.string().min(2).max(20),
  registerNumber: z.string().max(20).optional(),
  startTime: z.string(),
  endTime: z.string().optional(),
  deadline: z.string(),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "SUBMITTED"]),
  answers: z.record(z.string(), answerSchema).default({}),
  quizVersion: z.number().int(),
  connectionEvents: z
    .array(
      z.object({
        type: z.literal("INTERNET_DETECTED"),
        detectedAt: z.number(),
        resolvedAt: z.number().optional(),
        duration: z.number().optional(),
      }),
    )
    .max(500)
    .optional(),
});

interface StoredQuestion {
  id: string;
  correctIndex: number;
  marks: number;
  negativeMarks: number;
}
interface StoredQuiz {
  questions?: StoredQuestion[];
  totalMarks?: number;
  
  settings?: { enableNegativeMarks?: boolean };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export const Route = createFileRoute("/api/public/submit-attempt")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let parsed;
        try {
          parsed = attemptSchema.parse(await request.json());
        } catch {
          return json({ error: "Invalid submission" }, 400);
        }

        const quiz = await getDocument<StoredQuiz>(`quizzes/${parsed.quizId}`);
        if (!quiz || !Array.isArray(quiz.questions)) return json({ error: "Unknown quiz" }, 404);

        // Re-score server-side; a participant device can never set its own score.
        let correct = 0;
        let wrong = 0;
        let unanswered = 0;
        let score = 0;
        for (const q of quiz.questions) {
          const a = parsed.answers[q.id];
          if (!a || a.selectedIndex === null || a.selectedIndex === undefined) {
            unanswered++;
          } else if (a.selectedIndex === q.correctIndex) {
            correct++;
            score += q.marks ?? 1;
          } else {
            wrong++;
            if (quiz.settings?.enableNegativeMarks) score -= q.negativeMarks ?? 0;
          }
        }
        score = Math.round(Math.max(0, score) * 100) / 100;
        const totalMarks =
          quiz.questions.reduce((s, q) => s + (q.marks ?? 1), 0) || quiz.totalMarks || 0;
        const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 10000) / 100 : 0;
        // Timing always comes from the device clock at quiz time, never from sync time.
        const startedAt = new Date(parsed.startTime).getTime();
        const submittedAt = parsed.endTime ? new Date(parsed.endTime).getTime() : NaN;
        const timeTaken =
          Number.isFinite(startedAt) && Number.isFinite(submittedAt)
            ? Math.max(0, submittedAt - startedAt)
            : 0;

        try {
          const outcome = await createDocument("attempts", parsed.attemptId, {
            ...parsed,
            registerNumber: parsed.registerNumber ?? parsed.roleNumber,
            // Stored security rules require this exact field name.
            participantName: parsed.studentName,
            correct,
            wrong,
            unanswered,
            score,
            percentage,
            totalQuestions: quiz.questions.length,
            totalMarks,
            timeTaken,
            passed: score > 0,
            syncStatus: "SYNCED",
            serverReceivedAt: new Date().toISOString(),
          } as never);
          return json({ ok: true, attemptId: parsed.attemptId, score, percentage, duplicate: outcome === "exists" });
        } catch (e) {
          return json({ error: "Could not store the submission", detail: String(e).slice(0, 300) }, 502);
        }

      },
    },
  },
});
