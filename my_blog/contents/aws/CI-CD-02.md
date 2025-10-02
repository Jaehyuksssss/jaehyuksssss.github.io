---
date: '2025-09-16'
title: 'Elastic Beanstalk × GitHub Actions로 .NET 8 CI/CD 구축기 (OIDC, 최소 권한)'
categories: ['TIL','AWS','Elastic Beanstalk','GitHub Actions','CI/CD','.NET']
summary: 'AL2023(.NET 8) Elastic Beanstalk에 액세스 키 없이(OIDC) 배포 파이프라인 구축. 권한 설계/워크플로까지.'
thumbnail: '/aws.png'
---

![아키텍쳐](/images/eb.png)

# 개요

기존 닷넷 코드를 cli로 수동으로 publish 파일로 만들고 ZIP을 업로드해 **Elastic Beanstalk(EB)** 에 배포를 했고, 시간적으로나 실수를 할 가능성 등의 기술 부채가 있었다.

## 목표

* `BRANCH`에 푸시 → **자동** `dotnet publish` → ZIP 생성 → **Application Version** 생성 → **환경 업데이트**
* 액세스 키 없이 **GitHub OIDC → AssumeRole** 로 인증
* **최소 권한** 으로 운영

아래는 실제로 구축하면서 정리한 내용이고 모든 값들은 **플레이스홀더**로 표기했다.

---

## 변수(플레이스홀더) 목록

| 키               | 의미                      | 예시                                           |
| --------------- | ----------------------- | -------------------------------------------- |
| `<AWS_REGION>`  | 리전                      | `ap-northeast-2`                             |
| `<ACCOUNT_ID>`  | AWS 계정 ID(12자리)         | `123456789012`                               |
| `<ROLE_ARN>`    | OIDC 배포 역할 ARN          | `arn:aws:iam::<ACCOUNT_ID>:role/<ROLE_NAME>` |
| `<REPO_OWNER>`  | GitHub Org/Owner        | `HOGAKCORP`                                  |
| `<REPO_NAME>`   | GitHub Repo             | `hogak-backoffice`                           |
| `<BRANCH_NAME>` | 배포 트리거 브랜치              | `Stg`                                        |
| `<EB_APP>`      | EB **Application Name** | 예: `myapp-stg`                               |
| `<EB_ENV>`      | EB **Environment Name** | 예: `myapp-stg`                               |
| `<CSPROJ_PATH>` | .csproj 경로              | `./src/Web/Web.csproj`                       |
| `<DLL_NAME>`    | 최종 DLL 파일명              | `Web.dll`                                    |

> **주의**: EB의 Application/Environment 이름은 콘솔 표기와 **한 글자도** 다르면 안 된다.
> (둘을 동일하게 쓰는 조직도 있음)

---

# 1) IAM: GitHub Actions OIDC 역할 만들기

### 1-1. Trust Policy (신뢰 정책)

* 공급자: `token.actions.githubusercontent.com`
* aud: `sts.amazonaws.com`
* sub: `repo:<REPO_OWNER>/<REPO_NAME>:ref:refs/heads/<BRANCH_NAME>`

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
    },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
      },
      "StringLike": {
        "token.actions.githubusercontent.com:sub": "repo:<REPO_OWNER>/<REPO_NAME>:ref:refs/heads/<BRANCH_NAME>"
      }
    }
  }]
}
```

> 좀 더 나아가서: 특정 워크플로 파일만 허용 할시에는 아래와 같이 값을 넣으면 된다.

```json
"token.actions.githubusercontent.com:workflow_ref": "<REPO_OWNER>/<REPO_NAME>/.github/workflows/eb-deploy.yml@refs/heads/<BRANCH_NAME>"
```

### 1-2. 권한 정책

**A) EB 제어(관리형 또는 커스텀 최소 권한)**

간단: `AdministratorAccess-AWSElasticBeanstalk` (실무에서 흔히 사용)

최소 권한 커스텀 예시:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "EbCore",
    "Effect": "Allow",
    "Action": [
      "elasticbeanstalk:CreateApplicationVersion",
      "elasticbeanstalk:UpdateEnvironment",
      "elasticbeanstalk:DescribeApplications",
      "elasticbeanstalk:DescribeApplicationVersions",
      "elasticbeanstalk:DescribeEnvironments",
      "elasticbeanstalk:ListAvailableSolutionStacks"
    ],
    "Resource": "*"
  }]
}
```

