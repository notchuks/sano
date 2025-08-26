// Session and Quiz Models for SMS Quiz App

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string; // could be index or value
}

export interface QuizSession {
  phoneNumber: string;
  currentQuestionIndex: number;
  questions: Question[];
  currentScore: number;
  isCompleted: boolean;
  aggregateScore: number;
}

// In-memory session store (for MVP)
export const sessionStore: Record<string, QuizSession> = {};

export function getSession(phoneNumber: string): QuizSession | undefined {
  return sessionStore[phoneNumber];
}

export function setSession(phoneNumber: string, session: QuizSession) {
  sessionStore[phoneNumber] = session;
}

export function clearSession(phoneNumber: string) {
  delete sessionStore[phoneNumber];
}
