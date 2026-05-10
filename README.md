@'
## youtube-search

独立 YouTube 搜索、评论提取、头像下载工具套件。

### 功能
- **搜索视频** - 批量搜索 YouTube，返回按观看量排序的视频列表
- **提取评论** - 获取视频的高赞评论，含作者和头像 URL
- **下载头像** - 批量下载评论者头像，支持多分辨率

### 存储设计

所有产出由 `--output-dir` 决定落点，不依赖项目目录：

```
{output-dir}/
├── search_{query}_{date}/results.json
├── comments/{video_id}/comments.json
└── avatars/{video_id}/{author}.jpg
```

### 使用

```bash
# 搜索
bun scripts/search_videos.js --queries "ai business" --output-dir "./data"

# 评论
bun scripts/extract_comments.js --video-id "eA9Zf2-qYYM" --output-dir "./data"

# 头像
bun scripts/download_avatars.js --comments-file "data/comments/eA9Zf2-qYYM/comments.json" --output-dir "./data"
```

前置：Bun、yt-dlp、YouTube cookies（支持 CDP 提取）。
'@ | gh repo create youtube-search --public --description "Independent YouTube search, comment extraction, and avatar download toolkit." --source=. --remote=origin --push