---
date: '2024-12-19'
title: '리액트에서 flushSync로 포커스 관리 마스터하기'
categories: ['TIL', 'REACT']
summary: 'React의 flushSync를 활용한 완벽한 포커스 관리와 접근성 개선, 그리고 실제 프로젝트에서 바로 사용할 수 있는 패턴들을 소개합니다.'
thumbnail: '/react.png'
---

![React flushSync 포커스 관리](/my_blog/contents/react/images)

# intro
포커스 관리는 문제가 생기기 전까지는 잘 인지하지 못하는 부분입니다. 하지만 한 번이라도 문제가 발생하면 앱이 어색하게 동작하거나, 접근성이 떨어지거나, 혹은 아예 잘못된 것처럼 느껴질 수 있습니다. 오늘은 포커스 관리를 제대로 할 수 있게 도와주지만, 잘 알려지지 않은 리액트 API인 flushSync에 대해 말씀드리겠습니다.

# 리액트에서 flushSync로 포커스 관리 마스터하기

포커스 관리는 미묘하지만 접근 가능하고 즐거운 리액트 앱을 만드는 데 매우 중요한 부분입니다. `flushSync`는 리액트의 일반적인 업데이트 흐름에서 벗어나 지금 당장 무언가를 실행해야 할 때 사용할 수 있는 강력한 도구입니다.

---

## 1. 리액트에서 포커스 관리가 까다로운 이유

리액트는 DOM을 빠르고 똑똑하게 업데이트합니다. `setShow(true)`와 같은 상태 업데이트 함수를 호출하면 리액트는 즉시 리렌더링하지 않고, 이벤트 핸들러가 끝난 뒤 한 번에 상태 업데이트를 처리합니다.

### 문제가 되는 상황

```javascript
function MyComponent() {
  const [show, setShow] = useState(false);

  return (
    <div>
      <button onClick={() => setShow(true)}>Show</button>
      {show ? <input /> : null}
    </div>
  );
}
```

여기서 인풋이 나타나자마자 포커스를 주고 싶다고 해봅시다. 아마 아래와 같이 작성할 겁니다.

```javascript
function MyComponent() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [show, setShow] = useState(false);

  return (
    <div>
      <button
        onClick={() => {
          setShow(true);
          inputRef.current?.focus(); //  아마 작동하지 않을 겁니다!
        }}
      >
        Show
      </button>
      {show ? <input ref={inputRef} /> : null}
    </div>
  );
}
```

**하지만 이건 동작하지 않습니다!** 이유는 `setShow(true)`를 호출했을 때 리액트는 업데이트를 예약할 뿐, 핸들러가 끝나기 전까지는 적용하지 않기 때문입니다.

---

## 2. setTimeout이나 requestAnimationFrame을 쓰면 안 되나요?

저 역시 경력 초창기에는 포커스 호출을 `setTimeout`이나 `requestAnimationFrame`으로 감싸서 해결하려 했습니다.

```javascript
onClick={() => {
  setShow(true)
  setTimeout(() => {
    inputRef.current?.focus()
  }, 10) // �� 운에 맡기기
}}
```

가끔은 잘 되지만, 가끔은 안 됐습니다. 브라우저나 기기, 앱의 다른 동작 상황에 따라 달라졌습니다. 따라서 이 방법은 신뢰할 수 없었고 임시방편에 불과했습니다.

---

## 3. flushSync의 등장

`react-dom`의 `flushSync`는 이런 상황을 위한 탈출구입니다. 리액트에게 **"성능을 위해 배치 업데이트를 하는 걸 알지만, 이번 업데이트는 지금 당장 처리해야 해"**라고 알려주는 역할을 합니다.

```javascript
import { flushSync } from 'react-dom';

function MyComponent() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [show, setShow] = useState(false);

  return (
    <div>
      <button
        onClick={() => {
          flushSync(() => {
            setShow(true);
          });
          inputRef.current?.focus(); //  이제 확실히 작동합니다!
        }}
      >
        Show
      </button>
      {show ? <input ref={inputRef} /> : null}
    </div>
  );
}
```

이제 버튼을 클릭하면 인풋이 즉시 나타나고 자동으로 포커스를 받습니다. 더 이상 임시방편도, 운에 맡기는 일도 없습니다.

---

