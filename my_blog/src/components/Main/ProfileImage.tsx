import { type FunctionComponent } from "react"
import styled from "@emotion/styled"

type ProfileImageProps = {
  profileImage: ProfileImageSource
}

export type ProfileImageSource = string | {
  images?: { fallback?: { src?: string } }
}

const ProfileImageWrapper = styled.img`
  display: block;
  width: 120px;
  height: 120px;
  object-fit: cover;
  margin-bottom: 30px;
  border-radius: 50%;

  @media (max-width: 768px) {
    width: 80px;
    height: 80px;
  }
`

const ProfileImage: FunctionComponent<ProfileImageProps> = function ({
  profileImage,
}) {
  const src = typeof profileImage === "string"
    ? profileImage
    : profileImage.images?.fallback?.src || "/profile-image.png"

  return (
    <ProfileImageWrapper src={src} alt="임재혁" />
  )
}

export default ProfileImage
