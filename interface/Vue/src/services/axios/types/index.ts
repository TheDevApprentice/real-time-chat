// src/services/index.ts - Export central

import { axiosService } from "../axios";

// Service principal
export { default as axiosService } from "../axios";
export { axiosService as axios } from "../axios";

// Types

export type {
  ApiError,
  ApiResponse,
  RequestConfig,
  AuthTokens,
  ApiConfig,
  EnvironmentConfig,
} from "./types";

// Export de convenance pour les imports courts
export const {
  get,
  post,
  put,
  patch,
  delete: del,
  upload,
  download,
  setBaseURL,
  getBaseURL,
} = axiosService;
