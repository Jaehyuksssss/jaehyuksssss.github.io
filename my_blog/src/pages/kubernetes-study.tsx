import React, { useState } from "react"
import styled from "@emotion/styled"
import Template from "components/Common/Template"

// ─── Data ────────────────────────────────────────────────────────────────────

const QUIZ_DATA = [
  { q: "Pod란 무엇인가?", a: "Kubernetes에서 배포 가능한 가장 작은 단위. 하나 이상의 컨테이너 묶음으로 같은 네트워크와 스토리지를 공유한다." },
  { q: "Deployment가 하는 역할은?", a: "Pod의 원하는 상태(replicas, image 등)를 선언적으로 관리. Pod가 죽으면 자동으로 재생성한다." },
  { q: "ClusterIP Service란?", a: "클러스터 내부에서만 접근 가능한 가상 IP. Pod들에 트래픽을 로드밸런싱하며 기본 Service 타입이다." },
  { q: "NodePort Service란?", a: "각 Node의 특정 포트(30000-32767)를 열어 외부에서 접근 가능하게 한다." },
  { q: "Headless Service란?", a: "clusterIP: None으로 설정. 가상 IP 없이 DNS가 각 Pod IP를 직접 반환한다. StatefulSet과 함께 사용." },
  { q: "StatefulSet vs Deployment 차이는?", a: "StatefulSet은 Pod에 고정 이름(pod-0, pod-1...)과 정체성을 부여. 재시작해도 같은 이름으로 복구된다." },
  { q: "etcd의 역할은?", a: "분산 키-값 저장소로 클러스터의 모든 상태를 저장한다. API Server만 직접 접근한다." },
  { q: "Scheduler가 하는 일은?", a: "새로운 Pod를 어느 Worker Node에 배치할지 결정한다. 리소스 가용량, affinity 등을 고려한다." },
  { q: "kubectl apply vs create 차이?", a: "apply는 선언적 — 이미 있으면 업데이트, 없으면 생성. create는 명령적 — 이미 있으면 에러가 난다." },
  { q: "ReplicaSet의 역할은?", a: "지정된 수의 Pod 복제본이 항상 실행되도록 보장. Deployment가 내부적으로 생성·관리한다." },
  { q: "ConfigMap vs Secret 차이는?", a: "ConfigMap은 일반 설정값(문자열)을 저장. Secret은 비밀번호·토큰 등 민감 데이터를 Base64로 인코딩해 저장한다." },
  { q: "PersistentVolume(PV)이란?", a: "클러스터 수준의 스토리지 리소스. Pod 생명주기와 독립적으로 존재해 Pod가 삭제돼도 데이터가 유지된다." },
  { q: "Namespace의 용도는?", a: "클러스터를 논리적으로 분리하는 단위. 팀/환경(dev·staging·prod)별 리소스 격리에 사용한다." },
  { q: "DaemonSet이란?", a: "모든 노드(또는 특정 노드)에 Pod 하나씩 배포하는 컨트롤러. 로그 수집, 모니터링 에이전트 등에 사용." },
  { q: "Ingress란?", a: "HTTP/HTTPS 트래픽을 클러스터 내부 Service로 라우팅하는 규칙. 도메인/경로 기반 라우팅, TLS 종료를 담당한다." },
]

