---
date: '2022-06-06'
title: 'JavaScript'
categories: ['TIL','Deep_Dive']
summary: '21장 빌트인 객체'
thumbnail: '/blog/deep-dive.png'
---


# 21장.빌트인 객체
## 빌트인객체 
## 자바스크립트 객체의 분류
### 표준 빌트인 객체
Object , String , Number , Boolean , Symbol , Date , Math , RegExp , Array , Map/Set, WeakMap/ WeakSet, Function ,promise ,Reflect , Proxy ,JSON ,Error 등 40여 개의 표준 빌트인 객체를 제공한다.

표준 빌트인 객체는 ECMAScript 사양의 자바스크립트 실행 환경(브라우저/node.js)에서 모두 사용 가능한 공통 객체이다.

## 내 방식대로 정리한거

자바스크립트 내장 객체를 말함

개발자가 모든 기능을 구현하지않고, 편하게 개발할 수 있도록 자바스크립트에서 기본적으로 제공하는 객체
호스트 객체
호스트 객체는 ECMAScript 사양에 정의되어 있지 않지만 자바스크립트 실행 환경에서 추가로 제공하는 객체를 말한다.

브라우저 환경에서는 DOM,Canvas,BOM,XMLHttpRequest,fetch ,requestAnimationFrame,SVG,Web Storage,Web Component , Web Worker 같은 Web API를 호스트 객체로 제공하고 , Node.js 환경에서는 Node.js 고유의 API를 호스트 객체로 제공한다.

## 내 방식대로 정리한거

ECMAScript 사양에 정의되어 있지 않음 , JS 실행 환경에서 추가로 제공하는 객체

웹페이지 제어 및 동작을 추가하기위한 공통의 기능을 제공함 (브라우저 환경에서는 클라이언트 사이드 Web API를 호스트 객체로 제공하고 , Node.js 환경에서는 Node.js 고유의 API를 호스트 객체로 제공한다.)
사용자 정의 객체
사용자 정의 객체는 표준 빌트인 객체와 호스트 객체처럼 기본 제공되는 객체가 아닌 사용자가 직접 정의한 객체를 말한다.

## 표준 빌트인 객체
```
var num = 3.14;
console.log(typeof num);//number;

// 위 num 변수의 타입은 number이고 타입이 number라면 Number객체를 별도로 생성하지 않아도
//Number객체의 프로퍼티와 메서드를 사용할 수 있다.
// String 생성자 함수에 의한 String 객체 생성
const strObj = new String('Lee'); // String {"Lee"}

// String 생성자 함수를 통해 생성한 strObj 객체의 프로토타입은 String.prototype이다.
console.log(Object.getPrototypeOf(strObj) === String.prototype); // true 
```
생성자 함수인 표준 빌트인 객체(String)가 생성한 인스턴스의 프로토타입은 표준빌트인 객체의 prototype 프로퍼티에 바인딩 된 객체다.

예를 들면 표준 빌트인 객체인 String을 생성자 함수로서 호출하여 생성한 String 인스턴스의 프로토타입은 String.protype이다.

## 원시값과 래퍼 객체

문자열, 숫자, 불리언 등의 원시값이 있는데도 String, Number, Boolean등의 표준 빌트인 생성자 함수가 존재하는 이유가 뭘까? 에 대해 알아보겠습니다.
```
const str = 'hello';

// 원시 타입인 문자열이 프로퍼티와 메서드를 갖고 있는 객체처럼 동작한다.
console.log(str.length); // 5
console.log(str.toUpperCase()); // HELLO
```
위 예제와 같이 str은 원시값인 문자열을 담은 변수인데, str.length, str.toUpperCase()와 같이 프로퍼티와 메서드를 호출할 수 있다.

이는 원시값에 객체처럼 마침표 표기법으로 접근하면 자바스크립트 엔진이 일시적으로 원시값을 연관된 객체로 변환해 주기 때문이다.

