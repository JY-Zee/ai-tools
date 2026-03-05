---
name: create-query-list-page
description: 用于生成查询列表页面，基于 ZProTable 组件，自动创建页面文件、service.ts 文件、constants.ts 文件和 components 组件目录。当用户需要创建新的查询列表页时应使用此 skill。
---

# Create Query List Page

## Overview

此 skill 用于生成基于 ZProTable 的查询列表页面。根据用户提供的页面名称和字段配置，自动创建包含页面文件(index.tsx)、接口层(service.ts)、静态变量(constants.ts)和组件目录(components)的完整页面结构。

## When to Use

当用户需要创建新的查询列表页面时，使用此 skill 生成标准化的查询列表页代码。

## Page Structure

创建页面时，需要生成以下文件结构：

```
src/pages/{PageName}/
  ├── index.tsx          # 页面主文件
  ├── service.ts         # 接口层
  ├── constants.ts       # 静态变量和类型定义
  └── components/       # 页面特有的组件目录
```

## Page Template

### 1. index.tsx 模板

```typescript
import { useRef } from 'react';
import { ProColumns } from '@ant-design/pro-components';
import ZProTable, { ZProTableRef } from '@/components/ZProTable';
import { getTable } from './service';
import { ColumnType } from './constants';

const {PageName}Page = () => {
  const ztableRef = useRef<ZProTableRef>(null);

  const columns: ProColumns<ColumnType>[] = [
    // 列定义将根据用户配置生成
  ];

  return (
    <ZProTable
      ref={ztableRef}
      rowKey='id'
      manualRequest={false}
      params={{}}
      columns={columns}
      toolBarRender={(action) => []}
      request={async (params, sort) => {
        const { current, pageSize, ...rest } = params;

        return getTable({
          ...rest,
          current: current || 1,
          pageSize: pageSize || 10,
        });
      }}
    />
  );
};

export default {PageName}Page;
```

### 2. service.ts 模板

```typescript
import { request } from '@umijs/max';
import { get } from 'lodash';
import { TableRes } from './constants';

/**
 * 获取表格数据
 */
export const getTable = (
  params: any,
): Promise<TableRes<any>> => {
  return new Promise((resolve) => {
    request('url', {
      method: 'POST',
      data: params,
    })
      .then((res) => {
        resolve({
          data: get(res, 'list', []),
          total: get(res, 'total', 0),
          success: true,
        });
      })
      .catch(() => {
        resolve({
          data: [],
          total: 0,
          success: true,
        });
      });
  });
};
```

### 3. constants.ts 模板

```typescript
/**
 * 表格列类型定义
 */
export interface ColumnType {
  id?: number | string;
  // 根据实际字段添加类型定义
}

/**
 * 表格返回数据类型
 */
export interface TableRes<T> {
  data: T[];
  total: number;
  success: boolean;
}
```

## Column Configuration Rules

### 字段配置需要考虑以下情况：

#### 1. 基础规则
- 默认表格查询方法不需要权限，不用额外添加其他代码
- 如果 valueType 没有明确说明，默认为字符串
- 如果 width 没有明确说明，默认为 200

#### 2. 日期时间字段
如果 column 中有用到时间，需要询问用户 valueType 类型：
- `dateRange`: 日期范围
- `dateTimeRange`: 日期时间范围
- 其他类型

**如果是 dateRange/dateTimeRange，需要添加 search 配置转换时间对象为字符串：**
```typescript
{
  title: '时间字段',
  dataIndex: 'timeField',
  valueType: 'dateRange', // 或 'dateTimeRange'
  width: 200,
  search: {
    transform: (value) => {
      return {
        startTime: moment(value[0]).startOf('day').format('YYYY-MM-DD HH:mm:ss'),
        endTime: moment(value[1]).endOf('day').format('YYYY-MM-DD HH:mm:ss'),
      };
    },
  },
},
```

注意：开始时间和结束时间的 key 可以询问用户，默认为 `startTime` 和 `endTime`。

#### 3. 字符串字段
如果 valueType 没有明确说明，默认添加 search 配置做去空格处理：
```typescript
{
  title: '字段名',
  dataIndex: 'field',
  width: 200,
  search: {
    transform: (value) => {
      return {
        field: value?.trim(),
      };
    },
  },
},
```

#### 4. 其他 valueType 类型
- `select`: 选择框（需要配置 options）
- `radio`: 单选框（需要配置 options）
- `checkbox`: 复选框（需要配置 options）
- `switch`: 开关
- `textarea`: 文本域
- `money`: 金额
- `percent`: 百分比
- 等其他 ProTable 支持的类型

## Information Gathering

在创建页面前，需要从用户处获取以下信息：

### 必需信息：
1. **页面名称**（用于文件夹名和组件名）
2. **页面标题**（用于显示和菜单）
3. **接口 URL**（默认需要询问用户）
4. **请求方法**（默认需要询问用户，通常是 GET 或 POST）
5. **表格字段列表**（包含以下信息）：
   - 字段名称（title）
   - 数据字段（dataIndex）
   - 值类型（valueType，可选，默认为 text）
   - 列宽度（width，可选，默认为 200）
   - 是否需要搜索（hideInSearch，可选，默认显示）
   - 其他配置（如 options、字典等）

