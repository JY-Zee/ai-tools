---
name: react-component-template
description: 用于生成 React 函数组件模板，根据组件名称自动生成 forwardRef 模式的组件代码，包括 Props 和 Ref 接口定义。当用户需要创建新的页面或组件时应使用此 skill。
---

# React Component Template

## Overview

此 skill 用于生成基于 forwardRef 的 React 函数组件模板。根据用户提供的组件名称，自动生成包含 Props 接口、Ref 接口和 forwardRef 导出的标准组件代码。

## When to Use

当用户需要创建新的 React 页面或组件时，使用此 skill 生成标准化的函数组件模板。

## Component Template

使用以下模板生成组件代码：

```typescript
import { forwardRef, Ref, useImperativeHandle } from 'react';

export interface {ComponentName}Props {}

export interface {ComponentName}Ref {}

const {ComponentName} = (props: {ComponentName}Props, ref: Ref<{ComponentName}Ref> | undefined) => {
  useImperativeHandle(ref, () => ({}));

  return <div>123</div>;
};

export default forwardRef({ComponentName});
```

## Naming Convention

根据组件名称替换模板中的占位符：

| 占位符                 | 替换为         | 示例 (组件名: UserList) |
| ---------------------- | -------------- | ----------------------- |
| `{ComponentName}`      | 组件名         | `UserList`              |
| `{ComponentName}Props` | 组件名 + Props | `UserListProps`         |
| `{ComponentName}Ref`   | 组件名 + Ref   | `UserListRef`           |

## Usage

1. 获取用户指定的组件名称
2. 使用模板替换占位符
3. 生成最终的组件代码

### Example

**Input:** 组件名 `UserList`

**Output:**

```typescript
import { forwardRef, Ref, useImperativeHandle } from 'react';

export interface UserListProps {}

export interface UserListRef {}

const UserList = (props: UserListProps, ref: Ref<UserListRef> | undefined) => {
  useImperativeHandle(ref, () => ({}));

  return <div>123</div>;
};

export default forwardRef(UserList);
```
