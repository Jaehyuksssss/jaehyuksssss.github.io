---
date: '2025-09-03'
title: '리눅스 공부'
categories: ['Linux', 'AWS']
summary: '리눅스 공부'
thumbnail: './aws.png'
---
# AWS SSH 키 등록 및 EC2 접속 방법
1. Aws 콘솔에서 키페어를 다운 받을 수 있지만 직접 SSH키를 생성해서 EC2에 등록 해보기

- 로컬에서 ssh키 생성 
```
ssh-keygen -t rsa -b 4096 -f ~/.ssh/my-aws-key
```