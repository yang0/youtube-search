#!/usr/bin/env bun
/**
 * search_videos.js - YouTube 视频搜索
 *
 * 用法:
 *   bun scripts/search_videos.js --queries "anthropology, ai business" --output-dir "./data"
 *   bun scripts/search_videos.js --queries-file "./queries.json" --output-dir "./data"
 *
 * 产出:
 *   {output-dir}/search_{query-slug}_{date}/results.json
 */

import { resolve } from "node:path";
import {
  ytdlp,
  ensureDir,
  writeJson,
  queryToSlug,
  todayStr,
  isoNow,
  parseArgs
} from "./helpers.js";

// ---------------------------------------------------------------------------
// 主逻辑
// ---------------------------------------------------------------------------

async function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);

  // 校验必需参数
  if (!args["output-dir"]) {
    throw new Error("必需参数: --output-dir <目录>");
  }

  // 获取查询列表
  let queries = [];
  if (args["queries-file"]) {
    const { readFileSync } = await import("node:fs");
    const raw = readFileSync(resolve(args["queries-file"]), "utf8");
    const parsed = JSON.parse(raw);
    queries = parsed.queries || parsed.finalQueries || [];
  } else if (args["queries"]) {
    queries = args["queries"].split(",").map((q) => q.trim()).filter(Boolean);
  }

  if (queries.length === 0) {
    throw new Error("请提供搜索词: --queries 'xxx, yyy' 或 --queries-file <json>");
  }

  const outputDir = resolve(args["output-dir"]);
  const cookies = args["cookies"] || undefined;
  const limit = parseInt(args["limit"] || "20", 10);
  const searchSize = parseInt(args["search-size"] || "10", 10);
  const language = args["language"] || "en";

  const allVideos = [];
  const searchQueries = queries.slice(0, 8); // 最多 8 个查询

  console.log(`[search] 共 ${searchQueries.length} 个查询, 每个获取 ${searchSize} 条结果`);
  console.log();

  for (const query of searchQueries) {
    console.log(`[search] 搜索: "${query}"`);
    try {
      const stdout = ytdlp(
        [
          "--dump-single-json",
          "--skip-download",
          "--playlist-end", String(searchSize),
          "--extractor-args", `youtube:lang=${language}`,
          `ytsearch${searchSize}:${query}`,
        ],
        { cookies }
      );

      const data = JSON.parse(stdout);
      const entries = data.entries || [data];

      for (const entry of entries) {
        if (!entry.id || !entry.title) continue;
        allVideos.push({
          id: entry.id,
          title: entry.title,
          url: `https://www.youtube.com/watch?v=${entry.id}`,
          channel: entry.channel || entry.uploader || "",
          viewCount: entry.view_count || 0,
          durationSeconds: entry.duration || 0,
          durationDisplay: entry.duration_string || "",
          publishedAt: entry.upload_date || "",
          query,
        });
      }

      console.log(`  -> 获取 ${entries.filter((e) => e.id && e.title).length} 条`);
    } catch (err) {
      console.error(`  ✗ 搜索失败: ${err.message}`);
    }
  }

  // 去重并按观看量排序
  const seen = new Set();
  const unique = [];
  for (const v of allVideos) {
    if (seen.has(v.id)) continue;
    seen.add(v.id);
    unique.push(v);
  }
  const sorted = unique.sort((a, b) => b.viewCount - a.viewCount).slice(0, limit);

  // 写结果
  const slug = queryToSlug(searchQueries[0]);
  const date = todayStr();
  const dir = ensureDir(outputDir, `search_${slug}_${date}`);

  const result = {
    schemaVersion: "1.0",
    queries: searchQueries,
    searchedAt: isoNow(),
    totalVideos: sorted.length,
    videos: sorted,
  };

  const outputPath = resolve(dir, "results.json");
  writeJson(outputPath, result);

  console.log();
  console.log(`[search] 完成! 共 ${sorted.length} 条视频`);

  // 打印摘要
  sorted.slice(0, 5).forEach((v, i) => {
    console.log(`  ${i + 1}. [${v.viewCount.toLocaleString()}] ${v.title}`);
    console.log(`     ${v.url} | ${v.channel}`);
  });

  console.log();
  console.log(`[search] 结果保存至: ${outputPath}`);
}

main().catch((err) => {
  console.error(`[search] 错误: ${err.message}`);
  process.exit(1);
});
