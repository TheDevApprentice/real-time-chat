// src/services/api.ts
import axios, {
    type AxiosError,
    type AxiosInstance,
    type AxiosResponse,
    type InternalAxiosRequestConfig,
  } from "axios";
  import type { ApiError, ApiResponse, RequestConfig } from "./types";
  import { getCookie } from '@/utils/cookieHelper';
  
  // ===== CONFIGURATION =====
  const API_CONFIG = {
    baseURL: import.meta.env.VITE_API_BASE_URL,
    timeout: 30000,
    retries: 3,
    retryDelay: 1000,
  } as const;

  // ===== CLASSE API SERVICE =====
  class AxiosService {
    private instance: AxiosInstance;
  
    constructor() {
      this.instance = axios.create({
        baseURL: API_CONFIG.baseURL,
        timeout: API_CONFIG.timeout,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        withCredentials: true, // Toujours envoyer le cookie de session sécurisé
      });
  
      this.setupInterceptors();
    }
  
    // ===== CONFIGURATION DES INTERCEPTEURS =====
    private setupInterceptors(): void {
      // Intercepteur de requête
      this.instance.interceptors.request.use(
        (config: InternalAxiosRequestConfig) => {
          return this.handleRequest(config);
        },
        (error: AxiosError) => {
          return this.handleRequestError(error);
        }
      );
  
      // Intercepteur de réponse
      this.instance.interceptors.response.use(
        (response: AxiosResponse) => {
          return this.handleResponse(response);
        },
        (error: AxiosError) => {
          return this.handleResponseError(error);
        }
      );
    }
  
    // ===== GESTION DES REQUÊTES =====
    private handleRequest(
      config: InternalAxiosRequestConfig
    ): InternalAxiosRequestConfig {
      // Ajouter la locale actuelle
      const locale = this.getCurrentLocale();
      if (locale) {
        config.headers["Accept-Language"] = locale;
      }

      // Ajout du header CSRF pour les requêtes mutatives
      const csrfToken = getCookie('X-XSRF-TOKEN');
      if (
        csrfToken &&
        ['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() || '')
      ) {
        config.headers['X-XSRF-TOKEN'] = csrfToken;
      }

      // Log en développement
      if (import.meta.env.DEV) {
        console.log(`🔄 ${config.method?.toUpperCase()} ${config.url}`, {
          headers: config.headers,
          data: config.data,
          params: config.params,
        });
      }

      return config;
    }
  
    private handleRequestError(error: AxiosError): Promise<never> {
      console.error("❌ Request Error:", error);
      return Promise.reject(this.formatError(error));
    }
  
    // ===== GESTION DES RÉPONSES =====
    private handleResponse(response: AxiosResponse): AxiosResponse {
      if (import.meta.env.DEV) {
        console.log(
          `✅ ${response.status} ${response.config.url}`,
          response.data
        );
      }
  
      return response;
    }
  
    private async handleResponseError(error: AxiosError): Promise<never> {
      const config = error.config as RequestConfig;
  
      // Retry logic pour les erreurs réseau
      if (
        this.shouldRetry(error) &&
        (config?.retries ?? API_CONFIG.retries) > 0
      ) {
        return this.retryRequest(error);
      }
  
      // Gestion des erreurs spécifiques
      if (!config?.skipErrorHandling) {
        this.handleSpecificErrors(error);
      }
  
      return Promise.reject(this.formatError(error));
    }
  
    // ===== RETRY LOGIC =====
    private shouldRetry(error: AxiosError): boolean {
      return (
        !error.response ||
        error.response.status >= 500 ||
        error.code === "NETWORK_ERROR" ||
        error.code === "TIMEOUT"
      );
    }
  
    private async retryRequest(error: AxiosError): Promise<never> {
      const config = error.config as RequestConfig;
      const retries = (config.retries ?? API_CONFIG.retries) - 1;
  
      await this.delay(API_CONFIG.retryDelay);
  
      // @ts-expect-error
      return this.instance({
        ...config,
        retries,
      });
    }
  
    private delay(ms: number): Promise<void> {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
  
    // ===== MÉTHODES UTILITAIRES =====
    private getCurrentLocale(): string {
      // Tenter de récupérer la locale depuis le localStorage ou le navigateur
      return (
        localStorage.getItem("app-locale") ||
        navigator.language.split("-")[0] ||
        "fr"
      );
    }
  
    private handleSpecificErrors(error: AxiosError): void {
      const status = error.response?.status;
  
      switch (status) {
        case 403:
          console.warn("⚠️ Access forbidden - insufficient permissions");
          break;
        case 404:
          console.warn("⚠️ Resource not found");
          break;
        case 422:
          console.warn("⚠️ Validation error:", error.response?.data);
          break;
        case 429:
          console.warn("⚠️ Rate limit exceeded");
          break;
        case 500:
          console.error("❌ Internal server error");
          break;
        default:
          console.error("❌ API Error:", error.message);
      }
    }
  
    private formatError(error: AxiosError): ApiError {
      const response = error.response;
  
      return {
        message:
          (response && (response.data as any)?.message) || error.message || "Une erreur est survenue",
        status: response?.status,
        code: error.code,
        data: response?.data,
      };
    }
  
    // ===== MÉTHODES PUBLIQUES =====
  
    // GET
    async get<T = any>(
      url: string,
      config?: RequestConfig
    ): Promise<ApiResponse<T>> {
      try {
        console.warn("AXIOS Service - GET - URL:", url);
        const response = await this.instance.get<T>(url, config);
        return this.normalizeResponse(response);
      } catch (error) {
        throw error;
      }
    }
  
    // POST
    async post<T = any>(
      url: string,
      data?: any,
      config?: RequestConfig
    ): Promise<ApiResponse<T>> {
      try {
        console.warn("AXIOS Service - POST - URL:", url);
        const response = await this.instance.post<T>(url, data, config);
        return this.normalizeResponse(response);
      } catch (error) {
        throw error;
      }
    }
  
    // PUT
    async put<T = any>(
      url: string,
      data?: any,
      config?: RequestConfig
    ): Promise<ApiResponse<T>> {
      try {
        console.warn("AXIOS Service - PUT - URL:", url);
        const response = await this.instance.put<T>(url, data, config);
        return this.normalizeResponse(response);
      } catch (error) {
        throw error;
      }
    }
  
    // PATCH
    async patch<T = any>(
      url: string,
      data?: any,
      config?: RequestConfig
    ): Promise<ApiResponse<T>> {
      try {
        console.warn("AXIOS Service - PATCH - URL:", url);
        const response = await this.instance.patch<T>(url, data, config);
        return this.normalizeResponse(response);
      } catch (error) {
        throw error;
      }
    }
  
    // DELETE
    async delete<T = any>(
      url: string,
      config?: RequestConfig
    ): Promise<ApiResponse<T>> {
      try {
        console.warn("AXIOS Service - DELETE - URL:", url);
        const response = await this.instance.delete<T>(url, config);
        return this.normalizeResponse(response);
      } catch (error) {
        throw error;
      }
    }
  
    // UPLOAD
    async upload<T = any>(
      url: string,
      file: File,
      config?: RequestConfig
    ): Promise<ApiResponse<T>> {
      const formData = new FormData();
      formData.append("file", file);
      try {
        console.warn("AXIOS Service - UPLOAD - URL:", url);
        const response = await this.instance.post<T>(url, formData, {
          ...config,
          headers: {
            ...config?.headers,
            "Content-Type": "multipart/form-data",
          },
        });
        return this.normalizeResponse(response);
      } catch (error) {
        throw error;
      }
    }

    // DOWNLOAD
    async download(
      url: string,
      filename?: string,
      config?: RequestConfig
    ): Promise<void> {
      try {
        console.warn("AXIOS Service - DOWNLOAD - URL:", url);
        const response = await this.instance.get(url, {
          ...config,
          responseType: "blob",
        });
        const blob = new Blob([response.data]);
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = filename || "download";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      } catch (error) {
        throw error;
      }
    }
  
    // MÉTHODES UTILITAIRES
    setBaseURL(baseURL: string): void {
      console.log("AXIOS Service - Set Base URL set to:", baseURL);
      this.instance.defaults.baseURL = baseURL;
    }
  
    getBaseURL(): string {
      console.log("AXIOS Service - Get Base URL set to:", this.instance.defaults.baseURL);
      return this.instance.defaults.baseURL || "/api";
    }
  
    // Normaliser la réponse
    private normalizeResponse<T>(response: AxiosResponse<T>): ApiResponse<T> {
      return {
        data: response.data,
        message: response.statusText,
        success: response.status >= 200 && response.status < 300,
        status: response.status,
      };
    }
  
    // Accès à l'instance Axios pour les cas avancés
    get axiosInstance(): AxiosInstance {
      return this.instance;
    }
  }
  
  // ===== INSTANCE SINGLETON =====
  export const axiosService = new AxiosService();
  export default axiosService;
  