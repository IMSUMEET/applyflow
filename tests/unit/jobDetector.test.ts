import { describe, it, expect, beforeEach } from "vitest";
import { JSDOM } from "jsdom";
import { detectJobInfo } from "@/features/autofill/detection/jobDetector";

function makeDoc(html: string): Document {
  return new JSDOM(html).window.document;
}

describe("detectJobInfo", () => {
  describe("company detection", () => {
    it("extracts company from Greenhouse URL slug", () => {
      const doc = makeDoc("<html><head><title>Engineer</title></head></html>");
      const result = detectJobInfo(doc, "https://boards.greenhouse.io/stripe/jobs/12345");
      expect(result.company).toBe("Stripe");
    });

    it("extracts company from Lever URL slug", () => {
      const doc = makeDoc("<html><head><title>Engineer</title></head></html>");
      const result = detectJobInfo(doc, "https://jobs.lever.co/notion/abc-123");
      expect(result.company).toBe("Notion");
    });

    it("extracts company from og:site_name meta tag", () => {
      const doc = makeDoc(
        `<html><head><meta property="og:site_name" content="Acme Corp"></head></html>`
      );
      const result = detectJobInfo(doc, "https://jobs.acme.com/apply");
      expect(result.company).toBe("Acme Corp");
    });

    it("extracts company from title 'at Company' pattern", () => {
      const doc = makeDoc(
        `<html><head><title>Senior Engineer at Figma | Careers</title></head></html>`
      );
      const result = detectJobInfo(doc, "https://figma.com/careers/123");
      expect(result.company).toBe("Figma");
    });

    it("returns empty string when company cannot be detected", () => {
      const doc = makeDoc("<html><head><title>Jobs</title></head></html>");
      const result = detectJobInfo(doc, "https://example.com");
      expect(result.company).toBe("");
    });
  });

  describe("title detection", () => {
    it("extracts title from JSON-LD JobPosting schema", () => {
      const doc = makeDoc(`
        <html><head>
          <script type="application/ld+json">
            {"@type":"JobPosting","title":"Staff Engineer"}
          </script>
        </head></html>
      `);
      const result = detectJobInfo(doc, "https://example.com");
      expect(result.title).toBe("Staff Engineer");
    });

    it("extracts title from h1", () => {
      const doc = makeDoc(`<html><body><h1>Frontend Engineer</h1></body></html>`);
      const result = detectJobInfo(doc, "https://example.com");
      expect(result.title).toBe("Frontend Engineer");
    });

    it("extracts title from og:title", () => {
      const doc = makeDoc(
        `<html><head><meta property="og:title" content="Data Scientist"></head></html>`
      );
      const result = detectJobInfo(doc, "https://example.com");
      expect(result.title).toBe("Data Scientist");
    });
  });

  describe("location detection", () => {
    it("extracts location from JSON-LD JobPosting", () => {
      const doc = makeDoc(`
        <html><head>
          <script type="application/ld+json">
            {"@type":"JobPosting","title":"Eng","jobLocation":{"address":{"addressLocality":"Seattle","addressRegion":"WA","addressCountry":"US"}}}
          </script>
        </head></html>
      `);
      const result = detectJobInfo(doc, "https://example.com");
      expect(result.location).toBe("Seattle, WA, US");
    });
  });

  it("always returns the url", () => {
    const doc = makeDoc("<html></html>");
    const result = detectJobInfo(doc, "https://example.com/job/42");
    expect(result.url).toBe("https://example.com/job/42");
  });
});