const NODE_INFO: Record<string, { title: string; desc: string; color: string }> = {
  "api-server": { title: "API Server", color: "#185FA5", desc: "모든 요청의 관문. kubectl 명령어가 여기로 전달되고 인증/인가를 처리한 뒤 etcd와 통신한다." },
  etcd: { title: "etcd", color: "#185FA5", desc: "분산 키-값 저장소. 클러스터의 모든 상태(원하는 상태·현재 상태)를 저장하며 API Server만 직접 접근한다." },
  scheduler: { title: "Scheduler", color: "#185FA5", desc: "새 Pod를 어느 Worker Node에 배치할지 결정한다. 리소스 가용량, affinity, taints/tolerations 등을 고려한다." },
  controller: { title: "Controller Manager", color: "#185FA5", desc: "원하는 상태와 현재 상태를 비교해 일치시킨다. Deployment, ReplicaSet, Node 등 각 컨트롤러를 실행한다." },
  kubelet: { title: "Kubelet", color: "#0F6E56", desc: "Worker Node에서 실행되는 에이전트. API Server로부터 Pod 명세를 받아 컨테이너를 실행하고 상태를 보고한다." },
  "kube-proxy": { title: "Kube-proxy", color: "#0F6E56", desc: "Service로 들어온 트래픽을 적절한 Pod로 라우팅한다. iptables/ipvs 규칙을 관리한다." },
  runtime: { title: "Container Runtime", color: "#0F6E56", desc: "실제 컨테이너를 실행하는 엔진. containerd, CRI-O 등이 있으며 Docker는 더 이상 직접 사용하지 않는다." },
  pod: { title: "Pod", color: "#533AB7", desc: "Kubernetes 최소 배포 단위. 하나 이상의 컨테이너가 네트워크와 스토리지를 공유한다. IP가 재시작 시 바뀐다." },
  deployment: { title: "Deployment", color: "#533AB7", desc: "Stateless 앱을 선언적으로 관리. 롤링 업데이트, 롤백, 스케일 아웃을 지원하며 내부적으로 ReplicaSet을 생성한다." },
  service: { title: "Service", color: "#533AB7", desc: "Pod 집합에 대한 고정 접근점. ClusterIP(내부), NodePort(외부 포트), LoadBalancer(클라우드 LB) 타입이 있다." },
  statefulset: { title: "StatefulSet", color: "#533AB7", desc: "Stateful 앱 관리. Pod에 고정 이름(0,1,2...)과 정체성을 부여. Headless Service와 함께 개별 Pod DNS를 제공한다." },
}

const TERMS = [
  { name: "Pod", badge: "워크로드", bc: "#E6F1FB", tc: "#0C447C", desc: "Kubernetes 최소 배포 단위. 하나 이상의 컨테이너 묶음." },
  { name: "Deployment", badge: "워크로드", bc: "#E6F1FB", tc: "#0C447C", desc: "Stateless 앱의 선언적 관리. ReplicaSet을 통해 Pod를 유지한다." },
  { name: "StatefulSet", badge: "워크로드", bc: "#E6F1FB", tc: "#0C447C", desc: "Stateful 앱 관리. Pod에 순서와 고정 정체성을 부여한다." },
  { name: "DaemonSet", badge: "워크로드", bc: "#E6F1FB", tc: "#0C447C", desc: "모든 (또는 특정) Node에 Pod 하나씩 실행되도록 보장한다." },
  { name: "ReplicaSet", badge: "워크로드", bc: "#E6F1FB", tc: "#0C447C", desc: "지정된 수의 Pod 복제본 유지. Deployment가 내부적으로 생성·관리한다." },
  { name: "Service", badge: "네트워크", bc: "#E1F5EE", tc: "#085041", desc: "Pod 집합에 대한 고정 네트워크 엔드포인트. ClusterIP, NodePort, LoadBalancer 타입." },
  { name: "Ingress", badge: "네트워크", bc: "#E1F5EE", tc: "#085041", desc: "HTTP/HTTPS 트래픽을 클러스터 내부 Service로 라우팅하는 규칙." },
  { name: "ClusterIP", badge: "네트워크", bc: "#E1F5EE", tc: "#085041", desc: "클러스터 내부에서만 접근 가능한 가상 IP. Service의 기본 타입." },
  { name: "NodePort", badge: "네트워크", bc: "#E1F5EE", tc: "#085041", desc: "각 Node의 특정 포트(30000-32767)를 열어 외부 접근을 허용한다." },
  { name: "Headless Service", badge: "네트워크", bc: "#E1F5EE", tc: "#085041", desc: "clusterIP: None. 가상 IP 없이 Pod IP를 DNS로 직접 반환한다." },
  { name: "ConfigMap", badge: "설정", bc: "#FAEEDA", tc: "#633806", desc: "설정 데이터를 키-값으로 저장. 컨테이너에 env나 볼륨으로 주입." },
  { name: "Secret", badge: "설정", bc: "#FAEEDA", tc: "#633806", desc: "민감한 데이터(비밀번호, 토큰 등)를 Base64로 저장." },
  { name: "PersistentVolume", badge: "스토리지", bc: "#EEEDFE", tc: "#3C3489", desc: "클러스터 수준의 스토리지 리소스. Pod 생명주기와 독립적으로 존재한다." },
  { name: "PVC", badge: "스토리지", bc: "#EEEDFE", tc: "#3C3489", desc: "PersistentVolumeClaim. 사용자가 PV를 요청하는 방법." },
  { name: "Namespace", badge: "클러스터", bc: "#F1EFE8", tc: "#444441", desc: "클러스터를 논리적으로 분리하는 단위. 팀/환경별 격리에 사용." },
  { name: "kubectl", badge: "도구", bc: "#FAECE7", tc: "#993C1D", desc: "Kubernetes API와 통신하는 CLI 도구. apply, get, describe, delete 등의 명령어 제공." },
]

