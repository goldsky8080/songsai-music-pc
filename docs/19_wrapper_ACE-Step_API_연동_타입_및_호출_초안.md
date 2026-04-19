# wrapper ACE-Step API 연동 타입 및 호출 초안

기준일: 2026-04-19

## 목적

이 문서는 `wrapper (songsai-api)`에서 `ace-step-api`를 호출할 때 필요한 TypeScript 타입, env 값, 호출 함수, 응답 검증, 저장 매핑의 초안을 정리한다.

현재 구조 기준:

```text
songsai-music-pc
  -> songsai-api
      -> provider=suno     : 기존 로직
      -> provider=ace_step : ace-step-api 호출

ace-step-api
  -> ACE-Step 엔진 호출
  -> 결과 정규화
  -> wrapper 저장형 응답 반환
```

즉 이 문서의 목적은 `songsai-api`가 `ace-step-api` 응답을 받아 기존 `Music` 저장 흐름에 맞춰 연결할 수 있게 하는 것이다.

## 관련 기준 문서

- `docs/18_ACE-Step_wrapper저장형_응답계약_및_저장흐름.md`

이 문서 기준으로:

- `ace-step-api`는 DB 저장을 하지 않는다.
- `songsai-api`가 최종 저장 책임을 가진다.
- `ace-step-api`는 wrapper 저장 친화 응답만 반환한다.

## 1. env 추가 초안

파일:

- `src/lib/env.ts`

추가 env:

```env
ACE_STEP_API_BASE_URL=http://127.0.0.1:8200
```

설명:

- `songsai-api`가 `ace-step-api`를 내부 호출할 때 사용할 base URL
- `wrapper`와 `ace-step-api`가 같은 서버라면 `127.0.0.1:8200`이 가장 자연스럽다

예상 코드 추가:

```ts
ACE_STEP_API_BASE_URL: emptyStringToUndefined,
```

그리고 parse 대상에도 추가:

```ts
ACE_STEP_API_BASE_URL: process.env.ACE_STEP_API_BASE_URL,
```

## 2. TypeScript 타입 초안

파일 후보:

- `src/server/music/types.ts`

```ts
export type AceStepStatus = "queued" | "processing" | "completed" | "failed";

export type AceStepCreateRequest = {
  title?: string | null;
  lyrics: string;
  stylePrompt: string;
  prompt?: string | null;
  model?: string | null;
  modelVersion?: string | null;
  duration?: number | null;
  thinking?: boolean;
  vocalLanguage?: string | null;
};

export type AceStepCreateResponse = {
  requestId: string;
  provider: "ACE_STEP";
  providerTaskId: string | null;
  status: AceStepStatus;
  title: string;
  lyrics: string;
  stylePrompt: string;
  imageUrl: string | null;
  mp3Url: string | null;
  duration: number | null;
  errorMessage: string | null;
  raw?: unknown;
  createdAt: string;
  updatedAt: string;
};
```

## 3. ace-step-api 호출 함수 초안

파일 후보:

- `src/server/music/provider.ts`
- 또는 `src/server/music/ace-step.ts`

```ts
import { getEnv } from "@/lib/env";
import type { AceStepCreateRequest, AceStepCreateResponse } from "./types";

function getAceStepApiBaseUrl() {
  const baseUrl = getEnv().ACE_STEP_API_BASE_URL;
  if (!baseUrl) {
    throw new Error("ACE_STEP_API_BASE_URL is not configured.");
  }

  return baseUrl.replace(/\/$/, "");
}

export async function createMusicWithAceStep(
  payload: AceStepCreateRequest,
): Promise<AceStepCreateResponse> {
  const response = await fetch(`${getAceStepApiBaseUrl()}/api/v1/music`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const data = (await response.json()) as AceStepCreateResponse | { detail?: string };

  if (!response.ok) {
    throw new Error(
      "detail" in data && typeof data.detail === "string"
        ? data.detail
        : "ACE-Step API request failed.",
    );
  }

  return data as AceStepCreateResponse;
}
```

## 4. 응답 검증 함수 초안

`songsai-api`는 저장 전에 최소한의 응답 검증을 하는 것이 좋다.

```ts
import type { AceStepCreateResponse } from "./types";

export function validateAceStepResponse(response: AceStepCreateResponse) {
  if (response.provider !== "ACE_STEP") {
    throw new Error("ACE-Step response provider mismatch.");
  }

  if (!response.title?.trim()) {
    throw new Error("ACE-Step response missing title.");
  }

  if (!response.stylePrompt?.trim()) {
    throw new Error("ACE-Step response missing stylePrompt.");
  }

  if (response.status === "completed") {
    if (!response.providerTaskId?.trim()) {
      throw new Error("ACE-Step completed response missing providerTaskId.");
    }

    if (!response.imageUrl?.trim()) {
      throw new Error("ACE-Step completed response missing imageUrl.");
    }

    if (!response.mp3Url?.trim()) {
      throw new Error("ACE-Step completed response missing mp3Url.");
    }
  }

  if (response.status === "failed" && !response.errorMessage?.trim()) {
    throw new Error("ACE-Step failed response missing errorMessage.");
  }
}
```

## 5. wrapper -> ace-step-api 요청 예시

```json
{
  "title": "곡 제목",
  "lyrics": "가사 전체",
  "stylePrompt": "cinematic korean ballad, warm strings, emotional male vocal",
  "prompt": "korean ballad with emotional strings",
  "model": "acestep-v15-turbo",
  "modelVersion": "ace_step_1_5",
  "duration": 180,
  "thinking": false,
  "vocalLanguage": "ko"
}
```

## 6. ace-step-api 정상 응답 예시

