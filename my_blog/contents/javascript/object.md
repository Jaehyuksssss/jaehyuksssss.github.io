---
date: '2022-06-04'
title: 'JavaScript'
categories: ['TIL','Deep_Dive']
summary: '10장 객체 리터럴'
thumbnail: '/deep-dive.png'
---

# 10장 객체 리터럴
## 객체
## 1. 객체란?
자바스크립트는 객체 기반의 프로그래밍 언어이며, 자바스크립트를 구성하는 거의 "모든 것"이 객체다. 원시 값을 제외한 나머지 값(함수, 배열, 정규 표현식 등)은 모두 객체다.

>원시 타입 값(원시값): 변경 불가능한 값(immutable value)

객체 타입의 값 (객체): 변경 가능한 값(mutable value) (함수, 배열, 정규 표현식 등 원시 값 제외 나머지)

객체: 프로퍼티로 이루어짐. 프로퍼티는 키와 값으로 구성.

프로퍼티 : 객체의 상태를 나타내는 값 (data)
메서드: 프로퍼티를 참조하고 조작할 수 있는 동작 (behavior)
(프로퍼티값이 함수일 경우, 일반함수와 구분하기 위해 메서드라고 부름)

## 2. 객체 리터럴에 의한 객체 생성
c,자바 언어: 클래스 기반 객체지향 언어

자바스크립트: 프로토타입 기반 객체지향 언어

차이점 : 클래스 기반 객체지향 언어와는 달리 다양한 객체 생성 방법을 지원

객체 리터럴
Object 생성자 함수
생성자 함수
Object.create 메서드
클래스(ES6)
객체 리터럴 : =값으로 평가되는 표현식 ≠ 코드블록

닫는 중괄호 뒤에 세미콜론(;)을 붙임

## 3. 프로퍼티
객체: 프로퍼티의 집합이며, 프로퍼티는 키와 값으로 구성
```
var person = {
  // 프로퍼티 키는 name, 프로퍼티 값은 'Lee'
  name: 'Lee',
  // 프로퍼티 키는 age, 프로퍼티 값은 20
  age: 20
};
```
프로퍼티 나열할 때 쉼표(,)로 구분
프로퍼티 키: 빈 문자열을 포함하는 모든 문자열 또는 심벌 값(이외의 값을 사용하면 암묵적 타입변환을 통해 문자열됨)
프로퍼티 값: 자바스크립트에서 사용할 수 있는 모든 값
식별자 네이밍 규칙을 따르지 않는 이름은 따옴표 사용
>에러 상황
```
var person = {
  firstName: 'Jae-hyuk',
  last-name: 'LIM' // SyntaxError: Unexpected token -
}; //last-name을 -연산자가 있는 표현식으로 해석
```
>따옴표 사용
```
var person = {
  firstName: 'Jae-hyuk', // 식별자 네이밍 규칙을 준수하는 프로퍼티 키
  'last-name': 'LIM' // 식별자 네이밍 규칙을 준수하지 않는 프로퍼티 키
};

console.log(person); // {firstName: 'Jae-hyuk', last-name: 'LIM'}
```
표현식을 사용해 프로퍼티 키를 동적으로 생성 가능

>상황: 빈 객체에 {hello: "world"}를 만들고 싶다면?!
```
var obj = {}; // 1. 객체 생성
var key = 'hello'; // 2. 키 네이밍

obj[key] = 'world'; // 3. 키에 값 부여
console.log(obj); //{hello:"world"}

1.객체 생성 var object = {};
2.키 네이밍 var key = '키네임';
3.값 부여 var obj[key] = 'value';

object = {키네임 : "value"};
중복 선언하면 덮어씀
var foo = {
name : "Lee",
name : "Kim"
};

console.log(foo); // {name: "Kim"}
```

## 4.메서드