const SCENARIOS = [
  {
    label: "Spring Boot 배포",
    steps: [
      { title: "클러스터 생성", desc: "k3d로 로컬 Kubernetes 클러스터를 생성한다. 포트 매핑으로 외부 접근을 허용한다.", cmd: `k3d cluster create my-cluster \\\n  --port "30001:30001@loadbalancer" \\\n  -a 2` },
      { title: "Docker 이미지 빌드 & 푸시", desc: "앱 이미지를 빌드하고 Docker Hub에 푸시한다.", cmd: `docker build -t myuser/spring-app:1.0 .\ndocker push myuser/spring-app:1.0` },
      { title: "Deployment 배포", desc: "kubectl apply로 Pod와 ReplicaSet을 생성한다.", cmd: `kubectl apply -f deployment.yaml\nkubectl get pods` },
      { title: "Service 생성 (NodePort)", desc: "외부에서 30001 포트로 접근 가능하게 NodePort Service를 생성한다.", cmd: `kubectl apply -f service.yaml\nkubectl get svc` },
      { title: "동작 확인", desc: "curl 또는 브라우저로 접근해 앱이 정상 동작하는지 확인한다.", cmd: `curl http://localhost:30001` },
    ],
  },
  {
    label: "수평 스케일 아웃",
    steps: [
      { title: "현재 상태 확인", desc: "실행 중인 Pod와 Deployment를 확인한다.", cmd: `kubectl get pods\nkubectl get deployment` },
      { title: "replicas 증가", desc: "scale 명령어로 Pod를 3개로 늘린다.", cmd: `kubectl scale deployment my-app --replicas=3` },
      { title: "스케일 아웃 확인", desc: "새 Pod가 생성되는 것을 실시간으로 확인한다.", cmd: `kubectl get pods -w` },
      { title: "로드밸런싱 확인", desc: "Service가 3개 Pod로 트래픽을 분산하는지 확인한다.", cmd: `kubectl describe svc my-service` },
    ],
  },
  {
    label: "StatefulSet + DB",
    steps: [
      { title: "Headless Service 생성", desc: "clusterIP: None으로 Headless Service를 먼저 생성한다.", cmd: `kubectl apply -f headless-service.yaml\n# spec:\n#   clusterIP: None` },
      { title: "StatefulSet 배포", desc: "PostgreSQL StatefulSet을 배포한다. Pod가 순서대로 생성된다.", cmd: `kubectl apply -f statefulset.yaml\nkubectl get pods\n# postgres-0, postgres-1, postgres-2` },
      { title: "DNS로 Pod 접근", desc: "각 Pod는 고정 DNS로 직접 접근할 수 있다.", cmd: `# postgres-0.postgres.default.svc.cluster.local\n# postgres-1.postgres.default.svc.cluster.local` },
      { title: "상태 확인", desc: "StatefulSet과 각 Pod의 상태를 확인한다.", cmd: `kubectl get statefulset\nkubectl describe pod postgres-0` },
    ],
  },
]

