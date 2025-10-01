---
date: '2025-10-01'
title: 'DevTools에 뜨는 (disk cache), (prefetch cache)는 뭘까?'
categories: ['TIL','Deep_Dive']
summary: 'Chrome DevTools Network 패널에 표시되는 disk cache/prefetch cache의 의미와 Gatsby가 데이터를 미리 불러오는 방식 정리'
thumbnail: '/blog/disk.png'
---

# DevTools에 뜨는 `(disk cache)`, `(prefetch cache)`는 뭘까?

Gatsby를 비롯한 SPA 프로젝트에서 DevTools의 Network 패널을 열어보면 `Size` 열에 `(disk cache)`, `(prefetch cache)` 같은 표시가 등장합니다. 처음에는 "뭘 캐시한 거지?"라는 생각이 들지만, 이는 **브라우저가 이미 받아둔 리소스를 어디서 꺼내 썼는지** 알려주는 힌트입니다. Chrome이 캐시를 관리하는 방식과 Gatsby가 데이터를 미리 가져오는 원리를 정리해봤습니다.

## Chrome의 주요 캐시 계층

Chrome은 리소스를 재사용하기 위해 여러 층의 캐시를 두고 있습니다. Network 패널의 Size 열은 해당 요청이 어느 층에서 응답을 가져왔는지 보여줍니다.

| 표기 | 의미 | 특징 |
| --- | --- | --- |
| `(from memory cache)` | 탭이 열려 있는 동안 RAM에 저장된 리소스 | JS 번들처럼 같은 세션 내에서 바로 재사용되는 파일 |
| `(disk cache)` | 브라우저 프로필의 HTTP 캐시 디렉터리에서 읽음 | 브라우저를 껐다 켜도 남아 있으며 조건이 맞으면 즉시 반환 |
| `(prefetch cache)` | 사전에 `prefetch`로 받아둔 응답을 사용 | 사용자가 이동할 가능성이 높은 리소스를 미리 내려 받음 |
| `(service worker)` | 등록된 서비스 워커가 반환 | PWA에서 많이 사용하는 방식 |

표기 자체는 Chrome이 정해 놓은 문자열이라 서버 설정과는 무관합니다.

## `(disk cache)`가 붙는 이유

Chrome은 HTTP 캐시 저장소에 콘텐츠를 저장할 때 `ETag`, `Last-Modified`, `Cache-Control` 같은 헤더를 함께 기록합니다. 이후 동일한 URL을 요청하면 우선 캐시 저장소에서 응답을 찾고, 조건이 맞으면 서버와 통신하지 않고 그대로 반환합니다. DevTools에 `(disk cache)`라고 표시되었다면 **네트워크 왕복 없이 로컬 디스크의 HTTP 캐시에서 응답을 가져온 것**입니다.

만약 조건부 요청(`If-None-Match`)을 보냈다면 `Status` 열은 `304 Not Modified`와 함께 정상 크기가 표시되고, Size 열에는 `(from disk cache)`가 아닌 실제 바이트 수가 나타납니다.

## `(prefetch cache)`는 어떻게 생기나?

정적 사이트 제너레이터(Gatsby, Next.js SSG 등)는 사용자가 링크 위에 마우스를 올리거나 뷰포트에 앵커가 등장하면, 다음 페이지에 필요한 JSON 데이터를 미리 요청합니다. Gatsby의 경우 `loader.js`가 `page-data.json`을 호출하면서 `requestIdleCallback`을 이용해 백그라운드에서 prefetch 작업을 수행합니다.

Chrome DevTools는 이런 사전 요청을 별도의 "prefetch cache" 영역에 저장합니다. 그 후 실제 페이지 전환이 일어나면 네트워크 요청 없이 해당 캐시를 재사용하고, Size 열에 `(prefetch cache)`라고 표시합니다.

```text
Name           Status  Size
page-data.json 200     (prefetch cache)
```

즉, prefetch cache는 **미래에 쓸 가능성이 높은 리소스를 미리 내려받아 두는 메커니즘**이며, 표기 자체는 정상 동작임을 의미합니다.

## 어느 캐시인지 확인하는 방법

1. **Network 패널에서 Disable cache 끄기**: 기본 설정으로 두면 브라우저가 실제 캐시를 사용합니다.
2. **Name 열 우측 클릭 → Response Headers**를 추가하면 `x-cache`, `age` 등 CDN 헤더를 확인할 수 있습니다.
3. **`Size` 열**이 `(disk cache)`라면 네트워크 왕복이 생략된 것이고, `(prefetch cache)`라면 사전 로드된 콘텐츠입니다.
4. 필요하다면 DevTools 상단의 "Disable cache"를 체크해 강제로 새 요청을 보내 비교할 수 있습니다.

## Gatsby에서 캐시 전략 튜닝하기

- **Prefetch 끄기**: `gatsby-config.js`에서 `gatsby-plugin-offline`이나 `gatsby-plugin-preload-link-crossorigin` 같은 플러그인이 prefetch를 제어합니다. 필요 시 옵션으로 prefetch를 제한할 수 있습니다.
- **데이터 갱신 확인**: API 응답을 prefetch로 저장하면 최신 값이 반영되기까지 시간이 걸릴 수 있습니다. 사용자가 이동했을 때 최신 데이터를 강제로 가져오고 싶다면 `fetchPolicy`나 `stale-while-revalidate` 패턴을 적용합니다.
- **캐시 무효화**: 배포 후 기존 JSON이 남아 있는 경우 `gatsby build`가 생성한 `app-data.json`의 `buildId`가 바뀌면서 자동으로 무효화되지만, CDN 레이어에서도 캐시 무효화를 해야 즉시 반영됩니다.

## 마무리

Network 패널의 `(disk cache)`와 `(prefetch cache)` 표기는 브라우저가 정상적으로 캐시를 활용하고 있다는 신호입니다. 오히려 이런 표기가 보인다면 사용자가 느끼는 체감 속도가 빨라졌다는 뜻이다고 생각하면 될것 같습니다..
