---
date: '2025-10-22'
title: 'vanilla-ssr: 프레임워크에 종속되지 않는 SSR-first 컴포넌트 라이브러리 만들기'
categories: ['JavaScript', 'SSR', 'npm library ,vanilla js']
summary: '서버에서 마크업을 만들고, 클라이언트에서 필요한 상호작용을 하이드레이션하는 UI 라이브러리 만들기'
thumbnail: '/npm.png'
---

# vanilla-ssr: SSR-first UI 컴포넌트

최근 여러 프로젝트에서 백엔드 개발자나 인프라 엔지니어들이 대시보드를 만들 때  혹은 서버 사이드로 동작하는 간단한 서비스를 개발할때 리액트나 다른 SPA를 사용하지 않기도 하고 , UI 개발에 대한 부담이 있다는 니즈에 대해서 알게 되었고 라이브러리를 만들면 부담을 덜어 줄 수 있지 않을까 하는 생각이 들었습니다. 

서버 템플릿(Blade/Twig/Razor/Go/Express/Next.js 등)에서 접근성 있는 마크업을 만들고, 클라이언트에서는 꼭 필요한 상호작용만 붙이면 . 이 문제에 도움을 줄 수 있을거라 생각하고 `vanilla-ssr`을 만들게 되었습니다.

아직은 완성도가 낮지만 더 많은 개발자들에게 편안함을 느끼게 해줄 라이브러리가 되길 희망하며 개선해 나가겠습니다.

## 목표

- SSR-first: 서버에서 `render*Markup`으로 순수 마크업을 생성하고, 클라이언트에서 `hydrate*`로 동작을 부여합니다.
- 프레임워크 비종속: Laravel Blade/Twig/Razor/Go/Express/Next.js 어디서든 동작. 런타임 의존을 최소화합니다.
- 접근성 우선: ARIA 속성, 키보드 내비게이션, FocusTrap/RovingTabindex 등 기본기를 내장합니다.
- 점진적 하이드레이션: `hydrateOnVisible`/`hydrateOnInteraction`/`hydrateOnIdle`로 사용자 경험과 번들 비용을 균형 있게 맞춥니다.
- 테마 시스템: CSS 변수 토큰 기반으로 라이트/다크 모드를 즉시 적용하며 FART(Flash of Incorrect Theme)를 피합니다.
- 안전한 기본값: `sanitizeHtml`,  XSS 대응 항목을 기본 제공합니다.

## 패키지 구조와 엔트리 포인트

- `vanilla-ssr`: 기본 엔트리. 대부분의 `create*`/`hydrate*`/`render*Markup`를 제공합니다.
- `vanilla-ssr/server`: 서버 전용 렌더러(`render*Markup`)와 스타일/테마 유틸.
- `vanilla-ssr/client`: 브라우저 전용 하이드레이션/테마/접근성 유틸.
- `vanilla-ssr/components/*`: 컴포넌트 개별 임포트로 번들 크기를 최소화합니다.
- `vanilla-ssr/theme`, `vanilla-ssr/accessibility`: 테마/접근성 도우미 전용 경로.

권장하는 임포트 방식은 “필요한 것만” 가져오는 per-component import입니다.

```ts
// Good – 모달만 가져와서 번들 절약 (~3KB 수준)
import { hydrateModal } from 'vanilla-ssr/components/modal'

// Avoid – 전체 번들을 가져와 트리셰이킹 여지 감소
import { hydrateModal } from 'vanilla-ssr'
```

## 서버는 렌더, 클라이언트는 하이드레이트

서버에서 순수 마크업을 만들고, 브라우저에서 상호작용을 붙입니다. 런타임 사이드 이펙트 없이 “문자열 마크업”을 만드는 점이 핵심입니다.

