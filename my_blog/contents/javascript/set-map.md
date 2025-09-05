---
date: '2022-06-07'
title: 'JavaScript'
categories: ['TIL','Deep_Dive']
summary: '37장 set과Map'
thumbnail: '/blog/deep-dive.png'
---

# 37장 set과Map
## 셋과맵


## set 
Set 객체는 중복되지 않는 유일한 값들이 집합이다. Set 객체는 배열과 유사하지만 다음과 같이 배열과 다른 특성을 가진다.

동일한 값을 중복하여 포함할수 없다.
* 요소 순서에 의미가 있다
* 인덱스로 요소에 접근할 수 없다
* Set 객체의 특성은 수학적 집합의 특성과 일치하며, 수학적 집합을 구현하기 위한 자료구조다.

 

## 1. Set 객체의 생성
Set 객체는 Set 생성자 함수로 생성한다. 인수를 전달하지 않으면 빈 Set 객체가 생성된다.
```
const set = new Set();
console.log(set); // Set(0) {}
```
Set 생성자 함수는 이터러블을 인수를 전달받아 Set 객체를 생성한다. 이때 이터러블의 중복된 값은 Set 객체에 요소로 저장되지 않는다.
```
const set1 = new Set([1, 2, 3, 3]);
console.log(set1); // Set(3) {1, 2, 3}

const set2 = new Set('hello');
console.log(set2); // Set(4) {"h", "e", "l", "o"}
```
중복을 허용하지 않는 Set 객체의 특성을 활용하여 배열에서 중복된 요소를 제거할 수 있다.

```
// 배열의 중복 요소 제거
const uniq = array => array.filter((v, i, self) => self.indexOf(v) === i);
console.log(uniq([2, 1, 2, 3, 4, 3, 4])); // [2, 1, 3, 4]

// Set을 사용한 배열의 중복 요소 제거
const uniq = array => [...new Set(array)];
console.log(uniq([2, 1, 2, 3, 4, 3, 4])); // [2, 1, 3, 4]
 ```

## 2. 요소 개수 확인
Set 객체의 요소 개수를 확인할 때는 Set.prototype.size 프로퍼티를 사용한다.
```
const { size } = new Set([1, 2, 3, 3]);
console.log(size); // 3
```
size 프로퍼티는 getter 함수만 존재하는 접근자 프로퍼티이므로 size 프로퍼티에 값을 할당하여 개수를 변경할 수 없다.

```
const set = new Set([1, 2, 3]);

console.log(Object.getOwnPropertyDescriptor(Set.prototype, 'size'));
// {set: undefined, enumerable: false, configurable: true, get: ƒ}

set.size = 10; // 무시된다.
console.log(set.size); // 3
 ```

## 3. 요소 추가
Set 객체에 요소를 추가할 때는 Set.prototype 메서드를 사용한다.
```
const set = new Set();
console.log(set); // Set(0) {}

set.add(1);
console.log(set); // Set(1) {1}
```
add 메서드는 새로운 요소가 추가된 Set 객체를 반환한다. 따라서 add 메서드를 연속적으로 호출할 수 있다.
```
const set = new Set();

set.add(1).add(2);
console.log(set); // Set(2) {1, 2}
```
Set 객체에 중복된 요소의 추가는 허용되지 않지만, 에러를 발생시키지는 않고 무시함.
```
const set = new Set();

set.add(1).add(2).add(2);
console.log(set); // Set(2) {1, 2}
```
자바스크립트에서 일반적으로 === 을 사용하면 NaN과 NaN을 다르다고 평가하지만, Set 객체는 같다고 평가한다. 또한 +0, -0도 같은 것으로 평가한다.
```
const set = new Set();

console.log(NaN === NaN); // false
console.log(0 === -0); // true


// NaN과 NaN을 같다고 평가하여 중복 추가를 허용하지 않는다.
set.add(NaN).add(NaN);
console.log(set); // Set(1) {NaN}

// +0과 -0을 같다고 평가하여 중복 추가를 허용하지 않는다.
set.add(0).add(-0);
console.log(set); // Set(2) {NaN, 0}
```
Set 객체는 자바스크립트의 모든 값을 요소로 저장할 수 있다.
```
const set = new Set();

set
  .add(1)
  .add('a')
  .add(true)
  .add(undefined)
  .add(null)
  .add({})
  .add([]);

console.log(set); // Set(7) {1, "a", true, undefined, null, {}, []}
 ```
## 4. 요소 존재 여부 확인
Set 객체에 특정 요소가 존재하는지 확인하려면 Set.prototype.has 메서드를 사용한다. 값의 존재 여부를 불리언 값으로 반환해준다.
```
const set = new Set([1, 2, 3]);

console.log(set.has(2)); // true
console.log(set.has(4)); // false
 ```
