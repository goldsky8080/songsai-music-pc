# Stripe 크레딧 결제 및 차감 설계

기준일: 2026-04-25

## 1. 목표

SongsAI 서비스에 다음 흐름을 추가한다.

1. 사용자가 Stripe로 크레딧 상품을 결제한다.
2. 결제 확정은 Stripe webhook 기준으로 처리한다.
3. 결제 완료 시 사용자에게 유료 크레딧을 지급한다.
4. 음악 생성, 비디오 생성, 추가 기능 사용 시 크레딧을 차감한다.
5. 환불이나 생성 실패 시 원장 기준으로 크레딧을 복구할 수 있게 한다.

핵심 원칙은 다음과 같다.

- `User.freeCredits`, `User.paidCredits`는 빠른 조회용 잔액 캐시로 유지한다.
- 실제 정합성의 기준은 `CreditGrant`와 `CreditTransaction` 같은 원장 테이블에 둔다.
- 결제 성공은 프론트 리다이렉트가 아니라 Stripe webhook으로 확정한다.
- 차감은 음악 생성 직전 transaction 안에서 처리한다.

## 2. 왜 Stripe가 맞는가

현재 기준으로는 Stripe가 가장 적합하다.

- 글로벌 카드 결제 확장성이 좋다.
- Next.js 서버 라우트와 webhook 패턴이 잘 맞는다.
- 단건 충전과 구독형 모두 구현이 쉽다.
- 문서와 SDK가 안정적이다.
- 나중에 한국 PG를 추가하더라도 1차 기준 결제 엔진으로 두기 좋다.

권장 1차 범위:

- Stripe Checkout Session 기반 단건 크레딧 충전
- Stripe webhook 기반 결제 확정
- 구독형은 2차

## 3. D:\\music 프로젝트 분석 결과

`D:\music` 프로젝트에서 재사용 가치가 높은 부분은 `server/credits/service.ts`와 `prisma/schema.prisma`의 크레딧 구조다.

### 3.1 현재 D:\\music 구조의 장점

- `User.freeCredits`, `User.paidCredits`를 캐시 잔액으로 사용한다.
- 실제 사용 가능한 크레딧은 `CreditGrant` 단위로 관리한다.
- `CreditGrant.remainingAmount`를 소진시키는 방식이라 만료/부분 사용/환불이 쉽다.
- `Transaction` 테이블에 `DEPOSIT`, `USAGE`, `REFUND`, `ADJUSTMENT` 이력이 남는다.
- 차감은 free → paid 순으로 일관되게 처리된다.
- 실패 시 `refundUsageCreditsByMemo()`로 usage 이력을 되돌린다.

### 3.2 D:\\music 구조에서 그대로 가져올 부분

- `User.freeCredits`, `User.paidCredits` 유지
- `CreditGrant` 방식 도입
- `CreditTransaction` 원장 방식 도입
- 차감 함수 공통화
- 환불 함수 공통화
- `syncUserCreditBalances()` 같은 잔액 재동기화 함수

### 3.3 D:\\music 구조에서 SongsAI에 맞게 바꿔야 할 부분

- `Transaction` 명칭은 결제/크레딧/정산까지 섞여 보여서 `CreditTransaction`으로 더 명확히 분리하는 것이 좋다.
- `DepositRequest`는 수동 입금 승인용이므로 SongsAI 1차 Stripe 설계에는 불필요하다.
- 결제 원장용 `PaymentOrder`가 별도로 필요하다.
- 크레딧 비용 정책은 provider별로 분리해야 한다.
  - `SUNO`
  - `ACE_STEP`
  - `VIDEO_RENDER`

## 4. 권장 최종 구조

### 4.1 잔액 구조

`User`

- `freeCredits`
- `paidCredits`
- `tier`

역할:

- 현재 사용자 잔액 빠른 조회
- 프론트 상단/Account 페이지 표시

### 4.2 실제 원장 구조

#### `CreditGrant`

크레딧 묶음 단위 저장소다.

예:

- 회원가입 무료 지급 20
- 결제 충전 100
- 이벤트 보상 10