```ts
// server.ts (Express/Next.js/Go 템플릿 등 어디든)
import { renderModalMarkup, getVanilaStyleText } from 'vanilla-ssr/server'

const modalHtml = renderModalMarkup({ id: 'hello-modal', title: 'Hello', message: 'World' })
const styles = getVanilaStyleText() // 서버에서 CSS 텍스트 추출 가능

// 템플릿에 주입
res.send(`
  <html>
    <head><style>${styles}</style></head>
    <body>
      ${modalHtml}
      <script type="module" src="/client.js"></script>
    </body>
  </html>
`)
```

```ts
// client.js (브라우저)
import { hydrateModal } from 'vanilla-ssr/client'

document.addEventListener('DOMContentLoaded', () => {
  hydrateModal(document.getElementById('hello-modal'))
})
```

페이지 전체를 하이드레이션 하고 싶다면 아래처럼 도와주는 헬퍼도 있습니다.

```ts
import { hydrateAllVanilaComponents } from 'vanilla-ssr/client'

hydrateAllVanilaComponents({
  injectStyles: false, // 이미 서버에서 스타일을 주입했다면 false 가능
  debug: process.env.NODE_ENV === 'development',
})
```

## 점진적 하이드레이션 전략

사용자에게 필요한 순간에만 코드를 로드하고 하이드레이트합니다.

```ts
import { hydrateOnVisible, hydrateOnInteraction, hydrateOnIdle } from 'vanilla-ssr/client'

// 보일 때 하이드레이트
hydrateOnVisible("[data-vanila-component='data-table']", (el) => {
  import('vanilla-ssr/components/data-table').then(({ hydrateDataTable }) => {
    hydrateDataTable(el)
  })
}, { rootMargin: '100px' })

// 사용자 상호작용 시 로드
hydrateOnInteraction("[data-vanila-component='modal']", (el) => {
  import('vanilla-ssr/components/modal').then(({ hydrateModal }) => hydrateModal(el))
})

// 여유 시간에 처리
hydrateOnIdle(() => {
  // 저우선순위 작업
}, { timeout: 1500 })
```

SPA 라우트 전환 시에도 신규 마크업만 부분 하이드레이션 가능합니다.

```ts
import { hydrateVanilaComponents } from 'vanilla-ssr/client'

function onRouteChange(newHtml: string) {
  const root = document.getElementById('app')!
  root.innerHTML = newHtml
  hydrateVanilaComponents({ root, skipHydrated: true })
}
```

## 스타일 로딩과 Shadow DOM 호환

두 가지 방식을 지원합니다.

- 번들 임포트: `import 'vanilla-ssr/styles.css'`
- 런타임 주입: `injectVanilaStyles()`를 호출해 스타일 태그를 삽입 (CSP nonce 지원, Shadow DOM 호환)

```ts
import 'vanilla-ssr/styles.css'
// or
import { injectVanilaStyles } from 'vanilla-ssr'
injectVanilaStyles()
```

## 테마 시스템과 FART 방지

테마는 CSS 변수 토큰으로 구성되어 있으며, 라이트/다크 모드를 즉시 적용할 수 있습니다.

```ts
import { applyThemeMode, toggleTheme } from 'vanilla-ssr/theme'

applyThemeMode('dark')
document.getElementById('theme-toggle')?.addEventListener('click', () => toggleTheme())
```

초기 로드에서 잘못된 테마가 번쩍 보이지 않게(FART) 하려면 `<head>`에 아주 작은 스니펫을 넣습니다.

```html
<script>
  (function () {
    const stored = localStorage.getItem('vanila-theme-mode')
    const system = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    document.documentElement.setAttribute('data-vanila-theme', stored || system)
  })()
  </script>
```

토큰은 필요 시 오버라이드할 수 있습니다.

```ts
import { applyThemeMode } from 'vanilla-ssr/theme'

applyThemeMode('dark', {
  customTokens: {
    '--vanila-theme-primary': '#8b5cf6',
    '--vanila-theme-primary-hover': '#7c3aed',
  },
})
```

## 접근성과 보안

