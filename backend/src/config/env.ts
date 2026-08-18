import dotenv from "dotenv";

dotenv.config();

function withScheme(url: string): string {
  return /^https?:\/\//.test(url) ? url : `https://${url}`;
}

export const PORT = Number(process.env.PORT) || 4000;
export const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

// Em produção (Render), CLIENT_URL pode vir de outro serviço via `fromService`,
// que resolve apenas o host (sem protocolo) — por isso normalizamos aqui.
export const CLIENT_URL = withScheme(process.env.CLIENT_URL || "http://localhost:5173");
