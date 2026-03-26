# 交接文档示例骨架

## Web 单路由（可直接复制后填空）

```markdown
# `/path/to/page` 交接文档

一句话说明页面职责。

## 1. URL 与路由配置

| 项 | 说明 |
|----|------|
| **访问路径** | `/path` |
| **路由 name** | `routeName` |
| **组件映射** | `@/pages/X` → `src/pages/X/index.tsx` |

```ts
// .umirc.ts 片段
{ path: '/path', name: 'routeName', component: '@/pages/X' },
```

## 2. 页面组件与文件结构

| 文件 | 作用 |
|------|------|
| `src/pages/X/index.tsx` | 入口 |
| … | … |

## 3. 页面入参

（路径参数 / query / history state）

## 4. 页面逻辑

（首屏、请求、副作用）

## 5. 跳转到其他页面

| 目标 | 条件 | 参数 |
|------|------|------|
| … | … | … |

## 6. SDK 与外部依赖

## 7. 对全局的影响

（storage、initialState、window、title…）

## 8. 多语言

## 9. 代码摘录

（短片段 + 路径）
```

## 后端单接口条目

```markdown
### `POST /api/resource`

| 项 | 说明 |
|----|------|
| **入参 body** | `{ "field": string }` |
| **认证** | `Authorization: Bearer` |
| **调用** | `xxxController.create` → `xxxService` |
| **数据库** | 表 `t_xxx`，insert … |
| **成功 200** | `{ "code": 0, "data": { ... } }` |
| **错误** | … |

```ts
// 摘录：路由或 handler
```
```
