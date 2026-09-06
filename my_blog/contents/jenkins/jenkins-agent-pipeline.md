---
date: "2026-09-06"
title: "Jenkins Agent 서버 추가 및 Pipeline 개선"
categories: ["TIL", "Jenkins", "CI/CD", "DevOps"]
summary: "Jenkins Controller와 Agent의 역할부터 Label 기반 스케줄링, 재현 가능한 빌드 환경, Pipeline 구조와 배포 연계까지 정리"
thumbnail: "/images/jenkins/jenkins-pipeline-overview.png"
---

# 개요

기존 Jenkins 환경에 신규 Agent 서버를 추가하는 작업을 진행했다.

처음에는 Jenkins에 Node 하나 추가하고 같은 Label만 지정하면 끝나는 작업이라고 생각했는데, 실제로 확인해보니 Pipeline 내부에서 특정 서버를 직접 지정하고 있는 부분도 있었고 서버마다 Java, Gradle, Node.js 환경도 맞춰줘야 했다.

또 환경에 따라 소스를 준비하는 주체가 달랐고, Jenkins가 빌드 이후 배포 도구와 어떤 방식으로 연결되는지도 확인해야 했다.

이번 글에서는 특정 환경의 설정값 자체보다, Agent를 추가할 때 공통으로 알아야 하는 Jenkins의 동작 원리와 그 원리를 실제 Pipeline에서 어떻게 확인했는지를 함께 정리해본다.

---

## Jenkins가 하는 역할과 기본 구조

Jenkins는 빌드 명령을 직접 제공하는 도구라기보다, 소스 Checkout부터 테스트, 빌드, 배포까지의 작업 순서를 정의하고 실행을 조율하는 자동화 서버다.

구성 요소는 크게 Controller와 Agent로 나뉜다.

* **Controller**: Job 설정, Pipeline 해석, Build Queue 관리, Agent 선택, 실행 결과와 Credential을 관리한다.
* **Agent**: Controller가 할당한 실제 명령을 실행한다. Java, Node.js, Docker 같은 빌드 도구와 Workspace가 존재하는 곳도 Agent다.
* **Executor**: Agent가 동시에 처리할 수 있는 작업 슬롯이다. Agent가 Online이어도 사용 가능한 Executor가 없으면 Job은 Queue에서 기다린다.
* **Workspace**: Checkout한 소스와 빌드 중간 결과가 놓이는 작업 디렉터리다. 같은 Job이라도 어느 Agent에서 실행됐는지에 따라 물리적인 경로가 달라질 수 있다.

일반적인 CI/CD 흐름에 이번에 추가한 세 번째 Agent를 함께 표시하면 아래와 같다.

![Jenkins Agent 추가 후 전체 CI/CD 구조](/images/jenkins/jenkins-pipeline-overview.png)

여기서 Jenkins는 전체 흐름을 조율하고, 실제 `gradle`, `pnpm`, `docker` 같은 명령은 선택된 Agent에서 실행된다. Nexus나 Argo CD는 Jenkins의 구성 요소가 아니라 Pipeline이 연동하는 외부 시스템이다.

신규 Agent는 바로 기존 Agent들과 묶지 않았다.

먼저 별도 Label을 지정해서 3번 서버에서만 Job을 실행해보고, 정상적으로 빌드되는지 확인한 뒤 기존 서버들과 같은 Label로 묶는 방식으로 진행했다.

---

## 1. Jenkins Agent Label

Jenkins에서 Node는 Controller에 등록된 실행 머신을 뜻하고, Agent는 그 Node에서 Controller의 요청을 받아 작업을 수행하는 프로세스를 뜻한다. 실무에서는 두 용어를 비슷한 의미로 사용하는 경우가 많다.

각 Node에는 운영체제나 용도, 설치된 도구 같은 특성을 나타내는 Label을 붙일 수 있다. 예를 들면 `linux`, `docker`, `jdk21`, `frontend`처럼 구성할 수 있다. Pipeline은 서버의 실제 이름 대신 필요한 실행 조건을 Label로 요청한다.

기존 구조가 아래와 같다고 하면

![신규 Jenkins Agent의 Label 테스트 및 전환 과정](/images/jenkins/jenkins-agent-labels.png)

Pipeline에서

