# BLOCKFALL 운영 설정

게임은 `/tetris/`에 있습니다. 정적 Astro 빌드만으로 플레이·개인 최고 기록·조작 설정을 사용할 수 있습니다. 공개 리더보드는 아래 서버 설정이 필요합니다. 서버가 없거나 응답하지 않으면 개인 기록으로 시작하며, 가짜 순위는 표시하지 않습니다.

## 최초 서버 적용

1. 기존 블로그가 사용하는 Supabase 프로젝트의 SQL Editor에서 `supabase/tetris.sql` 전체를 실행합니다. 다른 게임 테이블은 변경하지 않습니다.
2. Supabase CLI로 로그인하고 같은 프로젝트에 연결합니다. 아래 명령은 `my_blog` 폴더에서 실행합니다.

```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy tetris --no-verify-jwt
```

함수는 `supabase/functions/tetris/index.ts`와 공유 엔진 `supabase/functions/_shared/tetris-engine.ts`를 함께 배포해야 합니다. 대시보드에 index.ts만 붙여넣으면 공유 모듈이 없어 실행되지 않습니다.

`SUPABASE_URL`과 `SUPABASE_SERVICE_ROLE_KEY`는 Supabase Edge 환경에서 제공됩니다. service role 키를 프론트엔드나 GitHub Pages 환경 변수에 넣지 마세요. 브라우저는 기존 `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_ANON_KEY`를 그대로 사용합니다.

## 배포 확인

- 게임 페이지에서 순위 새로고침 → 아직 기록이 없다면 빈 순위 안내가 나옵니다.
- 게임 시작 → 상단에 '온라인 기록'이 표시되는지 확인합니다.
- 게임 오버 → 닉네임 입력 후 등록 → 순위와 내 기록을 확인합니다.
- 같은 브라우저에서 낮은 점수를 등록해도 최고 기록이 유지되는지 확인합니다.
- 서버를 끊으면 순위 실패 안내가 표시되고 개인 기록으로 플레이 가능한지 확인합니다.
- 등록 실패 후 페이지 새로고침 → 남은 기록을 다시 등록합니다. 등록 기한은 시작 후 24시간입니다.

로컬에서는 기본적으로 실제 서비스 접속을 막습니다. 전용 테스트 프로젝트로 확인할 때만 `.env.local`의 `PUBLIC_ENABLE_LOCAL_SERVICES=true`와 테스트용 공개 키를 설정하세요.

## 검증과 한계

서버가 발급한 seed로 60Hz 고정 시뮬레이션을 실행합니다. 브라우저의 점수는 신뢰하지 않고 입력 변경 기록, handling 값, 완료 tick으로 점수를 재계산합니다. 종료 전 기록, 종료 후 입력, 잘못된 입력, 실제 경과 시간보다 빠른 기록을 거절합니다. 최대 2시간 / 80,000개 입력 변경 / 2MB 요청으로 제한합니다.

플레이어는 브라우저에 생성한 256비트 게스트 토큰으로 식별하고 서버에는 SHA-256 해시만 저장합니다. 공개 응답에는 토큰이나 해시를 포함하지 않습니다. 다른 기기·브라우저·저장 공간 초기화 후에는 새 플레이어입니다. 계정 동기화나 로그인은 이번 버전에 없습니다.

RLS와 권한으로 anon/authenticated의 테이블 및 점수 등록 RPC 직접 접근을 막습니다. Edge Function만 service role로 저장합니다. 같은 run 재요청은 멱등 처리하며, 점수가 더 높을 때만 갱신합니다. 동점은 서버에 먼저 등록된 최고 기록을 우선합니다.

입력 재생은 점수 위조를 막지만 자동 플레이나 여러 게스트 토큰 생성까지 판별하지는 못합니다. 플레이어별 시작 횟수 제한은 분당 12회입니다. 공개 트래픽이 늘면 IP 기반 gateway 제한/CAPTCHA, 인증 계정 연동을 추가로 고려하세요. 오래된 세션 정리 SQL은 스키마 파일 끝에 포함했습니다.

## 규칙과 레퍼런스

- 단일 마라톤, 7-bag, NEXT 5개, HOLD, SRS 회전 보정, 500ms lock delay, 15회 lock reset.
- 점수표는 게임의 '플레이 가이드 & 점수 규칙'에 표시합니다. T-SPIN mini는 구분하지 않는 자체 규칙입니다.
- 엔진/점수 규칙을 변경할 때 RULESET과 순위 테이블 버전을 함께 관리하세요. 기존 기록과 다른 규칙을 한 순위에 섞지 마세요.
- 조작 설정 UX: https://github.com/tetrio/faq/blob/main/mechanics.html
- 키 변경/터치 조작 참고: https://jstris.jezevec10.com/
- Supabase 함수 인증: https://supabase.com/docs/guides/functions/auth

## 로컬 검증

```sh
npm run check
npm test
npm run build
npm run test:build
```

엔진 테스트는 7-bag, 회전, lock delay, HOLD, hard-drop 키 유지, 점수, seed 재현, replay 변조/미완료 거부를 확인합니다. 타입 검사에는 Edge Function을 포함합니다. 이 명령만으로 원격 DB 마이그레이션이나 서버 배포가 완료되는 것은 아닙니다.