각 묶음은 개별 만료일과 잔여량을 가진다.

#### `CreditTransaction`

이력 원장이다.

예:

- 결제 완료로 +100
- 음악 생성으로 -10
- 비디오 생성으로 -5
- 실패 환불로 +10

#### `PaymentOrder`

Stripe 결제 주문과 webhook 상태를 기록한다.

역할:

- checkout session 생성 전후 주문 상태 추적
- webhook 중복 처리 방지
- 환불/취소/실패 상태 추적

## 5. Prisma 스키마 초안

아래는 SongsAI 기준 추천 초안이다.

```prisma
enum CreditKind {
  FREE
  PAID
}

enum CreditGrantStatus {
  ACTIVE
  CONSUMED
  EXPIRED
  CANCELLED
}

enum CreditTransactionType {
  PURCHASE
  USAGE
  REFUND
  ADJUSTMENT
  PROMOTION
  EXPIRATION
}

enum CreditTransactionStatus {
  PENDING
  COMPLETED
  FAILED
  CANCELLED
}

enum PaymentProvider {
  STRIPE
}

enum PaymentOrderStatus {
  PENDING
  CHECKOUT_CREATED
  PAID
  FAILED
  CANCELED
  REFUNDED
}

model CreditGrant {
  id              String            @id @default(cuid())
  userId          String
  creditKind      CreditKind
  amount          Int
  remainingAmount Int
  expiresAt       DateTime?
  lastUsedAt      DateTime?
  status          CreditGrantStatus @default(ACTIVE)
  source          String?
  paymentOrderId  String?
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  user            User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  paymentOrder    PaymentOrder?     @relation(fields: [paymentOrderId], references: [id], onDelete: SetNull)

  @@index([userId, creditKind, status])
  @@index([expiresAt, status])
  @@index([paymentOrderId])
}

model CreditTransaction {
  id             String                  @id @default(cuid())
  userId         String
  musicId        String?
  videoId        String?
  paymentOrderId String?
  amount         Int
  creditKind     CreditKind?
  type           CreditTransactionType
  status         CreditTransactionStatus @default(COMPLETED)
  balanceAfter   Int
  memo           String?
  metadata       Json?
  createdAt      DateTime                @default(now())

  user           User                    @relation(fields: [userId], references: [id], onDelete: Cascade)
  music          Music?                  @relation(fields: [musicId], references: [id], onDelete: SetNull)
  video          Video?                  @relation(fields: [videoId], references: [id], onDelete: SetNull)
  paymentOrder   PaymentOrder?           @relation(fields: [paymentOrderId], references: [id], onDelete: SetNull)

  @@index([userId, createdAt])
  @@index([type, status])
  @@index([musicId])
  @@index([videoId])
  @@index([paymentOrderId])
}

model PaymentOrder {
  id                    String             @id @default(cuid())
  userId                String
  provider              PaymentProvider
  status                PaymentOrderStatus @default(PENDING)
  productCode           String
  requestedCredits      Int
  amount                Int
  currency              String             @default("KRW")
  stripeSessionId       String?            @unique
  stripePaymentIntentId String?            @unique
  stripeCustomerId      String?
  externalOrderId       String             @unique
  paidAt                DateTime?
  refundedAt            DateTime?
  rawPayload            Json?
  createdAt             DateTime           @default(now())
  updatedAt             DateTime           @updatedAt

  user                  User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  creditGrants          CreditGrant[]
  creditTransactions    CreditTransaction[]

  @@index([userId, createdAt])
  @@index([status, createdAt])
  @@index([provider, status])
}
```

### 5.1 기존 User에 유지할 필드

기존 `User`는 유지한다.

```prisma
freeCredits Int @default(0)
paidCredits Int @default(0)
tier        String?
```

### 5.2 Music / Video와의 연결

기존 `Music`, `Video`는 유지한다.

추가로 `CreditTransaction.musicId`, `CreditTransaction.videoId`만 연결해두면 충분하다.

## 6. 크레딧 차감 정책

### 6.1 차감 우선순위

권장 정책:

