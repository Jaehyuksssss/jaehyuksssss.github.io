---
date: "2026-10-15"
title: "Jenkins Next.js 빌드의 GLIBC_2.29 오류 트러블 슈팅"
categories: ["TIL", "Next", "Jenkins", "CI/CD", "pnpm", "Linux"]
summary: ""
thumbnail: "/next.png"
---

# OS 호스트 버전 업데이트 vs webpack 우회 빌드.. 둘 다 큰일이다..

사내 폐쇄망에서 Jenkins로 Next.js 프론트엔드를 빌드를 해야했다. pnpm 기반 모노레포였고, 패키지는 사내 Nexus를 통해 받아오는 구성이었다.

당시 turbo 명령으로 빌드를 진행하려 했는데 SWC 네이티브 바이너리를 로딩하는 과정에서 glibc 오류가 발생했다. Agent의 OS 업데이트가 필요한 상황이었지만, 주어진 시간 안에 업데이트와 검증까지 끝내기는 어려웠다. 그래서 결국 Webpack으로 우회해 빌드를 진행했다.

이 대응을 Best Practice 라고는 생각하지는 않는다. 빌드 환경의 호환성 문제는 남아 있었고, 일정 때문에 그 환경에서 동작하는 빌드 경로를 선택한 것이다. 이번 글에는 오류 자체와 함께, 왜 그런 선택을 했고 무엇을 후속 작업으로 남겨야 하는지 적어보려 한다.

## 로그에서 확인한 실패 지점

문제가 된 로그는 아래와 같다.

```text
Attempted to load @next/swc-linux-x64-gnu,
but an error occurred:

/lib64/libm.so.6:
version `GLIBC_2.29' not found
```

이 로그에서 봐야 할 부분은 `@next/swc-linux-x64-gnu`와 `GLIBC_2.29`다. 패키지를 찾지 못했다는 메시지가 아니라, 네이티브 모듈을 로드하면서 필요한 심볼 버전을 찾지 못했다는 메시지다. 해당 로딩 시도는 Agent의 라이브러리 호환성에서 막혔다.

`@next/swc-linux-x64-gnu`는 Linux x64의 glibc 환경을 대상으로 배포되는 Next.js용 SWC 네이티브 바인딩이다. Next.js Compiler는 SWC를 사용해 JavaScript·TypeScript 변환과 코드 압축을 수행하고, 이때 플랫폼에 맞는 `.node` 파일을 로드한다. [Next.js Compiler 문서](https://nextjs.org/docs/architecture/nextjs-compiler)에서 역할과 지원 범위를 확인할 수 있다.

로컬에서 빌드가 된다고 이 바이너리가 Jenkins에서도 동작하는 것은 아니다. macOS라면 애초에 다른 플랫폼용 바인딩을 쓰고, 같은 Linux라도 배포판과 libc 버전이 다를 수 있다. Node.js와 pnpm 버전을 맞췄더라도 네이티브 의존성이 요구하는 실행 환경까지 같아지는 것은 아니다.

이런 경우에는 실제 빌드가 실행되는 환경에서 다음 정보를 확보해야 한다. 컨테이너 안에서 빌드한다면 컨테이너 내부 기준이다.

```bash
cat /etc/os-release
uname -m
ldd --version
node -v
pnpm -v
```

glibc 환경에서는 아래 명령으로도 버전을 확인할 수 있다.

```bash
getconf GNU_LIBC_VERSION
```

Alpine처럼 musl을 쓰는 환경이라면 `gnu` 바인딩과 동일한 조건으로 비교하면 안 된다. 이번 로그는 GNU 계열 바인딩을 로드하는 시도에 관한 것이다.

## glibc에서 막힌 이유

glibc는 파일 입출력, 메모리, 스레드 등의 기능을 제공하는 GNU C 라이브러리다. 이번 문제에서는 개별 API보다 동적 링크와 심볼 버전이 중요하다.

동적 링크된 네이티브 모듈을 로드할 때, 동적 링커는 ELF 파일에 기록된 공유 라이브러리와 심볼 버전 요구사항을 확인한다. 로그에 나온 `libm.so.6`는 glibc가 제공하는 수학 라이브러리인데, 실제 선택된 파일이 요구된 `GLIBC_2.29` 심볼 버전을 제공하지 못한 것이다. [glibc의 동적 링커 문서](https://sourceware.org/glibc/manual/latest/html_node/Dynamic-Linker.html)도 런타임 공유 객체 로딩을 설명한다.

따라서 패키지를 같은 버전으로 다시 받아도, 동일한 바이너리와 라이브러리 조합이라면 이 오류는 그대로다. Node.js 버전만 바꾸는 것도 OS의 glibc를 갱신하는 작업은 아니다.

진단할 때는 Agent의 glibc 버전과 실제 실패한 바이너리의 요구사항을 함께 봐야 한다. 모노레포에는 여러 버전의 SWC가 설치될 수 있으므로, 임의로 찾은 첫 파일보다 오류 로그의 경로를 기준으로 확인하는 편이 정확하다.

```bash
# 모노레포의 실제 앱 필터로 바꾼다.
pnpm --filter '<NEXT_APP_FILTER>' exec next --version
pnpm --filter '<NEXT_APP_FILTER>' why @next/swc-linux-x64-gnu

