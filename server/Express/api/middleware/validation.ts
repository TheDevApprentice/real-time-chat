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

export const WsSendMessageSchema = z
  .object({
    roomId: z.string().min(1),
    content: z.string().max(2000).optional(),
    attachments: z.array(z.string().min(1)).max(50).optional(),
    timestamp: z.number().int().positive().optional(),
  })
  .passthrough()
  .refine(
    (v) => {
      const hasText = typeof v.content === 'string' && v.content.trim().length > 0;
      const hasAtt = Array.isArray(v.attachments) && v.attachments.length > 0;
      return hasText || hasAtt;
    },
    { message: 'content or attachments required' }
  );

// Message edit/delete (WS)
export const WsMessageEditSchema = z.object({
  roomId: z.string().min(1),
  messageId: z.number().int().positive(),
  newContent: z.string().min(1).max(2000),
});

export const WsMessageDeleteSchema = z.object({
  roomId: z.string().min(1),
  messageId: z.number().int().positive(),
});

export const WsMessageUndoSchema = z.object({
  roomId: z.string().min(1),
  messageId: z.number().int().positive(),
});

export const WsUndoTtlSchema = z.object({
  roomId: z.string().min(1),
  messageId: z.number().int().positive(),
});

// REST params/bodies
export const MessageIdParamsSchema = z.object({
  messageId: z.coerce.number().int().positive(),
});

export const MessageEditBodySchema = z.object({
  roomId: z.string().min(1),
  content: z.string().min(1).max(2000),
});

export const MessageDeleteBodySchema = z.object({
  roomId: z.string().min(1),
});

export const MessageUndoBodySchema = z.object({
  roomId: z.string().min(1),
});

// User search (REST) schemas
export const SearchUsersQuerySchema = z.object({
  q: z.string().min(1).max(50),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

// Invites (REST) schemas
export const InviteCreateBodySchema = z.object({
  roomId: z.string().min(1),
  invitedUserId: z.string().min(1).optional(),
  role: z.string().min(1).max(50).optional(),
});