// ─── Styled Components ───────────────────────────────────────────────────────

const Wrap = styled.div`
  max-width: 760px;
  padding: 0 16px 60px;
`

const PageTitle = styled.h1`
  font-size: 22px;
  font-weight: 500;
  margin-bottom: 1.5rem;
  color: #111;
`

const TabBar = styled.div`
  display: flex;
  gap: 2px;
  border-bottom: 1px solid #e5e5e0;
  margin-bottom: 1.5rem;
  overflow-x: auto;
`

const Tab = styled.button<{ active: boolean }>`
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  border: none;
  background: none;
  color: ${p => (p.active ? "#111" : "#888")};
  border-bottom: 2px solid ${p => (p.active ? "#111" : "transparent")};
  font-weight: ${p => (p.active ? 600 : 400)};
  white-space: nowrap;
  font-family: inherit;
  transition: color 0.15s;
  &:hover:not([data-active]) {
    color: #111;
  }
`

// Quiz
const CardWrap = styled.div`
  height: 180px;
  cursor: pointer;
  perspective: 1000px;
  margin-bottom: 1rem;
`

const CardInner = styled.div<{ flipped: boolean }>`
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.4s;
  transform: ${p => (p.flipped ? "rotateY(180deg)" : "none")};
`

const CardFace = styled.div<{ back?: boolean }>`
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid #e5e5e0;
  background: ${p => (p.back ? "#f5f5f2" : "#fff")};
  transform: ${p => (p.back ? "rotateY(180deg)" : "none")};
  text-align: center;
`

const ScoreRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.875rem;
`

const Badge = styled.span<{ bg: string; color: string }>`
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 99px;
  background: ${p => p.bg};
  color: ${p => p.color};
`

const BtnRow = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
`

const Btn = styled.button<{ variant?: "green" | "red" | "default" }>`
  flex: 1;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  border: 1px solid
    ${p =>
      p.variant === "green"
        ? "#639922"
        : p.variant === "red"
        ? "#A32D2D"
        : "#d0d0cc"};
  background: ${p =>
    p.variant === "green"
      ? "#EAF3DE"
      : p.variant === "red"
      ? "#FCEBEB"
      : "#fff"};
  color: ${p =>
    p.variant === "green"
      ? "#3B6D11"
      : p.variant === "red"
      ? "#A32D2D"
      : "#111"};
  &:hover {
    filter: brightness(0.96);
  }
`

// Diagram
const ZoneBox = styled.div<{ borderColor: string; bgColor: string }>`
  border: 1px solid ${p => p.borderColor};
  border-radius: 12px;
  padding: 0.875rem;
  margin-bottom: 10px;
  background: ${p => p.bgColor};
`

const ZoneLabel = styled.p<{ color: string }>`
  font-size: 11px;
  font-weight: 600;
  color: ${p => p.color};
  margin-bottom: 8px;
`

const NodeGrid = styled.div<{ cols?: number }>`
  display: grid;
  grid-template-columns: repeat(${p => p.cols ?? 4}, 1fr);
  gap: 6px;
  margin-bottom: 6px;
`

const NodeBtn = styled.button<{ selected: boolean }>`
  padding: 9px 6px;
  border-radius: 8px;
  border: 1px solid ${p => (p.selected ? "#378ADD" : "#e5e5e0")};
  background: ${p => (p.selected ? "#E6F1FB" : "#fff")};
  color: ${p => (p.selected ? "#185FA5" : "#111")};
  font-size: 12px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  text-align: center;
  transition: all 0.15s;
  &:hover {
    background: ${p => (p.selected ? "#E6F1FB" : "#f5f5f2")};
  }
`

