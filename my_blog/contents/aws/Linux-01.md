---
date: '2025-09-03'
title: '리눅스 공부'
categories: ['Linux', 'AWS']
summary: '리눅스 공부'
thumbnail: '/my-Gatsby-blog/aws.png'
---
# AWS SSH 키 등록 및 EC2 접속 방법

AWS EC2 인스턴스에 접속하기 위한 SSH 키 생성 및 등록 방법에 대해 알아보겠습니다.

## 1. SSH 키 생성

AWS 콘솔에서 키페어를 다운받을 수 있지만, 직접 SSH 키를 생성해서 EC2에 등록해보겠습니다.

### 로컬에서 SSH 키 생성
```bash
ssh-keygen -t rsa -b 4096 -f ~/.ssh/my-aws-key
```

![SSH 키 생성 결과](/my-Gatsby-blog/images/pemkey.png)

### 생성된 키 파일 확인
```bash
ls -la ~/.ssh/
```

생성된 파일들:
- `my-aws-key`: 개인키 (Private Key)
- `my-aws-key.pub`: 공개키 (Public Key)

## 2. AWS EC2에 공개키 등록

### 2.1 공개키 내용 복사
```bash
cat ~/.ssh/my-aws-key.pub
```

### 2.2 AWS 콘솔에서 키페어 등록
1. AWS EC2 콘솔 접속
2. 좌측 메뉴에서 "Key Pairs" 선택
3. "Import key pair" 클릭
4. 키 이름 입력 (예: my-aws-key)
5. 공개키 내용 붙여넣기
6. "Import" 클릭

## 3. EC2 인스턴스 생성

### 3.1 인스턴스 시작
1. EC2 대시보드에서 "Launch Instance" 클릭
2. AMI 선택 (Amazon Linux 2 또는 Ubuntu)
3. 인스턴스 타입 선택 (t2.micro 권장)
4. 키 페어 선택에서 방금 등록한 키 선택
5. 보안 그룹 설정 (SSH 포트 22번 열기)
6. 인스턴스 시작

### 3.2 인스턴스 정보 확인
- 퍼블릭 IP 주소 확인
- 인스턴스 상태가 "running"인지 확인

## 4. SSH로 EC2 접속

### 4.1 기본 접속 명령
```bash
ssh -i ~/.ssh/my-aws-key ec2-user@[퍼블릭-IP-주소]
```

### 4.2 접속 예시
```bash
ssh -i ~/.ssh/my-aws-key ec2-user@3.34.123.456
```

### 4.3 첫 접속 시 주의사항
- "Are you sure you want to continue connecting (yes/no)?" 메시지가 나오면 `yes` 입력
- 호스트 키가 자동으로 `~/.ssh/known_hosts`에 추가됨

## 5. SSH 설정 최적화

### 5.1 SSH 설정 파일 생성
```bash
# ~/.ssh/config 파일 생성
Host aws-server
    HostName [퍼블릭-IP-주소]
    User ec2-user
    IdentityFile ~/.ssh/my-aws-key
    IdentitiesOnly yes
```

### 5.2 간편한 접속
설정 파일 생성 후 다음과 같이 간단하게 접속 가능:
```bash
ssh aws-server
```

## 6. 보안 설정

### 6.1 키 파일 권한 설정
```bash
chmod 600 ~/.ssh/my-aws-key
chmod 644 ~/.ssh/my-aws-key.pub
```

### 6.2 SSH 에이전트 사용
```bash
# SSH 에이전트에 키 추가
ssh-add ~/.ssh/my-aws-key

# 에이전트에 등록된 키 확인
ssh-add -l
```

## 7. 문제 해결

### 7.1 권한 오류
```
Permissions 0644 for 'my-aws-key' are too open
```
**해결방법**: `chmod 600 ~/.ssh/my-aws-key`

### 7.2 연결 거부 오류
```
Connection refused
```
**해결방법**: 
- 보안 그룹에서 SSH 포트(22) 열려있는지 확인
- 인스턴스가 실행 중인지 확인

### 7.3 호스트 키 검증 실패
```
Host key verification failed
```
**해결방법**: 
```bash
ssh-keygen -R [퍼블릭-IP-주소]
```

## 8. 추가

- **키 로테이션**: 보안을 위해 주기적으로 SSH 키 교체
- **다중 키 관리**: 여러 서버에 대해 다른 키 사용 권장
- **백업**: 개인키는 안전한 곳에 백업 보관