1. 무료 크레딧 먼저 차감
2. 부족하면 유료 크레딧 차감

장점:

- 사용자 입장에서 무료 혜택이 먼저 소진되어 자연스럽다.
- 유료 결제분 보존 여부를 정책적으로 따로 고민하지 않아도 된다.

### 6.2 만료 정책

권장:

- 무료 크레딧: 30일 만료
- 유료 크레딧: 만료 없음 또는 365일

1차 구현 추천:

- 무료 30일
- 유료 만료 없음

즉 `expiresAt`는 `FREE`에만 적용해도 된다.

### 6.3 비용 정책

하드코딩보다 설정형이 좋다.

예:

```ts
export const CREDIT_COSTS = {
  SUNO_MUSIC_GENERATION: 10,
  ACE_STEP_MUSIC_GENERATION: 8,
  VIDEO_RENDER: 5,
  BONUS_TRACK_UNLOCK: 4,
} as const;
```

추후 DB 테이블로 분리 가능하지만 1차는 상수로 충분하다.

## 7. Stripe 결제 흐름

### 7.1 1차 결제 방식

Stripe Checkout Session 기반 단건 충전.

예시 상품:

- `credit_100`
- `credit_300`
- `credit_1000`

### 7.2 권장 흐름

1. 프론트가 상품 선택
2. `POST /api/v1/billing/checkout` 호출
3. backend가 Stripe Checkout Session 생성
4. `PaymentOrder`를 `CHECKOUT_CREATED` 상태로 저장
5. 프론트가 Stripe checkout URL로 이동
6. Stripe 결제 완료
7. Stripe webhook 수신
8. webhook에서 `PaymentOrder`를 `PAID`로 변경
9. `CreditGrant` 생성
10. `CreditTransaction(PURCHASE)` 생성
11. `User.freeCredits/paidCredits` 갱신

### 7.3 중요한 원칙

- 결제 성공 화면 redirect만 믿고 잔액 지급하면 안 된다.
- 반드시 webhook에서 지급 확정해야 한다.
- Stripe event id 또는 `stripeSessionId` 기준 중복 처리 방지가 필요하다.

## 8. 음악 생성 차감 흐름

SongsAI 기준으로는 `POST /api/v1/music` 진입 직전 차감이 가장 맞다.

권장 transaction 흐름:

1. 세션 사용자 확인
2. provider별 비용 계산
3. DB transaction 시작
4. 사용자 잔액 재동기화
5. 사용 가능한 grant 목록 조회
6. free → paid 순으로 `remainingAmount` 차감
7. `CreditTransaction(USAGE)` 기록
8. `User.freeCredits/paidCredits` 업데이트
9. `Music` row 생성
10. transaction commit
11. provider 호출

### 8.1 실패 시 환불 규칙

권장:

- provider 호출 직전/직후 시스템 오류로 생성 시작도 못 했으면 전액 환불
- 생성이 실제 시작된 뒤 provider 내부 실패는 정책적으로 선택

1차 추천:

- wrapper가 provider create 호출 실패 시 환불
- provider가 task를 만들었고 이후 실패한 경우 환불 안 함 또는 관리자 정책 처리

## 9. 비디오 생성 차감 흐름

현재 SongsAI 구조에는 이미 `Video`와 `GenerationJob`이 있으므로 비디오 생성 시 별도 비용 차감이 적합하다.

권장:

- `POST /api/v1/music/:id/video`에서 차감
- render job 생성 직전 transaction 안에서 차감
- 렌더 실패 시 refund

이 부분은 `D:\music\app\api\music\[id]\video\route.ts` 패턴을 거의 그대로 가져오면 된다.

## 10. API 목록 초안

### 10.1 결제/크레딧

#### `GET /api/v1/me/balance`

응답:

```json
{
  "freeCredits": 20,
  "paidCredits": 80,
  "totalCredits": 100
}
```

#### `GET /api/v1/me/credit-transactions`

크레딧 사용/환불/충전 이력 조회

#### `GET /api/v1/me/payment-orders`

결제 주문 이력 조회

#### `POST /api/v1/billing/checkout`

