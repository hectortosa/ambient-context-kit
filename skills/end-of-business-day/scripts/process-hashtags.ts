#!/usr/bin/env -S bun

/**
 * Process hashtags to YAML frontmatter conversion utility
 * Usage: bun scripts/process-hashtags.ts "text with #hashtags"
 *
 * Converts hashtags to YAML frontmatter format:
 * - #today -> dueDate: today's date
 * - #week -> dueDate: this/next Friday
 * - Other hashtags -> tags array
 */

import { parseArgs } from "util";

interface DateTags {
  today?: boolean;
  week?: boolean;
}

interface ProcessResult {
  dueDate?: string;
  tags: string[];
  frontmatter: string;
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get Friday of current/next week in YYYY-MM-DD format
 * Rules:
 * - If today is before Friday (Mon-Thu): return this Friday
 * - If today is Friday or later (Fri-Sun): return next Friday
 */
function getFridayDate(): string {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 5 = Friday

  let daysUntilFriday: number;

  if (dayOfWeek === 0) {
    // Sunday - Friday is 5 days away
    daysUntilFriday = 5;
  } else if (dayOfWeek < 5) {
    // Monday-Thursday - Friday is this week
    daysUntilFriday = 5 - dayOfWeek;
  } else {
    // Friday or later - next Friday
    daysUntilFriday = dayOfWeek === 5 ? 7 : 12 - dayOfWeek;
  }

  const friday = new Date(now);
  friday.setDate(friday.getDate() + daysUntilFriday);

  const year = friday.getFullYear();
  const month = String(friday.getMonth() + 1).padStart(2, "0");
  const day = String(friday.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Extract and categorize hashtags from text
 */
function parseHashtags(text: string): { dateTags: DateTags; categoryTags: string[] } {
  const hashtagRegex = /#(\w+)/g;
  const matches = text.matchAll(hashtagRegex);

  const dateTags: DateTags = {};
  const categoryTags: string[] = [];

  for (const match of matches) {
    const tag = match[1].toLowerCase();

    if (tag === "today" || tag === "week") {
      dateTags[tag as keyof DateTags] = true;
    } else {
      categoryTags.push(tag);
    }
  }

  // Remove duplicates and sort
  const uniqueTags = [...new Set(categoryTags)].sort();

  return { dateTags, categoryTags: uniqueTags };
}

/**
 * Generate YAML frontmatter from hashtags
 */
function generateFrontmatter(dateTags: DateTags, categoryTags: string[]): ProcessResult {
  let dueDate: string | undefined;
  const frontmatterLines: string[] = ["---"];

  // Handle due date
  if (dateTags.today) {
    dueDate = getTodayDate();
    frontmatterLines.push(`dueDate: ${dueDate}`);
  } else if (dateTags.week) {
    dueDate = getFridayDate();
    frontmatterLines.push(`dueDate: ${dueDate}`);
  }

  // Handle tags
  if (categoryTags.length > 0) {
    frontmatterLines.push("tags:");
    for (const tag of categoryTags) {
      frontmatterLines.push(`  - ${tag}`);
    }
  }

  frontmatterLines.push("---");
  const frontmatter = frontmatterLines.join("\n");

  return {
    dueDate,
    tags: categoryTags,
    frontmatter,
  };
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage: bun scripts/process-hashtags.ts \"text with #hashtags\"");
    console.log("\nExample: bun scripts/process-hashtags.ts \"Update Tax Card #week #personal\"");
    console.log("\nConverts hashtags to YAML frontmatter:");
    console.log("  #today  -> dueDate: today's date");
    console.log("  #week   -> dueDate: this/next Friday");
    console.log("  Other   -> tags array");
    process.exit(1);
  }

  const text = args.join(" ");
  const { dateTags, categoryTags } = parseHashtags(text);
  const result = generateFrontmatter(dateTags, categoryTags);

  console.log(result.frontmatter);

  if (result.dueDate || result.tags.length > 0) {
    console.log("\n# Parsed Result");
    if (result.dueDate) {
      console.log(`Due Date: ${result.dueDate}`);
    }
    if (result.tags.length > 0) {
      console.log(`Tags: ${result.tags.join(", ")}`);
    }
  }
}

main();
