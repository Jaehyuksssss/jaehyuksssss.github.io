# 재혁의 엔지니어링 노트

Astro 정적 블로그와 React 미니게임. 기존 글, 이미지, 게임 구현과 글 URL을 유지하면서 화면과 빌드 도구를 이전했습니다.

## 실행

저장소 루트에서 실행합니다. Node.js 22.19 이상이 필요하며, `.nvmrc`에는 검증한 22.23.3을 지정했습니다.

```bash
nvm install
nvm use
npm run setup
npm run dev
```

개발 주소는 `http://127.0.0.1:4321/`입니다. `my_blog` 안에서도 `npm run dev`를 사용할 수 있습니다. 이전 Node가 선택된 터미널에서는 실행 스크립트가 nvm에 이미 설치된 지정 버전을 사용합니다. 자동으로 Node를 설치하거나 기본 버전을 바꾸지는 않습니다.

Astro가 백그라운드로 실행된 경우 `npm run dev:stop`으로 종료할 수 있습니다.

## 구조

- `my_blog/astro/`: 현재 사용 중인 Astro 페이지, 레이아웃, 스타일, 콘텐츠 스키마
- `my_blog/contents/`: 기존 Markdown과 글에 첨부한 파일. 원본 유지
- `my_blog/static/`: 기존 공개 에셋. Astro의 `publicDir`로 사용
- `my_blog/src/components/Game/`: 기존 React 게임 구현. 원본 유지
- `my_blog/src/pages/`: 재사용하는 React 게임 페이지와 이전 Gatsby 페이지 소스. Astro 라우팅에는 `astro/pages/`만 사용
- `my_blog/scripts/`: 실행 도우미, 에셋 경로 호환 처리, 이전 검증

기존 `gatsby-*.js`, 블로그용 React 컴포넌트와 템플릿은 비교용으로 남겼으며, Astro 빌드에는 사용하지 않습니다. Gatsby 패키지는 설치하지 않습니다. 게임 페이지의 `Template` import만 새 Astro 레이아웃 내부용 React 프레임으로 연결합니다.

타입 검사는 Astro 코드와 `src/pages/`의 React 페이지 및 이들이 사용하는 컴포넌트·훅·API를 함께 확인합니다. 이전 Gatsby 전용 진입점인 `index.tsx`, `games.tsx`, `info.tsx`는 검사 대상에서 제외합니다.

## 글 작성과 URL

기존 `contents/<category>/<file>.md`에 글을 추가하면 됩니다. Frontmatter의 `date`, `title`, `categories`, `summary`, `thumbnail`을 그대로 사용합니다. 파일명의 대소문자와 공백을 유지하므로 기존 글 URL과 Utterances 댓글의 `pathname`, Supabase의 글 식별자가 바뀌지 않습니다.

`static/` 파일은 기존 루트 경로로 제공됩니다. Markdown의 상대 이미지 경로와 과거 `/images/` 경로는 빌드 단계에서 호환 처리하므로 글 원본을 수정할 필요가 없습니다.

## 외부 서비스

`my_blog/.env.example`을 참고해 `.env`를 구성합니다. 브라우저에 전달해도 되는 Supabase anon key만 사용하고, service-role key는 넣지 마세요.

- `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`: 기존 조회수·좋아요·게임 점수 연동
- `PUBLIC_UTTERANCES_REPO`: 기존 댓글 저장소
- `PUBLIC_GTM_CONTAINER_ID`, `PUBLIC_ADSENSE_CLIENT`: 통계와 광고

이전 `GATSBY_*` 공개 환경 변수도 호환됩니다. 로컬 개발과 localhost 미리보기에서는 DB·댓글·광고 호출을 기본적으로 비활성화해 운영 통계와 게임 기록을 오염시키지 않습니다. 의도적으로 실제 서비스를 테스트할 때만 `PUBLIC_ENABLE_LOCAL_SERVICES=true`를 설정하세요.

## 검증과 배포

```bash
nvm use
npm run check
npm test
npm run build
npm run test:build
npm run preview
```

`npm run check`는 Astro 검사와 일반 TypeScript 검사를 모두 실행합니다. `npm run typecheck`로 TypeScript 검사만 실행할 수도 있습니다. 테스트 명령도 개발 서버와 같은 Node 선택 로직을 사용합니다.

`npm test`는 기존 파일의 존재, 에셋·게임 구현의 SHA-256, 이미지 호환 경로, 분류 규칙과 Node 버전 선택을 확인합니다. 기존 글의 내용 수정과 새 글 추가는 허용합니다. 글의 Frontmatter는 Astro 콘텐츠 스키마가, URL과 이미지 경로는 `test:build`가 검사합니다.

이전 당시 원본 106개를 내용까지 비교하려면 `npm run test:snapshot`을 사용합니다. 이 명령은 과거 마이그레이션 상태를 확인하는 수동 검사이며, 글을 편집한 뒤에는 실패하는 것이 정상이라 일반 CI에는 포함하지 않습니다. 에셋이나 게임을 의도적으로 수정할 때에는 `migration-baseline.json`의 해당 항목을 검토 후 갱신하세요.

`test:build`는 기존 URL, 이미지와 내부 링크, SEO 메타데이터, JSON-LD 및 게임 목록을 검사합니다. 브라우저 플레이 테스트나 외부 서비스의 실제 응답을 대신하지는 않습니다.

GitHub Actions는 Node 버전을 `.nvmrc`에서 읽고 `my_blog/dist`를 GitHub Pages에 배포합니다. 기존 GitHub Secrets 이름을 그대로 연결합니다. 운영 도메인과 기존 루트 URL은 유지하며, 저장소 이름을 이유로 `/blog`를 추가하지 않습니다.
