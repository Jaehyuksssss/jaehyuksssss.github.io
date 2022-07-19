---
date: '2022-06-08'
title: 'JavaScript'
categories: ['TIL','Deep_Dive']
summary: '39장 Dom '
thumbnail: './deep-dive.png'
---

# 39. DOM
## Dom 트리란?
- HTMl 문서의 계층적 구조와 정보를 표현하며 이를 제어할 수 있는 API, 즉 프로퍼티와 메서드를 제공 하는 트리 자료 구조
- 노드 객체들로 구성된 트리자료 구조 

##  Html 요소와 노드 객체
- HTML 요소란 ? HTML 문서를 구성하는 개별적인 요소
```
시작태그     어트리뷰트값   종료태그
<div class = "인사">안뇽</div>
    어트리뷰트이름    컨텐츠
```
노드 변환 요소 : 요소노드 div + 어트리뷰트 노드 class = "인사" + 텍스트노드 안뇽
HTML 요소를 객체화한 모든 노드 객체 -> 트리자료구조 로 구성
트리자료구조(부모노드 + 자식노드) : 계층적 구조(비선형 자료구조), 최상위노드(부모노드 x,루트노드라고 불림, 자식노드 없을시 -> 리플노드)포함

# 비동기 프로그래밍
## 비동기 프로그래밍

# 동기처리와 비동기 처리

함수를 호출하면 함수 코드가 평가되어 함수 실행 컨텍스트가 생성된다. 이때 생성된 함수 실행 컨텍스트는 실행 컨텍스트 스택(콜 스택)에 푸시되고 함수 코드가 실행된다. 함수 코드의 실행이 종료하면 함수 실행 컨텍스트는 실행 컨텍스트 스택에서 팝되어 제거된다.

자바스크립트 엔진은 단 하나의 실행 컨텍스트 스택을 갖는다.

이는 함수를 실행할 수 있는 창구가 단 하나이며, 동시에 2개 이상의 함수를 동시에 실행할 수 없다는 것을 의미한다. 자바스크립트 엔진은 한 번에 하나의 태스크만 실행할 수 있는 싱글 스레드 방식으로 동작한다. 싱글 스레드 방식은 한 번에 하나의 태스크만 실행할 수 있기 때문에 처리에 시간이 걸리는 태스크를 실행하는 경우 블로킹(작업 중단) 이 발생한다.

간단하게 말해보기

```
함수를 호출 →  함수 코드를 평가 →  함수 실행 컨텍스트를 생성

실행 컨텍스트 콜스택에 push ⇒ 코드 실행

코드실행 종료 ⇒실행 컨텍스트 스택에서 pop 되어 제거

자바스크립트는 단 하나의 실행 컨텍스트 갖습니다.

이게 무슨 말인가 하면 함수를 실행 할 수 있는 창구가 단 하나고 동시에 두개 이상의 함수를 동시에 실행 시킬 수 없다는것을 의미. 즉 실행 하고 있는 최상위 컨텍스트를 제외한 모든 컨텍스트는 대기중인 테스크 (task) 입니다. pop이 되어야 비로소 실행 -싱글스레드
```

# setTimeout을 사용해서 수정해보기
```
function foo () {
console.log('foo';
}

function bar () {
console.log('bar')
}

setTimeout (foo , 3 * 1000);
bar();
```
이렇게 코드를 실행시키면 순서대로 코드가 읽히는데 즉 앞에 코드가 완전히 실행이 된 후 종료를 해야 비로소 다음 코드가 읽힙니다.
즉 실행이 종료가 될 때 까지 이후 작업들의 작업이 멈춰있는 블로킹이 발생하지만 setTimeout 함수를 사용하면 블로킹이 발생하지 않고 bar를 호출하고 3초뒤 foo를 호출하게 됩니다.

## 동기 처리 요약
- 현재 실행 중인 테스크가 종료할 때까지 다음에 실행될 테스크가 대기하는 방식
- 테스크를 순서대로 하나씩 처리하므로 실행 순서가 보장된다는 장점
- 하지만 앞선 테스크가 종료할 떄까지 이후 테스크들이 블로킹 되는 단점