자바스크립트의 함수는 객체일급 객체이기 때문에 값으로 취급되어 프로퍼티 값으로 사용할 수 있다.
이러한 경우 메서드method라고 부른다.
```
var circle = {
  radius: 5, // ← 프로퍼티

  // 원의 지름
  getDiameter: function () { // ← 메서드
    return 2 * this.radius; // this는 circle을 가리킨다.
  }
};

console.log(circle.getDiameter()); // 10
```


## 5.프로퍼티 접근

>프로퍼티에 접근하는 방법은 두 가지다.

- 마침표 프로퍼티 접근 연산자.를 사용하는 마침표 표기법dot notation
- 대괄호 프로퍼티 접근 연산자[]를 사용하는 대괄호 표기법bracket notation
```
var person = {
  name: 'Lee'
};

// 마침표 표기법에 의한 프로퍼티 접근
console.log(person.name); // Lee

// 대괄호 표기법에 의한 프로퍼티 접근
console.log(person['name']); // Lee
```
>대괄호 프로퍼티 접근 연산자[] 내부에 지정하는 프로퍼티 키는 반드시 따옴표('', "")로 감싼 문자열이어야 한다. 만약 따옴표로 감싸지 않으면 자바스크립트 엔진은 식별자로 해석한다.
```
var person = {
  name: 'Lee'
};

console.log(person[name]); // ReferenceError: name is not defined
```
객체에 존재하지 않는 프로퍼티에 접근하면 undefined를 반환한다. ReferenceError가 발생되지 않음!!

```
var person = {
  name: 'Lee'
};

console.log(person.age); // undefined
```

```
var person = {
  'last-name': 'Lee',
  1: 10
};

person.'last-name';  // -> SyntaxError: Unexpected string
person.last-name;    // -> 브라우저 환경: NaN
                     // -> Node.js 환경: ReferenceError: name is not defined
person[last-name];   // -> ReferenceError: last is not defined
person['last-name']; // -> Lee

// 프로퍼티 키가 숫자로 이뤄진 문자열인 경우 따옴표를 생략할 수 있다.
person.1;     // -> SyntaxError: Unexpected number
person.'1';   // -> SyntaxError: Unexpected string
person[1];    // -> 10 : person[1] -> person['1']
person['1'];  // -> 10
```
>위 예제에서 person.last-name의 실행결과가 브라우저와 Node.js 환경이 다른 이유는??
person.last-name을 평가할 때 자바스크립트 엔진은 person.last를 먼저 평가하는데,
브라우저 환경에는 window객체에 name의 프로퍼티가 암묵적으로 전재하고 기본값은 빈 문자열이다.
이에 반해 Node.js 환경에서는 전역변수 name이 존재하지 않기 대문에 ReferenceError가 발생한다.

## 6.프로퍼티 값 갱신