```groovy
agent {
    label 'dev-agent'
}
```

로 지정되어 있으면 Jenkins는 `dev-agent` Label이 있고 사용 가능한 Executor를 가진 Agent를 선택해 Job을 실행한다.

3번 서버는 `temp-agent`이기 때문에 선택되지 않는다.

그래서 신규 서버 테스트할 때는 임시로

```groovy
agent {
    label 'temp-agent'
}
```

로 변경해서 3번 서버에서만 빌드되도록 했다.

테스트가 끝난 뒤 3번 서버 Label도

```text
dev-agent
```

로 변경하면

```text
Agent 1 ─┐
Agent 2 ─┼─ dev-agent
Agent 3 ─┘
```

형태가 되고, Jenkins가 현재 사용 가능한 Agent를 선택해서 Job을 실행한다.

즉 Label은 단순한 별명이 아니라 Pipeline의 실행 요구 조건과 Agent의 능력을 연결하는 선택자다. 같은 Label을 가진 Node가 여러 개 있으면 특정 서버에 고정되지 않고, Jenkins Scheduler가 Queue와 Executor 상태를 기준으로 실행 위치를 정한다.

Label 표현식을 사용하면 조건을 더 구체적으로 만들 수도 있다.

```groovy
agent {
    label 'linux && docker && jdk21'
}
```

다만 Label을 너무 세세하게 나누면 특정 Agent에 작업이 몰릴 수 있다. 서버명이 아니라 "이 Job을 실행하는 데 필요한 능력"을 기준으로 Label을 설계하는 편이 좋다.

---

## 2. Pipeline에 서버가 하드코딩되어 있는지 확인

Label만 같게 설정하면 끝날 줄 알았는데 Pipeline을 확인해보니 일부 코드에서는 서버를 직접 지정하고 있었다.

예를 들면 이런 형태다.

```groovy
def cicdNodes = [
    'agent01',
    'agent02'
]

cicdNodes.each { nodeName ->

    node(nodeName) {

        // build

    }

}
```

`node(...)`에는 Node 이름이나 Label을 전달할 수 있다. 위 코드는 배열에 실제 Node 이름을 넣었기 때문에 Jenkins에 3번 서버를 등록하고 Label을 동일하게 설정해도 3번 서버는 사용되지 않는다.

Pipeline 자체가 1번, 2번 서버만 반복하도록 되어 있기 때문이다.

서버명을 직접 지정해야 하는 특수 작업도 있지만, 일반적인 빌드는 Agent 교체와 증설이 쉬운 Label 기반 구성이 더 유연하다. 따라서 신규 서버를 추가할 때는 Jenkins Node 설정만 볼 게 아니라 Pipeline 안에서

```text
node(...)
agent { label ... }
BUILD_NODE
NODE_NAME
cicdNodes
```

같은 값이 어떻게 사용되고 있는지도 같이 확인해야 한다.

---

## 3. 서버명 대신 Label로 실행 위치 선택하기

다른 Pipeline에서는 서버명을 직접 사용하는 대신 Label을 변수로 관리하고 있었다.

```groovy
def BUILD_NODE = 'dev-agent'

pipeline {

    agent {
        label BUILD_NODE
    }

    stages {

        stage('Build') {

            steps {

                sh './gradlew build'

            }

        }

    }

}
```

Declarative Pipeline의 `agent`는 Stage나 Pipeline 전체를 실행할 위치를 선언한다. Scripted Pipeline의 `node`는 Agent를 할당받고 Workspace를 준비하는 블록이다. 문법은 다르지만 둘 다 "어디에서 실행할 것인가"를 Jenkins에 요청한다는 점은 같다.

이 구조가 서버를 직접 지정하는 것보다 관리하기 편했다.

예를 들어 Agent가

```text
1번 → dev-agent
2번 → dev-agent
3번 → dev-agent
```

로 구성되어 있으면 Pipeline 코드를 수정하지 않아도 Agent를 추가하거나 제거할 수 있다.

그래서 기존 코드에서 특정 서버명이 하드코딩된 부분은 가능하면 Label 기반으로 변경하는 방향으로 정리했다.

---

## 4. 신규 Agent 서버에 필요한 환경 맞추기

Agent만 Jenkins에 등록한다고 바로 빌드가 되는 것은 아니었다.