- ARIA/키보드: 모달에는 `role="dialog"`, `aria-modal="true"` 등, 테이블에는 정렬 시 `aria-sort`를 적용합니다. FocusTrap/RovingTabindex 유틸로 키보드 내비게이션을 보강합니다.
- 스크린 리더 공지: `announceToScreenReader(message, politeness)` 제공.
- XSS 대비: `sanitizeHtml` 유틸과 CSP nonce를 지원하고, `eval/new Function` 같은 동적 코드 실행을 사용하지 않습니다.

```ts
import { sanitizeHtml } from 'vanilla-ssr/security'
import { renderModalMarkup } from 'vanilla-ssr/server'

const html = renderModalMarkup({
  title: sanitizeHtml(userInput),
  message: sanitizeHtml(userContent),
})
```

## 컴포넌트 사용 예시

### Modal

```ts
import { showModal } from 'vanilla-ssr'

showModal({
  id: 'confirm-delete-modal',
  target: '#modal-root',
  title: '삭제 확인',
  message: '이 항목을 삭제할까요?',
  primaryButtonText: '삭제',
  secondaryButtonText: '취소',
})
```

### Data Table (SSR + Hydration)

```ts
// server
import { renderDataTableMarkup } from 'vanilla-ssr/server'

const tableHtml = renderDataTableMarkup({
  columns: [
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
  ],
  data: users,
})

// client
import { hydrateDataTable } from 'vanilla-ssr/components/data-table'
hydrateDataTable(document.getElementById('user-table')!)
```

### Banner, Toast, File Uploader 등

모든 위젯은 동일한 3단계 모델을 공유합니다.

- `render*Markup` – 서버에서 마크업 생성
- `hydrate*` – SSR 마크업에 동작을 부여
- `create*`/`show*` – 브라우저에서 즉시 생성/표시

## Next.js(App Router) 통합 예시

```tsx
// app/components/UserModal.tsx
import { renderModalMarkup } from 'vanilla-ssr/server'

export function UserModal({ title, content }: { title: string; content: string }) {
  const html = renderModalMarkup({ id: 'user-modal', title, message: content })
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}

// app/components/ClientHydration.tsx
'use client'
import { useEffect } from 'react'
import { hydrateModal } from 'vanilla-ssr/client'

export function ClientHydration() {
  useEffect(() => {
    hydrateModal(document.getElementById('user-modal')!)
  }, [])
  return null
}
```

## 만들면서 부딪힌 고민들

- SSR 순수성: `render*Markup`은 부작용이 없어야 합니다. 서버에서 DOM/API 접근 없이 동작하도록 분리했습니다.
- 하이드레이션 경계: SPA 라우팅과 SSR 조합에서 “이미 하이드레이트된 노드 재처리” 문제를 피하기 위해 `skipHydrated` 같은 옵션을 넣었습니다.
- 번들 크기: 기본 엔트리 대신 컴포넌트 단위 임포트를 권장하고, 동적 임포트와 지연 하이드레이션으로 초기 비용을 낮췄습니다.
- 접근성 기본값: 자동으로 과하게 개입하지 않으면서도 꼭 필요한 ARIA/키보드 패턴은 내장하도록 균형을 맞췄습니다.
- 보안: 템플릿 문자열로 마크업을 조합하는 특성상 `sanitizeHtml`과 CSP nonce 지원을 초기에 설계에 포함했습니다.


## 마무리

`vanilla-ssr`는 SSR-first 원칙으로 어디서나 쓸 수 있는 UI 컴포넌트를 목표로 합니다. 프레임워크에 종속되지 않고도 접근성과 성능을 모두 잡을 수 있는 라이브러리이니 사용해보세요.

- 문서 & 플레이그라운드: https://docs-vanilla-ssr.vercel.app/
- npm: https://www.npmjs.com/package/vanilla-ssr
- GitHub: (`https://github.com/Jaehyuksssss/vanila-ssr`)
