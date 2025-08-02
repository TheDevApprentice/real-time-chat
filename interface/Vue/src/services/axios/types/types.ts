// src/services/types.ts

// src/services/types.ts
import type { AxiosRequestConfig } from "axios";

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

// Configuration des environnements
export interface ApiConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  retryDelay: number;
}

export interface EnvironmentConfig {
  development: ApiConfig;
  staging: ApiConfig;
  production: ApiConfig;
}

// ===== TYPES =====
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  data?: any;
}

export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  success: boolean;
  status: number;
}

export interface RequestConfig extends AxiosRequestConfig {
  skipAuth?: boolean;
  skipErrorHandling?: boolean;
  retries?: number;
}
