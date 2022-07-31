---
date: '2022-07-22'
title: 'JavaScript'
categories: ['TIL','Deep_Dive']
summary: '16장 프로퍼티 어트리뷰트'
thumbnail: './deep-dive.png'
---
# 16장 프로퍼티 어트리뷰트
## 프로퍼티어트리뷰트

## 1. 내부 슬롯과 내부 메서드
내부 슬롯과 내부 메서드는 자바스크립트 엔진의 구현 알고리즘을 설명하기 위해 ECMAScript 사양에서 사용하는 의사 프로퍼티와 의사 메서드다.

내부 슬롯과 내부 메서드는 ECMAScript 사양에 정의된 대로 구현되어 자바스크립트 엔진에서 실제로 동작하지만, 개발자가 직접 접근할 수 있도록 외부적으로 공개된 객체의 프로퍼티는 아니다. 단, 일부 내부 슬롯과 내부 메서드에 한하여 간접적으로 접근할 수 있는 수단을 제공하기도 한다. 

내부 슬롯과 메서드는 이중 대괄호 [[...]] 로 감싼 형태이다. 예를 들어 모든 객체는 [[Prototype]]이라는 내부 슬롯을 가진다.

내부 슬롯은 자바스크립트 엔진의 내부 로직이므로 원칙적으로 직접 접근 할 수 없지만 [[Prototype]] 내부 슬롯의 경우 , __proto__ 를 통해 간접적으로 접근 할 수 있다.

```
const o = {};
// 내부 슬롯은 자바스립트 엔진의 내부 로직이므로 직접 접근할 수 없다.
o.[[Prototype]] // uncaught SyntaxError : Unexpected token '['
//단,일부 내부 슬롯과 내부 메서드에 한하여 간접적으로 접근 할 수 있는 수단을 제공하기는 한다.
o.__proto__ // -> Object.prototype
```


## 2. 프로퍼티 어트리뷰트와 프로퍼티 디스크립터 객체
자바스크립트 엔진은 프로퍼티를 생성 시 프로퍼티의 상태(value, writable, enumerable, configurable)를 나타내는 프로퍼티 어트리뷰트를 기본적으로 자동 정의. 직접 접근할 수 없지만 Object.getOwnPropertyDescriptor 메서드를 사용해서 간접적으로 확인은 가능.
```
프로퍼티의 상태란 프로퍼티의 값(value), 값의 갱신 가능 여부(writable), 열거 가능 여부(enumerable), 재정의 가능 여부(configurable)를 말한다.
```
따라서 프로퍼티 어트리뷰트(상태)는 자바스크립트 엔진이 관리하는 내부상태 값인 내부 슬롯 [[value]], [[writable]], [[Enumerable]], [[Configurable]]이다. (바로 얘들이 내부 슬롯 중 간접적으로 접근할 수 있는 일부에 속한다.)

 

프로퍼티 어트리뷰트에 직접 접근할 수 없지만 Object.getOwnPropertyDescriptor 메서드를 사용하여 간접적으로 확인할 수는 있다.
```
const person = {
  name: "LEE",
  age: 25
}

// 프로퍼티 어트리뷰트 정보를 제공하는 프로퍼티 디스크립터 객체를 반환한다.
console.log(Object.getOwnPropertyDescriptor(person, 'name'))
// {value: 'LEE', writable: true, enumerable: true, configurable: true}


// 모든 프로퍼티의 프로퍼티 어트리뷰트 정보를 제공하는 프로퍼티 디스크립터 객체를 반환한다.
console.log(Object.getOwnPropertyDescriptors(person))
/*
{
  age: { value: 25, writable: true, enumerable: true, configurable: true },
  name: { value: 'LEE', writable: true, enumerable: true, configurable: true }
}
*/
```

Object.getOwnPropertyDescriptor 메서드는 프로퍼티 어트리뷰트 정보를 제공하는 프로퍼티 디스크립터 객체를 반환한다.

Object.getOwnPropertyDescriptors는 모든 프로퍼티 어트리뷰트의 정보를 제공한다.

 ## 3.데이터 프로퍼티와 접근자 프로퍼티

- 데이터 프로퍼티란?
키와 값으로 구성된 일반적인 프로퍼티. 일반적으로 우리가 생각하는 그 프로퍼티이다.
- 접근자 프로퍼티란?
자체적으로는 값을 가지고 있지 않고, 다른 데이터 프로퍼티의 값을 읽거나 저장할 때 호출되는 접근자 함수로 구성된 프로퍼티

