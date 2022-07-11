import React, { FunctionComponent } from 'react'
import styled from '@emotion/styled'
import ProfileImage from 'components/Main/ProfileImage'

const Background = styled.div`
  width: 100%;
  background: #2E8B57;
  color: #ffffff;
`

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  width: 768px;
  height: 400px;
  margin: 0 auto;
`

const SubTitle = styled.div`
  font-size: 20px;
  font-weight: 400;
`

const Title = styled.div`
  margin-top: 5px;
  font-size: 35px;
  font-weight: 700;
`

const Introduction: FunctionComponent = function () {
  return (
    <Background>
      <Wrapper>
        <ProfileImage />

        <div>
          <SubTitle>Hello,</SubTitle>
          <Title>I'm a Frontend Developer Jaehyuk LIm.</Title>
        </div>
      </Wrapper>
    </Background>
  )
}

export default Introduction