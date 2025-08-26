import { Type } from "@sinclair/typebox";
import { QuestionResponse } from "../question/question.schema";

export const QuizSchema = Type.Object({
  id: Type.Integer(),
  userId: Type.Integer(),
  category: Type.String(),
  difficulty: Type.String(),
  score: Type.Integer(),
  createdAt: Type.String({ format: "date-time" }),
  questions: Type.Array(Type.Integer()), // question IDs
}, {
    $id: 'QuizResponse',
    additionalProperties: false,
});

export const QuizResponseSchema = Type.Object({
  id: Type.Integer(),
  userId: Type.Integer(),
  category: Type.String(),
  difficulty: Type.String(),
  score: Type.Integer(),
  createdAt: Type.String({ format: "date-time" }),
  questions: Type.Array(QuestionResponse),
}, {
    $id: 'QuizResponseSchema',
    additionalProperties: false,
});

export const CreateQuizSchema = Type.Object({
  userId: Type.Integer(),
  category: Type.String(),
  difficulty: Type.String(),
});

export const UpdateQuizSchema = Type.Partial(Type.Object({
  score: Type.Integer(),
}));

export const AnswerSchema = Type.Object({
  userId: Type.Integer(),
  answer: Type.String({ minLength: 1, maxLength: 1, pattern: "^[A-Da-d]$" }),
})

export const AnswerResponseSchema = Type.Object({
  correct: Type.Boolean(),
  nextQuestion: Type.Optional(QuestionResponse),
  done: Type.Boolean(),
  score: Type.Integer(),
})