/**
 * helpers.js - YouTube Skill 共享工具
 * yt-dlp 封装、输出目录管理、JSON 读写
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";

/** 默认 cookies 路径 */
export const DEFAULT_COOKIES = "G:\\cookies\\youtube_cdp.txt";

/** yt-dlp 调用超时（毫秒） */
export const YTDLP_TIMEOUT = 120_000;

/**
 * 执行 yt-dlp 命令，返回 stdout
 * @throws {Error} yt-dlp 失败时抛出
 */
export function ytdlp(args, options = {}) {
  const {
    cookies = DEFAULT_COOKIES,
    timeout = YTDLP_TIMEOUT,
    encoding = "utf8",
    bin = "yt-dlp",
  } = options;

  const cmd = [
    bin,
    "--no-warnings",
    ...(cookies ? ["--cookies", cookies] : []),
    ...args,
  ];

  const result = spawnSync(cmd[0], cmd.slice(1), {
    encoding,
    maxBuffer: 50 * 1024 * 1024,
    timeout,
  });

  if (result.error) {
    throw new Error(`yt-dlp spawn failed: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const stderr = (result.stderr || "").trim();
    const stdout = (result.stdout || "").trim();
    throw new Error(stderr || stdout || "yt-dlp failed with unknown error");
  }

  return result.stdout;
}

/**
 * 在 outputDir 下创建目录并返回路径
 */
export function ensureDir(outputDir, ...segments) {
  const dir = resolve(outputDir, ...segments);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * 读取 JSON 文件
 */
export function readJson(filePath) {
  const raw = readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

/**
 * 写入 JSON 文件（格式化）
 */
export function writeJson(filePath, data) {
  writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

/**
 * 搜索查询 → slug
 */
export function queryToSlug(query) {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "search";
}

/**
 * 今天日期 YYYY-MM-DD
 */
export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * ISO 8601 时间戳
 */
export function isoNow() {
  return new Date().toISOString();
}

/**
 * 从 URL 或纯 ID 中提取视频 ID
 */
export function extractVideoId(input) {
  // 纯 ID: 11位字母数字+下划线+连字符
  if (/^[\w-]{11}$/.test(input)) return input;
  // 从 URL 中提取
  const m = input.match(/(?:v=|youtu\.be\/|embed\/|watch\?v=)([\w-]{11})/);
  if (m) return m[1];
  throw new Error(`无法解析视频 ID: ${input}`);
}

/**
 * 下载文件到指定路径，返回文件大小（字节）
 */
export async function downloadFile(url, destPath) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${url}`);
  const buf = Buffer.from(await resp.arrayBuffer());
  writeFileSync(destPath, buf);
  return buf.length;
}

/**
 * 解析 CLI 参数（简单的 --key value 格式）
 */
export function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token.startsWith("--")) {
      const key = token.slice(2);
      // 检查下一个 token 是否是值
      if (i + 1 < argv.length && !argv[i + 1].startsWith("--")) {
        args[key] = argv[++i];
      } else {
        args[key] = "true";
      }
    }
  }
  return args;
}