Pipeline은 Agent 위에서 실행되므로 Pipeline에서 사용하는 프로그램과 네트워크 권한이 신규 서버에도 준비되어 있어야 한다. 같은 Pipeline이 어느 Agent에서 실행되더라도 같은 결과를 내는 것이 중요하다.

일반적으로 확인할 항목은 다음과 같다.

```text
Java
Gradle
Node.js
npm / pnpm
Git
Docker / Podman
Nexus 접근
배포 서버 접근
```

특히 Backend에서는 Java와 Gradle 버전이 중요했다.

기존 프로젝트는 Java 21을 사용하는데 신규 Agent에 Java 17만 설정되어 있으면 아래와 같은 오류가 발생할 수 있다.

```text
invalid source release: 21
```

그래서 먼저 버전을 확인했다.

```bash
java -version

gradle -v

node -v

npm -v

git --version
```

Java가 여러 버전 설치되어 있는 경우에는 Pipeline에서 명시적으로 `JAVA_HOME`을 지정했다.

```groovy
withEnv([
    "JAVA_HOME=/app/jdk-21",
    "PATH=/app/jdk-21/bin:${env.PATH}"
]) {

    sh '''
        java -version
        ./gradlew build
    '''

}
```

이렇게 하면 서버의 기본 Java 버전과 상관없이 해당 Job에서는 지정한 Java를 사용할 수 있다.

다만 Agent마다 도구를 수동 설치하면 시간이 지날수록 버전 차이가 생기기 쉽다. Jenkins Global Tool Configuration, 프로젝트의 Wrapper, 컨테이너 기반 Agent 등을 사용하면 빌드 환경을 더 재현 가능하게 만들 수 있다. 어떤 방식을 사용하든 버전과 경로가 Pipeline 또는 코드로 추적되어야 한다는 원칙은 같다.

---

## 5. Gradle 경로

기존 Jenkins Agent에서는 Gradle을 특정 경로에 설치해서 사용하고 있었다.

```text
/app/cicd/gradle-8.14.4
```

Pipeline에서도 시스템 기본 Gradle을 사용하는 게 아니라 경로를 직접 지정해서 실행했다.

```bash
/app/cicd/gradle-8.14.4/bin/gradle copyDependencies

/app/cicd/gradle-8.14.4/bin/gradle jar
```

이런 Pipeline은 신규 Agent에서도 기존 서버와 동일한 경로 구조를 만들어주거나 Pipeline의 경로를 함께 수정해야 한다.

예를 들어

```groovy
environment {

    GRADLE_HOME = '/app/cicd/gradle-8.14.4'

}
```

```groovy
sh '''
    ${GRADLE_HOME}/bin/gradle copyDependencies
    ${GRADLE_HOME}/bin/gradle jar
'''
```

처럼 사용할 수 있다.

하지만 일반적인 Gradle 프로젝트라면 시스템에 별도 설치한 Gradle보다 저장소에 포함된 Gradle Wrapper를 사용하는 편이 이식성이 좋다.

```bash
./gradlew copyDependencies
./gradlew jar
```

Wrapper는 프로젝트가 사용할 Gradle 버전을 함께 관리하므로 Agent마다 `/app/...` 경로를 동일하게 맞춰야 하는 부담을 줄인다. 고정 설치 경로가 필요한 환경이라면 해당 경로를 Agent 설정에 숨기기보다 Pipeline 변수나 Jenkins Tool 설정으로 드러내는 것이 좋다.

---

## 6. Frontend 빌드

Frontend 쪽은 Node.js와 pnpm을 사용하고 있었다.

대략적인 빌드 흐름은

```text
Git Checkout
    ↓
pnpm install
    ↓
pnpm build
```

형태였다.

패키지 설치 시에는 public npm Registry를 직접 사용하거나, Nexus나 Artifactory 같은 사내 Proxy Registry를 사용할 수 있다. 이번 환경에서는 Nexus Registry를 사용하고 있어서

```bash
pnpm install --registry=<NEXUS_REGISTRY>
```

형태로 Dependency를 받아왔다.

신규 Agent에서 확인해야 했던 것은

```text
Node.js 버전

npm 버전

pnpm 설치 여부

Nexus Registry 접근 가능 여부
```

였다.

