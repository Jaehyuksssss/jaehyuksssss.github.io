---
date: "2026-11-17"
title: "Docker Layer Cache는 왜 예상대로 동작하지 않을까?"
categories: ["Docker", "CI/CD", "DevOps"]
summary: "docker layer cache에 대해서 아시나요?"
thumbnail: "/images/docker-logo.png"
---

간단한 수정만 했는데 이미지 빌드에서 의존성을 다시 설치한다. 반대로 다시 실행될 거라고 생각한 명령에는 `CACHED`가 찍힌다.

Docker 캐시를 이해할 때 생각해 볼 만한 두 상황이다. 한쪽은 이전 결과를 재사용했으면 좋겠고, 다른 쪽은 새 결과가 필요하다. 그런데 Dockerfile의 명령어만 읽어서는 그 차이가 잘 드러나지 않는다.

`RUN npm ci`라는 문장이 같더라도 그 작업에 전달되는 파일과 환경이 달라질 수 있다. 외부 저장소의 내용이 바뀌었더라도 빌더가 그 변화를 입력으로 인식하지 못할 수도 있다.

[앞선 Standalone 글](/next/nextjs-standalone-docker/)에서는 실행 이미지에 어떤 파일을 남길지 다뤘다. 이번에는 빌더가 이전 작업의 결과를 언제 다시 사용할 수 있는지 정리한다.

설명 범위는 Docker BuildKit으로 빌드하는 Linux 컨테이너다. 아래 Dockerfile은 동작을 설명하기 위한 예시이며, 이 글에 직접 측정한 캐시 적중률이나 빌드 시간은 포함하지 않았다. 실제 실험에서는 Docker Engine, Buildx, BuildKit 버전과 builder 드라이버를 함께 기록할 필요가 있다.

## 명령어가 같으면 이전 결과를 써도 될까

다음과 같은 빌드 단계를 생각해 보자.

```dockerfile
FROM node:22-bookworm-slim AS build
WORKDIR /workspace
COPY . .
RUN npm ci
RUN npm run build
```

`package-lock.json`은 그대로 두고 화면 문구만 바꿔도 `COPY . .`에 포함되는 파일은 달라진다. 의존성 설치 작업은 변경된 파일시스템을 입력으로 받는다.

사람은 수정한 파일이 의존성 설치와 관계없다고 판단할 수 있다. 하지만 이 Dockerfile은 앱 소스 전체를 먼저 복사하도록 작성돼 있다. 빌더가 재사용을 판단할 때 고려하는 입력 범위를 넓혀 둔 셈이다.

설치에 필요한 파일을 먼저 복사하면 의존 관계를 더 좁힐 수 있다.

```dockerfile
FROM node:22-bookworm-slim AS build
WORKDIR /workspace
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
```

