export type PublicUser = {
  id: string;
  email: string;
  name?: string | null;
  profileImage?: string | null;
  role: "USER" | "DEVELOPER" | "ADMIN";
  emailVerifiedAt?: string | null;
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

function getConfiguredApiUrl() {
  return process.env.NEXT_PUBLIC_SONGSAI_API_URL?.replace(/\/$/, "") ?? "https://api.songsai.org";
}

function shouldUseLocalProxy(configured: string) {
  return /^https?:\/\/localhost(?::\d+)?$/i.test(configured);
}

export function getSongsaiApiUrl() {
  const configured = getConfiguredApiUrl();

  if (shouldUseLocalProxy(configured)) {
    return "/api/proxy";
  }

  return configured;
}

export function buildSongsaiApiUrl(path: string) {
  const base = getSongsaiApiUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (base.startsWith("/")) {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    return new URL(`${base}${normalizedPath}`, origin);
  }

  return new URL(normalizedPath, `${base}/`);
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text) {
    return {} as T;
  }

  return JSON.parse(text) as T;
}

type ErrorPayload = {
  error?:
    | string
    | {
        formErrors?: string[];
        fieldErrors?: Record<string, string[] | undefined>;
      };
};

function getErrorMessage(payload: ErrorPayload) {
  if (typeof payload.error === "string") {
    return payload.error;
  }

  const formMessage = payload.error?.formErrors?.[0];
  if (formMessage) {
    return formMessage;
  }

  const fieldErrors = payload.error?.fieldErrors;
  if (fieldErrors) {
    const firstFieldMessage = Object.values(fieldErrors)
      .flat()
      .find((value): value is string => typeof value === "string" && value.trim().length > 0);

    if (firstFieldMessage) {
      return firstFieldMessage;
    }
  }

  return "요청 처리에 실패했습니다.";
}

export async function songsaiApiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildSongsaiApiUrl(path).toString(), {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = await parseJson<ErrorPayload>(response);
    const message = getErrorMessage(payload);

    throw new SongsaiApiError(message, response.status);
  }

  return parseJson<T>(response);
}