## 5. 요소 삭제
Set 객체의 특정 요소를 삭제하려면 Set.prototype.delete 메서드를 사용한다. delete 메서드는 성공 여부를 나타내는 불리언 값을 반환한다. delete 메서드는 인덱스가 아니라 삭제하려는 요소값을 인수로 전달해야 한다.
```
const set = new Set([1, 2, 3]);

// 요소 2를 삭제한다.
set.delete(2);
console.log(set); // Set(2) {1, 3}

// 요소 1을 삭제한다.
set.delete(1);
console.log(set); // Set(1) {3}
```
만약 존재하지 않는 Set 객체의 요소를 삭제하려 하면 에러 없이 무시된다.
```
const set = new Set([1, 2, 3]);

// 존재하지 않는 요소 0을 삭제하면 에러없이 무시된다.
set.delete(0);
console.log(set); // Set(3) {1, 2, 3}
```
delete 메서드는 삭제 성공 여부를 나타내는 불리언 값을 반환하고, 따라서 연속적으로 호출할 수 없다.

 
## 6. 요소 일괄 삭제
Set 객체의 모든 요소를 일괄적으로 삭제하려면 Set.prototype.clear 메서드를 사용한다. 또 항상 undefined를 반환한다.
```
const set = new Set([1, 2, 3]);

set.clear();
console.log(set); // Set(0) {}
```
 
## 7. 요소 순회
Set 객체의 요소를 순회하려면 Set.prototype.forEach 메서드를 사용한다. Array.prototype.forEach 메서드와 유사하지만 인수에 차이가 있다.

 

Array의 forEach 메서드는( 현재 요소 값, 현재 요소의 인덱스, 현재 순회 중인 this )객체 3개의 인수가 있지만 Set의 forEach는 (현재 요소 값, 현재 요소 값, 순회 중인 Set 객체 자체 )를 인수로 가진다. Set의 forEach가 인수로 똑같은 현재 요소 값을 두번 받는 것은 Array의 forEach 메서드와 인터페이스를 통일하기 위함일뿐이다(Set에는 index가 없기 때문....).
```
const set = new Set([1, 2, 3]);
set.forEach((v, v2, set) => console.log(v, v2, set));

//1 1 Set(3) {1, 2, 3}
//2 2 Set(3) {1, 2, 3}
//3 3 Set(3) {1, 2, 3}
```
Set 객체는 이터러블이다. 따라서 for of 문과 스프레드 문법, 배열 구조 분해 할당을 사용할 수 있다.
```
const set = new Set([1, 2, 3]);

// Set 객체는 Set.prototype의 Symbol.iterator 메서드를 상속받는 이터러블이다.
console.log(Symbol.iterator in set); // true

// 이터러블인 Set 객체는 for...of 문으로 순회할 수 있다.
for (const value of set) {
  console.log(value); // 1 2 3
}

// 이터러블인 Set 객체는 스프레드 문법의 대상이 될 수 있다.
console.log([...set]); // [1, 2, 3]

// 이터러블인 Set 객체는 배열 디스트럭처링 할당의 대상이 될 수 있다.
const [a, ...rest] = [...set];
console.log(a, rest); // 1, [2, 3]
 ```

# Map
Map 객체는 키와 쌍으로 이루어진 컬렉션이다. Map 객체는 객체와 유사하지만 다음과 같은 차이가 있다.


 ## 1. Map 객체의 생성
``` 
const map = new Map();
console.log(map); // Map(0) {}
```
Map 생성자 함수는 이터러블을 인수로 전달받아 Map 객체를 생성한다. 이때 인수로 전달되는 이터러블은 키와 값의 쌍으로 이루어진 요소로 구성되어야 한다.
```
const map1 = new Map([['key1', 'value1'], ['key2', 'value2']]);
console.log(map1); // Map(2) {"key1" => "value1", "key2" => "value2"}

const map2 = new Map([1, 2]); // TypeError: Iterator value 1 is not an entry object
```
Map 생성자 함수의 인수로 전달한 이터러블에 중복된 키를 갖는 요소가 존재하는 값이 덮어써진다. 따라서 Map 객체에는 중복된 키를 갖는 요소가 존재할 수 없다.
```
const map = new Map([['key1', 'value1'], ['key1', 'value2']]);
console.log(map); // Map(1) {"key1" => "value2"}
 ```
## 2. 요소 개수 확인
Map 객체의 요소 개수를 확인할 때는 Map.prototype.size 프로퍼티를 사용한다.
```
const { size } = new Map([['key1', 'value1'], ['key2', 'value2']]);
console.log(size); // 2
 ```
## 3. 요소 추가
Map 객체에 요소를 추가할 때는 Map.prototype.set 메서드를 사용하며, 새로운 요소가 추가된 Map 객체를 반환하기 때문에 연속적으로 set 메서드를 호출할 수 있다.
```
const map = new Map();
console.log(map); // Map(0) {}

map.set('key1', 'value1');
console.log(map); // Map(1) {"key1" => "value1"}
```
```
const map = new Map();

map
  .set('key1', 'value1')
  .set('key2', 'value2');

console.log(map); // Map(2) {"key1" => "value1", "key2" => "value2"}
 ```
