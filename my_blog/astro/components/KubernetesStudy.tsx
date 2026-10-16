import { useMemo, useState } from 'react'

type TabId = 'incidents' | 'request-path' | 'runbook' | 'review'

const incidents = [
  {
    id: 'pending',
    signal: 'Pending',
    title: 'Pod가 스케줄링되지 않는다',
    summary: '이미지보다 먼저 scheduler 이벤트를 본다. 리소스 부족, affinity, taint, PVC 바인딩을 순서대로 좁힌다.',
    checks: [
      ['이벤트', 'FailedScheduling 메시지와 반복 횟수를 확인한다.'],
      ['배치 조건', 'requests, nodeSelector, affinity, toleration을 비교한다.'],
      ['스토리지', 'PVC가 Pending이면 StorageClass와 provisioner 이벤트를 확인한다.'],
    ],
    commands: `kubectl describe pod <pod> -n <ns>\nkubectl get events -n <ns> --sort-by=.lastTimestamp\nkubectl get nodes -o custom-columns=NAME:.metadata.name,TAINTS:.spec.taints\nkubectl get pvc -n <ns>`,
    caution: 'requests를 낮추거나 toleration을 추가하기 전에 왜 해당 제약이 설정됐는지 먼저 확인한다.',
  },
  {
    id: 'crashloop',
    signal: 'CrashLoopBackOff',
    title: '컨테이너가 반복해서 재시작된다',
    summary: '현재 로그만 보면 직전 프로세스의 종료 원인을 놓치기 쉽다. lastState와 --previous 로그를 같이 본다.',
    checks: [
      ['종료 상태', 'exit code, reason, restartCount를 확인한다.'],
      ['직전 로그', '재시작 전 컨테이너 로그에서 애플리케이션 오류를 찾는다.'],
      ['실행 조건', '환경 변수, Secret, volume mount, command와 probe를 확인한다.'],
    ],
    commands: `kubectl get pod <pod> -n <ns> -o wide\nkubectl describe pod <pod> -n <ns>\nkubectl logs <pod> -n <ns> -c <container> --previous\nkubectl get pod <pod> -n <ns> -o jsonpath='{.status.containerStatuses[*].lastState}'`,
    caution: 'livenessProbe 지연만 늘리면 애플리케이션 시작 실패를 가릴 수 있다. readiness와 startupProbe도 분리해서 본다.',
  },
  {
    id: 'service',
    signal: '503 / timeout',
    title: 'Service 뒤의 Pod로 요청이 가지 않는다',
    summary: 'Service 객체의 존재보다 EndpointSlice에 Ready 주소가 잡히는지가 중요하다.',
    checks: [
      ['Selector', 'Service selector와 Pod label이 정확히 일치하는지 본다.'],
      ['EndpointSlice', '주소가 비어 있거나 ready=false인지 확인한다.'],
      ['Port', 'port, targetPort, 컨테이너 listen port를 비교한다.'],
      ['경로', '클러스터 내부에서 Service DNS와 Pod IP를 각각 호출한다.'],
    ],
    commands: `kubectl get svc,endpointslice -n <ns>\nkubectl describe svc <service> -n <ns>\nkubectl get pods -n <ns> --show-labels\nkubectl run net-debug --rm -it --image=curlimages/curl -- sh`,
    caution: 'Ingress부터 수정하지 않는다. Pod IP → Service DNS → Ingress 순서로 경계를 나누면 원인을 빨리 찾을 수 있다.',
  },
  {
    id: 'rollout',
    signal: 'Rollout stalled',
    title: '배포가 완료되지 않거나 오류율이 올랐다',
    summary: '새 ReplicaSet의 상태, readiness 실패, 이미지와 설정 변경을 확인하고 롤백 기준을 명확히 잡는다.',
    checks: [
      ['진행 상태', 'availableReplicas와 updatedReplicas가 원하는 수에 도달했는지 본다.'],
      ['변경 이력', '배포 이미지, 환경 변수, ConfigMap/Secret 버전을 비교한다.'],
      ['안전장치', 'PDB, maxUnavailable, maxSurge가 현재 용량과 맞는지 확인한다.'],
    ],
    commands: `kubectl rollout status deployment/<name> -n <ns> --timeout=3m\nkubectl rollout history deployment/<name> -n <ns>\nkubectl get rs,pod -n <ns> -l app=<label>\nkubectl rollout undo deployment/<name> -n <ns>`,
    caution: 'undo는 원인 분석이 아니라 복구 수단이다. GitOps 환경이라면 선언 저장소의 버전도 함께 되돌려야 재동기화를 막을 수 있다.',
  },
]