여기에 `package.json`뿐 아니라 lock 파일과 패키지 매니저 버전도 같이 확인해야 한다. 예를 들어 `pnpm-lock.yaml`을 유지하고 Corepack 또는 `packageManager` 필드로 pnpm 버전을 고정하면 Agent가 바뀌어도 Dependency 해석 결과가 달라지는 문제를 줄일 수 있다.

특히 기존 Agent에는 pnpm이 설치되어 있는데 신규 서버에는 없는 경우가 있어서

```bash
node -v

npm -v

pnpm -v
```

를 먼저 확인했다.

---

## 7. Source를 준비하는 두 가지 방식

Pipeline을 보면서 가장 헷갈렸던 부분 중 하나였다.

Jenkins Pipeline의 빌드는 Workspace에 Source가 있어야 시작할 수 있다. Source를 준비하는 방식은 크게 Jenkins가 SCM에서 직접 Checkout하는 방식과 외부 시스템이 미리 준비한 파일을 전달받는 방식으로 나눌 수 있다.

가장 일반적인 방식은 Jenkins가 GitHub, GitLab 같은 SCM에서 직접 Source를 가져오는 것이다. Multibranch Pipeline이나 Webhook과 함께 사용하면 Commit 또는 Branch를 기준으로 빌드를 추적하기도 쉽다.

이번 환경의 개발계도 Jenkins가 GitLab에서 직접 Source를 가져왔다.

![개발계와 테스트·운영계의 소스 Checkout 흐름 비교](/images/jenkins/jenkins-checkout-flow.png)

Pipeline에서는 일반적으로

```groovy
git(
    branch: params.BRANCH_NAME,
    credentialsId: 'gitlab-credentials',
    url: PROJECT_GIT_URL
)
```

같은 형태로 사용한다.

반면 테스트/운영계에서는 외부 릴리스 관리 시스템인 PCMS가 Source를 먼저 준비했다.

즉 Jenkins 입장에서는 이미 Source가 준비되어 있기 때문에 다시 Git Checkout을 하지 않는다.

외부 시스템이 Source를 전달하는 구조에서는 Jenkins가 실제로 어떤 Commit을 빌드했는지 추적하기 어려워질 수 있다. 따라서 Commit SHA, 전달받은 경로, 배포 요청 ID 같은 식별자를 Build Parameter와 로그에 남기는 것이 중요하다.

Pipeline을 처음 분석할 때

```text
왜 여기에는 git checkout이 없지?
```

라고 생각했는데, 실제로는 Source를 가져오는 주체가 Jenkins가 아니라 외부 시스템이었던 것이다. PCMS라는 제품명보다 중요한 것은 "SCM Checkout의 책임이 어디에 있는가"였다.

---

## 8. Parameter로 실행 방식을 명시하기

Jenkins의 Parameterized Build를 사용하면 Branch, 배포 환경, 수동 Checkout 여부처럼 실행할 때 달라지는 값을 Pipeline 밖에서 입력받을 수 있다.

이번 Pipeline에는 테스트를 위해 외부 시스템을 거치지 않고 GitLab Source를 직접 가져오는 분기도 있었다. 기존에는 특정 `deploy_id` 값에 `-999`가 들어 있는지를 보고 수동 빌드 여부를 판단했다.

대략적으로

```groovy
if (params.DEPLOY_ID.contains('-999')) {

    // GitLab Checkout

}
```

같은 구조였다.

동작은 했지만 하나의 문자열 값이 배포 식별자와 실행 모드라는 두 의미를 동시에 가지고 있었다. Pipeline을 처음 보는 사람은 `-999`의 의미를 별도 문서 없이 알기 어렵다.

일반화하면 실행 방식은 의미가 드러나는 Parameter로 분리하는 편이 낫다.

```groovy
parameters {
    booleanParam(
        name: 'CHECKOUT_FROM_SCM',
        defaultValue: false,
        description: 'SCM에서 Source를 직접 Checkout할지 여부'
    )
}

stage('Prepare Source') {
    steps {
        script {
            if (params.CHECKOUT_FROM_SCM) {
                checkout scm
            } else {
                echo '외부 시스템이 준비한 Source 사용'
            }
        }
    }
}
```

