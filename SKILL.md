---
name: youtube-search
description: "独立 YouTube 搜索、评论提取、头像下载工具套件。可在任何目录下执行，通过 --output-dir 控制存储落点。"
---

# YouTube Search - 搜索 / 评论 / 头像

独立、可移植的 YouTube 数据提取工具。不依赖特定目录结构，通过 `--output-dir` 参数确定数据落点。

## 存储 Schema（重要）

本 skill 不预建目录，所有产出物由脚本按以下 schema 在 `--output-dir` 下按需创建：

```
{output-dir}/
├── search_{query-slug}_{YYYY-MM-DD}/
│   └── results.json          # 搜索视频列表
├── comments/
│   └── {video_id}/
│       └── comments.json      # 评论列表（含头像 URL）
└── avatars/
    └── {video_id}/
        ├── {author}.jpg       # 评论者头像
        └── manifest.json      # 头像清单
```

### results.json 契约

```json
{
  "schemaVersion": "1.0",
  "query": "原始查询词",
  "searchedAt": "ISO 8601",
  "videos": [
    {
      "id": "视频ID",
      "title": "视频标题",
      "url": "https://www.youtube.com/watch?v=...",
      "channel": "频道名",
      "viewCount": 123456,
      "durationSeconds": 3600,
      "durationDisplay": "1:00:00",
      "publishedAt": "ISO 8601 或空"
    }
  ]
}
```

### comments.json 契约

```json
{
  "schemaVersion": "1.0",
  "videoId": "视频ID",
  "videoTitle": "视频标题",
  "videoUrl": "https://www.youtube.com/watch?v=...",
  "channelName": "频道名",
  "extractedAt": "ISO 8601",
  "totalComments": 301,
  "sortBy": "top",
  "comments": [
    {
      "id": "评论ID",
      "author": "评论者昵称",
      "authorId": "评论者频道ID",
      "authorUrl": "频道URL",
      "authorAvatar": "头像URL",
      "text": "评论正文",
      "likeCount": 123,
      "publishedAt": "ISO 8601 或空",
      "parentId": "父评论ID或空"
    }
  ]
}
```

### avatars/{video_id}/manifest.json 契约

```json
{
  "schemaVersion": "1.0",
  "videoId": "视频ID",
  "videoUrl": "https://www.youtube.com/watch?v=...",
  "downloadedAt": "ISO 8601",
  "stats": { "total": 20, "downloaded": 18, "skipped": 1, "failed": 1 },
  "avatars": [
    {
      "author": "评论者昵称",
      "filename": "author.jpg",
      "sourceUrl": "原始头像URL",
      "sizeBytes": 4600
    }
  ]
}
```

### URL 字段覆盖说明

所有产出 JSON 均包含可直接访问的 URL 字段：

| 产出文件 | URL 字段 | 说明 |
|---------|---------|------|
| `results.json` | `videos[].url` | 视频播放页面，格式 `https://www.youtube.com/watch?v={id}` |
| `comments.json` | `videoUrl` | 视频播放页面 |
| `comments.json` | `comments[].authorUrl` | 评论者频道主页 |
| `comments.json` | `comments[].authorAvatar` | 评论者头像图片 URL |
| `manifest.json` | `videoUrl` | 视频播放页面 |
| `manifest.json` | `avatars[].sourceUrl` | 头像原始下载 URL |

## 前置环境

- **Bun** v1.0+
- **yt-dlp** 已安装并在 PATH 中
- **Chrome** 已登录 YouTube 的 profile（用于 CDP 提取 cookies）
- **bgutil PoToken server** 运行在 127.0.0.1:4416

## 脚本说明

### 1. 搜索视频 - `search_videos.js`

```bash
bun scripts/search_videos.js \
  --queries "anthropology documentary, ai business ideas" \
  --output-dir "D:/data/youtube" \
  --cookies "G:/cookies/youtube_cdp.txt" \
  --limit 20 \
  --search-size 10
```

