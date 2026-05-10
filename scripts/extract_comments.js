#!/usr/bin/env bun
/**
 * extract_comments.js - 提取 YouTube 视频评论
 *
 * 用法:
 *   bun scripts/extract_comments.js --video-id "eA9Zf2-qYYM" --output-dir "./data"
 *   bun scripts/extract_comments.js --video-id "https://youtube.com/watch?v=eA9Zf2-qYYM" --output-dir "./data"
 *
 * 产出:
 *   {output-dir}/comments/{video_id}/comments.json
 */

import { resolve } from "node:path";
import {
  ytdlp,
  ensureDir,
  writeJson,
  extractVideoId,
  isoNow,
  parseArgs,
} from "./helpers.js";

// ---------------------------------------------------------------------------
// 提取评论
// ---------------------------------------------------------------------------

function extractCommentsFromInfo(data) {
  const comments = [];

  // yt-dlp --write-comments 返回的 comment 列表在 info.comments
  const raw = data.comments || [];
  for (const c of raw) {
    comments.push({
      author: c.author || "",
      authorId: c.author_id || "",
      authorUrl: c.author_url || "",
      authorAvatar: c.author_thumbnail || "",
      text: c.text || "",
      likeCount: c.like_count || 0,
      publishedAt: c.timestamp ? new Date(c.timestamp * 1000).toISOString() : "",
      parentId: c.parent || "",
      id: c.id || "",
    });
  }

  return comments;
}

// ---------------------------------------------------------------------------
// 主逻辑
// ---------------------------------------------------------------------------

async function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);

  const rawId = args["video-id"];
  if (!rawId) throw new Error("必需参数: --video-id <id 或 URL>");
  if (!args["output-dir"]) throw new Error("必需参数: --output-dir <目录>");

  const videoId = extractVideoId(rawId);
  const outputDir = resolve(args["output-dir"]);
  const cookies = args["cookies"] || undefined;
  const maxComments = parseInt(args["max-comments"] || "200", 10);
  const sortBy = args["sort-by"] || "top"; // "top" | "new"

  console.log(`[comments] 视频: ${videoId}`);
  console.log(`[comments] 最多: ${maxComments} 条, 排序: ${sortBy}`);
  console.log();

  // 提取评论
  console.log("[comments] 正在提取评论...");
  const orderFlag = sortBy === "new" ? "0" : "1"; // yt-dlp: 0=newest, 1=top

  let stdout;
  try {
    stdout = ytdlp(
      [
        "--dump-single-json",
        "--skip-download",
        "--write-comments",
        `https://www.youtube.com/watch?v=${videoId}`,
      ],
      { cookies, timeout: 180_000 }
    );
  } catch (err) {
    throw new Error(`提取评论失败: ${err.message}`);
  }

  const data = JSON.parse(stdout);
  let comments = extractCommentsFromInfo(data);

  // yt-dlp --write-comments 返回全部评论，在 JS 侧排序并截断
  if (sortBy === "top") {
    comments.sort((a, b) => b.likeCount - a.likeCount);
  }
  comments = comments.slice(0, maxComments);

  console.log(`[comments] 获取 ${comments.length} 条评论（共 ${data.comments ? data.comments.length : 0} 条）`);

  // 写入结果
  const dir = ensureDir(outputDir, "comments", videoId);
  const result = {
    schemaVersion: "1.0",
    videoId,
    videoTitle: data.title || "",
    videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
    channelName: data.channel || data.uploader || "",
    extractedAt: isoNow(),
    totalComments: comments.length,
    sortBy,
    comments,
  };

  const outputPath = resolve(dir, "comments.json");
  writeJson(outputPath, result);

  // 打印高赞 Top 5
  console.log();
  console.log(`[comments] 高赞 Top 5:`);
  comments.slice(0, 5).forEach((c, i) => {
    console.log(`  ${i + 1}. @${c.author} (${c.likeCount} 赞)`);
    console.log(`     ${c.text.slice(0, 100)}...`);
  });

  console.log();
  console.log(`[comments] 结果保存至: ${outputPath}`);
}

main().catch((err) => {
  console.error(`[comments] 错误: ${err.message}`);
  process.exit(1);
});
