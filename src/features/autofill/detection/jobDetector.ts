// Heuristic job info extractor for content scripts.
// Attempts to identify company name, job title, and location from the current page.
// Returns partial results — callers must handle missing fields gracefully.

import type { DetectedJobInfo } from "@/messaging/messages";

export function detectJobInfo(
  doc: Document,
  url: string
): DetectedJobInfo {
  return {
    company: detectCompany(doc, url),
    title: detectTitle(doc),
    location: detectLocation(doc),
    url,
  };
}

function detectCompany(doc: Document, url: string): string {
  // 1. Try known ATS URL patterns
  try {
    const u = new URL(url);
    const hostname = u.hostname;

    // Greenhouse: boards.greenhouse.io/company-slug/jobs/...
    if (hostname === "boards.greenhouse.io") {
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts[0]) return titleCase(parts[0].replace(/-/g, " "));
    }

    // Lever: jobs.lever.co/company-slug/...
    if (hostname === "jobs.lever.co") {
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts[0]) return titleCase(parts[0].replace(/-/g, " "));
    }

    // Workday: company.wd5.myworkdayjobs.com
    const workdayMatch = hostname.match(/^([^.]+)\.wd\d+\.myworkdayjobs\.com/);
    if (workdayMatch?.[1]) return titleCase(workdayMatch[1].replace(/-/g, " "));
  } catch {
    // malformed URL — continue
  }

  // 2. Try common meta tags
  const og = doc.querySelector('meta[property="og:site_name"]');
  if (og?.getAttribute("content")) return og.getAttribute("content")!.trim();

  const appName = doc.querySelector('meta[name="application-name"]');
  if (appName?.getAttribute("content")) return appName.getAttribute("content")!.trim();

  // 3. Try page title heuristics — often "Role at Company | ATS"
  const titleEl = doc.querySelector("title");
  if (titleEl?.textContent) {
    const match = titleEl.textContent.match(/ at (.+?)(?:\s*[\|–—]|$)/);
    if (match?.[1]) return match[1].trim();
  }

  return "";
}

function detectTitle(doc: Document): string {
  // 1. og:title
  const og = doc.querySelector('meta[property="og:title"]');
  if (og?.getAttribute("content")) return og.getAttribute("content")!.trim();

  // 2. JSON-LD JobPosting schema
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent ?? "");
      if (data["@type"] === "JobPosting" && data.title) return String(data.title).trim();
    } catch {
      // skip malformed JSON-LD
    }
  }

  // 3. h1 on page
  const h1 = doc.querySelector("h1");
  if (h1?.textContent) return h1.textContent.trim();

  return "";
}

function detectLocation(doc: Document): string {
  // JSON-LD location
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent ?? "");
      if (data["@type"] === "JobPosting" && data.jobLocation) {
        const loc = data.jobLocation;
        const addr = loc.address ?? loc;
        const parts = [addr.addressLocality, addr.addressRegion, addr.addressCountry].filter(Boolean);
        if (parts.length) return parts.join(", ");
      }
    } catch {
      // skip
    }
  }
  return "";
}

function titleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}