이렇게 하면 하나의 Pipeline이 두 방식을 지원하면서도 Build 화면과 실행 로그에서 어떤 경로를 선택했는지 바로 확인할 수 있다.

---

## 9. Artifact Repository의 역할

CI 환경에서는 Agent가 인터넷에서 매번 Dependency를 직접 받게 하기보다 Nexus나 Artifactory 같은 Artifact Repository를 사이에 두는 경우가 많다. 외부 Dependency를 Proxy하고 사내 Library를 배포하며, 승인된 버전을 안정적으로 공급할 수 있기 때문이다.

이번 환경에서도 Backend를 빌드하면서 필요한 Library를 Nexus Repository에서 받아왔다.

```text
Jenkins Agent
     ↓
   Gradle
     ↓
   Nexus
     ↓
Dependency Download
```

Gradle에서는 보통 Repository가 이런 식으로 설정된다.

```groovy
repositories {

    maven {
        url = uri("https://nexus.example.com/repository/maven-group/")
    }

}
```

빌드 과정에서 특정 DTO나 Library가 없다는 오류가 발생했을 때 처음에는 Source 문제라고 생각했는데, 실제로는 Repository에서 받아온 JAR 버전이나 Dependency 문제인 경우도 있었다.

이럴 때는 실제 어떤 JAR가 받아졌는지 확인하는 게 도움이 됐다.

```bash
find ~/.gradle -name "*.jar"

jar tf library.jar
```

그리고 필요한 Class가 JAR 안에 있는지도 확인할 수 있다.

```bash
jar tf library.jar | grep SomeDto
```

여기서 Dependency Repository와 빌드 결과물 저장소는 역할을 구분해서 보는 것이 좋다. 전자는 빌드 입력인 Library를 제공하고, 후자는 JAR·ZIP·Container Image 같은 빌드 결과를 다음 단계에 전달한다. Jenkins Workspace만 결과물 보관소로 사용하면 Agent 정리나 재실행 시 파일을 잃을 수 있다.

---

## 10. Jenkins와 배포 도구의 역할 분리

Jenkins는 배포 명령도 실행할 수 있지만, 반드시 Jenkins 자체가 Kubernetes 리소스를 직접 변경해야 하는 것은 아니다. Pipeline은 CLI를 호출하거나 REST API를 사용하거나, GitOps 저장소의 Manifest를 변경하는 방식으로 별도의 배포 도구에 다음 단계를 위임할 수 있다.

중요한 것은 CI와 CD의 책임 경계다. Jenkins가 테스트와 이미지 생성까지 담당하고 Argo CD가 원하는 배포 상태와 실제 클러스터 상태를 동기화하도록 나누면, 빌드와 배포의 이력을 각각 추적할 수 있다.

처음에는 Jenkins Agent 서버에 Argo CD CLI가 설치되어 있어야 배포가 가능한 줄 알았다.

그런데 운영 Pipeline을 확인해보니 CLI를 사용하는 구조가 아니었다.

Jenkins의 `httpRequest`를 이용해서 Argo CD REST API를 직접 호출하고 있었다.

대략적인 구조는

```text
Jenkins
   ↓
HTTP Request
   ↓
Argo CD REST API
   ↓
Application Sync
   ↓
Kubernetes / OpenShift
```

형태였다.

Pipeline에서는 이런 식이다.

```groovy
def response = httpRequest(
    httpMode: 'POST',
    url: "${ARGOCD_URL}/api/v1/applications/${APP_NAME}/sync",
    customHeaders: [
        [
            name: 'Authorization',
            value: "Bearer ${ARGOCD_TOKEN}"
        ]
    ]
)
```

따라서 이 환경의 신규 Jenkins Agent 서버에는 Argo CD CLI를 별도로 설치할 필요가 없었다.

대신 신규 Agent에서

```text
Argo CD API 서버까지 네트워크 통신이 가능한지

Jenkins Credential을 정상적으로 사용할 수 있는지

API 호출 권한이 있는지
```

를 확인해야 했다. 배포 Token 같은 비밀값은 Pipeline 코드나 일반 환경 변수에 직접 넣지 않고 Jenkins Credential로 주입해야 한다.

---

## 11. Blue-Green 배포