const requestPath = [
  { name: 'Load Balancer / Ingress', role: '외부 요청을 host·path 규칙에 따라 Service로 전달', check: 'IngressClass, rule, TLS, controller 로그' },
  { name: 'Service', role: '변하는 Pod 앞에 안정적인 VIP와 DNS 제공', check: 'selector, port, targetPort' },
  { name: 'EndpointSlice', role: 'Service가 전달할 실제 Pod 주소와 readiness 상태 보관', check: 'endpoints, ready, serving, terminating' },
  { name: 'Pod', role: '애플리케이션 컨테이너와 probe가 실행되는 지점', check: 'listen port, readiness, logs, resource usage' },
]

const controlLoop = [
  { name: 'API Server', role: '선언과 상태 변경의 단일 진입점', check: '인증·인가, admission, API 응답' },
  { name: 'etcd', role: '클러스터의 원하는 상태와 현재 상태 저장', check: '지연, quorum, 저장 공간' },
  { name: 'Controller', role: '원하는 상태와 실제 상태의 차이를 계속 조정', check: 'Deployment·ReplicaSet 이벤트와 condition' },
  { name: 'Scheduler', role: '아직 배치되지 않은 Pod에 Node를 선택', check: 'requests, affinity, taint, topology' },
  { name: 'Kubelet', role: 'Node에서 Pod 명세를 실제 컨테이너 상태로 반영', check: 'runtime, volume mount, probe, node pressure' },
]

const runbook = [
  ['워크로드 전체 상태', 'kubectl get deploy,sts,ds,pod -n <ns> -o wide', 'Ready 수와 Pod 배치부터 한 번에 본다.'],
  ['최근 이벤트', 'kubectl get events -n <ns> --sort-by=.lastTimestamp', '스케줄링·마운트·이미지 오류를 시간순으로 본다.'],
  ['직전 컨테이너 로그', 'kubectl logs <pod> -n <ns> -c <container> --previous', 'CrashLoop 재시작 전 로그를 확인한다.'],
  ['리소스 사용량', 'kubectl top pod -n <ns> --containers', 'requests/limits 대비 CPU·메모리 사용량을 본다.'],
  ['Service 경로', 'kubectl get svc,endpointslice -n <ns>', 'Service에 실제 Ready endpoint가 연결됐는지 본다.'],
  ['배포 진행', 'kubectl rollout status deploy/<name> -n <ns> --timeout=3m', '무기한 대기하지 않고 실패를 CI에 반환한다.'],
  ['리소스 변경 확인', 'kubectl diff -f <manifest.yaml>', '적용 전에 클러스터 상태와 선언의 차이를 확인한다.'],
  ['권한 확인', 'kubectl auth can-i <verb> <resource> -n <ns> --as=<subject>', 'RBAC 문제를 추측하지 않고 직접 검증한다.'],
]

const reviewQuestions = [
  {
    question: 'Service는 존재하지만 EndpointSlice가 비어 있다. 가장 먼저 확인할 것은?',
    options: ['Ingress TLS 인증서', 'Service selector와 Pod label', 'Node의 디스크 사용량'],
    answer: 1,
    note: 'EndpointSlice controller는 selector와 일치하는 Pod를 기준으로 endpoint를 만든다.',
  },
  {
    question: 'CrashLoopBackOff에서 재시작 직전의 애플리케이션 로그를 보는 옵션은?',
    options: ['--previous', '--watch', '--all-namespaces'],
    answer: 0,
    note: '현재 컨테이너 로그와 --previous 로그를 함께 비교해야 재시작 전후를 구분할 수 있다.',
  },
  {
    question: 'Pod가 Pending이고 이벤트에 Insufficient memory가 반복된다. 우선 비교할 값은?',
    options: ['Pod memory request와 Node allocatable', 'Service targetPort', 'Ingress pathType'],
    answer: 0,
    note: 'Scheduler는 실제 사용량이 아니라 request를 기준으로 배치 가능 여부를 판단한다.',
  },
]

