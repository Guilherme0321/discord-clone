import { useState, type FormEvent } from "react";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/useAuthStore";
import { DiscordiaLogo } from "../icons/Icons";
import type { User } from "../../types";

export function LoginScreen() {
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setSession = useAuthStore((state) => state.setSession);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const { data } = await api.post<{ user: User; token: string }>("/users/login", {
        username,
      });
      setSession(data.user, data.token);
    } catch (err) {
      setError("Não foi possível entrar. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-discord-bg-darkest">
      <div className="w-full max-w-md rounded-md bg-discord-bg p-8 shadow-xl">
        <div className="mb-4 flex flex-col items-center gap-2">
          <DiscordiaLogo className="h-14 w-14" />
          <span className="text-xl font-bold text-white">Discordia</span>
        </div>
        <h1 className="text-center text-2xl font-semibold text-white">Bem-vindo(a) de volta!</h1>
        <p className="mt-2 text-center text-sm text-discord-text-muted">
          Que bom te ver de novo! Digite um nome de usuário para entrar.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="username"
              className="mb-2 block text-xs font-bold uppercase text-discord-text-muted"
            >
              Nome de usuário
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-[3px] border-none bg-discord-bg-darkest px-3 py-2.5 text-discord-text outline-none ring-1 ring-transparent focus:ring-discord-blurple"
              placeholder="ex: otavio"
              minLength={2}
              required
              autoFocus
            />
          </div>

          {error && <p className="text-sm text-discord-red">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-[3px] bg-discord-blurple py-2.5 font-medium text-white transition hover:bg-discord-blurple-hover disabled:opacity-60"
          >
            {isLoading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
