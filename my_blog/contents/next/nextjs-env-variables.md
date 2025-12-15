---
date: "2025-12-15"
title: "Next.js 환경변수(.env) 제대로 쓰는 법: 로드 순서, NEXT_PUBLIC_, 런타임/빌드타임, 그리고 staging 전략"
categories: ["TIL", "Next", "React"]
summary: "Next.js 환경변수 로드 규칙(.env*), NEXT_PUBLIC_ 동작 방식, 빌드타임/런타임 차이, @next/env 활용, 테스트 환경, 그리고 staging을 운영처럼 굴릴 때의 실전 패턴을 정리한다."
thumbnail: "/next.png"
---

# intro

이번 글에서는 Next.js가 환경변수를 **어떤 규칙으로 로드하고**, **어디까지 노출하며**, **staging을 어떻게 설계하는 게 실무적으로 덜 아픈지**를 정리해보았다.

# Next.js 환경변수(.env) 제대로 쓰는 법: 로드 순서, NEXT*PUBLIC*, 런타임/빌드타임, 그리고 staging 전략

## 1. Next.js는 어디서 .env를 읽을까?

Next.js는 기본적으로 프로젝트 루트의 `.env*` 파일을 읽어서 `process.env`로 주입한다.

- `.env` (기본)
- `.env.local` (개인/로컬 오버라이드)
- `.env.development`, `.env.production`, `.env.test`
- 그리고 각각의 `.local` 변형

> **주의:** `/src` 폴더를 쓰더라도 `.env*` 파일은 `/src` 안이 아니라 **프로젝트 루트**에 있어야 한다.  
> (루트에서만 로드됨)

서버 코드(예: Route Handler)에서는 그냥 `process.env`로 읽으면 된다.

```typescript
// app/api/health/route.ts
export async function GET() {
  return Response.json({
    dbHost: process.env.DB_HOST,
  })
}
```

## 2. 환경변수 로드 우선순위 (중요)

Next.js는 아래 순서로 값을 찾고, 먼저 발견된 값을 사용한다.

1. `process.env` (실행 환경에 이미 들어온 값)
2. `.env.$(NODE_ENV).local`
3. `.env.local` (단, `NODE_ENV=test`일 땐 로드 안 함)
4. `.env.$(NODE_ENV)`
5. `.env`

즉 로컬에서 `DB_HOST`가 이상하다면 대부분 "더 우선순위 높은 파일에 같은 키가 들어있음"이 원인이다.

## 3. NEXT*PUBLIC*는 "브라우저에 박제"된다

클라이언트(브라우저)에서 환경변수를 쓰려면 반드시 `NEXT_PUBLIC_` 접두사가 필요하다.

```bash
NEXT_PUBLIC_ANALYTICS_ID=abcdefghijk
```

그리고 여기서 핵심 포인트:

- **`NEXT_PUBLIC_*` 값은 `next build` 시점에 번들에 인라인(하드코딩)**
- 빌드가 끝난 뒤에 서버 환경변수를 바꿔도 클라이언트 번들 값은 안 바뀜

```typescript
// pages/index.tsx (또는 app router의 client component)
setupAnalytics(process.env.NEXT_PUBLIC_ANALYTICS_ID)
```

### 동적으로 접근하면 인라인이 안 된다

아래 패턴은 빌드 인라인 대상이 아니라서 기대처럼 동작하지 않을 수 있다.

```typescript
const key = "NEXT_PUBLIC_ANALYTICS_ID"
setupAnalytics(process.env[key]) //  인라인 대상 아님
```

## 4. 빌드타임 vs 런타임: "서버에서 읽으면 런타임이 될 수 있다"

정리하면 이렇게 생각하면 편하다:

- **클라이언트에서 읽는 값(`NEXT_PUBLIC_`)**: 기본적으로 빌드타임 고정
- **서버에서 읽는 값(비공개 env 포함)**: 렌더링이 동적이면 런타임에 평가 가능

예를 들어 서버 컴포넌트에서 동적 렌더링(요청마다 실행)로 동작하면, 서버 환경변수는 "컨테이너/서버 실행 시점 값"을 읽을 수 있다.

```typescript
// app/page.tsx
export default async function Page() {
  // 동적 렌더링 유도(예시)
  const secret = process.env.MY_VALUE //  런타임 평가 가능(서버)
  return <div>OK</div>
}
```

**결론**: "하나의 Docker 이미지를 dev → stg → prd로 승격(promote)하고 싶다"면 클라이언트로 내려가야 하는 값은 최대한 줄이고, 서버에서 런타임으로 읽을 수 있게 설계하는 게 안정적이다.

## 5. .env.staging이 왜 안 먹히지?

여기서 많은 팀이 한 번씩 부딪힌다.