### 可选信息：
1. **TableRes 泛型类型**（默认为 any，如果有明确的类型定义可以询问）
2. **日期时间字段的查询 key**（默认为 startTime/endTime）
3. **数据字段路径**（默认为 list，如果接口返回结构不同需要询问）
4. **总数字段路径**（默认为 total，如果接口返回结构不同需要询问）
5. **表格行的 key**（默认为 id）
6. **是否为内嵌组件**（如果是内嵌组件，需要在父组件中插入逻辑而不是创建新页面）

### 内嵌组件场景：
如果组件是内嵌在父组件中，需要：
- 保留父组件的原有逻辑
- 在父组件中添加 `ztableRef` 和 `columns` 定义
- 插入 ZProTable 组件而不破坏父组件的其他逻辑

## Usage Steps

1. **收集信息**：
   - 询问页面名称、标题
   - 询问表格字段配置列表
   - 询问是否有特殊需求（日期字段、选项字段等）

2. **创建目录结构**：
   ```
   src/pages/{PageName}/
   ├── index.tsx
   ├── service.ts
   ├── constants.ts
   └── components/
   ```

3. **生成 service.ts**：
   - 定义 getTable 方法（或根据需求修改方法名）
   - 配置接口路径
   - 根据接口返回定义类型

4. **生成 constants.ts**：
   - 定义 ColumnType 类型
   - 定义常量（如有需要）
   - 定义选项（如有需要）

5. **生成 index.tsx**：
   - 配置 columns 数组
   - 应用字段配置规则（日期、去空格等）
   - 配置表格属性

6. **更新路由配置**（如需要）：
   - 在 `config/routes.ts` 中添加路由

7. **更新菜单配置**（如需要）：
   - 在 `src/locales/zh-CN/menu.ts` 中添加菜单项

## Example

**用户输入：**
- 页面名称：UserManage
- 页面标题：用户管理
- 接口 URL：/api/user/list
- 请求方法：POST
- TableRes 泛型类型：any（或明确指定类型）
- 字段：
  1. 用户名 (username) - 字符串，需要搜索
  2. 手机号 (phone) - 字符串，需要搜索
  3. 创建时间 (createTime) - dateTimeRange，需要搜索

**生成代码：**

### service.ts
```typescript
import { request } from '@umijs/max';
import { get } from 'lodash';
import { TableRes } from './constants';

export const getTable = (
  params: any,
): Promise<TableRes<any>> => {
  return new Promise((resolve) => {
    request('/api/user/list', {
      method: 'POST',
      data: params,
    })
      .then((res) => {
        resolve({
          data: get(res, 'list', []),
          total: get(res, 'total', 0),
          success: true,
        });
      })
      .catch(() => {
        resolve({
          data: [],
          total: 0,
          success: true,
        });
      });
  });
};
```

### constants.ts
```typescript
/**
 * 表格列类型定义
 */
export interface ColumnType {
  id?: number;
  username?: string;
  phone?: string;
  createTime?: string;
}

/**
 * 表格返回数据类型
 */
export interface TableRes<T> {
  data: T[];
  total: number;
  success: boolean;
}
```

### index.tsx
```typescript
import { useRef } from 'react';
import { ProColumns } from '@ant-design/pro-components';
import moment from 'moment';
import ZProTable, { ZProTableRef } from '@/components/ZProTable';
import { getTable } from './service';
import { ColumnType } from './constants';

const UserManagePage = () => {
  const ztableRef = useRef<ZProTableRef>(null);

  const columns: ProColumns<ColumnType>[] = [
    {
      title: '用户名',
      dataIndex: 'username',
      width: 200,
      search: {
        transform: (value) => {
          return {
            username: value?.trim(),
          };
        },
      },
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      width: 200,
      search: {
        transform: (value) => {
          return {
            phone: value?.trim(),
          };
        },
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      valueType: 'dateTimeRange',
      width: 200,
      search: {
        transform: (value) => {
          return {
            startTime: moment(value[0]).format('YYYY-MM-DD HH:mm:ss'),
            endTime: moment(value[1]).format('YYYY-MM-DD HH:mm:ss'),
          };
        },
      },
    },
  ];

  return (
    <ZProTable
      ref={ztableRef}
      rowKey='id'
      manualRequest={false}
      params={{}}
      columns={columns}
      toolBarRender={(action) => []}
      request={async (params, sort) => {
        const { current, pageSize, ...rest } = params;

        return getTable({
          ...rest,
          current: current || 1,
          pageSize: pageSize || 10,
        });
      }}
    />
  );
};

export default UserManagePage;
```

## Notes

1. 确保已正确引入 ZProTable 组件
2. 根据项目实际情况调整 import 路径
3. 日期时间字段需要引入 moment
4. 类型定义根据实际接口返回调整，ColumnType 类型应取 TableRes 泛型类型
5. 如果有字典枚举，需要在 constants.ts 中定义
6. 菜单配置需要根据实际的菜单结构确定父级菜单
7. **默认全部参数都是可搜索的**（除非明确指定 hideInSearch）
8. 如果接口返回的数据结构不是标准的 `{list: [], total: 0}` 格式，需要询问数据字段路径和总数字段路径
9. 对于内嵌组件场景，务必保留父组件的原有逻辑，只插入必要的代码
