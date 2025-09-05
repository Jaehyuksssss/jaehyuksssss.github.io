import "prismjs/themes/prism-tomorrow.css"
/**
 * Implement Gatsby's Browser APIs in this file.
 *
 * See: https://www.gatsbyjs.com/docs/browser-apis/
 */

// 라우팅 성능 최적화
export const onRouteUpdate = ({ location, prevLocation }) => {
  // 페이지 전환 시 스크롤 위치 초기화
  if (prevLocation) {
    window.scrollTo(0, 0)
  }
  
  // 라우팅 완료 후 페이지가 로드되었는지 확인
  if (typeof window !== 'undefined') {
    // 페이지 로딩 완료 표시
    document.body.style.opacity = '1'
  }
}

// 라우팅 전에 실행
export const onPreRouteUpdate = ({ location, prevLocation }) => {
  // 라우팅 시작 시 로딩 상태 표시
  if (typeof window !== 'undefined') {
    document.body.style.opacity = '0.7'
  }
}

// 페이지 로드 완료 시 실행
export const onInitialClientRender = () => {
  if (typeof window !== 'undefined') {
    document.body.style.opacity = '1'
  }
}
