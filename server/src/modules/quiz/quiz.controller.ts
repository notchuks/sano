import { FastifyRequest, FastifyReply } from "fastify";
import { QuizService } from "./quiz.service";

export class QuizController {
  static async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const quiz = await QuizService.createQuiz(request.body as any);
      reply.code(201).send(quiz);
    } catch (e: any) {
      reply.badRequest(e.message);
    }
  }

  static async getAll(request: FastifyRequest, reply: FastifyReply) {
    const quizzes = await QuizService.getAllQuizzes();
    reply.send(quizzes);
  }

  static async getById(request: FastifyRequest, reply: FastifyReply) {
    const quiz = await QuizService.getQuizById(Number(request.params["id"]));
    if (!quiz) return reply.notFound();
    reply.send(quiz);
  }

  static async update(request: FastifyRequest, reply: FastifyReply) {
    const quiz = await QuizService.updateQuiz(Number(request.params["id"]), request.body as any);
    reply.send(quiz);
  }

  static async delete(request: FastifyRequest, reply: FastifyReply) {
    await QuizService.deleteQuiz(Number(request.params["id"]));
    reply.code(204).send();
  }

  static async submitAnswerHandler(request: FastifyRequest, reply: FastifyReply) {
    const quizId = Number(request.params["id"]);
    const { userId, answer } = request.body as any;
    const result = await QuizService.submitAnswer({ quizId, userId, answer });
    reply.send(result);
  }
}