**B) EB 전용 S3 버킷 접근(Inline Policy 필수)**

EB는 Application Version ZIP을 **계정 전용 EB 버킷**에 올린다:
`elasticbeanstalk-<AWS_REGION>-<ACCOUNT_ID>`

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "EbS3BucketAccess",
    "Effect": "Allow",
    "Action": [
      "s3:PutObject","s3:GetObject","s3:DeleteObject","s3:ListBucket","s3:GetBucketLocation"
    ],
    "Resource": [
      "arn:aws:s3:::elasticbeanstalk-<AWS_REGION>-<ACCOUNT_ID>",
      "arn:aws:s3:::elasticbeanstalk-<AWS_REGION>-<ACCOUNT_ID>/*"
    ]
  }]
}
```

---

# 2) EB 환경 요구사항(.NET 8 / AL2023)

* **플랫폼**: AL2023 / .NET 8 (Linux)
* **Procfile 필수** (ZIP 루트에)

  ```
  web: dotnet <DLL_NAME>
  ```
* **ZIP 구조**: 최상단에 `Procfile`, `*.dll`, `appsettings*.json`, `wwwroot/` 등이 **바로 보이게**
  (상위 `publish/` 폴더가 한 겹 싸이면 실패)

---

# 3) GitHub Actions 워크플로

> 파일 경로 예: `.github/workflows/eb-deploy.yml`

```yaml
name: Deploy to EB (<BRANCH_NAME>)

on:
  push:
    branches: [ "<BRANCH_NAME>" ]  # 대소문자 정확히 > 틀렸었음
  workflow_dispatch:

permissions:
  id-token: write
  contents: read

env:
  AWS_REGION: <AWS_REGION>
  EB_APP: <EB_APP>
  EB_ENV: <EB_ENV>
  CSPROJ_PATH: <CSPROJ_PATH>
  DLL_NAME: <DLL_NAME>

concurrency:
  group: eb-${{ env.EB_ENV }}
  cancel-in-progress: false

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '8.0.x'

      - name: Restore
        run: dotnet restore ${{ env.CSPROJ_PATH }}

      - name: Build (Release)
        run: dotnet build --no-restore -c Release ${{ env.CSPROJ_PATH }}

      - name: Publish (Release)
        run: dotnet publish -c Release -o ./publish ${{ env.CSPROJ_PATH }}

      - name: Create Procfile (AL2023/.NET 8)
        run: |
          echo "web: dotnet ${{ env.DLL_NAME }}" > ./publish/Procfile
          cat ./publish/Procfile

      - name: Create deployment package
        run: |
          (cd publish && zip -r ../app.zip .)
          echo "VERSION=${GITHUB_REF_NAME}-${{ github.run_number }}-${GITHUB_SHA::7}" >> $GITHUB_ENV
          ls -lh app.zip

      - name: Configure AWS credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: <ROLE_ARN>
          aws-region: ${{ env.AWS_REGION }}
          role-session-name: gh-oidc-eb

      - name: Deploy to Elastic Beanstalk
        uses: einaregilsson/beanstalk-deploy@v22
        with:
          aws_access_key:     ${{ env.AWS_ACCESS_KEY_ID }}
          aws_secret_key:     ${{ env.AWS_SECRET_ACCESS_KEY }}
          aws_session_token:  ${{ env.AWS_SESSION_TOKEN }}   # OIDC 세션 토큰 전달
          application_name:   ${{ env.EB_APP }}
          environment_name:   ${{ env.EB_ENV }}
          version_label:      ${{ env.VERSION }}
          region:             ${{ env.AWS_REGION }}
          deployment_package: app.zip

      - name: Deployment Summary
        run: |
          echo "Application: ${{ env.EB_APP }}"
          echo "Environment: ${{ env.EB_ENV }}"
          echo "Version:     ${{ env.VERSION }}"
          echo "Region:      ${{ env.AWS_REGION }}"
