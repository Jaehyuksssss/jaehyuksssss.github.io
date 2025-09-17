---
date: '2025-09-17'
title: 'TypeScript'
categories: ['TIL','typescript']
summary: 'TypeScript에서 enum을 지양하는 이유와 대안'
thumbnail: '/blog/typescript.png'
---

# TypeScript에서 enum을 지양하는 이유와 대안

## 목차
- enum이란?
- enum의 문제점
- 대안 방법들
- 마치며

## 1. enum이란?

### 1.1 기본 사용법

TypeScript는 자바스크립트에 타입 시스템을 얹으면서, 기존 언어(C#, Java 등)에서 친숙한 기능들을 일부 도입했습니다.
그중 하나가 바로 **enum**입니다.

enum은 의미 있는 상수들을 묶어서 관리할 수 있게 해주고, IDE 자동완성과 타입 안정성까지 제공하니 매력적으로 보입니다.

```typescript
// 기본 숫자 enum
enum Days {
  Monday,   // 0
  Tuesday,  // 1
  Wednesday // 2
}

// 문자열 enum
enum Days {
  Monday = 'Monday',
  Tuesday = 'Tuesday'
}
```

- `Days.Monday` 같은 형태로 사용 가능
- 숫자 또는 문자열 값을 가질 수 있음
- 타입처럼 활용할 수 있어서 임의 입력으로 인한 버그를 줄여줌

### 1.2 enum의 장점

enum은 다음과 같은 장점을 제공합니다:

- **가독성**: 의미 있는 이름으로 상수를 표현
- **자동완성**: IDE에서 자동완성 지원
- **타입 안정성**: 컴파일 타임에 타입 체크
- **리팩토링**: 이름 변경 시 자동으로 모든 참조 업데이트

## 2. enum의 문제점

하지만 실무에서 깊이 써보면 문제점이 드러납니다. 그래서 대규모 애플리케이션에서는 오히려 enum을 지양하고 다른 방법을 택하는 경우가 많습니다.

### 2.1 JavaScript에 없는 기능을 억지로 구현

TypeScript는 enum을 JavaScript에서 흉내 내기 위해 IIFE(즉시 실행 함수)를 사용합니다.

```typescript
enum Days { Monday, Tuesday }
```

↓ 트랜스파일 결과

```javascript
"use strict";
var Days;
(function (Days) {
  Days[Days["Monday"] = 0] = "Monday";
  Days[Days["Tuesday"] = 1] = "Tuesday";
})(Days || (Days = {}));
```

- 불필요하게 즉시 실행 함수와 객체 생성 코드가 추가됨
- 코드 런타임 비용이 증가

### 2.2 Tree-shaking 불가

Tree-shaking은 사용하지 않는 코드를 최종 번들에서 제거하는 최적화 기법입니다.

그러나 enum은 IIFE로 감싸져 있기 때문에 번들러(Rollup, Webpack 등)가 "사용하지 않는다"고 판단하지 못합니다.

→ import만 해도 모든 enum 값이 최종 번들에 포함됩니다.
→ 대규모 프로젝트일수록 번들 크기 부담으로 이어집니다.

### 2.3 타입 안전성 허점

enum은 선언되지 않은 key에 접근할 때 컴파일 단계에서 잡아내지 못합니다.

```typescript
enum Days { Monday, Tuesday }

console.log(Days[100]);       // undefined (에러 아님)
console.log(Days['NotDay']);  // undefined (에러 아님)
```

즉, 타입스크립트가 제공하는 안정성이 깨질 수 있습니다.

## 3. 대안

### 3.1 Union Types + as const (가장 추천)

가장 추천되는 방식은 문자열 리터럴 유니온 타입입니다.

```typescript
const DAYS = {
  Monday: 'Monday',
  Tuesday: 'Tuesday'
} as const;

type Days = typeof DAYS[keyof typeof DAYS]; 
// 'Monday' | 'Tuesday'
```

↓ 트랜스파일 결과

```javascript
"use strict";
const DAYS = { Monday: "Monday", Tuesday: "Tuesday" };
```

**장점:**
- JS에서는 단순 객체, 런타임 부하 없음
- TS에서는 'Monday' | 'Tuesday' 타입으로 안전성 확보
- Tree-shaking 완벽 지원
- 현실적으로 가장 많이 쓰이는 대안입니다.

### 3.2 const enum

const enum은 컴파일 시점에 값으로 치환됩니다.

```typescript
const enum Direction { Up, Down }
console.log(Direction.Up);
```

↓ 트랜스파일 결과

```javascript
"use strict";
console.log(0 /* Up */);
```

**장점:**
- 런타임 객체가 없어 성능 최적화에 유리
- Tree-shaking 문제 없음
- 존재하지 않는 키 접근 시 에러 발생

**단점:**
- Babel은 기본적으로 지원하지 않음 → babel-plugin-const-enum 필요
- preserveConstEnums 옵션을 켜지 않으면 enum 객체가 생성되지 않아 디버깅이 어려움

### 3.3 Object.freeze() 활용

```typescript
const DAYS = Object.freeze({
  Monday: 'Monday',
  Tuesday: 'Tuesday'
} as const);

type Days = typeof DAYS[keyof typeof DAYS];
```

이 방식은 객체를 불변으로 만들어 실수로 값을 변경하는 것을 방지합니다.

## 4. enum vs const enum vs Union Types 비교

### 4.1 코드 & 트랜스파일 결과

**일반 enum**
```typescript
enum Days { Monday, Tuesday }
```

```javascript
var Days;
(function (Days) {
  Days[Days["Monday"] = 0] = "Monday";
  Days[Days["Tuesday"] = 1] = "Tuesday";
})(Days || (Days = {}));
```

**const enum**
```typescript
const enum Direction { Up, Down }
console.log(Direction.Up);
```

```javascript
console.log(0 /* Up */);
```

**Union Types**
```typescript
const DAYS = { Monday: 'Monday', Tuesday: 'Tuesday' } as const;
type Days = typeof DAYS[keyof typeof DAYS];
```

```javascript
const DAYS = { Monday: "Monday", Tuesday: "Tuesday" };
```

### 4.2 성능 및 번들 크기 비교

| 방식 | 런타임 객체 | Tree-shaking | 타입 안전성 | 번들 크기 |
|------|-------------|--------------|-------------|-----------|
| enum | 있음 | 불가 | 부분적 | 큼 |
| const enum | 없음 | 가능 | 높음 | 작음 |
| Union Types | 있음 | 가능 | 높음 | 작음 |

## 5. 마치며

enum은 문법적으로는 편리해 보이지만, 번들 크기와 타입 안정성 측면에서는 위험 요소가 많습니다.

대규모 애플리케이션일수록 Tree-shaking과 타입 안정성이 중요한 만큼, enum 대신 Union Types를 우선적으로 고려하고, 성능 최적화가 필요하다면 const enum을 보조적으로 사용하는 것이 현실적인 선택입니다.

### 추천 순서
1. **Union Types** (가장 추천)
2. **const enum** (성능 최적화 필요시)
3. **enum** (지양)

### 참고
- [TypeScript 공식 핸드북 - Enums](https://www.typescriptlang.org/docs/handbook/enums.html)
- [Rollup Tree-shaking Guide](https://rollupjs.org/guide/en/#tree-shaking)
- 『Effective TypeScript』 - Item 48
