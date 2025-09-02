import { z } from 'zod';

// HTTP-friendly validation error
export class ValidationHttpError extends Error {
  status = 422 as const;
  details: Array<{ path: string; message: string }>;
  constructor(issues: import('zod').ZodIssue[]) {
    super('Invalid payload');
    this.name = 'ValidationHttpError';
    this.details = issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
  }
}

// Auth schemas
export const RegisterSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(200),
  confirmPassword: z.string().min(6).max(200),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().uuid().or(z.string().min(10)),
});

// Chat schemas
export const CreateRoomSchema = z.object({
  name: z.string().min(1).max(100),
});

export const JoinRoomParamsSchema = z.object({
  roomId: z.string().min(1),
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
});

export const WsJoinRoomSchema = z.object({
  roomId: z.string().min(1),
});

export const WsSendMessageSchema = z.object({
  roomId: z.string().min(1),
  content: z.string().min(1).max(2000),
  timestamp: z.number().int().positive().optional(),
});

// Helper to parse with friendly error
export function parseOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (!r.success) {
    throw new ValidationHttpError(r.error.issues);
  }
  return r.data;
}