(1) 데이터 프로퍼티 
데이터 프로퍼티는 다음과 같은 프로퍼티 어트리뷰트를 갖는다. 이 프로퍼티 어트리뷰트는 자바스크립트 엔진이 프로퍼티를 생성할 때 기본값으로 자동 정의된다.
- [[Value]] : 프로퍼티 키를 통해 값에 접근하면 반환되는 값
- [[Writable]] : 프로퍼티 값의 변경 가능 여부를 나타내벼 불리언 값을 갖는다.
- [[Enumerable]]: 프로퍼티 열거 가능 여부
- [[Configuralbe]] : 재정의 가능 여부

```
const person ={
  name : 'LIM'
}
//프로퍼티 어트리뷰트 정보를 제공하는 프로퍼티 디스크립터 객체를 취득한다.
console.log(Object.getOwnPropertyDescriptor(person,'name'));
//{value:"LIM",writable:true ,emurable:true, configurable:true}
```
프로퍼티가 생성될 때 [[Value]]의 값은 프로퍼티 값으로 초기화 [[Writable]] 등의 값은 true로 초기화. 이것은 프로퍼티를 동적으로 추가해도 마찬가지.
(2)접근자 프로퍼티 
접근자 프로퍼티는 자체적으로는 값을 갖지 않고 다른 데이터프로퍼티의 값을 읽거나 저장할 때 호출되는 접근자 함수로 구성된 프로퍼티
- [[Get]] //get // 접근자 프로퍼티를 통해 데이터 프로퍼티의 값을 읽을 때 호추로디는 접근자 함수. 접근자 프로퍼티 키로 프로퍼티 값에 접근하면 프로퍼티 어트리뷰트 [[Get]]의 값, 즉 getter함수가 호출되고 그 결과가 프로퍼티 값으로 반환.
- [[Set]] //set// 접근자 프로퍼티를 통해 데이터 프로퍼티의 값을 저장할 때 호출되는 접근자 함수. 즉, 접근자 프로퍼티 키로 프로퍼티 값을 저장하면 프로퍼티 어트리뷰트 [[Set]]의 값, 즉 setter 함수가 호출되고 그 결과가 프로퍼티 값으로 저장된다.
- [[Enumerable]] // enumerable // 위와 동일
- [[Configurable]] // configurable // 위와 동일

접근자 함수는 getter/setter 함수라고도 부른다. 접근자 프로퍼티는 getter와 setter 함수를 모두 정의할 수도 있고 하나만 정의할 수도 있다.
```
const person = {
  // 데이터 프로퍼티
  firstname: "Junmyung",
  lastname: "Lee",

  // 이 밑부터는 접근자 프로퍼티!
  // fullName은 접근자 함수로 구성된 접근자 프로퍼티
  // getter
  get fullName() {
    return `${this.firstname} ${this.lastname}`;
  },

  // setter
  set fullName(name) {
    //  이 할당 방법은 '배열 디스트럭처링' 할당 방법
    [this.firstname, this.lastname] = name.split(' ');
  }
};

// (1) 데이터 프로퍼티를 통한 참조
console.log(person.firstname + ' ' + person.lastname);
// = Junmyung Lee

// (2) setter 함수를 통한 값의 저장
person.fullName = 'kyungsoo Lee';
console.log(person)
// = {firstname: 'kyungsoo', lastname: 'Lee'}

// (3) getter 함수를 통한 값의 참조
console.log(person.fullName)
// = kyungsoo Lee
```
## get과 set 함수를 통해, 데이터 프로퍼티를 이용한 연산이 가능하다.

 

- getter 함수를 통해 객체 내의 데이터 프로퍼티를 활용해 반환해줄 수 있다.
- setter 함수를 통해 객체 내의 데이터 프로퍼티의 값을 재할당 해줄 수 있다.
 

get과 set 의 함수명을 fullname 으로 해주어도 되고, firstname 혹은 lastname 처럼 데이터 프로퍼티와 동일한 이름의 함수를 해줘도 된다. ( 이 때는 해당 데이터 프로퍼티를 get 하고 set 하는 데에 주로 쓰인다.)

## 프로토 타입 
프로토타입은 어떤 객체의 상위(부모) 객체의 역할을 하는 객체를 지칭한다.

프로토타입은 하위(자식) 객체에게 자신의 프로퍼티와 메서드를 상속한다.

프로토타입 객체의 프로퍼티나 메서드를 상속받은 하위 객체는 자신의 프로퍼티 또는 메서드인 것처럼 활용할 수 있다.

 

프로토타입 체인은 프로토타입이 단방향 링크드 리스트 형태로 연결되어 있는 상속 구조를 말한다.

객체의 프로퍼티나 메서드에 접근하려고 할 때 해당 객체에 접근하려는 프로퍼티 또는 메서드가 없다면 프로토타입 체인을 따라 프로토타입의 프로퍼티나 메서드를 차례대로 검색한다. 