```

> 참고
>
> * `permissions.id-token: write` 가 **반드시** 필요(OIDC)
> * beanstalk-deploy\@v22는 가끔 OIDC env를 자동 인식 못하므로 **세션 토큰까지 명시** 전달이 안전
> * `concurrency`로 **같은 환경 동시 배포 금지**

---

# 4) (옵션) 브랜치별 환경 분기

`stage-copy` 같은 브랜치를 같이 쓴다면, **EB\_ENV만** 분기하면 된다. (같은 환경을 공유하면 서로 덮어쓴다)

```yaml
- name: Set EB_ENV by branch
  run: |
    BRANCH="${GITHUB_REF##*/}"
    if [ "$BRANCH" = "<BRANCH_NAME>" ]; then
      echo "EB_ENV=<EB_ENV>" >> $GITHUB_ENV
    elif [ "$BRANCH" = "stage-copy" ]; then
      echo "EB_ENV=<EB_ENV_COPY>" >> $GITHUB_ENV
    else
      echo "Unsupported branch: $BRANCH"; exit 1
    fi
```

---

# 5) 도메인/HTTPS (요약)

* **CNAME**: `app.stg.example.com` → `<EB_ENV>.<AWS_REGION>.elasticbeanstalk.com`
* **ACM(리전 = ALB가 있는 리전)**: 인증서 발급 후 EB 환경의 **로드밸런서 443 리스너**에 연결
* **HTTP→HTTPS 리다이렉트** 규칙 추가
* **Blue/Green** 을 계획한다면 CNAME 방식이 **URL 스왑**과 궁합이 좋다

---

# 6) 자주 만난 오류 & 해결

* **`AWS Access Key not specified!`**
  → OIDC임에도 beanstalk-deploy가 env를 못 읽는 케이스.
  **해결:** `aws_access_key / aws_secret_key / aws_session_token` 을 **with 파라미터로 명시 전달**(위 예시 참고)

* **`No Application named 'X' found`**
  → EB Application Name 오타.
  **해결:** 콘솔 표기와 한 글자도 틀리지 않게 맞추기.

* **앱 안 뜸/런타임 에러 (배포 직후)**
  → ZIP 루트가 잘못됨(최상위가 `publish/`인 구조).
  **해결:** `(cd publish && zip -r ../app.zip .)` 로 **내용물만** 압축, `Procfile`은 루트.

* **AssumeRole 실패**
  → Trust policy의 `sub`가 브랜치/대소문자 미스매치.
  **해결:** 실제 브랜치명을 정확히, 필요 시 `workflow_ref` 까지 잠금.

* **Application Version 생성 AccessDenied**
  → EB 전용 S3 버킷 권한 누락.
  **해결:** `EbS3BucketAccess` 인라인 정책 추가(위 JSON).

---

# 마무리

* GitHub OIDC + EB 조합으로 **액세스 키 없는 안전한 배포**가 가능했다.
* 권한은 **EB 제어(관리형/최소권한)** + **EB S3 인라인** 으로 구성.
* 고생 포인트(세션 토큰 전달, 이름 오타, ZIP 루트, OIDC `sub`)만 조심하면 **안정적인 .NET 8 배포 파이프라인**을 만들 수 있다.

> 이 문서는 **모든 값이 플레이스홀더**로 추상화돼 있고. 본인 환경의 값으로 치환 후 사용하시면 됩니다..

---

# 7) 배포 상태 확인

## 성공 시

배포가 성공적으로 완료되면 다음과 같은 정보가 표시됩니다:

![배포 성공](/images/ci-cd-01.png)

**성공 시 확인사항:**
- Application Version이 정상적으로 생성됨
- EB 환경이 새 버전으로 업데이트됨
- 애플리케이션이 정상적으로 실행됨
- 도메인 접속 시 새 버전이 반영됨

## 실패 시

배포 중 오류가 발생하면 다음과 같은 정보가 표시됩니다:

![배포 실패](/images/ci-cd-01.png)

**실패 시 확인사항:**
- GitHub Actions 로그에서 구체적인 오류 메시지 확인
- EB 환경 상태 확인 (Health: Red)
- 권한 설정 검토
- ZIP 파일 구조 및 Procfile 확인

## 배포 상태 모니터링

배포 상태는 다음 방법으로 확인할 수 있습니다:

1. **GitHub Actions**: 워크플로 실행 결과
2. **EB 콘솔**: 환경 상태 및 이벤트 로그
3. **애플리케이션**: 실제 서비스 동작 확인

