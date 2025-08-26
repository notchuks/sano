import { FastifyInstance } from "fastify";
import { UserController } from "./user.controller";
import { CreateUserSchema, UpdateUserSchema, UserSchema } from "./user.schema";
import { Type } from "@sinclair/typebox";

const LeaderboardUser = Type.Object({
  id: Type.Integer(),
  username: Type.String(),
  aggregateScore: Type.Integer(),
  currentScore: Type.Integer(),
  phoneNumber: Type.String(),
  createdAt: Type.String({ format: "date-time" }),
  updatedAt: Type.String({ format: "date-time" }),
});

const LeaderboardResponse = Type.Object({
  data: Type.Array(LeaderboardUser),
  pagination: Type.Object({
    page: Type.Integer(),
    pageSize: Type.Integer(),
    total: Type.Integer(),
    totalPages: Type.Integer(),
  }),
});

export default async function userRoutes(app: FastifyInstance) {
  app.post("/", { schema: { body: CreateUserSchema, response: { 201: UserSchema } } }, UserController.create);
  app.get("/", { schema: { response: { 200: Type.Array(UserSchema) } } }, UserController.getAll);
  app.get("/:id", { schema: { response: { 200: UserSchema } } }, UserController.getById);
  app.put("/:id", { schema: { body: UpdateUserSchema, response: { 200: UserSchema } } }, UserController.update);
  app.delete("/:id", UserController.delete);
  app.get("/leaderboard", {
    schema: {
      querystring: Type.Object({
        page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
        pageSize: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 10 })),
      }),
      response: { 200: LeaderboardResponse },
      tags: ["Leaderboard"],
      summary: "Get leaderboard ranked by aggregateScore",
      description: "Returns a paginated leaderboard of users ranked by aggregateScore.",
    },
  }, UserController.leaderboard);
}