```json
{
  "requestId": "ace_req_7d8d8d8d8d8d",
  "provider": "ACE_STEP",
  "providerTaskId": "task_abc123",
  "status": "completed",
  "title": "곡 제목",
  "lyrics": "가사 전체",
  "stylePrompt": "cinematic korean ballad, warm strings, emotional male vocal",
  "imageUrl": "http://127.0.0.1:8200/media/images/ace_req_7d8d8d8d8d8d.svg",
  "mp3Url": "http://127.0.0.1:8200/media/audio/ace_req_7d8d8d8d8d8d.mp3",
  "duration": 182,
  "errorMessage": null,
  "raw": {
    "requestPayload": {
      "title": "곡 제목",
      "lyrics": "가사 전체",
      "stylePrompt": "cinematic korean ballad, warm strings, emotional male vocal",
      "prompt": "korean ballad with emotional strings",
      "vocalLanguage": "ko",
      "model": "acestep-v15-turbo",
      "modelVersion": "ace_step_1_5",
      "duration": 180,
      "thinking": false
    },
    "taskAccepted": {
      "taskId": "task_abc123",
      "status": "queued",
      "queuePosition": 0
    },
    "engineResult": {}
  },
  "createdAt": "2026-04-19T01:23:45.000000Z",
  "updatedAt": "2026-04-19T01:29:10.000000Z"
}
```

## 7. wrapper 저장 매핑 기준

`songsai-api`는 아래 필드를 `Music` 저장에 매핑하면 된다.

- `provider` -> `"ACE_STEP"`
- `providerTaskId` -> `Music.providerTaskId`
- `title` -> `Music.title`
- `lyrics` -> `Music.lyrics`
- `stylePrompt` -> `Music.stylePrompt`
- `imageUrl` -> `Music.imageUrl`
- `mp3Url` -> `Music.mp3Url`
- `duration` -> `Music.duration`
- `status` -> `Music.status`
- `errorMessage` -> `Music.errorMessage`
- `raw` -> `Music.rawResponse`

## 8. 상태값 해석 기준

허용 상태:

- `queued`
- `processing`
- `completed`
- `failed`

의미:

- `queued`
  - 요청 접수 직후
- `processing`
  - 엔진 처리 중
- `completed`
  - wrapper가 바로 저장 가능한 완료 상태
- `failed`
  - 실패 상태

`completed` 조건:

- `providerTaskId` 존재
- `title` 존재
- `imageUrl` 존재
- `mp3Url` 존재

## 9. wrapper 저장 예시 초안

```ts
const aceStepResult = await createMusicWithAceStep({
  title: parsed.data.title ?? null,
  lyrics: parsed.data.lyrics,
  stylePrompt: parsed.data.stylePrompt,
  prompt: parsed.data.stylePrompt,
  modelVersion: parsed.data.modelVersion ?? "ace_step_1_5",
  duration: null,
  thinking: false,
  vocalLanguage: "ko",
});

validateAceStepResponse(aceStepResult);

const createdMusic = await db.music.create({
  data: {
    userId: sessionUser.id,
    requestGroupId: randomUUID(),
    title: aceStepResult.title,
    lyrics: aceStepResult.lyrics,
    stylePrompt: aceStepResult.stylePrompt,
    provider: "ACE_STEP",
    providerTaskId: aceStepResult.providerTaskId,
    mp3Url: aceStepResult.mp3Url,
    imageUrl: aceStepResult.imageUrl,
    rawStatus: aceStepResult.status,
    rawPayload: parsed.data,
    rawResponse: aceStepResult,
    status:
      aceStepResult.status === "completed"
        ? MusicStatus.COMPLETED
        : aceStepResult.status === "failed"
          ? MusicStatus.FAILED
          : aceStepResult.status === "processing"
            ? MusicStatus.PROCESSING
            : MusicStatus.QUEUED,
    duration: aceStepResult.duration ?? null,
    errorMessage: aceStepResult.errorMessage ?? null,
    isPublic: false,
  },
});
```

## 10. provider 분기 기준

현재 구조를 크게 흔들지 않으려면 `provider.ts` 또는 `route.ts`에서 아래처럼 분기한다.

```ts
if (input.provider === "ace_step") {
  return createMusicWithAceStep(...);
}

return createMusicWithSuno(...);
```

또는 기존 `createMusicWithProvider` 안에서 내부 분기해도 된다.

## 11. 1차 구현 전략

가장 단순한 1차 방식:

1. `songsai-api`가 `ace-step-api` 호출
2. `ace-step-api`가 동기 완료 응답 반환
3. `songsai-api`가 바로 `Music` 저장
4. 프론트는 기존 `CreateMusicResponse` 구조 그대로 사용

장점:

- 상태 관리가 단순하다
- 기존 `wrapper` 저장 흐름에 맞추기 쉽다
- 프론트 영향이 가장 적다

## 12. 파일 후보 정리

### wrapper / songsai-api

예상 수정 파일:

- `src/app/api/v1/music/route.ts`
  - `provider=ace_step` 분기 추가
- `src/server/music/provider.ts`
  - Suno/ACE-Step 라우팅
- `src/server/music/types.ts`
  - ACE-Step 응답 타입 정의
- `src/lib/env.ts`
  - `ACE_STEP_API_BASE_URL`

### ace-step-api

예상 확인 파일:

- `POST /api/v1/music`
- `GET /health`

## 결론

`wrapper`는 `ace-step-api`를 “DB를 대신 저장하는 서버”로 보지 말고,
“ACE-Step 엔진 결과를 wrapper 저장형 응답으로 정규화해서 반환하는 서버”로 보면 된다.

즉 `wrapper` 구현 시 핵심은:

1. `ACE_STEP_API_BASE_URL` 추가
2. 요청 타입 정의
3. 응답 타입 정의
4. 최소 검증
5. 기존 `Music` 저장 흐름에 매핑
