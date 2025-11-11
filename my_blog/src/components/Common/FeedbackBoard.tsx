import React from 'react'
import styled from '@emotion/styled'
import { fetchRecentFeedback, submitFeedback, PublicFeedback } from 'lib/feedbackApi'

const Box = styled.div`
  width: min(720px, 92vw);
  margin: 20px auto 0;
  padding: 16px 16px 18px;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 8px 22px rgba(0,0,0,0.06);
`

const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`

const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  font-size: 16px;
  outline: none;
`

const Textarea = styled.textarea`
  width: 100%;
  min-height: 120px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  font-size: 16px;
  outline: none;
  resize: vertical;
`

const Primary = styled.button`
  border: none;
  background: #111827;
  color: #fff;
  padding: 10px 16px;
  border-radius: 10px;
  font-weight: 800;
  cursor: pointer;
`

const Muted = styled.div`
  color: #6b7280;
  font-size: 12px;
`

const Item = styled.div`
  padding: 10px 0;
  border-top: 1px solid #f3f4f6;
`

const FeedbackBoard: React.FC = () => {
  const [name, setName] = React.useState<string>(typeof window !== 'undefined' ? (localStorage.getItem('fb_name') || '') : '')
  const [email, setEmail] = React.useState<string>(typeof window !== 'undefined' ? (localStorage.getItem('fb_email') || '') : '')
  const [content, setContent] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [ok, setOk] = React.useState<boolean | null>(null)
  const [items, setItems] = React.useState<PublicFeedback[]>([])

  React.useEffect(() => {
    let alive = true
    fetchRecentFeedback(10).then(r => { if (alive) setItems(r) })
    return () => { alive = false }
  }, [])

  const onSubmit = async () => {
    if (submitting) return
    // Cooldown 60s
    try {
      const cooldown = Number(localStorage.getItem('fb_cooldown') || '0')
      if (Date.now() < cooldown) {
        setOk(false)
        return
      }
    } catch {}

    setSubmitting(true)
    const ok = await submitFeedback({ name, email, content })
    setOk(ok)
    setSubmitting(false)
    if (ok) {
      try {
        localStorage.setItem('fb_name', name)
        localStorage.setItem('fb_email', email)
        localStorage.setItem('fb_cooldown', String(Date.now() + 60_000))
      } catch {}
      setContent('')
      // refresh list
      fetchRecentFeedback(10).then(setItems)
    }
  }

  return (
    <Box>
      <h3 style={{ margin: '0 0 8px' }}>게임 피드백 게시판</h3>
      <Muted>모든 게임에 대한 의견을 환영합니다. 소중한 피드백을 남겨주신 분들 중 추첨을 통해 스타벅스 기프티콘을 드려요. (당첨 안내는 메일로 발송)</Muted>

      <div style={{ height: 10 }} />

      <Row>
        <div>
          <label htmlFor="fb-name" style={{ fontWeight: 800 }}>이름</label>
          <Input id="fb-name" value={name} onChange={e => setName(e.target.value)} maxLength={20} placeholder="홍길동" />
        </div>
        <div>
          <label htmlFor="fb-email" style={{ fontWeight: 800 }}>메일</label>
          <Input id="fb-email" value={email} onChange={e => setEmail(e.target.value)} maxLength={320} placeholder="you@example.com" />
        </div>
      </Row>
      <div style={{ marginTop: 10 }}>
        <label htmlFor="fb-content" style={{ fontWeight: 800 }}>내용</label>
        <Textarea id="fb-content" value={content} onChange={e => setContent(e.target.value)} maxLength={1000} placeholder="버그 제보, 개선 아이디어, 재미 요소 등 자유롭게 적어주세요 (10~1000자)" />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
        <Primary onClick={onSubmit} disabled={submitting || name.trim().length < 2 || !/.+@.+\..+/.test(email) || content.trim().length < 10}>
          {submitting ? '보내는 중...' : '피드백 제출'}
        </Primary>
      </div>
      {ok === false ? <div style={{ color: '#ef4444', fontSize: 13, marginTop: 6 }}>제출에 실패했어요. 입력값을 확인하거나 잠시 후 다시 시도해주세요.</div> : null}
      {ok === true ? <div style={{ color: '#059669', fontSize: 13, marginTop: 6 }}>감사합니다! 기록되었습니다.</div> : null}

      <div style={{ height: 16 }} />
      <div style={{ fontWeight: 800, marginBottom: 6 }}>최근 피드백</div>
      {items.length === 0 ? (
        <Muted>아직 피드백이 없어요.</Muted>
      ) : (
        <div>
          {items.map(it => (
            <Item key={it.id}>
              <div style={{ fontWeight: 700 }}>{it.display_name} <span style={{ color: '#9ca3af', fontWeight: 500, fontSize: 12 }}>· {new Date(it.created_at).toLocaleString()}</span></div>
              <div style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>{it.content}</div>
            </Item>
          ))}
        </div>
      )}
    </Box>
  )
}

export default FeedbackBoard

