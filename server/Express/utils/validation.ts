import { z } from "zod";

// Auth schemas
export const RegisterSchema = z
  .object({
    username: z.string().min(3).max(50),
    password: z.string().min(6).max(200),
    confirmPassword: z.string().min(6).max(200),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().uuid().or(z.string().min(10)),
});

// Chat schemas
export const CreateRoomSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["room", "user"]).optional(),
  isPublic: z.boolean().optional(),
  invitedUserIds: z.array(z.string().min(1)).max(100).optional(),
});

export const JoinRoomParamsSchema = z.object({
  roomId: z.string().min(1),
});

// REST params schemas
export const RoomIdParamsSchema = z.object({
  roomId: z.string().min(1),
});

export const SessionTokenParamsSchema = z.object({
  token: z.string().uuid(),
});

// WebSocket schemas
export const WsLoginSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(1).max(200),
});

export const WsAuthenticateSchema = z.object({
  token: z.string().min(10),
});

export const WsRefreshTokenSchema = z.object({
  refreshToken: z.string().uuid().or(z.string().min(10)),
});

export const WsCreateRoomSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["room", "user"]).optional(),
  isPublic: z.boolean().optional(),
  invitedUserIds: z.array(z.string().min(1)).max(100).optional(),
});

export const WsJoinRoomSchema = z.object({
  roomId: z.string().min(1),
});

export const WsSendMessageSchema = z.object({
  roomId: z.string().min(1),
  content: z.string().min(1).max(2000),
  timestamp: z.number().int().positive().optional(),
});

// User search (REST) schemas
export const SearchUsersQuerySchema = z.object({
  q: z.string().min(1).max(50),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});