입력:

```json
{
  "productCode": "credit_100"
}
```

응답:

```json
{
  "orderId": "po_xxx",
  "checkoutUrl": "https://checkout.stripe.com/..."
}
```

#### `POST /api/v1/billing/webhooks/stripe`

Stripe webhook 수신

처리:

- `checkout.session.completed`
- 필요 시 `payment_intent.payment_failed`
- 필요 시 `charge.refunded`

#### `POST /api/v1/admin/credits/grant`

관리자 수동 지급

#### `POST /api/v1/admin/credits/adjust`

관리자 수동 조정

### 10.2 음악/비디오 생성

#### `POST /api/v1/music`

변경점:

- 차감 전 잔액 확인
- 부족 시 `402 Payment Required`

예시:

```json
{
  "error": "Insufficient credits.",
  "requiredCredits": 10,
  "currentCredits": 4
}
```

#### `POST /api/v1/music/:id/video`

변경점:

- 비디오 렌더 비용 차감
- 실패 시 refund

## 11. 구현 파일 기준 초안

### 11.1 Prisma

- `D:\wrapper\suno-api\prisma\schema.prisma`
- 새 migration 추가

### 11.2 크레딧 서비스

신규 파일 권장:

- `D:\wrapper\suno-api\src\server\credits\constants.ts`
- `D:\wrapper\suno-api\src\server\credits\service.ts`
- `D:\wrapper\suno-api\src\server\credits\stripe.ts`

### 11.3 결제 API

- `D:\wrapper\suno-api\src\app\api\v1\me\balance\route.ts`
- `D:\wrapper\suno-api\src\app\api\v1\me\credit-transactions\route.ts`
- `D:\wrapper\suno-api\src\app\api\v1\billing\checkout\route.ts`
- `D:\wrapper\suno-api\src\app\api\v1\billing\webhooks\stripe\route.ts`

### 11.4 음악 생성 차감 연동

- `D:\wrapper\suno-api\src\app\api\v1\music\route.ts`
- `D:\wrapper\suno-api\src\app\api\v1\music\[id]\video\route.ts`

## 12. D:\\music에서 가져올 로직 제안

실제로는 다음 함수 구조를 거의 그대로 옮기면 된다.

- `syncUserCreditBalances()`
- `grantCredits()`
- `consumeCredits()`
- `refund...Credits()`

다만 이름은 SongsAI 기준으로 더 명확하게 바꾸는 것을 추천한다.

권장:

- `syncUserCreditBalances`
- `grantUserCredits`
- `consumeUserCredits`
- `refundMusicGenerationCredits`
- `refundVideoRenderCredits`

### 12.1 가져오지 않을 부분

- 수동 입금 승인 `DepositRequest`
- 쿠폰 기능
- PayPal 전용 결제 흐름

이건 SongsAI 1차 범위에서 제외하는 것이 좋다.

## 13. 1차 구현 순서

1. Prisma에 `CreditGrant`, `CreditTransaction`, `PaymentOrder` 추가
2. `server/credits/service.ts` 작성
3. `GET /api/v1/me/balance` 추가
4. `POST /api/v1/billing/checkout` 추가
5. `POST /api/v1/billing/webhooks/stripe` 추가
6. `POST /api/v1/music` 차감 연동
7. `POST /api/v1/music/:id/video` 차감 연동
8. 프론트 `Pricing` / `Account` / 헤더 잔액 노출

## 14. 결론

SongsAI에는 다음 구조가 가장 적합하다.

- 결제: Stripe
- 현재 잔액: `User.freeCredits`, `User.paidCredits`
- 실제 원장: `CreditGrant`, `CreditTransaction`, `PaymentOrder`
- 차감 시점: 음악/비디오 생성 직전 transaction
- 환불 기준: provider 호출 실패 또는 렌더 실패 시 원장 기반 복구

`D:\music`의 크레딧 차감 구조는 충분히 재사용 가치가 높고, 특히 `CreditGrant`를 순차 소진하는 방식은 SongsAI에도 그대로 적용하는 것이 좋다.