즉, 원시값을 객체처럼 사용하면 자바스크립트 엔진은 암묵적으로 연관된 객체를 생성하여 생성된 객체로 프로퍼티에 접근하거나 메서드를 호출하고 다시 원시값으로 되돌린다.

이러한 임시 객체를 래퍼 객체(wrapper object)라고 한다.
```
var str = 'abcde';
str.len = 5; // new String(str).len = 5

console.log(str.len); // undefined
```

```
const str = 'hi';

// 원시 타입인 문자열이 래퍼 객체인 String 인스턴스로 변환된다.
console.log(str.length); // 2
console.log(str.toUpperCase()); // HI

// 래퍼 객체로 프로퍼티에 접근하거나 메서드를 호출한 후, 다시 원시값으로 되돌린다.
console.log(typeof str); // string
```

## 내 방식대로 정리한거

원시값이 있는데 래퍼 객체를 생성하는 표준 빌트인 생성자 함수 따로 존재하는 이유?

- JS 엔진이 일시적으로 원시값을 연관된 객체로 변환해줌 (원시 타입으로 프로퍼티나 메서드 사용 가능)

원시값을 객체처럼 사용 시 JS 엔진은 암묵적으로 연관된 객체를 생성하여 생성된 객체로

프로퍼티에 접근하거나 메서드를 호출하고 다시 원시값으로 되돌림

- 문자열, 숫자, 불리언 값에 대해 객체처럼 접근하면 생성되는 임시 객체 => 래퍼 객체

전역객체
전역 객체 는 코드가 실행되기 이전 단계에 자바스크립트 엔진에 의해 어떤 객체보다도 먼저 생성되는 특수한 객체이며, 어떤 객체에도 속하지 않은 최상위 객체다.

브라우저 환경에서는 window, Node.js 환경에서는 global이다.

## 전역 객체의 프로퍼티

표준 빌트인 객체(Object, String, Number, Function, Array등)
- 환경에 따른 호스트 객체(클라이언트 Web API, Node.js의 호스트 API)
- var키워드로 선언한 전역 변수
- 전역 함수
- 내 방식대로 정리한거

전역 객체는 계층적 구조상 어떤 객체에도 속하지 않은 모든 빌트인 객체의 최상위 객체(표준 빌트인 객체 , 호스트객체)

## 전역 객체의 특징

전역 객체는 개발자가 의도적으로 생성할 수 없다. 즉, 전역 객체를 생성할 수 있는 생성자 함수가 제공되지 않는다.
전역 객체의 프로퍼티를 참조할 때 window(또는 global)를 생략할 수 있다.
빌트인 전역 프로퍼티
빌트인 전역 프로퍼티는 전역 객체의 프로퍼티를 의미한다.

Infinity

무한대를 나타내는 숫자값 Infinity를 가짐
number 타입
- NaN

Not a Number (숫자가 아님)를 나타냄
Number.NaN 과 동일
number 타입
- undefined

원시 타입 undefined를 값으로 가짐
undefined 타입
빌트인 전역 함수
빌트인 전역 함수는 애플리케이션 전역에서 호출할 수 있는 빌트인 함수로서 전역 객체의 메서드다.

eval

JS 코드를 나타내는 문자열을 인수로 전달받음
전달받은 문자열 코드가 표현식이라면 eval 함수는 문자열 코드를 런타임에 평가하여 값 생성
표현식이 아닌 문이면 eval 함수는 문자열 코드를 런타임에 실행함
- 변수 선언문은 표현식이 아닌 문임

- 객체 리터럴, 함수 리터럴은 반드시 소괄호로 둘러쌈

- eval 함수는 자신이 호출된 위치에 해당하는 기존의 스코프를 런타임에 동적으로 수정함

- strict mode 에서 eval 함수는 기존의 스코프 수정하지 않고 eval 함수 자신의 자체적인 스코프 생성

- 인수로 전달받은 문자열 코드가 let, const 키워드 사용한 변수 선언문 => 암묵적으로 strict mode 적용됨