const InfoBox = styled.div`
  margin-top: 0.875rem;
  padding: 1rem 1.125rem;
  border-radius: 12px;
  border: 1px solid #e5e5e0;
  background: #f5f5f2;
  min-height: 72px;
`

// Glossary
const SearchInput = styled.input`
  width: 100%;
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid #d0d0cc;
  border-radius: 8px;
  background: #fff;
  font-family: inherit;
  margin-bottom: 0.875rem;
  &:focus {
    outline: none;
    border-color: #378ADD;
  }
`

const TermItem = styled.div`
  padding: 10px 0;
  border-bottom: 1px solid #e5e5e0;
`

const TermBadge = styled.span<{ bg: string; color: string }>`
  display: inline-block;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 99px;
  background: ${p => p.bg};
  color: ${p => p.color};
  margin-bottom: 3px;
`

// Scenario
const ScBtnRow = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 1rem;
  flex-wrap: wrap;
`

const ScBtn = styled.button<{ active: boolean }>`
  padding: 6px 14px;
  font-size: 13px;
  border-radius: 8px;
  border: 1px solid ${p => (p.active ? "#378ADD" : "#d0d0cc")};
  background: ${p => (p.active ? "#E6F1FB" : "#fff")};
  color: ${p => (p.active ? "#185FA5" : "#111")};
  font-family: inherit;
  cursor: pointer;
  font-weight: ${p => (p.active ? 600 : 400)};
`

const ProgressBar = styled.div`
  height: 4px;
  background: #e5e5e0;
  border-radius: 99px;
  margin-bottom: 1.25rem;
`

const ProgressFill = styled.div<{ pct: number }>`
  height: 100%;
  border-radius: 99px;
  background: #378ADD;
  width: ${p => p.pct}%;
  transition: width 0.3s;
`

const StepRow = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 1rem;
`

const StepNum = styled.div<{ state: "done" | "active" | "pending" }>`
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
  border: 1px solid
    ${p =>
      p.state === "done"
        ? "#639922"
        : p.state === "active"
        ? "#378ADD"
        : "#d0d0cc"};
  background: ${p =>
    p.state === "done"
      ? "#EAF3DE"
      : p.state === "active"
      ? "#E6F1FB"
      : "#f5f5f2"};
  color: ${p =>
    p.state === "done"
      ? "#3B6D11"
      : p.state === "active"
      ? "#185FA5"
      : "#999"};
`

const CmdBlock = styled.pre`
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 12px;
  background: #1a1a1a;
  color: #e5e5e0;
  padding: 10px 14px;
  border-radius: 8px;
  margin-top: 8px;
  white-space: pre;
  overflow-x: auto;
  line-height: 1.6;
`

// ─── Sub-components ──────────────────────────────────────────────────────────

