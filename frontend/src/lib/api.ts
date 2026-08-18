import axios from "axios";
import { useAuthStore } from "../store/useAuthStore";

function withScheme(url: string): string {
  return /^https?:\/\//.test(url) ? url : `https://${url}`;
}

// Em produção (Render), VITE_API_URL pode vir de outro serviço via `fromService`,
// que resolve apenas o host (sem protocolo) — por isso normalizamos aqui.
export const API_URL = withScheme(import.meta.env.VITE_API_URL || "http://localhost:4000");

export const api = axios.create({
  baseURL: `${API_URL}/api`,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
