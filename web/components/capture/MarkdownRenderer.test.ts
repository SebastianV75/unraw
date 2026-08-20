import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MarkdownRenderer } from "./MarkdownRenderer";

function render(content: string, headingMode?: "document" | "card") {
	return renderToStaticMarkup(
		createElement(MarkdownRenderer, {
			content,
			...(headingMode ? { headingMode } : {}),
		}),
	);
}

describe("MarkdownRenderer", () => {
	it("renders ATX and Setext headings as block card content without headings", () => {
		const html = render(
			"# Uno\n## Dos\n### Tres\n\nTítulo\n======\n\nSubtítulo\n--------",
			"card",
		);

		expect(html).not.toMatch(/<h[1-6](?:\s|>)/);
		expect(html).toContain('<div class="markdown-card-heading">Uno</div>');
		expect(html).toContain('<div class="markdown-card-heading">Título</div>');
	});

	it("preserves heading markers inside blockquotes and fenced code", () => {
		const html = render(
			"> \\# literal\n> \\## también\n> \\### intacto\n\n```md\n# código\n## literal\n### intacto\n```",
			"card",
		);

		expect(html).toContain("# literal");
		expect(html).toContain("## también");
		expect(html).toContain("# código\n## literal\n### intacto");
	});

	it("keeps C#, links, raw HTML, and paragraph boundaries visible", () => {
		const html = render(
			"C#\n\n[documentación](https://example.com)\n\n<div>HTML literal</div>",
			"card",
		);

		expect(html).toContain("C#");
		expect(html).toMatch(
			/<a href="https:\/\/example\.com" target="_blank" rel="noreferrer"[^>]*>documentación<\/a>/,
		);
		expect(html).toContain("&lt;div&gt;HTML literal&lt;/div&gt;");
		expect(html).toMatch(/<p>C#<\/p>[\s\S]*<p><a/);
	});

	it("keeps headings and link behavior in default document mode", () => {
		const html = render("# Título\n\n[enlace](https://example.com)");

		expect(html).toContain("<h1>Título</h1>");
		expect(html).toMatch(
			/<a href="https:\/\/example\.com" target="_blank" rel="noreferrer"[^>]*>enlace<\/a>/,
		);
	});
});
