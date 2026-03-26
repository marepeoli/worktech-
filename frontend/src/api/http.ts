import axios from "axios";

import { clearSession, getAccessToken, getRefreshToken, saveSession } from "../auth/storage";
import type { TokenResponse } from "../auth/types";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
});

let refreshPromise: Promise<TokenResponse> | null = null;

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest || error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearSession();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (!refreshPromise) {
      refreshPromise = axios
        .post<TokenResponse>(`${import.meta.env.VITE_API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        })
        .then((res) => {
          saveSession(res.data.access_token, res.data.refresh_token, res.data.role);
          return res.data;
        })
        .catch((refreshError) => {
          clearSession();
          throw refreshError;
        })
        .finally(() => {
          refreshPromise = null;
        });
    }

    const newTokens = await refreshPromise;
    originalRequest.headers.Authorization = `Bearer ${newTokens.access_token}`;
    return api(originalRequest);
  }
);

export { api };