| 参数 | 必需 | 默认值 | 说明 |
|------|------|--------|------|
| `--queries` | 是 | - | 逗号分隔的搜索词 |
| `--queries-file` | 否 | - | JSON 文件含 `{ queries: [...] }` |
| `--output-dir` | 是 | - | 输出根目录 |
| `--cookies` | 否 | `G:\cookies\youtube_cdp.txt` | yt-dlp cookies 文件 |
| `--limit` | 否 | 20 | 最终返回视频数上限 |
| `--search-size` | 否 | 10 | 每个查询的搜索条数 |
| `--language` | 否 | `en` | 搜索语言 |

产出：`{output-dir}/search_{query-slug}_{date}/results.json`

### 2. 提取评论 - `extract_comments.js`

```bash
bun scripts/extract_comments.js \
  --video-id "eA9Zf2-qYYM" \
  --output-dir "D:/data/youtube" \
  --cookies "G:/cookies/youtube_cdp.txt" \
  --max-comments 300
```

| 参数 | 必需 | 默认值 | 说明 |
|------|------|--------|------|
| `--video-id` | 是 | - | YouTube 视频 ID 或完整 URL |
| `--output-dir` | 是 | - | 输出根目录 |
| `--cookies` | 否 | `G:\cookies\youtube_cdp.txt` | yt-dlp cookies 文件 |
| `--max-comments` | 否 | 200 | 最多提取评论数 |
| `--sort-by` | 否 | `top` | `top` 高赞优先 或 `new` 最新优先 |

产出：`{output-dir}/comments/{video_id}/comments.json`

### 3. 下载头像 - `download_avatars.js`

```bash
# 方式一：从评论 JSON 文件下载
bun scripts/download_avatars.js \
  --comments-file "D:/data/youtube/comments/eA9Zf2-qYYM/comments.json" \
  --output-dir "D:/data/youtube"

# 方式二：直接指定视频 ID（自动提取评论后下载头像）
bun scripts/download_avatars.js \
  --video-id "eA9Zf2-qYYM" \
  --output-dir "D:/data/youtube" \
  --cookies "G:/cookies/youtube_cdp.txt"
```

| 参数 | 必需 | 默认值 | 说明 |
|------|------|--------|------|
| `--comments-file` | 二选一 | - | 已有 comments.json 路径 |
| `--video-id` | 二选一 | - | YouTube 视频 ID |
| `--output-dir` | 是 | - | 输出根目录 |
| `--cookies` | 否 | `G:\cookies\youtube_cdp.txt` | 仅 `--video-id` 模式需要 |
| `--top` | 否 | 20 | 下载前 N 条高赞评论的头像 |
| `--resolution` | 否 | `s200` | 头像分辨率参数（s88/s200/s400/s800） |

产出：`{output-dir}/avatars/{video_id}/{author}.jpg` + `manifest.json`

## Cookie 提取（可选辅助）

如果 yt-dlp 遇到 bot 检测，使用 CDP 方式提取 cookies：

```bash
# 1. 确认 bgutil 运行
curl http://127.0.0.1:4416/ping

# 2. 启动 Chrome CDP（需要已登录 YouTube 的 profile）
Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Process "chrome.exe" -ArgumentList `
  "--remote-debugging-port=9223",
  "--user-data-dir=G:\chrome_data\remote_debug",
  "--remote-allow-origins=*",
  "about:blank"

# 3. 提取 cookies
python scripts/extract_cookies.py --port 9223 --output "G:\cookies\youtube_cdp.txt"
```

## 端到端示例

```bash
# 搜索 → 获取评论 → 下载头像（完整链路）
bun scripts/search_videos.js --queries "ai agents tutorial" --output-dir "./my-data"
# 记下感兴趣的 videoId，比如 "eA9Zf2-qYYM"

bun scripts/extract_comments.js --video-id "eA9Zf2-qYYM" --output-dir "./my-data"
bun scripts/download_avatars.js --video-id "eA9Zf2-qYYM" --output-dir "./my-data"
# 或直接用 comments 文件：
bun scripts/download_avatars.js --comments-file "./my-data/comments/eA9Zf2-qYYM/comments.json" --output-dir "./my-data"
```

## 设计原则

1. **无状态**：脚本不记录历史，不写配置到项目目录
2. **参数化落点**：`--output-dir` 决定一切产出位置，不硬编码路径
3. **松散耦合**：每个脚本独立可运行，通过 JSON 文件串接
4. **幂等性**：搜索和评论提取覆盖写，头像下载跳过已存在的文件