export default function KubernetesStudy() {
  const [tab, setTab] = useState<TabId>('incidents')
  const [incidentId, setIncidentId] = useState(incidents[0].id)
  const [flow, setFlow] = useState<'traffic' | 'control'>('traffic')
  const [selectedNode, setSelectedNode] = useState(0)
  const [query, setQuery] = useState('')
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const incident = incidents.find(item => item.id === incidentId) ?? incidents[0]
  const nodes = flow === 'traffic' ? requestPath : controlLoop
  const filteredRunbook = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return normalized ? runbook.filter(item => item.join(' ').toLowerCase().includes(normalized)) : runbook
  }, [query])

  return (
    <section className="k8s-lab">
      <header className="k8s-hero">
        <div>
          <p className="k8s-kicker">KUBERNETES OPERATIONS LAB</p>
          <h1>Kubernetes</h1>
          <p>까먹지 않기 위한 쿠버네티스 운영 노트</p>
        </div>
        <div className="k8s-status"><span></span>4개 장애 시나리오 · 8개 명령어</div>
      </header>

      <nav className="k8s-tabs" aria-label="Kubernetes 학습 메뉴">
        {([
          ['incidents', '장애 대응'],
          ['request-path', '요청과 제어 흐름'],
          ['runbook', 'kubectl 런북'],
          ['review', '상황 점검'],
        ] as [TabId, string][]).map(([id, label]) => (
          <button key={id} type="button" className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </nav>

      {tab === 'incidents' && <div className="k8s-panel-grid">
        <aside className="k8s-case-list">
          {incidents.map(item => <button key={item.id} type="button" className={incidentId === item.id ? 'is-active' : ''} onClick={() => setIncidentId(item.id)}><span>{item.signal}</span>{item.title}</button>)}
        </aside>
        <article className="k8s-case">
          <span className="k8s-signal">SIGNAL · {incident.signal}</span>
          <h2>{incident.title}</h2>
          <p className="k8s-summary">{incident.summary}</p>
          <h3>확인 순서</h3>
          <ol className="k8s-checks">{incident.checks.map(([title, desc]) => <li key={title}><strong>{title}</strong><span>{desc}</span></li>)}</ol>
          <h3>진단 명령어</h3>
          <pre><code>{incident.commands}</code></pre>
          <div className="k8s-caution"><strong>운영 메모</strong>{incident.caution}</div>
        </article>
      </div>}

      {tab === 'request-path' && <div className="k8s-flow-panel">
        <div className="k8s-segmented">
          <button type="button" className={flow === 'traffic' ? 'is-active' : ''} onClick={() => { setFlow('traffic'); setSelectedNode(0) }}>요청 경로</button>
          <button type="button" className={flow === 'control' ? 'is-active' : ''} onClick={() => { setFlow('control'); setSelectedNode(0) }}>상태 조정 루프</button>
        </div>
        <p className="k8s-flow-intro">{flow === 'traffic' ? '503이나 timeout은 요청 경계를 하나씩 나눠 확인합니다.' : 'Kubernetes는 선언된 상태와 실제 상태의 차이를 계속 줄이는 시스템입니다.'}</p>
        <div className="k8s-flow" aria-label={flow === 'traffic' ? '요청 경로' : '상태 조정 루프'}>
          {nodes.map((node, index) => <button key={node.name} type="button" className={selectedNode === index ? 'is-active' : ''} onClick={() => setSelectedNode(index)}><span>{String(index + 1).padStart(2, '0')}</span>{node.name}</button>)}
        </div>
        <article className="k8s-node-detail"><p>STEP {String(selectedNode + 1).padStart(2, '0')}</p><h2>{nodes[selectedNode].name}</h2><div><span>역할</span><strong>{nodes[selectedNode].role}</strong></div><div><span>확인 포인트</span><strong>{nodes[selectedNode].check}</strong></div></article>
      </div>}

      {tab === 'runbook' && <div className="k8s-runbook">
        <div className="k8s-runbook-head"><div><h2>자주 쓰는 진단 명령어</h2><p></p></div><label><span className="sr-only">런북 검색</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="예: rollout, Service, 권한" /></label></div>
        <div className="k8s-command-list">{filteredRunbook.map(([title, command, reason]) => <article key={title}><div><span>CHECK</span><h3>{title}</h3><p>{reason}</p></div><code>{command}</code></article>)}</div>
        {filteredRunbook.length === 0 && <p className="k8s-empty">일치하는 명령어가 없습니다.</p>}
      </div>}

      {tab === 'review' && <div className="k8s-review">
        <header><h2>운영 상황 점검</h2><p>정의보다 다음 확인 지점을 고르는 문제입니다.</p></header>
        {reviewQuestions.map((item, index) => <article key={item.question}>
          <span>CASE {String(index + 1).padStart(2, '0')}</span><h3>{item.question}</h3>
          <div>{item.options.map((option, optionIndex) => <button key={option} type="button" className={answers[index] === optionIndex ? (optionIndex === item.answer ? 'is-correct' : 'is-wrong') : ''} onClick={() => setAnswers(current => ({ ...current, [index]: optionIndex }))}>{option}</button>)}</div>
          {answers[index] !== undefined && <p className={answers[index] === item.answer ? 'is-correct' : 'is-wrong'}>{answers[index] === item.answer ? '맞습니다.' : `정답: ${item.options[item.answer]}`} {item.note}</p>}
        </article>)}
      </div>}
    </section>
  )
}