## 4. 실전 예시: EditableText 컴포넌트

Epic React 고급 리액트 API 워크숍의 예시를 보겠습니다. Ryan Florence님께서 제공해 주신 컴포넌트인데요, `<EditableText />`라는 컴포넌트는 사용자가 텍스트를 인라인으로 수정할 수 있게 해 줍니다.

### 요구사항
- 버튼을 누르면 인풋으로 바뀌고, 제출하거나 블러 되거나 ESC 키를 누르면 다시 버튼으로 돌아갑니다
- 수정이 시작되면 인풋에 포커스를 주고 텍스트를 선택합니다
- 수정이 끝나면(제출, 블러, 또는 ESC키) 버튼으로 포커스를 돌려줍니다

### 완전한 구현

```javascript
import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';

function EditableText({
  initialValue = '',
  fieldName,
  inputLabel,
  buttonLabel,
}: {
  initialValue?: string;
  fieldName: string;
  inputLabel: string;
  buttonLabel: string;
}) {
  const [edit, setEdit] = useState(false);
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return edit ? (
    <form
      onSubmit={event => {
        event.preventDefault();
        flushSync(() => {
          setValue(inputRef.current?.value ?? '');
          setEdit(false);
        });
        buttonRef.current?.focus();
      }}
    >
      <input
        required
        ref={inputRef}
        type="text"
        aria-label={inputLabel}
        name={fieldName}
        defaultValue={value}
        onKeyDown={event => {
          if (event.key === 'Escape') {
            flushSync(() => {
              setEdit(false);
            });
            buttonRef.current?.focus();
          }
        }}
        onBlur={event => {
          flushSync(() => {
            setValue(event.currentTarget.value);
            setEdit(false);
          });
          buttonRef.current?.focus();
        }}
      />
    </form>
  ) : (
    <button
      aria-label={buttonLabel}
      ref={buttonRef}
      type="button"
      onClick={() => {
        flushSync(() => {
          setEdit(true);
        });
        inputRef.current?.select();
      }}
    >
      {value || 'Edit'}
    </button>
  );
}
```

이 접근법은 사용자가 얼마나 빠르게 UI와 상호작용하든, 포커스가 항상 기대한 대로 정확하게 유지되도록 보장합니다.

---

## 5. 키보드 접근성: 일부 사용자만을 위한 것이 아닙니다

왜 이렇게까지 포커스를 신경 써야 할까요? 이유는 키보드 접근성이 모든 사람에게 중요하기 때문입니다.

### 접근성이 중요한 이유
- **장애로 인해 키보드에 의존하는 사람들**도 있지만
- **단순히 키보드를 선호하는 많은 파워 유저들**도 존재합니다
- 포커스 관리가 깨지면 키보드 내비게이션이 답답하거나 불가능해집니다

### 올바른 포커스 관리의 경험
- 편집 가능한 텍스트에 탭으로 들어왔을 때, 엔터 키를 누르거나 클릭하면 인풋에 포커스가 가고 텍스트가 선택됩니다
- 편집을 마치면(제출, 블러, ESC키) 다시 버튼에 포커스가 돌아가, 계속해서 탭으로 UI를 탐색할 수 있습니다

이런 디테일이 앱을 모든 사용자에게 즐겁게 만드는 요소입니다.

---

## 6. flushSync를 언제 사용해야 할까요?

### 적절한 사용 사례

#### 1. 포커스 관리
```javascript
// 상태 업데이트 이후에만 존재하는 요소로 포커스를 옮겨야 할 때
flushSync(() => {
  setShowModal(true);
});
modalRef.current?.focus();
```

#### 2. 서드파티 통합
```javascript
// DOM이 즉시 업데이트 되기를 기대하는 브라우저 API
useEffect(() => {
  const handleBeforePrint = () => {
    flushSync(() => {
      setPrintMode(true);
    });
    // 인쇄용 스타일이 적용된 후 실행
  };
  
  window.addEventListener('beforeprint', handleBeforePrint);
  return () => window.removeEventListener('beforeprint', handleBeforePrint);
}, []);
```

#### 3. 애니메이션 시작
```javascript
const startAnimation = () => {
  flushSync(() => {
    setAnimationState('running');
  });
  // 애니메이션이 시작된 후 측정값 계산
  const element = elementRef.current;
  const rect = element.getBoundingClientRect();
};
```

