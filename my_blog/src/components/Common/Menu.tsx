// import styled from "@emotion/styled"
// import React from "react"
// import { useRecoilState } from "recoil"
// import { HandleMenu } from "../recoil/atom"

// const Menu = () => {
//   const [handleMenu, setHandleMenu] = useRecoilState(HandleMenu)
//   console.log(handleMenu)
//   const closeMenu = () => {
//     setHandleMenu(!true)
//   }

//   return (
//     <>
//       <Container>
//         <button onClick={() => setHandleMenu(!handleMenu)}>
//           <div>Menu</div>
//         </button>
//       </Container>
//       {handleMenu && (
//         <MenuOpen>
//           <Button onClick={closeMenu}>
//             <div>x</div>
//           </Button>
//         </MenuOpen>
//       )}
//     </>
//   )
// }

// export default Menu

// const Container = styled.div`
//   position: fixed;
//   display: flex;
//   flex-direction: column;
// `
// const Button = styled.button`
//   position: absolute;
//   right: 0;
//   width: 20px;
//   display: flex;
//   justify-content: center;
//   align-items: center;
// `
// const MenuOpen = styled.div`
//   transition: width 0.5s;
//   transition-delay: 1s;
//   position: fixed;
//   display: flex;
//   flex-direction: column;
//   width: 100%;
//   background: #486090;
//   height: 100%;
//   z-index: 1;
// `