# 전체 오류 로그에 나온, 신뢰할 수 있는 설치 파일의 경로
SWC_BINARY='<ERROR_LOG_SWC_BINARY_PATH>'

file "$SWC_BINARY"
ldd "$SWC_BINARY"
readelf --version-info "$SWC_BINARY" \
  | grep 'GLIBC_' \
  | sort -u
```

`ldd`로 실제 연결되는 라이브러리를 보고, `readelf`로 바이너리의 버전 요구사항을 확인한다. `ldd --version`은 기본 환경 확인용이고, 로딩 경로가 바뀌어 있다면 실제 선택된 라이브러리까지 봐야 한다.

여기서 `GLIBC_2.29`는 이번 로딩 실패에 나온 요구사항이다. 모든 Next.js·SWC 버전의 공통 최소 조건을 뜻하지는 않는다. 정확한 Next.js·SWC 버전과 Agent 배포판의 수치는 이 글에서 특정하지 않는다.

## OS 업데이트 대신 Webpack을 선택한 이유

당시에는 OS를 업데이트해 필요한 라이브러리 호환성을 확보하는 방향이 필요했다. 다만 OS 변경은 빌드 명령 하나를 수정하는 작업과 검증 범위가 다르다. 기존 도구와 Job에 미치는 영향도 확인해야 하고, 폐쇄망에서는 패키지나 이미지 반입까지 고려해야 한다.

주어진 일정 안에 그 작업을 마칠 수 없어서 Next.js 빌드를 Webpack으로 우회했다. 환경 개선을 미루는 부담은 알고 있었지만, 당시에는 빌드 일정에 대응할 수 있는 쪽을 택했다.

OS 업데이트를 언제 할지 정하지 않은 채 이 설정만 남겨두면 임시 대응이 그대로 운영 기준이 되기 쉽다. 그래서 내 기준에서도 여기까지를 근본 해결로 보기는 어렵다. 빌드가 진행됐다는 사실과 Agent의 호환성 문제가 해소됐다는 판단은 구분해야 한다.

### Webpack 전환으로 달라지는 범위

Webpack과 Turbopack은 모듈을 해석하고 번들을 만드는 도구다. Webpack은 Node.js 기반의 로더·플러그인 생태계를 사용하고, Turbopack은 Rust 기반의 증분 번들러다. SWC는 그 안에서 코드 변환 등을 담당한다. Turbopack은 SWC를 내부적으로 사용하며, Webpack을 선택한 Next.js 빌드도 SWC를 사용할 수 있다.

따라서 이번에 Webpack으로 우회했다고 해서 “Webpack을 쓰면 SWC나 glibc가 필요 없다”고 설명하면 맞지 않는다.

[Next.js 공식 문서](https://nextjs.org/docs/app/api-reference/turbopack)에 따르면 Turbopack에는 플랫폼별 네이티브 바인딩이 필요하다. SWC의 WASM 바인딩은 변환·압축 같은 일부 기능을 제공하지만 Turbopack은 지원하지 않는다. 해당 버전의 Webpack 빌드가 필요한 기능을 WASM 경로로 처리할 수 있다면 우회가 가능한 조건이 된다. Webpack 전용 플러그인이나 설정의 호환성 때문에 전환이 필요한 경우도 있다.

다만 이번 우회에서 실제로 WASM fallback이 사용됐는지까지 확인된 것은 아니다. Babel 설정이 있었는지, 다른 네이티브 호출이 남았는지도 성공한 빌드의 전체 로그와 설정을 봐야 설명할 수 있다. 여기서는 Webpack으로 우회한 사실까지만 적는다.

오래된 SWC 오류 문서에 나오는 `.babelrc`나 `swcMinify: false`도 그대로 가져올 수는 없다. Babel의 파일 변환 설정이 모든 네이티브 호출을 없애는 것은 아니고, `swcMinify` 옵션은 Next.js 15부터 제거됐다. 이 부분은 [Compiler 문서의 버전별 안내](https://nextjs.org/docs/architecture/nextjs-compiler#minification)를 함께 확인해야 한다.

### 같은 명령도 Next.js 버전에 따라 다르다

실제 적용할 명령은 설치된 Next.js 버전부터 확인해야 한다.

```bash
pnpm --filter '<NEXT_APP_FILTER>' exec next --version
pnpm --filter '<NEXT_APP_FILTER>' exec next build --help
```

Next.js 14에서는 Turbopack이 `next build`를 지원하지 않았고, 15.3에서 실험적 지원, 15.5에서 베타가 됐다. 16부터는 개발 서버와 프로덕션 빌드의 기본 번들러가 Turbopack이다. 아래는 당시 스크립트 원본이 아니라, **Next.js 16 기준으로 두 빌드 경로를 표현한 예제**다. [Next.js 16 업그레이드 가이드](https://nextjs.org/docs/app/guides/upgrading/version-16#turbopack-by-default)

```json
{
  "scripts": {
    "build": "next build --turbopack",
    "build:webpack": "next build --webpack"
  }
}
```

16 이전 버전은 기본값과 지원 플래그가 다르다. 특히 15.x에서는 Turbopack 빌드 옵션을 제거하고 기본 Webpack 빌드를 사용하는 식으로 접근할 수 있으므로 해당 버전의 CLI 도움말을 먼저 봐야 한다.

모노레포에서 말하는 `turbo`도 구분할 필요가 있다. `turbo run build`라면 Turborepo가 각 패키지의 빌드 작업을 실행하는 명령이고, `next build --turbo` 또는 `--turbopack`은 Next.js의 번들러 선택이다. Turborepo를 쓰는 구성에서는 작업 순서와 캐시 설정을 유지하면서 앱의 Next.js 빌드 스크립트를 Webpack으로 바꿀 수도 있다. 최상위 명령 이름만으로 실제 번들러를 판단하지 않고, 하위 스크립트까지 확인해야 한다. [Turborepo run 문서](https://turborepo.dev/docs/reference/run)

## 같이 나타났던 pnpm·Nexus 오류

의존성 설치 과정에서는 `frozen-lockfile`과 `ERR_PNPM_NO_MATCHING_VERSION` 오류도 발생했다. 같은 작업 중에 보였지만, 이 둘은 앞의 glibc 오류와 발생 지점이 다르다. 설치 단계의 문제까지 Webpack 전환으로 해결됐다고 묶을 수는 없다.

### `frozen-lockfile` 오류

pnpm은 CI에서 lockfile이 있으면 기본적으로 frozen 설치를 사용한다. 저장소에 기록된 의존성대로 설치할 수 없는 경우에는 여기서 멈춘다. [pnpm install 문서](https://pnpm.io/cli/install#--frozen-lockfile)

```text
Cannot install with frozen-lockfile because
pnpm-lock.yaml is not up to date with package.json
```

위 메시지는 `package.json`과 `pnpm-lock.yaml`의 정합성을 먼저 확인해야 한다는 뜻이다. 의존성 변경 후 lockfile 커밋이 누락됐거나, 병합하면서 두 파일이 서로 다른 상태가 된 경우가 후보가 된다. pnpm 버전과 설정 차이로 lockfile 갱신이 필요한 경우도 있지만, 형식 호환성 문제는 다른 오류 코드로 나타날 수 있으므로 전체 로그를 봐야 한다.

정리할 때는 프로젝트가 사용하는 pnpm 버전으로 개발 환경에서 설치하고, 변경된 의존성을 검토한 뒤 lockfile을 함께 커밋한다.

```bash
# 개발 환경에서 프로젝트가 고정한 pnpm 버전으로 실행
pnpm -v
pnpm install

