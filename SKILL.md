---
name: youtube-search
description: "独立 YouTube 搜索、评论提取、头像下载工具套件。内置关键词拓展策略（格式维度×角度维度×热度维度），支持迭代精炼搜索。通过 --output-dir 控制存储落点。"
---

# YouTube Search - 搜索 / 评论 / 头像

独立、可移植的 YouTube 数据提取工具。不依赖特定目录结构，通过 `--output-dir` 参数确定数据落点。

## 搜索策略（编排者必读）

> **本 skill 的脚本只做执行，不做判断。搜索关键词的确定、扩展、精炼是编排者（你）的职责。**

### 原则：不要拿到用户的一句话就直接搜

用户的原始表述往往是"一个想法"，不是"一组搜索词"。编排者需要：

1. **意图校准** — 用户说的词 ≠ 用户真正想看的。先确认理解是否一致
2. **理解真实意图** — "找人类学视频" 可能意味着教学讲座、田野调查 Vlog、纪录片、或学术讨论，搜索结果天差地别
3. **拓展关键词** — 1-2 个种子词 → 5-8 个多角度查询
4. **选择格式策略** — 匹配用户想看的内容形式
5. **迭代精炼** — 搜一轮 → 看结果 → 问用户方向对不对 → 调整再搜

### ⛔ 硬性关卡：意图校准不可跳过

**严禁不做意图校准就直接调用 `search_videos.js`。** 这是本 skill 唯一的强制性步骤。

违反此规则的情况示例：
- 用户说"找人类学视频"→ 直接 `--queries "anthropology"` 执行搜索 ❌
- 用户说"搜 AI 创业"→ 不做校准直接扩展 8 个关键词搜 ❌

正确流程：
- 用户说任何搜索意图 → **必须**先做一次校准对话 → 校准完成后才能执行搜索 ✅

校准最少要做一件事：**用 2-3 个具体视频例子让用户确认方向**。即使用户看起来很明确（"我要看关于 X 的 Y 类型视频"），也至少用一句话追问确认。

唯一的例外：用户在同一个对话上下文中已经做过校准，且后续请求是同一主题的延续搜索（如"再搜搜看有没有更多"）。

### 意图校准（关键第一步）

领域术语在不同人群中有完全不同的含义。**用户说的词很可能不是 YouTube 上对应高流量内容的关键词。** 编排者需要做一次"翻译"：

**Step 1: 识别用户词可能存在的歧义**

```
用户说 "人类学视频"
  ├─ 学术含义: 人类学理论、民族志方法、田野调查方法论
  ├─ 大众认知: 原始部落生活、异文化纪录片、人类进化史
  └─ YouTube 高流量实际: "living with tribes", "ancient civilizations", "first peoples"
```

**Step 2: 用具体例子校准，而非用抽象定义追问**

❌ 不好的问法: "你要的是文化人类学还是体质人类学？"（用户可能答不上来）
✅ 好的问法:

```
"你说的「人类学视频」，更像哪一种？
  (a) 跟哈扎族一起打猎吃猴子 — 沉浸式部落生活 Vlog
  (b) PBS 出品的《第一批美洲人》— 历史文明纪录片  
  (c) MIT 的《什么是人类学》— 学术入门讲座
  (d) 都来点，帮我混合推荐"
```

**Step 3: 根据校准结果映射到搜索策略**

| 用户选择 | 实际搜索方向 | 示例查询 |
|---------|-------------|---------|
| (a) 部落 Vlog | `living with tribes vlog`, `tribe visit documentary` | 放弃 "anthropology" 这个词，改用 "tribe"/"living with" |
| (b) 历史纪录片 | `ancient civilizations documentary`, `first peoples full episode` | 加入 "PBS"/"National Geographic" 频道限定 |
| (c) 学术讲座 | `introduction to anthropology`, `anthropology lecture` | 保留 "anthropology"，但限定格式为 lecture/course |
| (d) 混合 | 以上三组并行搜索，按观看量混合排序 | 展示时标注每组来源 |

### 关键词拓展方法论

拿到用户的种子词后，不要直接搜。按以下维度扩展：

**1. 格式维度（用户想看什么形式？）**

| 格式 | 查询模板 | 适用场景 |
|------|---------|---------|
| Vlog/沉浸式 | `{topic} day in the life`, `living with {topic}` | 人类学田野调查、创业日常 |
| 纪录片 | `{topic} documentary`, `{topic} full episode` | 深度内容、历史回顾 |
| 教程/课程 | `{topic} tutorial`, `{topic} full course`, `introduction to {topic}` | 技能学习 |
| 案例/实操 | `{topic} case study`, `how I built {topic}`, `{topic} real results` | 商业分析 |
| 解释/科普 | `{topic} explained`, `what is {topic}` | 概念入门 |

**2. 角度维度（从什么视角切入？）**

```
种子词: "AI 创业"
├─ 按人群: "AI startup founder", "AI solopreneur"
├─ 按阶段: "AI business ideas", "scaling AI company"
├─ 按收入: "make money with AI", "AI business revenue"
├─ 按工具: "AI automation agency", "build AI agents"
└─ 按地域: "AI startup silicon valley", "AI business asia"
```

**3. 热度维度（怎样找到流量最高的内容？）**

- 先用宽泛词探测：`{topic}` 不加修饰，看 YouTube 返回什么 title pattern
- 从高观看视频的标题中提取高频短语，作为下一轮精炼查询
- 例如：搜 "anthropology" 发现 "anthropology documentary" 的视频观看量是纯 "anthropology" 的 10 倍

### 迭代对话模板

```
编排者: "你说的「人类学视频」，更像哪一种？
         (a) 跟部落同吃同住的沉浸式 Vlog
         (b) 历史文明纪录片（PBS/NatGeo 那种）
         (c) 学术讲座/入门课程
         (d) 都看看，帮我挑"

用户选择后 → 映射到实际搜索词 → 执行搜索 → 展示结果

编排者: "搜到 X 条结果。前 3 名是 [标题+观看量]。
         这个方向对吗？要不要换个角度再搜？"
```

**另一个例子**：

```
用户说 "AI 创业视频"
  → 校准：你想看的是哪种？
    (a) 具体操作指南 — "怎么用 AI 赚到第一桶金"
    (b) 真实案例 — "某人的 AI 公司从零到百万的故事"
    (c) 工具教程 — "Make.com + AI 搭建自动化业务"
    (d) 商业思维 — "AI 时代的创业机会在哪"
```

### 默认扩展策略

如果用户没给明确格式偏好，默认生成两套查询同时搜：
- **宽泛探测**（2-3 个）: `{topic}`, `{topic} documentary`, `{topic} explained`  
- **格式覆盖**（3-4 个）: 从 Vlog/教程/案例中各取一个角度

然后将两类结果并列展示，让用户选择深入方向。

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
