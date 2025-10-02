---
date: '2025-09-22'
title: 'GitHub Actions + AWS SES로 배포 알림 메일 받기'
categories: ['TIL', 'AWS', 'email']
summary: '외주 협업 환경에서 Slack/Teams 대신 이메일 기반 알림을 선택한 이유와 SES 통합 방법'
thumbnail: '/aws.png'
---

## 1. 문제 정의 (인트로)

GitHub Actions로 자동 배포를 하고 있는데, **배포 실패 시 바로 알림을 받고 싶다.**

보통은 Slack, Teams 같은 협업 툴에 Webhook을 붙여 알림을 받는다.  
하지만 이번 프로젝트에서는 상황이 조금 달랐다.  

- 사내 팀은 Teams를 쓰고 있었고, 외주 인력에게도 외부 파트너로 초대하려면 보안/계정 관리 이슈가 복잡해졌다.  
- 외주는 메신저보다 **메일을 통해 결과를 확인하는 흐름**을 선호했다.  

그래서 “모두가 공통적으로 접근 가능한 채널”인 **이메일**로 배포 결과를 알리기로 했다.  
AWS를 이미 쓰고 있었으므로, SES(Amazon Simple Email Service)를 활용하는 게 가장 간단했다.

---

## 2. SES 기본 개념 소개

Amazon SES란?

- AWS의 클라우드 이메일 발송 서비스.
- SMTP/SDK/CLI를 통해 발송 가능.

**Sandbox 모드 주의**  
- 기본은 검증된 이메일 주소끼리만 발송 가능.  
- 프로덕션 모드 전환하면 제한 해제.  

(블로그에는 콘솔 스크린샷: 자격 증명 생성, 메일 검증 화면)

---

## 3. SES 설정 과정

- **보내는 이메일(From) 주소 검증**  
  SES 콘솔 → *자격 증명* → 이메일 주소 추가 → 확인 메일 수락.

- **받는 이메일(To) 주소 검증**  
  Sandbox에서는 받는 주소도 검증 필요.

- **IAM Role 권한**  
  `ses:SendEmail` 권한 부여.

(스크린샷: “확인됨” 상태 표시된 이메일)

---

## 4. GitHub Actions에 통합

`.github/workflows/deploy.yml`에 SES 알림 스텝 추가.  
성공/실패 조건을 분기(`if: success()`, `if: failure()`).  
`aws ses send-email` CLI 사용.

예시 코드:

```yaml
- name: Send Email via SES (failure)
  if: failure()
  run: |
    BODY="Repository: ${{ github.repository }}%0AActor: ${{ github.actor }}"
    aws ses send-email \
      --region ap-northeast-2 \
      --from "noreply@mydomain.com" \
      --destination "ToAddresses=team@mydomain.com,qa@mydomain.com" \
      --subject "[FAILURE] EB 배포 실패: ${{ env.VERSION }}" \
      --text "$BODY"