## 비동기 처리 요약
- 현재 실행중인 테스크가 종료되지 않은 상태라 해도 다음 테스크 곧바로 실행하므로 블로킹이 발생하지 않음
- 하지만 테스크의 실행 순서가 보장되지 않음
- 전통적으로 콜백 패턴을 사용( 콜백 지옥에 빠질 수 있음)

## 이벤트 루프와 테스크 큐

자바스크립트의 특징 중 하나는 싱글 스레드로 동작한다는것.
-> 하지만 브라우저가 동작하는 것을 살펴보면 많은 태스크가 동시에 처리되는 것처럼 느껴짐

## 이벤트 루프 
- 자바스크립트의 동시성을 지원한다.
- 브라우저에 내장되어 있는 기능

## 구글의 V8 자바스크립트 엔진을 비롯한 대부분의 자바스크립트 엔진은 크게 2개의 영역으로 구분됨.
- 콜 스택
- 힙

자바스크립트 엔진은 단순히 태스크가 요청되면 콜 스택을 통해 요청된 작업을 순착적으로 실행함. 비동기 처리에서 소스코드의 평가와 실행을 제외한 모든 처리는 자바스크립트 엔진을 구동하는 환경인 브라우저 또는 Node.js 가 담당함.

비동기 방식으로 동작하는 setTimeout 의 콜백 함수의 평가와 실행은 자바스크립트 엔진 이 담당하지만 호줄 스케줄링을 위한 타이머 설정과 콜백 함수의 등록은 브라우저 또는 Node.js 가 담당함. 이를 위해 브라우저 환경은 태스크 큐 와 이벤트 루프 를 제공함.

-태스크 큐(task queue/event queue/callback queue)
비동기 함수의 콜백 함수 또는 이벤트 핸들러가 일시적으로 보관되는 영역
- 이벤트 루프(event loop)
콜 스택에 현재 실행 중인 실행 컨텍스트가 있는지, 그리고 태스크 큐에 대기 중인 함수(콜백 함수, 이벤트 핸들러 등)가 있는지 반복해서 확인함. 만약 콜 스택이 비어있고 태스크 큐에 대기 중인 함수가 있다면 이벤트 루프는 순차적으로 태스크 큐에 대기 중인 함수를 콜 스택으로 이동시킴.

<strong>자바스크립트는 싱글 스레드 방식으로 동작함. 이때 싱글 스레드 방식으로 동작하는 것은 브라우저가 아니라 브라우저에 내장된 자바스크립트 엔진이라는 것에 주의해야 함.
만약 모든 자바스크립트 코드가 자바스크립트 엔진에서 싱글 스레드 방식으로 동작한다면 자바스크립트는 비동기로 동작할 수 없음. 즉, 자바스크립트 엔진은 싱글 스레드로 동작하지만 브라우저는 멀티 스레드로 동작함.</strong>

# Ajax

자바스크립트를 사용하여 브라우저가 서버에게 비동기 방식으로 데이터를 요청하고, 서버가 응답한 데이터를 수신하여 웹페이지를 동적으로 갱신하는 프로그래밍 방식.

브라우저에서 제공하는 Web API인 XMLHttpRequest 객체(HTTP 비동기 통신을 위한 메서드와 프로퍼티를 제공)를 기반으로 동작.

## 전통적인 웹페이지 방식

- 이전 웹페이지와 차이가 없어서 변경할 필요가 없는 부분까지 포함된 완전한 HTML을 서버로부터 매번 다시 전송받기 때문에 불필요한 데이터 통신 발생
- 변경할 필요가 없는 부분까지 처음부터 다시 렌더링 -> 깜빡임 현상
- 클라이언트와 서버와의 통신이 동기 방식으로 동작하기 때문에 서버로부터 응답이 있을 때까지 다음 처리는 블로킹

## 그에 비한 Ajax의 장점

