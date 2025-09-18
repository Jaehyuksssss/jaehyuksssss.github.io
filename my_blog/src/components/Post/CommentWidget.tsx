import React, { useRef, FunctionComponent, useEffect, useState } from 'react'
import styled from '@emotion/styled'

const src = 'https://utteranc.es/client.js'
// Allow overriding the repo via env for flexibility
const repo = process.env.GATSBY_UTTERANCES_REPO || 'Jaehyuksssss/my-Gatsby-blog'

type UtterancesAttributesType = {
    src: string
    repo: string
    'issue-term': string
    label: string
    theme: string
    crossorigin: string
    async: string
  };
  
  const UtterancesWrapper = styled.div`
  @media (max-width: 768px) {
    padding: 0 20px;
  }
`
  const Status = styled.div`
    margin: 16px 0;
    font-size: 14px;
    opacity: 0.7;
  `

  const CommentWidget: FunctionComponent = function () {
    const element = useRef<HTMLDivElement>(null)
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
    const [message, setMessage] = useState<string>('댓글 불러오는 중…')
    const injectedRef = useRef<boolean>(false)
    const scriptRef = useRef<HTMLScriptElement | null>(null)

    useEffect(() => {
      const root = element.current
      if (!root) return

      // Avoid duplicate injections (React StrictMode double-mount in dev)
      if (injectedRef.current) return
      injectedRef.current = true

      setStatus('loading')
      setMessage('댓글 불러오는 중…')

      const utterances: HTMLScriptElement = document.createElement('script')
      scriptRef.current = utterances

      const attributes: UtterancesAttributesType = {
        src,
        repo,
        'issue-term': 'pathname',
        label: 'Comment',
        theme: `github-light`,
        crossorigin: 'anonymous',
        async: 'true',
      }

      Object.entries(attributes).forEach(([key, value]) => {
        utterances.setAttribute(key, value)
      })

      let timeout: number | undefined
      const markError = (reason?: string) => {
        setStatus('error')
        setMessage(reason || '댓글 위젯을 불러오지 못했습니다.')
      }

      // If iframe doesn't appear within 6s, show a fallback message
      timeout = window.setTimeout(() => {
        if (root && !root.querySelector('iframe.utterances-frame')) {
          markError('댓글 서비스를 불러오지 못했어요. 새로고침하거나 광고 차단을 확인해 주세요.')
        }
      }, 6000)

      utterances.onload = () => {
        setStatus('ready')
      }
      utterances.onerror = () => {
        markError('댓글 스크립트 로드에 실패했어요.')
      }

      root.appendChild(utterances)

      return () => {
        if (timeout) window.clearTimeout(timeout)
        // Cleanup without throwing if nodes moved/removed by browser
        const s = scriptRef.current
        if (s && s.parentNode) {
          try { s.parentNode.removeChild(s) } catch {}
        }
        const frame = root.querySelector('iframe.utterances-frame')
        if (frame && frame.parentNode) {
          try { frame.parentNode.removeChild(frame) } catch {}
        }
        injectedRef.current = false
      }
    }, [])

    return (
      <UtterancesWrapper ref={element}>
        {status !== 'ready' && <Status>{message}</Status>}
      </UtterancesWrapper>
    )
  }
  
  export default CommentWidget
