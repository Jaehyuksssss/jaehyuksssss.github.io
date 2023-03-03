import React, { FunctionComponent } from "react"
import styled from "@emotion/styled"
import { IGatsbyImageData } from "gatsby-plugin-image"
import ProfileImage from "components/Main/ProfileImage"
import Menu from "components/Common/Menu"

type IntroductionProps = {
  profileImage: IGatsbyImageData
}

const Background = styled.div`
  width: 100%;
  height: 420px;
  background: #9bb8d5;
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

  @media (max-width: 768px) {
    width: 100%;
    height: 300px;
    padding: 0 20px;
  }
`

const SubTitle = styled.div`
  font-size: 20px;
  font-weight: 400;

  @media (max-width: 768px) {
    font-size: 15px;
  }
`

const Title = styled.div`
  margin-top: 5px;
  font-size: 35px;
  font-weight: 700;

  @media (max-width: 768px) {
    font-size: 25px;
  }
`

const Introduction: FunctionComponent<IntroductionProps> = function ({
  profileImage,
}) {
  return (
    <Background>
      <Wrapper>
        <ProfileImage profileImage={profileImage} />
        <div>
          <SubTitle>Hello,</SubTitle>
          <Title>I'm a Frontend Developer Jaehyuk LIm.</Title>
        </div>
      </Wrapper>
    </Background>
  )
}

export default Introduction
