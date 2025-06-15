# 考研打卡平台

这是一个帮助考研学生记录学习进度、相互督促的Web应用程序。

## 项目结构

项目采用前后端分离架构：
- `/frontend` - React前端项目
- `/backend` - Node.js后端API服务

## 环境配置

### 后端环境变量

1. 在`backend`目录下复制`env.example`为`.env`：
```
cp backend/env.example backend/.env
```

2. 修改`.env`文件中的配置：
   - 数据库连接信息
   - JWT密钥
   - 邮件服务配置
   - 管理员邮箱 (`ADMIN_EMAIL`)

### 前端环境变量

1. 在`frontend`目录下创建`.env.local`文件：
```
# API配置
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_SOCKET_URL=http://localhost:3001

# 管理员配置 
REACT_APP_ADMIN_EMAIL=你的管理员邮箱
```

## 安装与运行

### 安装依赖

```bash
# 安装根目录依赖
npm install

# 安装前端依赖
cd frontend
npm install

# 安装后端依赖
cd backend
npm install
```

### 运行开发环境

```bash
# 启动后端服务
cd backend
npm run dev

# 启动前端开发服务器(新终端)
cd frontend
npm start
```

### 构建生产环境

```bash
# 构建前端
cd frontend
npm run build

# 构建后端
cd backend
npm run build
```


## 许可证

MIT 
