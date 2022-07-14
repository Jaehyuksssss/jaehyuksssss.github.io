import { FunctionComponent, ReactNode } from "react"
import GlobalStyle from "./GlobalStyle"
import styled from '@emotion/styled'
import Footer from 'components/Common/Footer'


type PostTemplateProps ={
    children: ReactNode
}

const Container = styled.div`
display: flex;
flex-direction:column;
height:100%
`

const Template :FunctionComponent<TemplateProps> = function ({children}) {
    return (
        <Container>
            <GlobalStyle />
            {children}
            <Footer />
        </Container>
    )
}
export default Template