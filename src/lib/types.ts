export type QuestionType = "MCQ";

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options: string[];
  correctIndex: number;
  marks: number;
  negativeMarks: number;
}

export interface QuizSettings {
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResultImmediately: boolean;
  allowOffline: boolean;
  allowMultipleAttempts: boolean;
  enableNegativeMarks: boolean;
}

export interface Quiz {
  id: string;
  code: string;
  title: string;
  instructions: string;
  teacherName: string;
  teacherId: string;
  durationMinutes: number;
  totalMarks: number;
  startDate?: string;
  endDate?: string;
  settings: QuizSettings;
  questions: Question[];
  version: number;
  published: boolean;
  createdAt: string;
}

export interface OfflineQuiz extends Quiz {
  downloadedAt: string;
  offlineReady: boolean;
}

export type AttemptStatus = "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED";
export type SyncStatus = "SYNCED" | "PENDING_SYNC" | "SYNC_FAILED";

export interface AttemptAnswer {
  questionId: string;
  selectedIndex: number | null;
  markedForReview: boolean;
  updatedAt: string;
}

export interface ConnectionEvent {
  type: "INTERNET_DETECTED";
  detectedAt: number;
  resolvedAt?: number;
  duration?: number;
}

export interface Attempt {
  attemptId: string;
  quizId: string;
  quizCode: string;
  quizTitle: string;
  studentName: string;
  /** Coordinator-assigned role number / participant ID, e.g. AIT024 */
  roleNumber: string;
  /** @deprecated kept for older records; mirrors roleNumber */
  registerNumber: string;
  startTime: string;
  endTime?: string;
  deadline: string;
  status: AttemptStatus;
  syncStatus: SyncStatus;
  answers: Record<string, AttemptAnswer>;
  score?: number;
  correct?: number;
  wrong?: number;
  unanswered?: number;
  percentage?: number;
  passed?: boolean;
  totalQuestions?: number;
  totalMarks?: number;
  /** Numeric elapsed milliseconds between start and submission (ranking uses this). */
  timeTaken?: number;
  quizVersion: number;
  connectionEvents?: ConnectionEvent[];
}
