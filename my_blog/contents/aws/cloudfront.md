---
date: "2025-12-18"
title: "AWS CloudFront 완전 정복"
categories: ["TIL", "AWS"]
summary: "CloudFront를 제대로 이해하고 쓰는 방법, S3/ALB와의 연동, 캐시 정책 설계, 보안 설정, 비용 최적화까지 실무에서 바로 쓸 수 있는 패턴을 정리한다."
thumbnail: "/aws.png"
---

# intro

요즘 프론트든 백엔드든 "CDN 붙이자"라는 말은 너무 많이 나오는데, 막상 **CloudFront**를 제대로 이해하고 쓰는 경우는 생각보다 적다.

- "S3 앞에 하나 만들어두면 되지 않나?"
- "ALB 앞에 붙여봤는데, 캐시가 왜 안 먹지?"
- "비용 줄이려고 붙였다가 오히려 더 나간다는데…?"

이 글에서는 **인프라/개발자 관점에서 CloudFront를 어떻게 이해하고, 어떤 패턴으로 설계하면 좋은지**를 쭉 정리해봤다.

# AWS CloudFront 완전 정복: 인프라 엔지니어 입장에서 정리한 CDN 가이드

## 1. CloudFront 한 줄 정의

> **전 세계에 깔린 캐시 서버(엣지 로케이션)에 콘텐츠를 저장해 두고, 사용자와 가장 가까운 위치에서 빠르게 응답해주는 AWS CDN 서비스**

조금 더 개발자스럽게 말하면:

- **Reverse Proxy + 캐시 + 보안 기능이 합쳐진 서비스**다.
- 오리진(S3, ALB, EC2 등)에 직접 붙는 대신, **CloudFront라는 레이어를 한 겹 더 두고** 트래픽을 받는 구조라고 보면 된다.

## 2. 왜 굳이 CloudFront를 써야 할까?

### 2.1 속도

- 한국 유저가 서울 근처 엣지에서 응답 받으면, 미국 리전에 있는 S3/EC2까지 왕복하지 않아도 된다.
- 특히 JS/CSS/이미지, 동영상 같은 정적 리소스에서 **체감 성능 차이가 꽤 크게** 나타난다.

### 2.2 원본 보호 (Origin Shield)

- 실제 S3/ALB는 **외부에 직접 노출할 필요가 없다.**
- CloudFront만 오리진에 접근하도록 잠그면:

  - 봇/공격 트래픽을 엣지에서 차단 가능
  - 갑자기 트래픽이 튀어도 오리진이 직접 다 받지 않아도 됨

### 2.3 보안 & 기능

- AWS WAF, AWS Shield 통합
- HTTPS/TLS 관리
- 서명 URL/쿠키로 유료 콘텐츠 보호
- 헤더/쿼리/쿠키 기반 캐시 키 설계
- 오리진으로 전달할 헤더/쿼리/쿠키를 따로 제어

### 2.4 비용

- CloudFront → Internet 데이터 전송 단가가 S3/EC2 직접 전송보다 낮은 리전이 많다.
- 캐시가 잘 맞으면 오리진 호출이 줄어 **EC2/EKS/RDS 비용까지 함께 줄어든다.**

## 3. CloudFront 핵심 개념 정리

### 3.1 Distribution

- 우리가 만드는 **CloudFront 인스턴스 한 덩어리**다.
- 각 Distribution은:

  - 고유한 도메인(`xxxxx.cloudfront.net`)
  - 여러 Origin
  - 여러 Behavior(경로별 설정)
  - 인증서, WAF, 로그 설정 등을 가진다.

### 3.2 Origin

CloudFront가 실제 데이터를 가져오는 **원본 서버**다.

- S3 버킷
- ALB / NLB
- EC2, 온프레미스 서버 (도메인/IP 기반)
- 기타 HTTP(S)로 접근 가능한 모든 것

> 하나의 Distribution 안에 여러 Origin을 넣고, 경로별로 어느 Origin을 쓸지 매핑할 수 있다.  
> 예: `/_next/static/*` → S3, `/api/*` → ALB

