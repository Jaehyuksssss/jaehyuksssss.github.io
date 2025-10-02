---
date: '2025-09-18'
title: 'javascript'
categories: ['TIL','Deep_Dive']
summary: '대규모 웹 애플리케이션 개발의 기초: 모듈화와 번들러'
thumbnail: '/deep-dive.png'
---

# 대규모 웹 애플리케이션 개발의 기초: 모듈화와 번들러

## 목차
- 대규모 애플리케이션, 모듈화의 필요성
- 전역 스코프 오염 문제와 극복 방법
- 모듈 패턴과 IIFE
- 마치며

## 1. 대규모 애플리케이션, 모듈화의 필요성

### 1.1 모듈이란?

**모듈(Module)**은 재사용 가능한 코드 단위입니다.
보통 파일 단위로 구성되며, 관련된 변수, 함수, 클래스 등을 캡슐화하여 외부에서 불필요하게 접근할 수 없도록 합니다.

ES6(ECMAScript 2015) 이후 자바스크립트는 export와 import 키워드를 도입해 모듈 간 의존성을 명시적으로 관리할 수 있게 되었습니다.

```javascript
// module.js
export const hello = () => console.log('Hello!');

// app.js
import { hello } from './module.js';
hello(); // Hello!
```

이렇게 명시적으로 의존성을 표현하면, 파일 간의 관계가 분명해지고 유지보수성이 크게 향상됩니다.

### 1.2 자바스크립트의 초기 한계

하지만 초기 자바스크립트에는 모듈 시스템이 없었습니다. 모든 변수와 함수가 전역 스코프(global scope)에 올라가면서 충돌 문제가 빈번했습니다.

```html
<!-- foo.js -->
<script>
  var shared = 1;
</script>

<!-- bar.js -->
<script>
  var shared = 2; // 기존 shared를 덮어씀
</script>
```

작은 프로젝트에서는 문제가 없지만, 대규모 애플리케이션에서는 네임스페이스 충돌, 예측 불가능한 버그, 협업 어려움으로 이어졌습니다.

## 2. 전역 스코프 오염 문제와 극복 방법

### 2.1 모듈 패턴과 IIFE

자바스크립트에 공식적인 모듈 시스템이 도입되기 전까지, 개발자들은 클로저와 **즉시 실행 함수(IIFE)**를 활용하여 모듈화를 흉내 냈습니다.

#### 모듈 패턴(Module Pattern)

```javascript
const CounterModule = (function () {
  let count = 0;

  return {
    increment() {
      count++;
      return count;
    },
    getCount() {
      return count;
    },
  };
})();

CounterModule.increment(); // 1
CounterModule.getCount();  // 1
```

- `count`는 외부에서 직접 접근할 수 없고
- 오직 `increment`, `getCount` 메서드를 통해서만 조작할 수 있습니다.
- 즉, **데이터 은닉(encapsulation)**과 공용 인터페이스 제공이라는 객체지향 개념을 자바스크립트로 구현한 것입니다.

#### IIFE (Immediately Invoked Function Expression)

IIFE는 선언과 동시에 실행되는 함수입니다.
전역 스코프를 오염시키지 않고, 함수 내부 스코프를 활용하여 캡슐화를 구현합니다.

```javascript
(function () {
  console.log('즉시 실행!');
})();
```

IIFE는 모듈 패턴의 기초가 되었으며, 코드 블록 단위의 독립 실행 환경을 만들어 전역 변수 충돌을 막는 데 널리 쓰였습니다.

#### IIFE를 활용한 모듈 패턴 예시

```javascript
const MyModule = (function () {
  const privateVar = '비공개';
  const publicVar = '공개';

  function getPrivateVar() {
    return privateVar;
  }

  return {
    publicVar,
    getPrivateVar,
  };
})();

console.log(MyModule.publicVar);        
console.log(MyModule.getPrivateVar());  
```

- 외부에서는 `publicVar`, `getPrivateVar`만 접근 가능
- `privateVar`는 은닉되어 외부 코드가 직접 접근할 수 없음

이 방식은 당시 전역 오염 문제를 피할 수 있는 사실상 유일한 방법이었습니다.

## 3. 마치며

이번 글에서는 자바스크립트 모듈화의 필요성과, 공식 모듈 시스템이 없던 시절에 사용되던 모듈 패턴과 IIFE를 살펴봤습니다.
이 과정을 통해 알 수 있는 점은 다음과 같습니다.

- 대규모 애플리케이션에서는 전역 스코프 의존은 반드시 피해야 한다.
- 클로저와 IIFE는 원시적인 모듈화 방식이지만, 당시에는 매우 효과적인 해결책이었다.
- ES6 모듈 시스템 도입은 이런 역사적 맥락 위에서 나온 발전이다.

### 다음 글에서 다룰 내용
- CommonJS vs AMD vs ESModules 비교
- 모듈 시스템과 번들러(Webpack, Vite 등)의 관계
- 번들러 최적화 기능: Tree Shaking, Code Splitting

### 참고
- [MDN - IIFE](https://developer.mozilla.org/ko/docs/Glossary/IIFE)
- 『모던 자바스크립트 Deep Dive』 - 48장
- [Webpack 공식 문서: Chunk Naming 가이드](https://webpack.js.org/configuration/output/#outputchunkfilename)
