// Gatsby 시절 Recoil atom 설정을 참조하던 코드와의 호환용 값이다.
// 현재 Astro 레이아웃의 메뉴 상태는 이 값을 사용하지 않는다.
export const HandleMenu = {
  key: "handleMenu",
  default: false,
} as const