Blue-Green은 Jenkins 전용 기능이 아니라 두 개의 동일한 실행 환경을 준비한 뒤 트래픽 대상을 전환하는 일반적인 배포 전략이다. 현재 트래픽을 받는 환경과 새 버전을 검증하는 환경을 분리하기 때문에 배포 중단 시간을 줄이고, 문제가 생기면 Route를 되돌려 빠르게 복구할 수 있다.

이번 운영 배포도 Blue-Green 방식으로 구성되어 있었다.

전체적인 흐름을 단순화하면 아래와 같다.

![Blue-Green 배포 및 Route 전환 흐름](/images/jenkins/jenkins-blue-green.png)

Jenkins Pipeline의 역할은 새 환경 배포, Health Check, 트래픽 전환이 올바른 순서로 실행되도록 조율하고 각 단계가 실패하면 다음 단계로 넘어가지 않게 하는 것이다.

여기서 개선이 필요했던 부분은 Pod 개수였다.

기존에는 Green 환경의 Pod 수가 고정되어 있었는데, Blue에 떠 있는 Pod 수만큼 Green도 동일하게 기동하도록 변경할 필요가 있었다.

예를 들어 현재 Blue가

```text
Blue Pod = 5
```

라면 배포 시 Green도

```text
Green Pod = 5
```

로 만든 다음 트래픽을 넘기는 방식이다.

```text
Blue 5 Pod
   ↓ replicas 확인
Green 5 Pod 생성
   ↓
Healthy 확인
   ↓
Traffic Switch
```

이렇게 해야 배포 순간에 기존보다 적은 Pod로 트래픽을 받는 문제를 줄일 수 있다.

---

## 12. Pipeline 리팩터링

Jenkins Pipeline을 코드로 관리하면 빌드 절차도 애플리케이션 코드처럼 버전 관리하고 리뷰할 수 있다. Declarative Pipeline은 `agent`, `stages`, `steps`, `post`처럼 정해진 구조로 전체 흐름을 보여주고, Scripted 문법은 복잡한 조건과 반복을 표현할 때 유용하다.

다만 Jenkinsfile 안에 모든 구현을 넣으면 Pipeline마다 같은 코드가 복사된다. 기존 Pipeline을 분석하면서도 반복되는 코드가 상당히 많았다.

예를 들면

```text
Git Checkout

Directory 생성

Build Path 계산

Nexus 설정

Gradle Build

Docker Build

Image Push
```

같은 로직이 Job마다 반복되고 있었다.

그래서 반복되는 부분을 함수로 분리했다.

기존에는

```groovy
stage('Checkout') {

    steps {

        deleteDir()

        git(
            branch: params.BRANCH_NAME,
            credentialsId: 'gitlab-credentials',
            url: PROJECT_GIT_URL
        )

    }

}
```

처럼 직접 작성되어 있었다면

```groovy
def checkoutProjectGit(Map config) {

    dir(config.projectDir) {

        deleteDir()

        git(
            branch: config.branch,
            credentialsId: config.credentialsId,
            url: config.gitUrl
        )

    }

}
```

형태로 공통화할 수 있다.

Pipeline에서는

```groovy
checkoutProjectGit(
    projectDir: PROJECT_DIR,
    branch: params.BRANCH_NAME,
    credentialsId: GIT_CREDENTIAL_ID,
    gitUrl: PROJECT_GIT_URL
)
```

처럼 호출한다.

이렇게 하면 Pipeline의 전체적인 흐름을 보기 쉬워지고 중복 코드도 줄일 수 있다. 여러 Repository에서 같은 로직을 사용한다면 함수 몇 개를 복사하는 것보다 Jenkins Shared Library로 분리하는 방법도 있다.

공통화할 때는 Stage 이름과 주요 로그는 Jenkinsfile에 남기는 편이 좋다. 모든 동작을 Library 내부에 숨기면 중복은 줄어도 Jenkins 화면에서 실패 지점을 찾기 어려워질 수 있다.

---

## 13. Jenkins Global Environment 최소화

Jenkins에는 값을 둘 수 있는 위치가 많다. Pipeline의 `environment`, Build Parameter, Folder/Global 설정, Node 환경 변수, Credential, Shared Library가 모두 후보가 된다.

기존 환경에서는 Jenkins Global Environment에 여러 값이 등록되어 있었다.

