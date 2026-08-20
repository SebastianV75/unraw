"use client";

import * as React from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownRendererProps = {
	content: string;
	compact?: boolean;
	/** Render user/AI headings as card-local, non-document headings. */
	headingMode?: "document" | "card";
};

const safeUrl = (url: string) =>
	/^(https?:|mailto:|tel:|#|\/)/i.test(url) ? url : "";

const baseComponents: Components = {
	a: ({ href, children, ...props }) => (
		<a href={href} target="_blank" rel="noreferrer" {...props}>
			{children}
		</a>
	),
	img: ({ src, alt, ...props }) =>
		src ? <img src={src} alt={alt ?? ""} loading="lazy" {...props} /> : null,
};

const cardComponents: Components = {
	...baseComponents,
	h1: ({ children }) => <div className="markdown-card-heading">{children}</div>,
	h2: ({ children }) => <div className="markdown-card-heading">{children}</div>,
	h3: ({ children }) => <div className="markdown-card-heading">{children}</div>,
	h4: ({ children }) => <div className="markdown-card-heading">{children}</div>,
	h5: ({ children }) => <div className="markdown-card-heading">{children}</div>,
	h6: ({ children }) => <div className="markdown-card-heading">{children}</div>,
};

export function MarkdownRenderer({
	content,
	compact = false,
	headingMode = "document",
}: MarkdownRendererProps) {
	const cardMode = headingMode === "card";
	return (
		<div
			className={
				compact ? "markdown-content markdown-content-compact" : "markdown-content"
			}
		>
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				urlTransform={safeUrl}
				components={cardMode ? cardComponents : baseComponents}
			>
				{content || "_Nothing to preview yet._"}
			</ReactMarkdown>
		</div>
	);
}