### 3.3 Edge Location

- 전 세계에 분포된 CloudFront 캐시 서버 위치다.
- 클라이언트가 DNS로 `cdn.example.com`을 조회하면 **가장 가까운 엣지의 IP**로 연결된다.

### 3.4 Behavior

- **"이 경로로 들어온 요청은 이렇게 처리해라"** 라고 정의하는 부분.
- 대표적으로 설정하는 것들:

  - Path Pattern (`/`, `/static/*`, `/api/*` 등)
  - 캐시 정책(Cache Policy)
  - 오리진 요청 정책(Origin Request Policy)
  - 어떤 Origin을 사용할지
  - HTTP Method 허용 범위, redirect, 압축 여부 등

### 3.5 Cache Policy

- CloudFront가 **캐시 키를 어떻게 만들지 + TTL을 어떻게 가져갈지**를 정의한다.
- 어떤 요소를 캐시 키에 포함할지 선택:

  - 헤더
  - 쿼리스트링
  - 쿠키

- TTL(최소/기본/최대)을 설정해서 **얼마 동안 엣지에 머물게 할지**도 결정한다.

### 3.6 Origin Request Policy

- 오리진에게 **어떤 헤더/쿼리/쿠키를 실제로 전달할지** 정의한다.
- 캐시 키에는 포함되지 않지만, 백엔드에서 필요한 값이라면 여기서 추가할 수 있다.
- 예: `Authorization` 헤더는 캐시 키엔 안 쓰고, 오리진으로만 전달하기.

## 4. 캐시가 실제로 동작하는 방식

CloudFront의 기본 흐름은 다음과 같다.

1. 사용자가 `https://cdn.example.com/logo.png` 요청
2. DNS가 가까운 Edge Location으로 라우팅
3. 엣지에서 `logo.png`에 해당하는 캐시 키를 찾아봄

   - 있으면 → 바로 응답 (Cache Hit)
   - 없으면 → 오리진(S3/ALB 등)에 요청 (Cache Miss)

4. 오리진 응답을 받으면:

   - Cache Policy에 따라 TTL/키를 기준으로 캐시에 저장
   - 사용자에게 응답 전달

5. TTL이 만료되기 전까지는, 같은 키 요청은 엣지에서 바로 응답

여기서 중요한 건 **"캐시 키를 어떻게 정의하느냐"** 다.  
같은 URL이라도 헤더/쿼리/쿠키 조합이 다르면 **다른 캐시로 취급**될 수 있기 때문에, 설계를 잘못하면 캐시 히트율이 바닥을 치게 된다.

## 5. S3 + CloudFront: 정석 패턴

정적 사이트/프론트 빌드를 올릴 때 가장 많이 쓰는 구조다.

### 5.1 기본 구조

1. S3 버킷 생성 (`my-app-prod-assets`)
2. 퍼블릭 접근 차단
3. CloudFront Distribution 생성

   - Origin: S3 버킷
   - Origin Access Control(OAC) 생성 후 연결
   - S3 버킷 정책에 OAC용 정책 추가 → CloudFront만 접근 가능

4. Behavior 설정

   - `/static/*` 또는 `/_next/static/*`: 정적 자산용 Behavior
   - `/` 및 나머지: HTML용 Behavior

5. 도메인 연결

   - ACM(us-east-1)에서 인증서 발급 (`cdn.example.com`)
   - CloudFront Alternate Domain Name에 추가
   - Route 53 CNAME → CloudFront 도메인

### 5.2 정적 파일 캐시 전략

- 빌드 시 파일명에 해시 붙이기: `main.7a3f1c2.js`
- Cache Policy:

  - TTL: 수 시간~수 일까지 길게
  - 쿼리/쿠키/헤더: 최대한 포함하지 않기

- 배포 시:

  - "파일 내용이 바뀌면 파일명도 바뀐다"는 전제를 이용해서 **CloudFront Invalidation 거의 안 쓰는 전략**을 취한다.

