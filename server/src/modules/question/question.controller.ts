import { FastifyReply, FastifyRequest } from "fastify";
import QuestionService from "./question.service";

const CACHE_TTL = 1800;
const CACHE_KEY_USER = "user";

export default class QuestionController {
  private questionService: QuestionService;

  constructor(questionService: QuestionService) {
    this.questionService = questionService;
  }

  public async getQuestionsHandler(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    try {
      const questions = await this.questionService.getQuestions();
      // console.log("Questions: ", questions);

      return reply.code(200).send(questions);
    } catch (e) {
      if (e instanceof Error) {
        return reply.badRequest(e.message);
      }
    }
  };

	public async getFilteredQuestionsHandler(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
		const queries = request.query;
		const category = queries?.category;
		const region = queries?.region;
		const difficulty = queries?.difficulty;
		// console.log("Queries: ", queries);
    try {
      const questions = await this.questionService.getFilteredQuestions({ category, region, difficulty });
      console.log("Questions: ", questions);

      return reply.code(200).send(questions);
    } catch (e) {
      if (e instanceof Error) {
        return reply.badRequest(e.message);
      }
    }
  }
}