const QuizPanel: React.FC = () => {
  const [cur, setCur] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)

  const go = (next: number) => {
    setCur((next + QUIZ_DATA.length) % QUIZ_DATA.length)
    setFlipped(false)
  }

  const mark = (ok: boolean) => {
    if (ok) setCorrect(c => c + 1)
    else setWrong(w => w + 1)
    go(cur + 1)
  }

  return (
    <div>
      <ScoreRow>
        <span style={{ fontSize: 13, color: "#888" }}>{cur + 1} / {QUIZ_DATA.length}</span>
        <div style={{ display: "flex", gap: 8 }}>
          <Badge bg="#EAF3DE" color="#3B6D11">✓ {correct}</Badge>
          <Badge bg="#FCEBEB" color="#A32D2D">✗ {wrong}</Badge>
        </div>
      </ScoreRow>

      <CardWrap onClick={() => setFlipped(f => !f)}>
        <CardInner flipped={flipped}>
          <CardFace>
            <div>
              <p style={{ fontSize: 11, color: "#aaa", marginBottom: 10 }}>클릭해서 정답 확인 👆</p>
              <p style={{ fontSize: 17, fontWeight: 500, lineHeight: 1.5 }}>{QUIZ_DATA[cur].q}</p>
            </div>
          </CardFace>
          <CardFace back>
            <div>
              <p style={{ fontSize: 11, color: "#aaa", marginBottom: 10 }}>정답</p>
              <p style={{ fontSize: 14, lineHeight: 1.7 }}>{QUIZ_DATA[cur].a}</p>
            </div>
          </CardFace>
        </CardInner>
      </CardWrap>

      <BtnRow>
        <Btn variant="green" onClick={() => mark(true)}>✓ 알았어요</Btn>
        <Btn variant="red" onClick={() => mark(false)}>✗ 몰랐어요</Btn>
      </BtnRow>
      <BtnRow>
        <Btn onClick={() => go(cur - 1)}>← 이전</Btn>
        <Btn onClick={() => go(cur + 1)}>다음 →</Btn>
      </BtnRow>
    </div>
  )
}

const DiagramPanel: React.FC = () => {
  const [selected, setSelected] = useState<string | null>(null)

  const controlPlane = ["api-server", "etcd", "scheduler", "controller"]
  const workerTop = ["kubelet", "kube-proxy", "runtime"]
  const workerBottom = ["pod", "deployment", "service", "statefulset"]

  const labels: Record<string, string> = {
    "api-server": "🖥 API Server",
    etcd: "🗄 etcd",
    scheduler: "📅 Scheduler",
    controller: "🔄 Controller",
    kubelet: "⚙️ Kubelet",
    "kube-proxy": "🔀 Kube-proxy",
    runtime: "📦 Runtime",
    pod: "🟦 Pod",
    deployment: "🚀 Deployment",
    service: "🌐 Service",
    statefulset: "🗃 StatefulSet",
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: "#888", marginBottom: "0.875rem" }}>컴포넌트를 클릭하면 설명을 볼 수 있어요</p>

      <ZoneBox borderColor="#B5D4F4" bgColor="rgba(230,241,251,0.2)">
        <ZoneLabel color="#185FA5">Control Plane (Master Node)</ZoneLabel>
        <NodeGrid cols={4}>
          {controlPlane.map(id => (
            <NodeBtn key={id} selected={selected === id} onClick={() => setSelected(id)}>
              {labels[id]}
            </NodeBtn>
          ))}
        </NodeGrid>
      </ZoneBox>

      <ZoneBox borderColor="#9FE1CB" bgColor="rgba(225,245,238,0.2)">
        <ZoneLabel color="#0F6E56">Worker Nodes</ZoneLabel>
        <NodeGrid cols={3}>
          {workerTop.map(id => (
            <NodeBtn key={id} selected={selected === id} onClick={() => setSelected(id)}>
              {labels[id]}
            </NodeBtn>
          ))}
        </NodeGrid>
        <NodeGrid cols={4}>
          {workerBottom.map(id => (
            <NodeBtn key={id} selected={selected === id} onClick={() => setSelected(id)}>
              {labels[id]}
            </NodeBtn>
          ))}
        </NodeGrid>
      </ZoneBox>

      <InfoBox>
        {selected && NODE_INFO[selected] ? (
          <>
            <p style={{ fontSize: 14, fontWeight: 600, color: NODE_INFO[selected].color, marginBottom: 6 }}>
              {NODE_INFO[selected].title}
            </p>
            <p style={{ fontSize: 13, color: "#555", lineHeight: 1.7 }}>
              {NODE_INFO[selected].desc}
            </p>
          </>
        ) : (
          <p style={{ fontSize: 13, color: "#aaa" }}>컴포넌트를 선택하면 설명이 표시됩니다.</p>
        )}
      </InfoBox>
    </div>
  )
}

