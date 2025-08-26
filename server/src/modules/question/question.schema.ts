import { Type, Static } from "@sinclair/typebox";
import { paginatedQueryRequestDtoSchema } from "../../shared/api/paginated-query.request.dto";

export type Question = Static<typeof Question>
export const questionCore = Type.Object({
    id: Type.Number({ minimum: 1 }),
    question: Type.String(),
    optionA: Type.String(),
    optionB: Type.String(),
    optionC: Type.String(),
    optionD: Type.String(),
    answer: Type.String(),
    category: Type.String(),
    region: Type.String(),
    difficulty: Type.String(),
    year: Type.String(),
})

export const Question = Type.Composite([
    questionCore,
    Type.Object({
        createdAt: Type.String({ format: 'date-time' }),
        updatedAt: Type.String({ format: 'date-time' }),
    })
]);

// id: Type.Unsafe<number>(
//     Type.Optional(Type.Number({ default: 1 }))
//   ),

type QuestionResponse = Static<typeof QuestionResponse>;
export const QuestionResponse = Type.Object({
    id: Type.Number({ example: 1, description: "Entity's id", }), 
    question: Type.String(),
    optionA: Type.String(),
    optionB: Type.String(),
    optionC: Type.String(),
    optionD: Type.String(),
    answer: Type.String(),
    category: Type.String(),
    region: Type.String(),
    difficulty: Type.String(),
    year: Type.String(),
    createdAt: Type.String({ format: 'date-time' }),
    updatedAt: Type.String({ format: 'date-time' }),
}, {
    $id: 'QuestionResponse',
    additionalProperties: false,
});

export const questionRequestSchema = Type.Object({
    question: Type.String(),
    optionA: Type.String(),
    optionB: Type.String(),
    optionC: Type.String(),
    optionD: Type.String(),
    answer: Type.String(),
    category: Type.String(),
    region: Type.String(),
    difficulty: Type.String(),
    year: Type.String(),
});
export type QuestionRequestSchema = Static<typeof questionRequestSchema>;

export const findQuestionsRequestDtoSchema = Type.Composite([
  paginatedQueryRequestDtoSchema,
  Type.Object({
    category: Type.Optional(
      Type.String({
        example: 'Politics',
        description: 'Question Category',
        maxLength: 50,
        pattern: '',
      }),
    ),
    region: Type.Optional(
      Type.String({
        example: 'Nigeria',
        description: 'Question region origin',
        maxLength: 50,
        pattern: '',
      }),
    ),
    difficulty: Type.Optional(
      Type.String({
        example: 'Hard',
        description: 'Question Difficulty',
        maxLength: 50,
        pattern: '',
      }),
    ),
  }),
]);