#### 4. 측정값 계산
```javascript
const measureElement = () => {
  flushSync(() => {
    setShowElement(true);
  });
  // 요소가 DOM에 추가된 후 크기 측정
  const height = elementRef.current?.offsetHeight;
};
```

### 주의사항

**flushSync는 성능 최적화 측면에서 손해를 보는 선택입니다.** 꼭 필요한 경우에만, 정말 즉각적인 DOM 업데이트가 필요할 때만 사용해야 합니다.

---

## 7. 실제 프로젝트 패턴들

### 모달 포커스 관리
```javascript
function Modal({ isOpen, onClose }) {
  const modalRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      flushSync(() => {
        setIsVisible(true);
      });
      modalRef.current?.focus();
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);
  
  if (!isVisible) return null;
  
  return (
    <div 
      ref={modalRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
    >
      {/* 모달 내용 */}
    </div>
  );
}
```

### 동적 리스트 스크롤
```javascript
function DynamicList() {
  const [items, setItems] = useState([]);
  const listRef = useRef(null);
  
  const addItem = (newItem) => {
    flushSync(() => {
      setItems(prev => [...prev, newItem]);
    });
    // 새 아이템으로 스크롤
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: 'smooth'
    });
  };
  
  return (
    <div ref={listRef} className="list">
      {items.map(item => (
        <div key={item.id}>{item.content}</div>
      ))}
    </div>
  );
}
```

### 폼 검증과 포커스
```javascript
function FormWithValidation() {
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firstErrorRef = useRef(null);
  
  const handleSubmit = async (formData) => {
    const validationErrors = validateForm(formData);
    
    if (Object.keys(validationErrors).length > 0) {
      flushSync(() => {
        setErrors(validationErrors);
      });
      // 첫 번째 에러 필드로 포커스
      firstErrorRef.current?.focus();
      return;
    }
    
    setIsSubmitting(true);
    // 폼 제출 로직...
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {Object.keys(errors).map(fieldName => (
        <input
          key={fieldName}
          ref={fieldName === Object.keys(errors)[0] ? firstErrorRef : null}
          className={errors[fieldName] ? 'error' : ''}
          aria-invalid={!!errors[fieldName]}
          aria-describedby={`${fieldName}-error`}
        />
      ))}
    </form>
  );
}
```

---

## 8. 성능 고려사항

### 언제 사용하지 말아야 할까?

```javascript
//  일반적인 상태 업데이트
const handleClick = () => {
  flushSync(() => {
    setCount(count + 1);
  });
  // 불필요한 동기화
};

//  대량의 데이터 처리
const processData = () => {
  flushSync(() => {
    setLargeDataSet(processLargeData());
  });
  // 성능 저하
};

//  루프 내부
items.forEach(item => {
  flushSync(() => {
    setItem(item);
  });
  // 매우 비효율적
});
```

### 올바른 사용법

```javascript
//  포커스가 필요한 경우에만
const showInput = () => {
  flushSync(() => {
    setShowInput(true);
  });
  inputRef.current?.focus();
};

//  측정이 필요한 경우에만
const measureElement = () => {
  flushSync(() => {
    setElementVisible(true);
  });
  const height = elementRef.current?.offsetHeight;
};
```

---

## 9. 마치며

포커스 관리는 미묘하지만 접근 가능하고 즐거운 리액트 앱을 만드는 데 매우 중요한 부분입니다. `flushSync`는 리액트의 일반적인 업데이트 흐름에서 벗어나 지금 당장 무언가를 실행해야 할 때 사용할 수 있는 강력한 도구입니다.

### 핵심 포인트
- **포커스 관리**는 모든 사용자에게 중요한 접근성 기능입니다
- **flushSync**는 꼭 필요한 경우에만 사용해야 합니다
- **성능과 사용자 경험**의 균형을 맞추는 것이 중요합니다
- **실제 프로젝트**에서 바로 사용할 수 있는 패턴들을 익혀두세요

현명하게 사용하시면, 사용자는 확실히 더 나은 경험을 하게 될 것입니다.

---

## 출처
- Epic React 고급 리액트 API 워크숍
- React 18 공식 문서
- Ryan Florence의 React 패턴
- 웹 접근성 가이드라인 (WCAG)