const GlossaryPanel: React.FC = () => {
  const [query, setQuery] = useState("")
  const filtered = TERMS.filter(
    t =>
      t.name.toLowerCase().includes(query.toLowerCase()) ||
      t.desc.includes(query)
  )

  return (
    <div>
      <SearchInput
        type="text"
        placeholder="용어 검색..."
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      {filtered.length === 0 ? (
        <p style={{ fontSize: 13, color: "#aaa", padding: "0.75rem 0" }}>검색 결과가 없습니다.</p>
      ) : (
        filtered.map(t => (
          <TermItem key={t.name}>
            <TermBadge bg={t.bc} color={t.tc}>{t.badge}</TermBadge>
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>{t.name}</p>
            <p style={{ fontSize: 13, color: "#666", lineHeight: 1.6 }}>{t.desc}</p>
          </TermItem>
        ))
      )}
    </div>
  )
}

const ScenarioPanel: React.FC = () => {
  const [scIdx, setScIdx] = useState(0)
  const [step, setStep] = useState(0)

  const sc = SCENARIOS[scIdx]
  const pct = Math.round((step / sc.steps.length) * 100)
  const done = step >= sc.steps.length

  const handleScenario = (idx: number) => {
    setScIdx(idx)
    setStep(0)
  }

  return (
    <div>
      <ScBtnRow>
        {SCENARIOS.map((s, i) => (
          <ScBtn key={i} active={scIdx === i} onClick={() => handleScenario(i)}>
            {s.label}
          </ScBtn>
        ))}
      </ScBtnRow>

      <ProgressBar>
        <ProgressFill pct={done ? 100 : pct} />
      </ProgressBar>

      {sc.steps.map((s, i) => {
        const state = i < step ? "done" : i === step ? "active" : "pending"
        return (
          <StepRow key={i}>
            <StepNum state={state}>
              {i < step ? "✓" : i + 1}
            </StepNum>
            <div style={{ flex: 1, opacity: i <= step ? 1 : 0.35 }}>
              <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>{s.title}</p>
              {i <= step && (
                <>
                  <p style={{ fontSize: 13, color: "#555", lineHeight: 1.6 }}>{s.desc}</p>
                  <CmdBlock>{s.cmd}</CmdBlock>
                </>
              )}
            </div>
          </StepRow>
        )
      })}

      <Btn
        style={{ marginTop: "0.75rem", maxWidth: 160 }}
        onClick={() => !done && setStep(s => s + 1)}
        disabled={done}
      >
        {done ? "완료 ✓" : "다음 단계 →"}
      </Btn>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

type TabId = "quiz" | "diagram" | "glossary" | "scenario"

const TABS: { id: TabId; label: string }[] = [
  { id: "quiz", label: "🃏 퀴즈" },
  { id: "diagram", label: "🗺 다이어그램" },
  { id: "glossary", label: "📖 용어사전" },
  { id: "scenario", label: "💻 시나리오" },
]

const KubernetesStudyPage: React.FC = () => {
  const [tab, setTab] = useState<TabId>("quiz")

  return (
    <Template
      title="Kubernetes 학습 프로그램"
      description="플래시카드 퀴즈, 인터랙티브 다이어그램, 용어사전, 시나리오 학습으로 Kubernetes를 마스터하세요"
      url="/kubernetes-study"
    >
      <Wrap>
        <PageTitle>⎈ Kubernetes 학습 프로그램</PageTitle>

        <TabBar>
          {TABS.map(t => (
            <Tab key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>
              {t.label}
            </Tab>
          ))}
        </TabBar>

        {tab === "quiz" && <QuizPanel />}
        {tab === "diagram" && <DiagramPanel />}
        {tab === "glossary" && <GlossaryPanel />}
        {tab === "scenario" && <ScenarioPanel />}
      </Wrap>
    </Template>
  )
}

export default KubernetesStudyPage
