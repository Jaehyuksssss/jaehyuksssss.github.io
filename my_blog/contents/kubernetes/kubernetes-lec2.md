---
date: "2026-05-19"
title: "Kubernetes(k3d)로 Spring Boot 앱 배포하기"
categories: ["TIL", "Kubernetes", "k3d", "Docker", "SpringBoot"]
summary: "k3d 로컬 환경에서 Spring Boot + PostgreSQL을 Kubernetes에 배포하고 외부에서 접근하는 전체 흐름 정리"
thumbnail: "/kubernetes.png"
---

# 개요

Mac 로컬 환경에서 k3d를 이용해 Kubernetes 클러스터를 만들고, Spring Boot 애플리케이션과 PostgreSQL을 배포해 외부에서 접근 가능하도록 구성

---

## 전체 아키텍처

<img src="/images/kube-2.png" alt="전체 아키텍처" style="width: 100%; max-width: 768px;" />

```
[브라우저 192.168.0.31:30001]
        ↓ 요청
[Mac Host - Docker (k3d)]
        ↓ 포트 매핑 (30001:30001@loadbalancer)
[k3d LoadBalancer]
        ↓
[kube-proxy]
        ↓
[spring-hello-svc NodePort:30001]
        ↓ 로드밸런싱
[spring-hello Pod 1/2/3 :8080]
        ↓ DB 쿼리
[postgres-svc ClusterIP:5432]
        ↓
[postgres Pod :5432]
```

---

## 1. k3d 클러스터 생성

k3d는 노드가 Docker 컨테이너 안에서 실행된다. 일반 AWS EC2 환경과 달리 노드 IP(`172.21.0.x`)가 Docker 내부 가상 네트워크에 갇혀있어 Mac 밖에서 접근이 불가능하다.

그래서 클러스터 생성 시 반드시 `--port` 옵션으로 포트 매핑을 해줘야 한다.

```bash
k3d cluster create my-cluster \
  --port "30001:30001@loadbalancer" \
  -a 2
```

- `--port "30001:30001@loadbalancer"`: Mac 호스트 30001 → k3d LoadBalancer 30001 포트 매핑
- `-a 2`: Worker Node 2개 생성 (agent = Worker Node)

```bash
# 생성 확인
k3d cluster list
kubectl get nodes
docker ps  # 0.0.0.0:30001->30001/tcp 확인
```

---

## 2. Docker 이미지 빌드 & 푸시

Kubernetes는 Pod를 생성할 때 Docker Hub에서 이미지를 가져다 쓴다. 그래서 배포 전에 이미지를 빌드하고 Docker Hub에 푸시해야 한다.

```bash
cd ~/dev/k8s-assignment/spring-app

docker build -t jaehyuksssss/spring-hello-world:1.1 .
docker push jaehyuksssss/spring-hello-world:1.1
```

`deployment.yaml`에서 이 이미지를 참조한다:

```yaml
image: jaehyuksssss/spring-hello-world:1.1
```

---

## 3. Kubernetes에 배포

### Kubernetes 내부 배포 흐름

`kubectl apply` 명령어를 실행하면 아래 흐름으로 Pod가 생성된다:

```
kubectl apply
→ API Server (요청 수신)
→ etcd (원하는 상태 저장)
→ Controller Manager (Pod 필요 감지)
→ Scheduler (Worker Node 배치 결정)
→ Kubelet (Pod 실행)
→ Pod 생성 완료
```

### 배포 명령어

PostgreSQL을 먼저 배포하는 이유는 Spring Boot 앱이 시작할 때 DB 연결을 시도하기 때문이다.

```bash
kubectl apply -f ~/dev/k8s-assignment/session2/k8s/postgres.yaml
kubectl apply -f ~/dev/k8s-assignment/session2/k8s/deployment.yaml

# 확인
kubectl get pods
kubectl get deployment
kubectl get rs   # ReplicaSet 확인
```

---

## 4. Service 구성

### NodePort (외부 접근용)

`spring-hello-svc`는 NodePort 타입으로 외부에서 30001 포트로 접근 가능하다.

```yaml
spec:
  type: NodePort
  selector:
    app: spring-hello
  ports:
    - port: 80
      targetPort: 8080
      nodePort: 30001
```

### ClusterIP (내부 통신 전용)

`postgres-svc`는 ClusterIP 타입으로 클러스터 내부에서만 접근 가능하다. DB를 외부에 노출하지 않는 안전한 구조다.

Spring Boot 앱은 Pod IP가 아닌 Service 이름으로 DB에 접근한다:

```yaml
env:
  - name: DB_HOST
    value: postgres-svc # Service 이름으로 접근
```

이렇게 하면 PostgreSQL Pod가 재시작되어 IP가 바뀌어도 안정적으로 DB에 접근할 수 있다.

```bash
# 서비스 확인
kubectl get svc
# spring-hello-svc → NodePort  80:30001/TCP
# postgres-svc     → ClusterIP 5432/TCP
```

---

## 5. 동작 확인

```bash
# 브라우저에서 접속
# http://192.168.0.31:30001        → Spring Boot 메인
# http://192.168.0.31:30001/items  → DB 연동 확인
```

---

## 6. 수평 스케일 아웃 (Horizontal Scale Out)

Pod를 1개에서 3개로 늘려 로드밸런싱 구조를 만든다. `spring-hello-svc`가 3개의 Pod로 트래픽을 분산한다.

```bash
kubectl scale deployment spring-hello --replicas=3
kubectl get pods
```

```
spring-hello-svc
→ spring-hello Pod 1 :8080
→ spring-hello Pod 2 :8080
→ spring-hello Pod 3 :8080
(트래픽 분산)
```

---

## Kubernetes 주요 컴포넌트 정리

### Master Node (Control Plane)

| 컴포넌트           | 역할                                             |
| ------------------ | ------------------------------------------------ |
| API Server         | 모든 요청의 관문. kubectl 명령어가 여기로 전달됨 |
| etcd               | 클러스터 상태 저장소                             |
| Controller Manager | 원하는 상태 유지 (Pod 수 감시 및 복구)           |
| Scheduler          | 새 Pod를 어느 Worker Node에 배치할지 결정        |

### Worker Node

| 컴포넌트          | 역할                                       |
| ----------------- | ------------------------------------------ |
| Kubelet           | Pod가 정상 실행되도록 관리                 |
| Kube-proxy        | Service로 들어온 트래픽을 Pod로 전달       |
| Container Runtime | 실제 컨테이너를 실행하는 엔진 (containerd) |

---

## 핵심 정리

- k3d는 노드가 Docker 컨테이너 안에 있어서 **클러스터 생성 시 포트 매핑 필수**
- **NodePort**: 외부 접근용 / **ClusterIP**: 내부 통신 전용
- Service를 사용하는 이유: Pod IP는 재시작 시 바뀌기 때문에 고정 엔드포인트 필요
- Deployment로 배포하면 Pod가 죽어도 자동으로 재생성됨
