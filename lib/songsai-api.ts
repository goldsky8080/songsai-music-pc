export type PublicUser = {
  id: string;
  email: string;
  name?: string | null;
  profileImage?: string | null;
  role: "USER" | "DEVELOPER" | "ADMIN";
  createdAt?: string;
};

export class SongsaiApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "SongsaiApiError";
    this.status = status;
  }
}

export function getSongsaiApiUrl() {
  return process.env.NEXT_PUBLIC_SONGSAI_API_URL?.replace(/\/$/, "") ?? "https://api.songsai.org";
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text) {
    return {} as T;
  }

  return JSON.parse(text) as T;
}

export async function songsaiApiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${getSongsaiApiUrl()}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = await parseJson<{ error?: string } | { error?: { formErrors?: string[] } }>(response);
    const message =
      typeof payload.error === "string"
        ? payload.error
        : payload.error?.formErrors?.[0] ?? "요청 처리에 실패했습니다.";

    throw new SongsaiApiError(message, response.status);
  }

  return parseJson<T>(response);
}