## 6. ALB/API + CloudFront: 백엔드도 CDN을 탄다

API 서버, SSR 서버, EKS 서비스 등을 CloudFront 뒤에 둘 수도 있다.

### 6.1 구조 예시

- Origin: ALB (`hogak-prod-alb-xxx.ap-northeast-2.elb.amazonaws.com`)
- Behavior:

  - `/api/*` → ALB Origin, 캐시 거의 없음
  - `/` → SSR 서버라면 TTL을 짧게, SPA라면 S3 Origin으로 빼는 게 일반적

### 6.2 API 캐시 전략

- 사용자별로 응답이 달라지는 API:

  - `Authorization`, `Cookie` 등으로 제어
  - 보통 캐시하지 않거나(TTL 0), 매우 짧게 설정

- 공용 데이터(API 형태지만 사실상 정적):

  - 랭킹, 공지, 사이트 설정값 등
  - 쿼리 파라미터만 캐시 키로 포함하고 TTL을 길게 가져가는 패턴이 많음

### 6.3 보안 포인트

- ALB 보안 그룹에서:

  - 0.0.0.0/0 SSH/HTTP 허용 대신
  - **CloudFront에서 오는 IP만 허용**하도록 제한하는 패턴이 이상적이다.

- 또는, ALB는 Private Subnet에 두고, CloudFront ↔ ALB 구간은 VPC Link/프록시 구조로만 열어두는 식도 있다.

## 7. 캐시 정책 설계 팁

### 7.1 정적 리소스 (JS/CSS/IMG)

- 파일명에 해시 포함이 거의 필수
- 캐시 정책:

  - 쿼리/쿠키/헤더: 포함 X
  - TTL: 길게 설정 (1시간~1일 이상)

- 브라우저 캐시도 `Cache-Control: max-age=...` 로 길게

### 7.2 HTML(SSR / 정적 HTML)

- 자주 바뀌는 페이지:

  - TTL 짧게 (수 초~수 분)
  - 또는 CloudFront 캐시 없이 브라우저 캐시만 활용

- 크게 안 바뀌는 공지/블로그:

  - TTL 길게 가져가도 무방
  - 수정 시에만 Invalidation 사용

### 7.3 API

- 사용자별, 토큰 기반 API:

  - 캐시 안 하는 게 안전하다.

- 공용 API:

  - Cache Policy에서 쿼리스트링만 캐시 키로 쓰고, TTL을 수 초~수 분 정도로 설정하면 오리진 부하가 많이 줄어든다.

## 8. CloudFront Invalidation 제대로 쓰기

### 8.1 언제 필요한가?

- 이미 캐시된 오브젝트를 **지금 당장 새 버전으로 바꿔야 할 때**
- 대표적인 케이스:

  - `index.html`처럼 파일명이 고정인데 내용을 긴급 수정해야 하는 경우
  - 치명적인 JS/CSS 버그가 나서 버전 롤백 해야 할 때

### 8.2 어떻게 쓰는가?

- CloudFront 콘솔 → Distribution → Invalidations
- 경로 패턴 지정:

  - `/index.html`
  - `/static/*`

### 8.3 비용

- 무료 쿼터 이후에는 Invalidation 요청 수에 따라 과금된다.
- 그래서 **"파일명 해시 전략 + Invalidation은 진짜 급할 때만"** 이 베스트 프랙티스다.

## 9. 보안: OAC, WAF, HTTPS, 서명 URL

### 9.1 OAC(Origin Access Control)

- S3 버킷을 **퍼블릭으로 열지 않고**, CloudFront만 접근하도록 만드는 기능이다.
- 예전에는 OAI(Origin Access Identity)를 썼고, 요즘은 OAC가 권장된다.

### 9.2 WAF

- CloudFront를 **Web ACL 리소스로 연결**하면:

  - IP 차단/허용
  - Rate limiting
  - SQL Injection, XSS Rule
  - Bot 확인 등

- 모든 검사가 엣지에서 이뤄지기 때문에, 오리진까지 트래픽이 도달하기 전에 방어가 가능하다.