- 변경할 부분을 갱신하는 데 필요한 데이터만 서버로부터 전송받기 때문에 불필요한 데이터 통신 X
- 변경할 필요가 없는 부분은 다시 렌더링하지 않음 -> 깜빡임 X
- 클라이언트와 서버와의 통신이 비동기 방식으로 동작하기 때문에 서버에게 요청을 보낸 이후 블로킹 발생 X

즉 Ajax의 등장으로 브라우저에서도 데스크톱 에플리케이션과 유사한 빠른 퍼포먼스와 부드러운 화면 전환이 가능해졌음.

## JSON

JSON(JavaScript Object Notation)은 클라이언트와 서버 간의 HTTP 통신을 위한 텍스트 데이터 포맷. 자바스크립트에 종속되지 않는 언어 독립형 데이터 포맷으로, 대부분의 프로그래밍 언어에서 사용할 수 있음.

```jsx
{
  "name": "Lee",
  "age": 20,
  "alive": true,
  "hobby": ["traveling", "tennis"]
}
```

### JSON.stringify

객체를 JSON 포맷의 문자열로 변환함. 클라이언트가 서버로 객체를 전송하려면 객체를 문자열화 해야 하는데 이를 직렬화(serializing)라 함.

```jsx
const obj = {
  name: "Lee",
  age: 20,
  alive: true,
  hobby: ["traveling", "tennis"]
};

const json = JSON.stringify(obj);
console.log(typeof json, json);
// string {"name":"Lee","age":20,"alive":true,"hobby":["traveling","tennis"]

const todos = [
  { id: 1, content: 'HTML', completed: false },
  { id: 2, content: 'CSS', completed: true },
  { id: 3, content: 'JavaScript', completed: false }
];

// 배열을 JSON 포맷의 문자열로 변환한다.
const json = JSON.stringify(todos, null, 2);
console.log(typeof json, json);
/*
string [
  {
    "id": 1,
    "content": "HTML",
    "completed": false,
  },
  ...
*/
```

## JSON.parse

JSON 포맷의 문자열을 객체로 변환함. 서버로부터 클라이언트에게 전송된 JSON 데이터는 문자열이므로 이를 객체로 사용하려면 JSON 포맷의 문자열을 객체화해야함.

```jsx

const obj = {
  name: "Lee",
  age: 20,
  alive: true,
  hobby: ["traveling", "tennis"]
};

// 객체를 JSON 포맷의 문자열로 변환한다.
const json = JSON.stringify(obj);

// JSON 포맷의 문자열을 객체로 변환한다.
const parsed = JSON.parse(json);
console.log(typeof parsed, parsed);
// object {name:"Lee",age:20,alive:true,hobby:["traveling","tennis"]

## const todos = [
  { id: 1, content: 'HTML', completed: false },
  { id: 2, content: 'CSS', completed: true },
  { id: 3, content: 'JavaScript', completed: false }
];

// 배열을 JSON 포맷의 문자열로 변환한다.
const json = JSON.stringify(todos);

// JSON 포맷의 문자열을 배열로 변환한다. 배열의 요소까지 객체로 변환된다.
const parsed = JSON.parse(json);
console.log(typeof parsed, parsed);
/*
  object [
    { id: 1, content: 'HTML', completed: false},
    ...
  ]
*/
```

## XMLHttpRequest 822p

브라우저는 주소창이나 HTML의 form 태그 또는 a 태그를 통해 HTTP 요청 전송 기능을 기본 제공함. 자바스크립트를 사용하여 HTTP 요청을 전송하려면 `XMLHttpRequest` 객체를 사용함.

### HTTP 요청 전송

1. XMLHttpRequest.prototype.open 메서드로 HTTP 요청을 초기화함
2. 필요에 따라 XMLHttpRequest.prototype.setRequestHeader 메서드로 특정 HTTP 요청의 헤더값 설정
3. XMLHttpRequest.prototype.send 메서드로 HTTP 요청을 전송함.

```jsx
const xhr = new XMLHttpRequest();

xhr.oepn('GET', '/users');

xhr.setRequestHeader('content-type', 'application/json');

xhr.send();
```