이미 존재하는 프로퍼티에 값을 할당하면 프로퍼티 값이 갱신된다.
```
var person = {
  name: 'Lee'
};

// person 객체에 name 프로퍼티가 존재하므로 name 프로퍼티의 값이 갱신된다.
person.name = 'Kim';

console.log(person);  // {name: "Kim"}
```
## 7. 프로퍼티 동적 생성
존재하지 않는 프로퍼티에 값을 할당하면 프로퍼티가 동적으로 생성되어 추가되고 프로퍼티 값이 할당된다.
```
var person = {
		name : 'Lee'
};
// person 객체에는 age 프로퍼티가 존재하지 않는다.
// 따라서 person 객체에 age 프로퍼티가 동적으로 생성되고 값이 할당된다.
person.age = 20;
console.log(person); // {name : 'Lee', age : 20}
```
## 8. 프로퍼티 삭제
delete 연산자는 객체의 프로퍼티를 삭제한다.
이때 delete 연산자의 피연산자는 프로퍼티 값에 접근할 수 있는 표현식이어야 한다.
만약 존재하지 않는 프로퍼티를 삭제하면 아무런 에러 없이 무시된다.
```
var person = {
		name : 'Lee'
};
// 프로퍼티 동적 생성
person.age = 20;

// person 객체에 age 프로퍼티가 존재한다.
// 따라서 delete 연산자로 age 프로퍼티를 삭제할 수 있다.
delete person.age;

// person 객체에 address 프로퍼티가 존재하지 않는다.
// 따라서 delete 연산자로 address 프로퍼티를 삭제할 수 없다. 이때 에러가 발생하지 않는다.
delete person.address;

console.log(person);
```
## 9. ES6에서 추가된 객체 리터럴의 확장 기능
ES6에서는 더욱 간편하고 표현력 있는 객체 리터럴의 확장 기능을 제공한다.
>9.1 프로퍼티 축약 표현
객체 리터럴의 프로퍼티는 프로퍼티 키와 프로퍼티 값으로 구성된다.
프로퍼티 값은 변수에 할당된 값, 즉 식별자 표현식일 수도 있다.
```
// ES5
var x = 1, y = 2;

var obj = {
	x : x,
	y : y
};            

console.log(obj); // {x : 1, y : 2}
```
ES6에서는 프로퍼티 값으로 변수를 사용하는 경우 변수 이름과 프로퍼티 키가 동일한 이름일 때 프로퍼티 키를 생략할 수 있다.
이때 프로퍼티 키는 변수 이름으로 자동 생성된다.
```
// ES6
var x = 1, y = 2;

var obj = { x, y };

console.log(obj); // {x : 1, y : 2}
```
>9.2 계산된 프로퍼티 이름
문자열 또는 문자열로 타입 변환할 수 있는 값으로 평가되는 표현식을 사용해 프로퍼티 키를 동적으로 생성할 수도 있다.
단, 프로퍼티 키로 사용할 표현식을 대괄호([…])로 묶어야 한다.
이를 계산된 프로퍼티 이름이라 한다.
ES5에서 계산된 프로퍼티 이름으로 프로퍼티 키를 동적 생성하려면 객체 리터럴 외부에서 대괄호([…]) 표기법을 사용해야 한다.
```
// ES5
var prefix = 'prop';
var i = 0;

var obj = {};

// 계산된 프로퍼티 이름으로 프로퍼티 키 동적 생성
obj[prefix + '-' + ++i] = i;
obj[prefix + '-' + ++i] = i;
obj[prefix + '-' + ++i] = i;

console.log(obj); // {prop-1 : 1, prop-2 : 2, prop-3 : 3}
```
ES6에서는 객체 리터럴 내부에서도 계산된 프로퍼티 이름으로 프로퍼티 키를 동적 생성할 수 있다.
```
// ES6
var prefix = 'prop';
var i = 0;

var obj = {
	[`${prefix}-${++i}`] : i,
	[`${prefix}-${++i}`] : i,
	[`${prefix}-${++i}`] : i,
};

// 계산된 프로퍼티 이름으로 프로퍼티 키 동적 생성
obj[prefix + '-' + ++i] = i;
obj[prefix + '-' + ++i] = i;
obj[prefix + '-' + ++i] = i;

console.log(obj); // {prop-1 : 1, prop-2 : 2, prop-3 : 3}
```
>9.3 메서드 축약 표현
ES5에서 메서드를 정의하려면 프로퍼티 값으로 함수를 할당한다.
```
// ES5
var obj = {
	name : 'Lee',
	sayHi : function() {
		console.log('Hi' + this.name);
	}
};

obj.sayHi(); // Hi! Lee
ES6에서는 메서드를 정의할 때 function 키워드를 생략한 축약 표현을 사용할 수 있다.
// ES6
var obj = {
	name : 'Lee',
	// 메서드 축약 표현
	sayHi() {
		console.log('Hi' + this.name);
	}
};

obj.sayHi(); // Hi! Lee
```
ES6의 메서드 축약 표현으로 정의한 메서드는 프로퍼티에 할당한 함수와 다르게 동작한다.