### 9.3 HTTPS/TLS

- 클라이언트 ↔ CloudFront:

  - ACM(us-east-1)에서 발급한 인증서를 연결

- CloudFront ↔ 오리진:

  - HTTPS Only로 설정 가능
  - 내부 도메인/사설 인증서 사용도 가능

### 9.4 서명된 URL/쿠키

- 유료 동영상, 유료 문서 다운로드 등에서 사용.
- CloudFront 전용 key pair로 URL/쿠키에 만료 시간, 경로, IP 제한 등을 서명해서 전달하고
- CloudFront가 유효한 서명만 통과시키는 방식이다.

## 10. 비용 & 성능 튜닝 포인트

### 10.1 Cache Hit Rate

- CloudWatch Metrics 또는 CloudFront 보고서에서 확인할 수 있다.
- Hit Rate가 높을수록:

  - 오리진 트래픽 감소
  - 응답 속도 향상
  - 비용 절감

- Hit Rate가 낮다면:

  - TTL이 너무 짧거나
  - Cache Policy에서 헤더/쿼리/쿠키를 과도하게 키에 포함했거나
  - 오리진 응답 헤더가 `no-store`, `private` 등으로 되어 있는지 체크해봐야 한다.

### 10.2 데이터 전송 비용 구조 이해

- CloudFront → Internet: 전송량 기반 과금
- AWS Origin → CloudFront: 리전별로 할인/무료 구간 존재
- 글로벌 서비스일수록 CloudFront를 붙이는 게 거의 필수에 가깝다.

### 10.3 압축 & HTTP/2/3

- CloudFront는 Gzip/Brotli 압축을 지원한다.
- HTTP/2, HTTP/3 지원으로 다중 스트림, 헤더 압축 덕에 성능이 올라간다.
- 설정에서 "Compress objects automatically" 옵션을 잊지 말고 체크해 주자.

## 11. 마무리: CloudFront 설계 체크리스트

마지막으로, CloudFront 붙이기 전에 한 번씩 체크하면 좋은 질문들을 정리해봤다.

1. **어떤 Origin을 쓸 것인가?**

   - S3? ALB? EC2? 외부 도메인?

2. **경로별 Behavior를 어떻게 나눌 것인가?**

   - `/static/*`, `/api/*`, `/`, `/_next/*` 등

3. **캐시 정책(Cache Policy)을 어떻게 가져갈 것인가?**

   - 정적 리소스 TTL, HTML TTL, API 캐시 여부
   - 캐시 키에 포함할 헤더/쿼리/쿠키

4. **오리진 요청 정책(Origin Request Policy)은?**

   - 오리진에 꼭 전달해야 하는 헤더/쿼리/쿠키는 무엇인가?

5. **보안은 어떻게 할 것인가?**

   - S3는 OAC로 잠글 것인가?
   - ALB/EC2는 CloudFront에서만 접근 가능하게 할 것인가?
   - WAF 규칙은 어떤 것을 적용할 것인가?

6. **배포 전략은?**

   - 정적 파일에 해시를 붙일 것인가?
   - Invalidation은 언제, 어떻게 사용할 것인가?

7. **비용과 모니터링은?**

   - Cache Hit Rate, Data Transfer Out, 4xx/5xx 비율 모니터링
   - 로그를 S3/Kinesis/CloudWatch Logs로 어디에 쌓을지

---

CloudFront는 "S3 앞에 하나 붙여서 속도 빠르게 해주는 서비스" 수준에서 멈추기엔 너무 많은 기능과 설계 포인트를 가진 서비스다.

- 프론트 정적 배포
- SSR/SPA 혼합 구조
- API 백엔드
- 이미지/동영상 CDN

까지 전부 CloudFront 한 덩어리에서 다루게 되는 경우가 많다.

처음에는 설정 항목이 많아서 복잡해 보이지만, **"Behavior로 경로를 나눠서 각각 다른 정책을 쓴다"** 이 한 줄만 머릿속에 박아두고 나면 훨씬 단순해진다.
