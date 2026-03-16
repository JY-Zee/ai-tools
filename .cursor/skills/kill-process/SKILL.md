---
name: kill-process
description: >
  Provides platform-specific commands to terminate Node.js or other processes
  from the command line. Use when the user wants to kill node or another process
  on Windows or macOS from the terminal.
---

# Kill Process

## 使用场景

当需要在命令行中“杀死 Node.js 进程”或“杀死指定进程”时，按当前操作系统选择对应命令。

## Windows 系统

### 杀死所有 Node.js 进程

在 PowerShell 或 CMD 中执行：

```powershell
taskkill /F /T /IM node.exe
```

- **/F**：强制结束进程  
- **/T**：连同子进程一起结束  
- **/IM**：按映像名称匹配进程，这里是 `node.exe`

### 杀死其他进程

将进程名替换为目标进程名（可在“任务管理器”或 `tasklist` 中查看）：

```powershell
taskkill /F /T /IM xxxx.exe
```

- 将 `xxxx.exe` 替换为实际进程名，例如：
  - `nginx.exe`
  - `chrome.exe`
  - `mysqld.exe`

> 如果进程名中不带 `.exe`，也可以写成 `xxxx`，Windows 会自动补全。

## macOS 系统

### 方式一：按进程名杀死（推荐）

#### 杀死所有 Node.js 进程

```bash
pkill -f node
```

- `pkill`：按名称匹配进程并发送信号（默认 `TERM`）
- `-f`：按完整命令行匹配，适用于各种 `node` 启动方式

如需“强制杀死”（等同 Windows `/F`），可以发送 `KILL` 信号：

```bash
pkill -9 -f node
```

#### 杀死其他进程

按进程名替换 `node` 即可：

```bash
pkill -f xxxx
```

或强制杀死：

```bash
pkill -9 -f xxxx
```

> 将 `xxxx` 替换为实际进程名，例如 `nginx`、`chrome`、`mysqld`。

### 方式二：先查 PID 再杀（更精确）

1. **查找进程 PID：**

   ```bash
   ps aux | grep node
   ```

2. **使用 `kill` 结束：**

   ```bash
   kill <PID>
   ```

3. 如需强制结束（类似 Windows `/F`）：

   ```bash
   kill -9 <PID>
   ```

## 快速决策表

- **Windows + 杀 Node**：`taskkill /F /T /IM node.exe`
- **Windows + 杀其他进程**：`taskkill /F /T /IM xxxx.exe`
- **macOS + 杀 Node（普通）**：`pkill -f node`
- **macOS + 杀 Node（强制）**：`pkill -9 -f node`
- **macOS + 杀其他进程**：按名称替换为 `pkill [-9] -f xxxx`