## 4. 요소 취득
Map 객체에서 특정 요소를 취득하려면 Map.prototype.get 메서드를 사용한다. get 메서드의 인수로 키를 전달하면 Map 객체에서 인수로 전달한 키를 갖는 값을 반환한다. 만약 해당 요소가 없다면 undefined를 반환한다.
```
const map = new Map();

const lee = { name: 'Lee' };
const kim = { name: 'Kim' };

map
  .set(lee, 'developer')
  .set(kim, 'designer');

console.log(map.get(lee)); // developer
console.log(map.get('key')); // undefined
 ```
## 5. 요소 존재 여부 확인
Map 객체에 특정 요소가 존재하는지 확인하려면 Map.prototype.has 메서드를 사용한다. has 메서드는 존재 여부를 확인하여 불리언 값을 반환한다.
```
const lee = { name: 'Lee' };
const kim = { name: 'Kim' };

const map = new Map([[lee, 'developer'], [kim, 'designer']]);

console.log(map.has(lee)); // true
console.log(map.has('key')); // false
 ```
## 6. 요소 삭제
Map 객체의 요소를 삭제하려면 Map.prototype.delete 메서드를 사용한다. 삭제 성공 여부를 나타내는 불리언 값을 반환한다. 따라서 연속적으로 호출은 불가능하다.
```
const lee = { name: 'Lee' };
const kim = { name: 'Kim' };

const map = new Map([[lee, 'developer'], [kim, 'designer']]);

map.delete(kim);
console.log(map); // Map(1) { {name: "Lee"} => "developer" }
```
만약 존재하지 않는 키로 Map 객체의 요소를 삭제하려 하면 에러 없이 무시된다.
```
const map = new Map([['key1', 'value1']]);

// 존재하지 않는 키 'key2'로 요소를 삭제하려 하면 에러없이 무시된다.
map.delete('key2');
console.log(map); // Map(1) {"key1" => "value1"}
 ```
## 7. 일괄 삭제
Map 객체의 요소를 일괄 삭제하려면 Map.prototype.clear 메서드를 사용한다. clear 메서드는 언제나 undefined를 반환한다.
```
const lee = { name: 'Lee' };
const kim = { name: 'Kim' };

const map = new Map([[lee, 'developer'], [kim, 'designer']]);

map.clear();
console.log(map); // Map(0) {}
 ```
## 8. 요소 순회
Map 객체의 요소를 순회하려면 Map.prototype.forEach 메서드를 사용한다. Set 객체의 요소 순회와 마찬가지로 3가지 인수(현재 요소 값, 현재 요소 값, 순회 중인 Map 객체 자체)개를 전달받는다.
```
const lee = { name: 'Lee' };
const kim = { name: 'Kim' };

const map = new Map([[lee, 'developer'], [kim, 'designer']]);

map.forEach((v, k, map) => console.log(v, k, map));
/*
developer {name: "Lee"} Map(2) {
  {name: "Lee"} => "developer",
  {name: "Kim"} => "designer"
}
designer {name: "Kim"} Map(2) {
  {name: "Lee"} => "developer",
  {name: "Kim"} => "designer"
}
*/
```
Map 객체는 이터러블이다. 따라서 for of, 스프레드 문법, 배열 비구조화할당을 사용할 수 있다.
```
const lee = { name: 'Lee' };
const kim = { name: 'Kim' };

const map = new Map([[lee, 'developer'], [kim, 'designer']]);

// Map 객체는 Map.prototype의 Symbol.iterator 메서드를 상속받는 이터러블이다.
console.log(Symbol.iterator in map); // true

// 이터러블인 Map 객체는 for...of 문으로 순회할 수 있다.
for (const entry of map) {
  console.log(entry); // [{name: "Lee"}, "developer"]  [{name: "Kim"}, "designer"]
}

// 이터러블인 Map 객체는 스프레드 문법의 대상이 될 수 있다.
console.log([...map]);
// [[{name: "Lee"}, "developer"], [{name: "Kim"}, "designer"]]

// 이터러블인 Map 객체는 배열 디스트럭처링 할당의 대상이 될 수 있다.
const [a, b] = map;
console.log(a, b); // [{name: "Lee"}, "developer"]  [{name: "Kim"}, "designer"]
```
Map 객체는 이터러블이면서 동시에 이터레이터인 객체를 반환하는 메서드를 제공한다.

```
const lee = { name: 'Lee' };
const kim = { name: 'Kim' };

const map = new Map([[lee, 'developer'], [kim, 'designer']]);

// Map.prototype.keys는 Map 객체에서 요소키를 값으로 갖는 이터레이터를 반환한다.
for (const key of map.keys()) {
  console.log(key); // {name: "Lee"} {name: "Kim"}
}

// Map.prototype.values는 Map 객체에서 요소값을 값으로 갖는 이터레이터를 반환한다.
for (const value of map.values()) {
  console.log(value); // developer designer
}

// Map.prototype.entries는 Map 객체에서 요소키와 요소값을 값으로 갖는 이터레이터를 반환한다.
for (const entry of map.entries()) {
  console.log(entry); // [{name: "Lee"}, "developer"]  [{name: "Kim"}, "designer"]
}
```