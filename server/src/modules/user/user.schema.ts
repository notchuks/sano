import { Type } from "@sinclair/typebox";

export const UserSchema = Type.Object({
  id: Type.Integer(),
  phoneNumber: Type.String({ minLength: 10, maxLength: 20 }),
  username: Type.String({ minLength: 3, maxLength: 50 }),
  currentScore: Type.Integer(),
  aggregateScore: Type.Integer(),
  createdAt: Type.String({ format: "date-time" }),
  updatedAt: Type.String({ format: "date-time" }),
}, {
    $id: 'UserResponse',
    additionalProperties: false,
});

export const CreateUserSchema = Type.Object({
  phoneNumber: Type.String({ minLength: 10, maxLength: 20 }),
  username: Type.String({ minLength: 3, maxLength: 50 }),
});

export const UpdateUserSchema = Type.Partial(CreateUserSchema);