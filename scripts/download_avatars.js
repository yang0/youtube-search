#!/usr/bin/env bun
/**
 * download_avatars.js - 下载 YouTube 评论者头像
 *
 * 用法:
 *   # 从已有 comments.json 下载
 *   bun scripts/download_avatars.js --comments-file "./comments/eA9Zf2-qYYM/comments.json" --output-dir "./data"
 *
 *   # 直接从视频 ID 提取评论后下载
 *   bun scripts/download_avatars.js --video-id "eA9Zf2-qYYM" --output-dir "./data"
 *
 * 产出:
 *   {output-dir}/avatars/{video_id}/{author}.jpg
 *   {output-dir}/avatars/{video_id}/manifest.json
 */

import { existsSync } from "node:fs";
import { resolve, basename } from "node:path";
import {
  ensureDir,
  writeJson,
  readJson,
  downloadFile,
  isoNow,
  extractVideoId,
  parseArgs,
} from "./helpers.js";

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

/**
 * 将头像 URL 中的分辨率参数替换
 * YouTube URL 中的 s88/s200/s400/s800 控制头像大小
 */
function resizeAvatarUrl(url, size) {
  if (!url) return "";
  return url.replace(/=s\d+/, `=${size}`);
}

/**
 * 清理作者名，生成合法文件名
 */
function sanitizeFilename(name) {
  return name
    .replace(/[@\s]+/g, "_")
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 60) || "unknown";
}

// ---------------------------------------------------------------------------
// 加载评论数据
// ---------------------------------------------------------------------------

async function loadComments({ commentsFile, videoId, outputDir, cookies }) {
  if (commentsFile) {
    return readJson(resolve(commentsFile));
  }

  if (videoId) {
    // 动态导入 extract_comments 逻辑
    const id = extractVideoId(videoId);
    const { execSync } = await import("node:child_process");
    const scriptDir = new URL(".", import.meta.url).pathname;
    const scriptPath = resolve(scriptDir, "extract_comments.js");

    console.log(`[avatars] 先提取视频 ${id} 的评论...`);
    let cmd = `bun "${scriptPath}" --video-id "${id}" --output-dir "${outputDir}" --max-comments 300`;
    if (cookies) cmd += ` --cookies "${cookies}"`;

    try {
      execSync(cmd, { encoding: "utf8", stdio: "inherit" });
    } catch (err) {
      throw new Error(`提取评论失败: ${err.message}`);
    }

    const commentsPath = resolve(outputDir, "comments", id, "comments.json");
    return readJson(commentsPath);
  }

  throw new Error("请提供 --comments-file 或 --video-id");
}

// ---------------------------------------------------------------------------
// 主逻辑
// ---------------------------------------------------------------------------

async function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);

  if (!args["output-dir"]) throw new Error("必需参数: --output-dir <目录>");
  if (!args["comments-file"] && !args["video-id"]) {
    throw new Error("请提供 --comments-file 或 --video-id");
  }

  const outputDir = resolve(args["output-dir"]);
  const cookies = args["cookies"] || undefined;
  const top = parseInt(args["top"] || "20", 10);
  const resolution = args["resolution"] || "s200";

  // 加载评论
  const data = await loadComments({
    commentsFile: args["comments-file"],
    videoId: args["video-id"],
    outputDir,
    cookies,
  });

  const videoId = data.videoId;
  const comments = (data.comments || []).slice(0, top);

  if (comments.length === 0) {
    console.log("[avatars] 没有可下载头像的评论");
    return;
  }

  console.log(`[avatars] 视频: ${videoId}, 下载前 ${comments.length} 条评论头像`);
  console.log();

  // 创建输出目录
  const avatarDir = ensureDir(outputDir, "avatars", videoId);

  // 下载头像
  const downloaded = [];
  let skipped = 0;
  let failed = 0;

  for (const c of comments) {
    const avatarUrl = c.authorAvatar;
    if (!avatarUrl) {
      skipped++;
      continue;
    }

    const filename = sanitizeFilename(c.author) + ".jpg";
    const destPath = resolve(avatarDir, filename);

    // 跳过已存在的
    if (existsSync(destPath)) {
      console.log(`  [跳过] ${c.author} (已存在)`);
      skipped++;
      continue;
    }

    const sizedUrl = resizeAvatarUrl(avatarUrl, resolution);
    try {
      const sizeBytes = await downloadFile(sizedUrl, destPath);
      console.log(`  [完成] ${c.author} -> ${filename} (${sizeBytes}B)`);
      downloaded.push({
        author: c.author,
        filename,
        sourceUrl: sizedUrl,
        sizeBytes,
      });
    } catch (err) {
      console.log(`  [失败] ${c.author}: ${err.message}`);
      failed++;
    }
  }

  // 写入 manifest
  const manifest = {
    schemaVersion: "1.0",
    videoId,
    videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
    downloadedAt: isoNow(),
    stats: { total: comments.length, downloaded: downloaded.length, skipped, failed },
    avatars: downloaded,
  };
  writeJson(resolve(avatarDir, "manifest.json"), manifest);

  console.log();
  console.log(`[avatars] 完成! 下载 ${downloaded.length}, 跳过 ${skipped}, 失败 ${failed}`);
  console.log(`[avatars] 保存至: ${avatarDir}`);
}

main().catch((err) => {
  console.error(`[avatars] 错误: ${err.message}`);
  process.exit(1);
});