처음에는 전역으로 등록해놓으면 모든 Job에서 사용할 수 있어서 편해 보였는데, Pipeline이 많아지면 오히려 어떤 값이 어디에서 들어오는지 찾기 어려워진다.

예를 들어 코드에는

```groovy
echo "${NEXUS_URL}"
```

만 있는데 실제 값이

```text
Pipeline

Shared Library

Jenkins Global Environment

Node Environment

Credential
```

중 어디에서 들어오는지 바로 알기 어렵다.

그래서 프로젝트에서 사용하는 값은 가능하면 Pipeline이나 별도 Config에서 관리하는 방향으로 정리했다.

```groovy
environment {

    BUILD_NODE = 'dev-agent'

    GRADLE_HOME = '/app/cicd/gradle-8.14.4'

}
```

실행하면서 바뀌어야 하는 값은 Parameter로 분리한다.

```groovy
parameters {

    string(
        name: 'BRANCH_NAME',
        defaultValue: 'dev'
    )

    choice(
        name: 'BUILD_ENV',
        choices: ['dev', 'tst', 'prod']
    )

}
```

정리하면

```text
고정값 → Config / Environment

실행할 때 바뀌는 값 → Parameter

비밀번호 / Token → Jenkins Credential
```

형태로 나누는 게 관리하기 편했다.

적용 범위가 좁은 곳에 값을 두는 것도 중요한 기준이다. 특정 Job에서만 쓰는 값은 Pipeline에, 여러 Job이 공유하는 비밀값은 Credential에, 실행 시 사용자가 선택해야 하는 값은 Parameter에 두면 값의 출처와 변경 영향을 파악하기 쉽다.

---

## Agent 추가 시 확인할 공통 항목

이번 작업에서 Jenkins Node 하나를 추가하는 것도 생각보다 확인할 부분이 많았다. 회사마다 SCM이나 Artifact Repository, 배포 도구는 달라도 점검 기준은 비슷하다.

단순히

```text
Jenkins에 Agent 등록
```

만 하면 끝나는 게 아니라

```text
Controller와 Agent의 Java 및 연결 방식이 호환되는지

Agent가 Online이고 Executor를 사용할 수 있는지

Pipeline이 서버명이 아닌 Label 기반으로 실행되는지

Java / Gradle / Node 등 Toolchain이 재현 가능한지

Workspace 경로와 파일 권한이 올바른지

SCM과 Artifact Repository에 접근할 수 있는지

Container Registry 및 배포 시스템과 통신할 수 있는지

필요한 Credential을 최소 권한으로 사용할 수 있는지

테스트 Job의 결과와 Artifact가 기존 Agent 실행 결과와 같은지
```

까지 확인해야 했다.

특히 기존 Pipeline을 먼저 분석하지 않고 서버만 추가하면 Jenkins에는 정상적으로 등록되어 있는데 실제 Job에서는 신규 서버가 전혀 사용되지 않는 상황도 생길 수 있다. 별도 Label로 검증한 뒤 공용 Label에 편입하면 기존 Job에 미치는 영향을 줄일 수 있다.

---

## 핵심 정리

* Controller는 Pipeline과 Queue를 관리하고, 실제 빌드 명령은 Agent의 Executor와 Workspace에서 실행된다.
* Label은 Pipeline이 요구하는 능력과 Agent를 연결하는 선택자다. 서버명보다 Label을 사용해야 Agent 증설과 교체가 쉽다.
* 어느 Agent에서 실행해도 같은 결과가 나오도록 Toolchain 버전과 Dependency를 고정해야 한다.
* Source Checkout의 주체는 환경마다 다를 수 있지만, 실제 빌드한 Commit과 입력 경로는 항상 추적할 수 있어야 한다.
* Artifact Repository는 빌드 입력인 Dependency와 다음 단계로 전달할 빌드 결과물을 안정적으로 관리한다.
* Jenkins는 배포를 직접 수행할 수도 있고 API, CLI, GitOps 방식으로 전문 배포 도구에 위임할 수도 있다.
* 반복되는 Pipeline 로직은 함수나 Shared Library로 공통화하되, Stage와 주요 로그는 읽을 수 있게 유지하는 편이 좋다.
* 설정값은 사용 범위에 맞게 Pipeline, Parameter, Credential 등으로 나눠야 출처와 변경 영향을 파악하기 쉽다.