Next.js가 기본으로 구분하는 `NODE_ENV` 값은 일반적으로 다음 3개다:

- `development`
- `production`
- `test`

그래서 `.env.staging`은 Next.js 기본 로더가 자동으로 읽어주지 않는다.

### 실전에서 staging을 처리하는 대표 패턴 3가지

#### 패턴 A) staging도 production으로 보고 "빌드 시점 값"을 다르게 주입

staging 배포도 `NODE_ENV=production`으로 두고,

- Jenkins에서 환경별 값들을 환경변수로 직접 주입하거나
- `next build` 전에 `.env.production` 파일을 staging용으로 만들어 넣는다

**장점**: 단순하고 Next.js 기본 흐름을 그대로 탄다  
**단점**: `NEXT_PUBLIC_` 값은 빌드 시점 고정이므로 "한 번 빌드한 산출물을 다른 환경으로 승격"하면 꼬일 수 있음

#### 패턴 B) staging도 production으로 두되, "클라이언트 런타임 설정"은 별도 endpoint로 제공

클라이언트에서 필요한 설정을 `/api/runtime-config` 같은 API로 받아오게 설계

- 서버는 런타임 env를 읽어 응답

**장점**: "이미지 1개로 여러 환경"에 강함  
**단점**: 초기 로딩 설계가 조금 복잡해짐

#### 패턴 C) 커스텀 로딩: @next/env로 외부 런타임에서 env 로드

Next.js 런타임 밖(ORM 설정, 테스트 러너 등)에서 `.env*`를 동일 규칙으로 읽고 싶으면 `@next/env`의 `loadEnvConfig()`를 쓴다.

```typescript
// envConfig.ts
import { loadEnvConfig } from "@next/env"

const projectDir = process.cwd()
loadEnvConfig(projectDir)
```

```typescript
// orm.config.ts
import "./envConfig"

export default {
  connectionString: process.env.DATABASE_URL!,
}
```

다만 ".env.staging도 이걸로 자동 처리" 같은 걸 기대하면, 결국 "어떤 파일을 선택할지" 로직은 직접 짜야 한다.  
(예: `DEPLOY_ENV=staging`이면 `.env.production`을 staging 값으로 생성/주입 등)

## 6. Jenkins에서의 추천 운영 방식

Jenkins를 기준으로 "팀이 덜 싸우는 방식"을 한 줄로 말하면:

- `.env` 파일은 로컬 개발 편의용
- CI/CD에서는 Credentials(Secret)로 환경변수를 주입하고, 필요하면 빌드 직전 `.env.production`을 생성

예시(개념용):

```bash
# (빌드 직전)
echo "NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL" > .env.production
echo "DATABASE_URL=$DATABASE_URL" >> .env.production

npm ci
npm run build
npm run start
```

이렇게 하면

- 레포에 비밀값 커밋을 피하고
- 환경별로 값을 통제하기 쉬워진다

## 7. 테스트 환경(.env.test)에서 주의할 점

테스트에서는 재현성이 중요해서:

- `NODE_ENV=test`일 때 `.env.local`은 로드되지 않는다
- 공통 기본값은 `.env.test`에 두고, 개인 오버라이드는 `.env.test.local`로 분리하는 식이 흔하다

Jest 같은 환경에서 Next.js와 같은 방식으로 읽고 싶으면 `@next/env`를 테스트 셋업에서 호출하면 된다.

## 8. 자주 하는 실수 체크리스트

- `.env`를 `/src` 안에 둬서 로드가 안 된다 (루트에 둬야 함)
- `NEXT_PUBLIC_`를 비밀값에 붙였다 (브라우저로 노출됨)
- `NEXT_PUBLIC_` 값이 빌드 후에도 바뀔 줄 알았다 (빌드타임 고정)
- `.env.staging`이 자동으로 읽힐 줄 알았다 (기본 지원 아님)
- 같은 키가 `.env.local`에 남아있어 값이 계속 덮어씌워진다 (우선순위 확인)

## 결론

Next.js 환경변수는 "그냥 `.env` 쓰면 되지"라고 시작했다가,

- 로드 우선순위
- 클라이언트 인라인(`NEXT_PUBLIC_`)
- 빌드타임/런타임 차이
- staging의 위치 선정

에서 실무 난이도가 갑자기 올라간다.

내 기준의 추천은:

- staging은 운영과 최대한 비슷하게 production 흐름을 타되,
- 클라이언트로 내려가야 하는 값은 최소화하고,
- CI(Jenkins)에서 Credentials 기반 주입으로 통제하는 쪽이 가장 안전했다.

## 출처

- [Next.js Documentation: Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables) (How to use environment variables in Next.js, updated 2025-10-08)
- [Next.js Documentation: @next/env](https://nextjs.org/docs/app/api-reference/next-config-js/env)