# 변경 내용을 검토한 뒤 manifest와 함께 커밋
git diff -- '**/package.json' package.json pnpm-lock.yaml pnpm-workspace.yaml
```

`--no-frozen-lockfile`은 설치 중 lockfile 갱신을 허용한다. 그때마다 모든 버전을 새로 고르는 것은 아니지만, CI에서 저장소에 없는 의존성 변경이 생길 여지가 있다. 불일치를 확인하는 데 잠시 사용할 수는 있어도, 지속적인 해결책으로 남길 이유는 없다.

### `ERR_PNPM_NO_MATCHING_VERSION`

```text
ERR_PNPM_NO_MATCHING_VERSION
```

당시 필요한 패키지는 Nexus에도 있었다. 그렇다면 확인할 대상은 Jenkins의 pnpm이 어느 저장소의 메타데이터를 받아 어떤 버전을 요청했는지다. 패키지 존재 여부만 확인하고 설치가 가능하다고 결론 낼 수는 없다.

아래는 SWC 패키지를 예로 든 조회 명령이다. 실제 `NO_MATCHING_VERSION` 로그에 나온 패키지와 요청 버전으로 바꿔서, Jenkins와 동일한 인증 설정으로 실행해야 한다.

```bash
pnpm config get registry
pnpm config get @next:registry

