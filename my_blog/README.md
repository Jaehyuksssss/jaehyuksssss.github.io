# my-Gatsby-blog

## 리액트 정적 프레임워크인 Gatsby를 사용하여 자기소개 블로그를 만들기
블로그 주소 : https://jaehyuksssss.github.io/
---

## Technologies

* Git, github
* 기술 스택 : TypeScript , React , Gatsby , GraphQL, @emotion 
---

### 구현 기능

1. 반응형 디자인, 인피니티 스크롤 구현, 404 페이지 커스텀

- **반응형 디자인** : 각각 profile Image, Introduction 컴포넌트, CategoryList 컴포넌트, PostList 컴포넌트, Footer 컴포넌트에 일반적으로 사용되는 태블릿 너비인 768px에 맞춰서
  미디어 쿼리를 통해 반응형 디자인을 구현.

- **인피니티 스크롤 구현** : 카테고리 별로 아이템을 필터링 해줌과 동시에 인피니티 스크롤 기능까지 제공하는 useInfiniteScroll 커스텀 훅을 통해 구현. (특정 요소가 화면에 보일 경우, 다음 데이터를 로드하는 방식)

- **404 페이지 커스텀** : src/pages 디렉토리에 404라는 이름의 컴포넌트 파일을 생성하여 커스텀

<img src ="https://s3.us-west-2.amazonaws.com/secure.notion-static.com/6201a47d-d662-4532-9e11-b54534d681f3/%E1%84%89%E1%85%B3%E1%84%8F%E1%85%B3%E1%84%85%E1%85%B5%E1%86%AB%E1%84%89%E1%85%A3%E1%86%BA_2022-07-21_%E1%84%8B%E1%85%A9%E1%84%92%E1%85%AE_9.02.27.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIAT73L2G45EIPT3X45%2F20220721%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20220721T120454Z&X-Amz-Expires=86400&X-Amz-Signature=bd297246a556000d51ff7e705f8fe391eb6781d87c927e52395f224de2f74403&X-Amz-SignedHeaders=host&response-content-disposition=filename%20%3D%22%25E1%2584%2589%25E1%2585%25B3%25E1%2584%258F%25E1%2585%25B3%25E1%2584%2585%25E1%2585%25B5%25E1%2586%25AB%25E1%2584%2589%25E1%2585%25A3%25E1%2586%25BA%25202022-07-21%2520%25E1%2584%258B%25E1%2585%25A9%25E1%2584%2592%25E1%2585%25AE%25209.02.27.png%22&x-id=GetObject">

### 2. 메인 페이지 
- 간단한 소개 부분 , 카테고리 부분 , 프로필 이미지 부분으로 구성
- 필터 기능을 통해서 원하는 카테고리의 포스트에 들어 갈 수 있음
<img src = 'my_blog/contents/Image/main.png'>

### 3. 포스트 
- GraphQL을 통해 Markdown 정보 쿼리하기
- 상단 배경 안에 게시글 제목, 카테고리, 날짜가 보이도록 구현
<img src = "my_blog/contents/Image/post.png"> 


- github Utterances 위젯을 통해 댓글을 달면 해당 repo issue에 댓글이 달릴 수 있게 함
<img src = "my_blog/contents/Image/comment.png">

<img src = "https://s3.us-west-2.amazonaws.com/secure.notion-static.com/2c228d8f-fbd5-49fa-8a84-fc5c2489dfa1/Untitled.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIAT73L2G45EIPT3X45%2F20220721%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20220721T125109Z&X-Amz-Expires=86400&X-Amz-Signature=16de54f5df320ed5a50e313386c4bffc327412c239cafb5ae49cdd4e2ebca537&X-Amz-SignedHeaders=host&response-content-disposition=filename%20%3D%22Untitled.png%22&x-id=GetObject">

---