- eval 함수 사용 금지! (보안 취약, JS 엔진 최적화 안되어 처리 속도 느림)

- isFinite

전달받은 인수가 정상적인 유한수인지 체크
전달받은 인수 타입이 숫자가 아니면 숫자로 타입 변환 후 검사 수행
- null 을 숫자 타입으로 변환하면 0

- isNaN

전달받은 인수가 NaN인지 검사
전달받은 인수 타입이 숫자가 아니면 숫자로 타입 변환 후 검사 수행
- parseFloat

전달받은 문자열 인수를 부동 소수점 숫자(실수)로 해석하여 반환
- parseInt

전달받은 문자열 인수를 정수로 해석하여 반환
전달받은 인수가 문자열이 아니면 문자열로 변환 후 정수로 해석해서 반환
두번째 매개변수(기수) 생략 시 첫번째 인수로 전달된 문자열을 10진수로 해석해서 반환
- 결과는 항상 10진수 정수로 반환

기수를 지정하여 10진수 숫자를 해당 기수의 문자열로 변환하고 싶으면 Number.prototype.toString() 이용
두번째 매개변수 지정 안하고 첫번째 매개변수의 문자열이 16진수 리터럴이면 그에 맞게 해석해줌 (0x)
2, 8진수는 제대로 해석 못함 (0b, 0o 불가)
- encodeURI / decodeURI

- encodeURI: 완전한 URI를 문자열로 전달받아 이스케이프 처리를 위한 인코딩

- URI: 인터넷에 있는 자원을 나타내는 유일한 주소 (URL, URN은 URI의 하위 개념)

- 인코딩: URI의 문자들을 이스케이프 처리하는 것

- 이스케이프 처리: 네트워크를 통해 정보 공유 시 어떤 시스템에서도 읽을 수 있는 아스키 문자 셋으로 변환

- UTF-8: 특수 문자는 1~3바이트, 한글은 3바이트

- decodeURI: 인코딩된 URI를 인수로 전달받아 이스케이프 처리 이전으로 디코딩

- encodeURIComponent / decodeURIComponent

- encodeURIComponent: URI component를 인수로 전달받아 인코딩

인수로 전달된 문자열을 URI의 구성 요소인 쿼리 스트링의 일부로 간주 (쿼리 스트링 구분자까지 인코딩)
- encodeURI 함수는 쿼리 스트링 구분자는 인코딩하지 않음 (URI 전체로 간주)

- 쿼리 스트링 구분자: =, ?, &

- decodeURIComponent: 매개변수로 전달된 URI component를 디코딩

# 암묵적 전역
전역 객체에 프로퍼티를 동적으로 생성
전역 변수처럼 동작하지만 변수는 아님! => 호이스팅 발생하지 않음!!!
전역 객체의 프로퍼티 이므로 delete 연산자로 삭제 가능
전역 변수는 delete 연산자로 삭제 불가
전역 프로퍼티와 전역 변수는 다른 개념!
전역 변수도 window 붙여서 사용 가능y는 전역에 선언되지 않았음에도 참조되어 foo는 30을 출력한다.이는 변수가 아니다. window.y = 20 처럼 해석되어, 전역객체의 프로퍼티가 되는 것이다.y는 변수가 아니므로 호이스팅이 발생하지 않는다!
이러한 현상을 implicit global, 암묵적 전역 이라 한다.
선언하지 않은 식별자에 값을 할당하면 전역객체의 '프로퍼티' 가 된다.
```
var x = 10; function foo(){ y = 20; console.log(x+y); } foo(); // 30
// 전역 변수 x는 호이스팅이 발생한다.
console.log(x); // undefined
// 전역 변수가 아니라 단지 전역 프로퍼티인 y는 호이스팅이 발생하지 않는다.
console.log(y); // ReferenceError: y is not defined

var x = 10; // 전역 변수

function foo () {
  // 선언하지 않은 변수
  y = 20;
  console.log(x + y);
}

foo(); // 30
``` 