# 실제 오류가 요청한 버전으로 확인한다.
pnpm view '@next/swc-linux-x64-gnu@<REQUESTED_VERSION>' version \
  --registry='https://nexus.example.invalid/repository/npm-group/'

grep -n '@next/swc-linux-x64-gnu' pnpm-lock.yaml
```

예를 들어 패키지가 있는 저장소와 Jenkins가 접근하는 group 저장소가 다르거나, `@next:registry` 설정이 기본 registry를 덮어쓰고 있을 수 있다. 응답 메타데이터에 요청 버전이 누락돼 있는지도 확인 대상이다. `latest` 태그가 가리키는 버전과 lockfile이나 manifest가 요구하는 버전 역시 같다고 가정하면 안 된다.

인증이나 다운로드 실패가 함께 있었다면 HTTP 상태와 tarball 접근도 별도로 확인해야 한다. 401·403·404나 다운로드 오류가 모두 `NO_MATCHING_VERSION`과 같은 뜻은 아니다.

이 항목들은 진단할 후보이고, 당시 Nexus 오류의 최종 원인으로 확인된 내용은 아니다. 원인을 좁히려면 요청한 패키지·버전, 유효 registry 설정, Nexus 응답을 맞춰 봐야 한다.

```bash
pnpm install --frozen-lockfile --reporter=append-only
```

더 자세한 의존성 해석 로그가 필요하면 `--reporter=ndjson`을 사용할 수 있다. `.npmrc` 전체나 인증 토큰을 로그에 남기지는 않고, registry URL에도 계정 정보를 넣지 않는 구성을 전제로 한다. 외부에 공유할 때는 로그의 내부 경로와 주소도 익명화한다.

### 앱 하나의 의존성만 보면 놓치는 부분

pnpm workspace는 기본적으로 전체 프로젝트를 설치 대상으로 삼고, 공유 lockfile 설정에서는 각 패키지의 의존성을 루트 lockfile에 기록한다. 이 구성에서는 Next.js 앱을 수정하지 않아도 다른 workspace의 manifest 변경 때문에 frozen 설치가 막힐 수 있다. 앱 디렉터리만 떼어 재현하면 루트의 `.npmrc`, workspace 설정, overrides 등을 놓칠 수 있다.

내부 패키지가 로컬 workspace에서 연결돼야 하는지도 확인 대상이다.

```json
{
  "dependencies": {
    "@company/ui": "workspace:*"
  }
}
```

`workspace:`는 로컬 패키지로만 해석하도록 제한한다. 일반 버전 범위를 쓰면 pnpm 설정과 로컬 버전의 일치 여부에 따라 registry 조회로 넘어갈 수 있다. 이 차이로 설치 실패의 조사 대상이 달라진다. [pnpm workspace 문서](https://pnpm.io/workspaces)

## Pipeline에 남길 정보

이런 장애는 실패한 명령만 남아 있으면 나중에 환경을 다시 맞추는 데 시간이 든다. 빌드를 실행한 OS·libc·Node.js·pnpm 버전과 실제 Next.js 버전이 같은 로그에 있어야 비교하기 편하다.

아래는 그 항목들을 모은 Declarative Pipeline 예제다. 당시 Jenkinsfile을 옮긴 코드가 아니며, 사내 환경에서 이 예제를 검증한 것은 아니다. 앞서 정의한 `build:webpack` 스크립트, 사전 준비된 Node.js·pnpm, Jenkins File Credential을 전제로 한다. 서버 주소와 식별자는 예시 값이다.

앱 하나의 빌드에 초점을 맞춘 예제이므로, 공유 패키지의 선행 빌드가 필요한 모노레포에 그대로 넣으면 안 된다. 기존에 Turborepo로 의존 작업 순서를 관리하고 있다면 그 실행 구조는 유지하고, 실제 Next.js 앱의 빌드 스크립트를 변경하는 쪽으로 적용해야 한다.

```groovy
pipeline {
    agent {
        label 'linux && frontend'
    }

    options {
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        skipDefaultCheckout(true)
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    environment {
        APP_FILTER = '<NEXT_APP_FILTER>'
        BUILD_SCRIPT = 'build:webpack'
        EXPECTED_REGISTRY = 'https://nexus.example.invalid/repository/npm-group/'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build environment') {
            steps {
                sh '''
                    set -eu

                    echo '[OS]'
                    uname -m
                    test ! -f /etc/os-release || cat /etc/os-release

                    echo '[libc]'
                    getconf GNU_LIBC_VERSION 2>/dev/null \
                        || (ldd --version 2>&1 | head -n 1) \
                        || true

                    echo '[Node and pnpm]'
                    node -v
                    pnpm -v
                    node -p "process.platform + ' ' + process.arch"
                '''
            }
        }

        stage('Registry and install') {
            steps {
                withCredentials([
                    file(
                        credentialsId: 'frontend-nexus-npmrc',
                        variable: 'NEXUS_NPMRC'
                    )
                ]) {
                    sh '''
                        set -eu
                        set +x
                        export NPM_CONFIG_USERCONFIG="$NEXUS_NPMRC"

                        echo "Expected registry: $EXPECTED_REGISTRY"
                        echo "Default registry: $(pnpm config get registry)"
                        echo "@next registry: $(pnpm config get @next:registry)"

                        pnpm install \
                            --frozen-lockfile \
                            --reporter=append-only
                    '''
                }
            }
        }

        stage('Next.js information') {
            steps {
                sh '''
                    set -eu
                    pnpm --filter "$APP_FILTER" --fail-if-no-match \
                        exec next --version
                    pnpm --filter "$APP_FILTER" why \
                        @next/swc-linux-x64-gnu || true
                '''
            }
        }

        stage('Build') {
            steps {
                withCredentials([
                    file(
                        credentialsId: 'frontend-nexus-npmrc',
                        variable: 'NEXUS_NPMRC'
                    )
                ]) {
                    sh '''
                        set -eu
                        set +x
                        export NPM_CONFIG_USERCONFIG="$NEXUS_NPMRC"

                        pnpm --filter "$APP_FILTER" --fail-if-no-match \
                            run "$BUILD_SCRIPT"
                    '''
                }
            }
        }
    }

    post {
        failure {
            sh '''
                set +e

                echo '[Failure diagnostics]'
                node -v
                pnpm -v
                getconf GNU_LIBC_VERSION 2>/dev/null \
                    || (ldd --version 2>&1 | head -n 1)
                pnpm --filter "$APP_FILTER" why @next/swc-linux-x64-gnu

                echo '[Installed GNU x64 SWC candidates]'
                if [ -d node_modules ]; then
                    find node_modules -type f \
                        -name 'next-swc.linux-x64-gnu.node' -print
                fi
                true
            '''
        }
    }
}
```

인증 정보는 [Jenkins File Credential](https://www.jenkins.io/doc/book/pipeline/jenkinsfile/#secret-files)로 주입하고, `.npmrc` 내용 전체를 출력하지 않는다. `EXPECTED_REGISTRY`는 비교할 기준값이지 registry를 강제로 바꾸는 설정은 아니다. 실제 적용값은 credential 파일뿐 아니라 프로젝트·scope 설정과 함께 확인해야 한다.

실패 시에는 설치된 SWC 후보 경로까지 남긴다. 파일이 여러 개라면 전체 오류 로그에 나온 경로를 골라 앞의 `ldd`와 `readelf` 명령으로 확인한다. 부가 정보 조회와 `post`의 진단 명령은 실패해도 원래 빌드 오류를 덮지 않도록 했고, 설치와 빌드는 오류가 나면 그대로 중단한다.

Node.js와 pnpm 버전은 Agent 이미지나 도구 설정에서 고정해 두는 것을 전제로 했다. 폐쇄망에서 빌드 도중 필요한 도구를 외부에서 받아오는 구성은 피해야 한다. WASM fallback을 사용한다면 그 패키지의 공급 경로도 따로 확인해야 한다. registry 설정을 넘겼다고 해당 Next.js 버전의 fallback 다운로드까지 검증된 것은 아니다.

## 우회 이후에 남은 일

Webpack을 선택하는 것 자체가 나쁜 운영 방식은 아니다. 프로젝트 요구사항과 호환성 때문에 계속 사용할 수도 있다. 이번 대응의 한계는 번들러의 이름이 아니라, 필요한 네이티브 바이너리를 로드하지 못하는 Agent 환경을 그대로 두었다는 데 있다.

후속 작업은 그 환경을 정리하는 것이다. 지원되는 OS로 Agent를 업데이트하거나, 필요한 사용자 공간 라이브러리를 갖춘 빌드 이미지로 전환하는 방향을 검토할 수 있다. 컨테이너를 쓰더라도 호스트 커널과 런타임 호환성은 확인해야 한다. 이 글에서 OS 업데이트나 이미지 전환까지 완료했다고 말할 수는 없다.

시스템의 `libc.so.6`나 `libm.so.6` 파일만 교체하는 방식은 다른 도구에 미치는 영향이 커서 우회책으로 삼기 어렵다. SWC 패키지만 임의의 구버전으로 내리는 것도 Next.js와의 조합을 깨뜨릴 수 있다. OS·Node.js·pnpm·Next.js·SWC를 검증한 조합으로 관리하고, lockfile뿐 아니라 빌드 이미지와 실행 명령도 재현할 수 있게 남기는 쪽이 맞다.

환경을 갱신한 뒤에는 깨끗한 workspace에서 frozen 설치부터 다시 확인하고, 빌드 캐시에 가려지지 않은 상태로 실제 사용하는 기능을 검증해야 한다. Turbopack을 다시 사용할지는 그때의 버전과 프로젝트 설정을 기준으로 결정할 일이다. Webpack 우회가 가능했던 정확한 내부 경로와 Nexus 설치 오류의 최종 원인은 전체 로그와 설정을 더 확인해야 하는 부분으로 남겨 둔다.

일정을 맞추기 위해 우회하는 일은 있을 수 있다. 다만 이번 변경을 “glibc 문제 해결”로 닫아 버리면 다음 프레임워크 업데이트 때 같은 제약을 다시 만날 수 있다. 이번에는 Webpack으로 빌드를 진행했지만, Agent 환경을 고치는 일까지 끝난 것은 아니다. 두 작업을 따로 남겨 두려고 이 글을 썼다.

## 참고 문서

- [Next.js Compiler](https://nextjs.org/docs/architecture/nextjs-compiler)
- [Next.js: SWC Failed to Load](https://nextjs.org/docs/messages/failed-loading-swc)
- [Next.js: Turbopack](https://nextjs.org/docs/app/api-reference/turbopack)
- [Next.js 16 업그레이드 가이드](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Next.js 15.5 릴리스](https://nextjs.org/blog/next-15-5)
- [Next.js 14 Turbopack 문서](https://nextjs.org/docs/14/architecture/turbopack)
- [Turborepo run](https://turborepo.dev/docs/reference/run)
- [pnpm install](https://pnpm.io/cli/install)
- [pnpm Workspace](https://pnpm.io/workspaces)
- [Jenkins: Using a Jenkinsfile](https://www.jenkins.io/doc/book/pipeline/jenkinsfile/)
- [GNU C Library: Dynamic Linker](https://sourceware.org/glibc/manual/latest/html_node/Dynamic-Linker.html)
- [Linux manual: ldd](https://man7.org/linux/man-pages/man1/ldd.1.html)
