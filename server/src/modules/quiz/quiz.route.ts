import { FastifyInstance } from "fastify";
import { QuizController } from "./quiz.controller";
import { CreateQuizSchema, UpdateQuizSchema, QuizSchema, QuizResponseSchema, AnswerSchema, AnswerResponseSchema } from "./quiz.schema";
import { Type } from "@sinclair/typebox";
import { SmsQuizService } from './quiz.service';
import { chargeUser, sendSms, subscribeUser } from '../../shared/sms';

export default async function quizRoutes(app: FastifyInstance) {
  app.post("/", { schema: { body: CreateQuizSchema, response: { 201: QuizSchema } } }, QuizController.create);
  app.get("/", { schema: { response: { 200: Type.Array(QuizSchema) } } }, QuizController.getAll);
  app.get("/:id", { schema: { response: { 200: QuizResponseSchema } } }, QuizController.getById);
  app.put("/:id", { schema: { body: UpdateQuizSchema, response: { 200: QuizSchema } } }, QuizController.update);
  app.delete("/:id", QuizController.delete);

  // submit each answer
  app.post("/:id/answer", {
    schema: { body: AnswerSchema, response: { 200: AnswerResponseSchema, }, }, }, QuizController.submitAnswerHandler);

  // Endpoint to receive incoming SMS from SDP API
  app.post('/sms/incoming', async (request, reply) => {
    // SDP API will POST sender and message in the body (adjust as per actual API)
    const { from, message } = request.body as { from: string; message: string };
    if (!from || !message) {
      return reply.code(400).send({ error: 'Missing from or message' });
    }
    let responseMsg = '';

    if (message.trim().toUpperCase() === 'BTD') { // Brain Teaser Daily "Start"
      await sendSms({ to: from, message: "Welcome to Brain Teaser! Answer simple questions and stand a chance to win fantastic prizes." });
      await subscribeUser({ msisdn: from, subscriptionPlan: "DAILY" });
      await chargeUser({ msisdn: from, subscriptionPlan: "DAILY" });
      const firstQ = await SmsQuizService.startQuiz(from);
      responseMsg = `Quiz started!\nQ1: ${firstQ.text}\nA) ${firstQ.options[0]}\nB) ${firstQ.options[1]}\nC) ${firstQ.options[2]}\nD) ${firstQ.options[3]}`;
    } else if (message.trim().toUpperCase() === 'BTW') {
      await sendSms({ to: from, message: "Welcome to Brain Teaser Weekly! Answer simple questions and stand a chance to win fantastic prizes." });
      const firstQ = await SmsQuizService.startQuiz(from);
      responseMsg = `Quiz started!\nQ1: ${firstQ.text}\nA) ${firstQ.options[0]}\nB) ${firstQ.options[1]}\nC) ${firstQ.options[2]}\nD) ${firstQ.options[3]}`;
    } else if (message.trim().toUpperCase() === 'BTM') {
      await sendSms({ to: from, message: "Welcome to Brain Teaser Monthly! Answer simple questions and stand a chance to win fantastic prizes." });
      const firstQ = await SmsQuizService.startQuiz(from);
      responseMsg = `Quiz started!\nQ1: ${firstQ.text}\nA) ${firstQ.options[0]}\nB) ${firstQ.options[1]}\nC) ${firstQ.options[2]}\nD) ${firstQ.options[3]}`;
    } else {
      const result = await SmsQuizService.processAnswer(from, message.trim());
      if (result.error) {
        responseMsg = result.error;
      } else if (result.done) {
        responseMsg = `Quiz complete! Your score: ${result.score}/10. Aggregate: ${result.aggregateScore}`;
      } else {
        const q = result.nextQuestion;
        if (q) {
          responseMsg = `${result.correct ? 'Correct!' : 'Wrong!'}\nQ${q.id}: ${q.text}\nA) ${q.options[0]}\nB) ${q.options[1]}\nC) ${q.options[2]}\nD) ${q.options[3]}`;
        } else {
          responseMsg = result.correct ? 'Correct!' : 'Wrong!';
        }
      }
    }
    await sendSms({ to: from, message: responseMsg });
    reply.code(200).send({ status: 'ok' });
  });

  // HTTP endpoint to start a quiz for a phone number (for testing)
  app.post('/start', async (request, reply) => {
    const { phoneNumber } = request.body as { phoneNumber: string };
    if (!phoneNumber) {
      return reply.code(400).send({ error: 'Missing phoneNumber' });
    }
    const firstQ = await SmsQuizService.startQuiz(phoneNumber);
    reply.send({ firstQuestion: firstQ });
  });
}

/*
// TODO: Subscribe and bill user based on sms sent; if "DAILY" or "WEEKLY" or "MONTHLY" is sent, then subscribe user to that plan
if (message.trim().toUpperCase() === 'STOP') {
  // Handle stop command, e.g., unsubscribe user
  responseMsg = 'You have been unsubscribed from the quiz service.';
  // Here you would typically remove the user from your subscription list
  // For example: await SmsQuizService.unsubscribeUser(from);
} else if (message.trim().toUpperCase() === 'HELP') {
  // Provide help information
  responseMsg = 'Send "START" to begin the quiz or "STOP" to unsubscribe.';
} else if (message.trim().toUpperCase() === 'DAILY') {
  // Handle daily subscription
  responseMsg = 'You have subscribed to daily quizzes. You will receive a quiz question every day.';
  // Here you would typically add the user to a daily subscription list
  // For example: await SmsQuizService.subscribeUserToDaily(from);
} else if (message.trim().toUpperCase() === 'WEEKLY') {
  // Handle weekly subscription
  responseMsg = 'You have subscribed to weekly quizzes. You will receive a quiz question every week.';
  // Here you would typically add the user to a weekly subscription list
  // For example: await SmsQuizService.subscribeUserToWeekly(from);
} else if (message.trim().toUpperCase() === 'MONTHLY') {
  // Handle monthly subscription
  responseMsg = 'You have subscribed to monthly quizzes. You will receive a quiz question every month.';
  // Here you would typically add the user to a monthly subscription list
  // For example: await SmsQuizService.subscribeUserToMonthly(from);
} else if (message.trim().toUpperCase() === 'STATUS') {
  // Handle status request
  const status = await SmsQuizService.getUserStatus(from);
  if (status) {
    responseMsg = `Your current status: ${status}.`;
  } else {
    responseMsg = 'You are not currently subscribed to any quiz service.';
  }
} else if (message.trim().toUpperCase() === 'SCORE') {
  // Handle score request
  const score = await SmsQuizService.getUserScore(from);
  if (score !== null) {
    responseMsg = `Your current score is: ${score}.`;
  } else {
    responseMsg = 'You have not participated in any quizzes yet.';
  }
} else if (message.trim().toUpperCase() === 'AGGREGATE') {
  // Handle aggregate score request
  const aggregateScore = await SmsQuizService.getUserAggregateScore(from);
  if (aggregateScore !== null) {
    responseMsg = `Your aggregate score is: ${aggregateScore}.`;
  } else {
    responseMsg = 'You have not participated in any quizzes yet.';
  }
} else if (message.trim().toUpperCase() === 'LEADERBOARD') {
  // Handle leaderboard request
  const leaderboard = await SmsQuizService.getLeaderboard();
  if (leaderboard.length > 0) {
    responseMsg = 'Leaderboard:\n' + leaderboard.map((user, index) => `${index + 1}. ${user.name} - Score: ${user.score}`).join('\n');
  }
  } else {
  responseMsg = 'Unknown command. Send "HELP" for a list of commands.';
};
*/