---
date: "2026-05-21"
title: "Kubernetes Service / ClusterIP / Headless Service 정리"
categories: ["TIL", "Kubernetes", "Service", "StatefulSet", "ClusterIP"]
summary: "Deployment + 일반 Service(ClusterIP)와 StatefulSet + Headless Service의 차이점, 그리고 각각 어떤 상황에 쓰이는지 다이어그램과 함께 정리"
thumbnail: "/kubernetes.png"
---

# 개요

Kubernetes에서 Pod에 접근하기 위한 네트워크 추상화 계층인 **Service**는 유형에 따라 동작이 완전히 달라진다.
이 글에서는 `Deployment + ClusterIP Service`와 `StatefulSet + Headless Service` 두 가지 구조를 비교해 정리한다.

![아키텍처 다이어그램](/kubernetes-service.png)

---

## 핵심 개념 요약

| 개념                     | 역할                                   |
| ------------------------ | -------------------------------------- |
| Deployment / StatefulSet | Pod를 관리하는 컨트롤러                |
| Service                  | Pod에 접근하기 위한 네트워크 객체      |
| ClusterIP (일반 Service) | 복제 Pod들에 트래픽을 분산하는 가상 IP |
| Headless Service         | ClusterIP 없이 Pod의 DNS를 직접 제공   |

---

## 1. Deployment + 일반 Service (ClusterIP)

```
클러스터 내부 Client
        ↓
Service (ClusterIP: 10.96.9.10)  ← 라벨 매칭
        ↓ 로드밸런싱
  Pod A | Pod B | Pod C
```

### 특징

- `Deployment`는 Pod를 관리할 때 **이름보다 역할**이 중요하다.
  - Pod가 죽으면 새로운 이름으로 재생성되어도 무방하다 (A/B/C로 단순 구분)
- `Service`는 **ClusterIP(가상 IP)** 를 가지며, selector 라벨로 대상 Pod를 찾는다.
- 클라이언트는 개별 Pod IP를 몰라도 되고, **Service IP 하나로 통신**한다.
- 내부 kube-proxy가 트래픽을 살아있는 Pod들에 분산시킨다.

### 언제 쓰나

- 상태가 없는(Stateless) 애플리케이션 (웹 서버, API 서버 등)
- Pod가 어떤 것이어도 상관없고, 요청만 처리하면 되는 경우

### 예시 YAML

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 8080
  # type 생략 시 기본값 = ClusterIP
```

---

## 2. StatefulSet + Headless Service

```
클러스터 내부 Client
        ↓ DNS 조회 후 Pod에 직접 접근
postgres-0.default.svc.cluster.local
postgres-1.default.svc.cluster.local
postgres-2.default.svc.cluster.local
        ↓
  postgres-0 | postgres-1 | postgres-2
  (Container: PostgreSQL)
```

### 특징

- `StatefulSet`은 Pod에 **고정 이름과 정체성**을 부여한다.
  - Pod 이름이 `postgres-0`, `postgres-1`, `postgres-2`처럼 순서 있게 붙는다.
  - Pod가 재시작되어도 **같은 이름으로 복구**된다.
- `Headless Service`는 `clusterIP: None`으로 설정한다.
  - 가상 IP가 없으므로 트래픽 분산(로드밸런싱) 기능이 없다.
  - 대신 DNS 조회 시 **각 Pod의 IP를 직접 반환**한다.
- 클라이언트는 `<pod-name>.<service-name>.<namespace>.svc.cluster.local` 형태의 DNS로 **특정 Pod를 직접 지정**해 접근할 수 있다.

### 언제 쓰나

- 상태가 있는(Stateful) 애플리케이션 (DB, 메시지 큐, 분산 캐시 등)
- Pod마다 **역할이 다른 경우** (Primary / Replica 구분 등)
- **특정 Pod를 명시적으로 지정**해야 하는 경우

### 예시 YAML

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres
spec:
  clusterIP: None # ← Headless의 핵심
  selector:
    app: postgres
  ports:
    - port: 5432
```

---

## 일반 Service vs Headless Service 비교

| 항목       | 일반 Service (ClusterIP) | Headless Service         |
| ---------- | ------------------------ | ------------------------ |
| ClusterIP  | 있음 (가상 IP 할당)      | 없음 (`clusterIP: None`) |
| 로드밸런싱 | O (kube-proxy가 분산)    | X (Pod DNS 직접 반환)    |
| DNS 응답   | Service IP 반환          | 각 Pod IP 반환           |
| Pod 이름   | 랜덤 (hash suffix)       | 고정 순서 (0, 1, 2 ...)  |
| 컨트롤러   | Deployment               | StatefulSet              |
| 사용 사례  | Stateless 앱             | Stateful 앱 (DB 등)      |

---

## 핵심 정리

- **일반 Service + Deployment**: Pod가 누구든 상관없이 같은 역할만 하면 된다. Service가 트래픽을 알아서 분산한다.
- **Headless Service + StatefulSet**: Pod 하나하나가 고정 이름과 정체성을 가진다. 클라이언트가 DNS로 특정 Pod를 직접 찾아간다.
- Headless는 `clusterIP: None` 한 줄로 만들어지지만, 동작 방식이 완전히 달라진다.
- DB처럼 Primary/Replica 구분이 필요하거나, 데이터가 Pod에 종속된 경우에는 StatefulSet + Headless를 써야 한다.