이 구조에서는 다른 조건이 같을 때 앱 소스만 변경해도 의존성 설치 결과를 재사용할 수 있다. 
뒤에 있는 소스 복사와 애플리케이션 빌드는 변경을 반영한다. [Docker 캐시 최적화 문서](https://docs.docker.com/build/cache/optimize/)

다만 설치 단계에 필요한 입력은 프로젝트마다 다르다. 모노레포의 workspace 설정, 하위 패키지의 manifest, 설치 중 사용하는 패치 파일이나 스크립트도 고려해야 한다. `postinstall`이 소스를 읽는 구조라면 위 예시를 그대로 적용했을 때 설치부터 실패할 수 있다.

복사 순서를 바꿀 때는 현재 설치 명령이 실제로 어떤 파일을 읽는지부터 정리하는 편이 낫다.

## 바뀐 파일을 복사하고 있는지도 확인해야 한다

소스를 수정했는데도 캐시가 사용된다면 빌드 컨텍스트와 `COPY` 범위를 고려해야 한다.

편집한 파일이 `.dockerignore`에서 제외됐거나 현재 빌드 컨텍스트 밖에 있다면, 수정한 내용은 해당 복사 작업의 입력에 들어오지 않는다. Dockerfile의 위치와 컨텍스트 경로가 다를 수도 있다.

따라서 캐시 로그를 해석하기 전에 실행한 명령의 마지막 경로, `-f`로 지정한 Dockerfile, `.dockerignore`를 함께 확인해야 한다. [Docker 빌드 컨텍스트 문서](https://docs.docker.com/build/concepts/context/)

파일의 수정 시각만 바뀐 경우도 구분할 필요가 있다. Docker는 `COPY`와 `ADD` 등의 캐시 검사에서 파일 정보를 사용하지만 `mtime`만 바뀐 것은 무효화 조건에 포함하지 않는다. 파일에 손을 댔다는 사실과 복사 입력의 유효한 변경은 다르게 취급될 수 있다. [Docker 캐시 무효화 문서](https://docs.docker.com/build/cache/invalidation/)

이런 문제에서 `--no-cache`로 다시 빌드하더라도 컨텍스트에 빠진 파일이 새로 들어오지는 않는다. 먼저 해당 작업에 전달되는 파일을 맞춰야 한다.

## 외부 저장소가 바뀐 사실까지 알 수 있을까

다음 명령은 실행될 때 외부 패키지 저장소에 접근한다.

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends curl
```

시간이 지나 저장소의 패키지가 바뀌어도, 명령과 캐시 검사에 사용되는 입력이 같다면 이전 결과가 재사용될 수 있다. 캐시 적중 여부를 판단하기 위해 명령 내부의 네트워크 요청을 먼저 실행하는 구조가 아니기 때문이다. [Docker 캐시 무효화 문서](https://docs.docker.com/build/cache/invalidation/)

같은 관점에서 lockfile이 고정된 의존성 설치와 외부 URL의 최신 파일을 받는 작업은 갱신 정책을 다르게 고려해야 한다. 전자는 동일한 의존성 구성을 재사용하려는 목적이 분명하다. 후자는 외부 데이터가 언제 바뀌는지와 언제 다시 받아야 하는지까지 정해야 한다.

캐시를 다시 사용할 수 있다는 판단이 외부 데이터의 최신성까지 보장하지는 않는다.

## 커밋 번호 하나가 설치 단계에 영향을 줄 수 있다

CI에서는 커밋 SHA나 빌드 번호를 이미지에 넣기도 한다. 이 값이 Dockerfile 어디에 들어가는지에 따라 캐시 재사용 범위가 달라질 수 있다.

```dockerfile
FROM node:22-bookworm-slim AS build
WORKDIR /workspace
ARG BUILD_REVISION
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
```

`ARG` 값이 달라졌다고 선언 위치에서 파일시스템 변경이 생기는 것은 아니다. 다만 선언 이후의 `RUN`에는 그 값이 환경으로 전달되므로, 명령 문자열에 변수를 직접 쓰지 않았더라도 캐시 검사에 영향을 줄 수 있다. [Dockerfile의 ARG와 캐시 문서](https://docs.docker.com/reference/dockerfile/#impact-on-build-caching)

커밋 번호가 설치에 필요하지 않고 이미지 메타데이터로만 사용된다면, 필요한 단계에서 선언해 `LABEL`에 반영하는 구성을 고려할 수 있다. 앱 빌드에 실제로 사용되는 값이라면 해당 빌드 작업이 다시 실행되는 것이 맞다.

여기서 목표는 변경을 숨기는 것이 아니다. 어떤 작업이 그 값에 의존하는지 Dockerfile에 드러내는 쪽이 이해하기 쉽다.

빌드 secret에도 별도 규칙이 있다. secret의 내용 변경은 캐시를 자동으로 무효화하지 않는다. 인증 정보 변경과 그 정보를 이용해 받아오는 데이터의 갱신을 함께 고려해야 한다. secret 내용 자체를 캐시 무효화용 인자로 노출하는 방식은 피하고, 필요할 때 별도의 비밀이 아닌 갱신 값을 사용할 수 있다. [Docker 빌드 secret과 캐시 문서](https://docs.docker.com/build/cache/invalidation/#build-secrets)

## npm 캐시가 있는데 왜 RUN은 다시 실행될까

캐시 마운트를 적용하면 또 다른 종류의 재사용이 생긴다.

```dockerfile
# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS build
WORKDIR /workspace
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
RUN npm run build
```

여기에는 설치 작업의 결과 캐시와 npm이 사용하는 다운로드 캐시가 함께 등장한다.

설치 작업의 입력이 같으면 BuildKit은 이전 결과를 재사용할 수 있다. lockfile 변경 등으로 설치 작업을 다시 실행해야 한다면, 그 실행 안에서 npm이 마운트된 캐시를 활용할 수 있다.

따라서 로그에 `RUN npm ci`가 다시 실행됐다고 해서 npm의 다운로드 캐시까지 사용되지 않았다고 판단할 수는 없다. 명령의 실행 여부와 명령 안에서 수행한 다운로드를 각각 확인해야 한다. [Docker 캐시 마운트 활용 문서](https://docs.docker.com/build/cache/optimize/#use-cache-mounts)

예시의 `/root/.npm`은 해당 명령을 root로 실행하는 조건에 맞춘 경로다. 실행 사용자를 바꿨다면 패키지 매니저가 실제로 사용하는 캐시 경로도 고려해야 한다.

캐시 마운트의 내용은 빌드 간 재사용할 수 있지만 영구 보관을 전제로 삼을 수는 없다. 빌드는 캐시가 비어 있어도 올바르게 동작해야 한다. [Dockerfile 캐시 마운트 문서](https://docs.docker.com/reference/dockerfile/#run---mounttypecache)

## 같은 Dockerfile인데 CI에서만 처음부터 시작하는 이유

로컬과 CI의 입력이 같아도 캐시가 저장된 장소는 다를 수 있다.

BuildKit의 내부 캐시는 builder가 관리한다. CI 실행마다 새 runner나 builder가 만들어진다면 이전 실행의 캐시를 그대로 사용할 수 있다고 가정하기 어렵다. 다른 Jenkins Agent에서 실행하는 경우에도 어떤 builder와 저장소를 사용하는지 확인해야 한다.

외부 캐시를 사용하려면 빌드 결과 캐시를 내보내고, 다음 실행에서 다시 가져오도록 구성해야 한다. `--cache-to`와 `--cache-from`이 이 경로를 지정한다. 최종 이미지를 레지스트리에 올리는 작업과 캐시를 가져오는 설정을 함께 확인할 필요가 있다. [Docker 캐시 저장 백엔드 문서](https://docs.docker.com/build/cache/backends/)

Multi-stage에서는 내보내는 범위도 영향을 준다. 지원되는 백엔드에서 `mode=min`은 최종 이미지에 포함되는 결과를 중심으로 내보내고, `mode=max`는 중간 단계의 캐시까지 포함한다. 빌드 도구가 최종 이미지에서 빠지는 구성이라면 중간 단계 재사용 여부가 달라질 수 있다.

범위를 넓히면 캐시 저장 공간과 가져오기·내보내기 비용도 증가한다. 빌드 명령의 실행 시간이 줄었더라도 전체 CI 시간이 줄었는지는 별도 측정이 필요하다. [Docker 외부 캐시 모드 문서](https://docs.docker.com/build/cache/backends/#cache-mode)

캐시가 사라지는 경우도 있다. BuildKit은 저장 공간과 보존 기간 등의 정책에 따라 캐시를 정리할 수 있다. 어제 적중했던 작업이 오늘 다시 실행된다면 입력 변경뿐 아니라 builder의 저장 상태도 조사 대상이다. [BuildKit 캐시 정리 문서](https://docs.docker.com/build/cache/garbage-collection/)

## 위에서 하나 바뀌면 정말 전부 다시 빌드할까

한 단계의 선형적인 Dockerfile에서는 앞선 입력의 변경이 뒤쪽 작업으로 이어지는 흐름으로 이해할 수 있다. 다만 Multi-stage와 BuildKit까지 설명할 때는 의존 관계를 함께 고려해야 한다.

BuildKit은 빌드를 LLB라는 의존 그래프로 표현한다. 작업 정의와 입력의 체크섬을 추적하고, 독립적인 작업은 병렬로 처리하거나 최종 결과에 필요 없는 단계를 생략할 수 있다. [BuildKit의 LLB 설명](https://docs.docker.com/build/buildkit/#llb)

그래서 로그에서 먼저 출력됐다는 이유만으로 다른 작업의 입력이라고 볼 수는 없다. `FROM`으로 상속한 단계와 `COPY --from`으로 가져오는 파일을 따라가야 어떤 변경이 연결되는지 설명할 수 있다.

빌드 로그의 번호를 Dockerfile 줄 번호처럼 읽으면 이런 관계를 놓치기 쉽다. 단계 이름과 실행 명령을 기준으로 이전 빌드와 비교하는 편이 낫다.

## no-cache로 해결됐다는 말에 남는 것

`--no-cache`는 이전 빌드 결과를 재사용하지 않고 작업을 다시 수행할 때 사용할 수 있다. 베이스 이미지의 갱신 여부를 확인하는 `--pull`은 별도로 고려해야 한다. [Docker Buildx 옵션 문서](https://docs.docker.com/reference/cli/docker/buildx/build/)

다시 실행해서 문제가 사라졌다면 캐시 조건을 좁히는 단서는 얻은 셈이다. 다만 무엇이 달라졌는지는 남겨야 한다. 외부 저장소의 파일을 새로 받았는지, 기존 설치 결과를 교체했는지, 다른 입력으로 실행했는지를 구분하지 못하면 다음 실패에서도 같은 명령을 반복하게 된다.

캐시 마운트에 보관된 패키지 데이터도 별도로 고려해야 한다. 빌드 결과 재사용을 끈 실험을 모든 캐시가 비어 있는 실험으로 기록하면 비교 조건이 맞지 않을 수 있다.

## 다음 빌드에서는 무엇을 기록할까

실험에서는 같은 소스에서 입력 하나씩만 바꿔 보는 편이 원인을 설명하기 좋다. 다음 표는 직접 실행할 비교 항목이며, 결과는 아직 측정하지 않았다.

| 변경 조건 | 확인할 내용 |
|---|---|
| 아무것도 바꾸지 않고 재빌드 | 같은 builder에서 재사용되는 작업 |
| 앱 소스만 변경 | 의존성 설치와 앱 빌드의 재실행 여부 |
| lockfile을 유효하게 갱신 | 설치 재실행과 패키지 다운로드 양 |
| `.dockerignore`로 제외한 파일만 변경 | 복사 입력과 캐시 로그의 변화 |
| 복사 대상 파일의 수정 시각만 변경 | 내용 변경 실험과의 차이 |
| 빌드 인자 값 변경 | 해당 값을 사용하는 작업과 영향 범위 |
| 새 builder에서 외부 캐시 가져오기 | 캐시 import 성공 여부와 중간 단계 재사용 |

로그는 아래처럼 자세한 출력으로 남길 수 있다. 이 명령은 실행 예시다.

```bash
docker buildx build --progress=plain --load -t cache-lab:check .
```

`CACHED`가 붙은 작업 수와 전체 소요 시간을 함께 기록하되, 캐시 가져오기와 이미지 내보내기에 걸린 시간도 따로 적어 두는 게 좋다. 의존성 설치가 빨라졌어도 다른 구간이 늘어나면 전체 시간은 비슷할 수 있다.

각 빌드에서 처음 예상과 달라진 작업을 찾고, 그 작업의 입력과 캐시 저장 위치를 나란히 기록하려 한다. 그 자료가 있어야 복사 범위를 줄일지, 인자 위치를 옮길지, CI 캐시 전달 경로를 바꿀지 판단할 수 있다.
