"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownRendererProps = {
	content: string;
	compact?: boolean;
};

const safeUrl = (url: string) =>
	/^(https?:|mailto:|tel:|#|\/)/i.test(url) ? url : "";

const components: Components = {
	a: ({ href, children, ...props }) => (
		<a href={href} target="_blank" rel="noreferrer" {...props}>
			{children}
		</a>
	),
	img: ({ src, alt, ...props }) =>
		src ? <img src={src} alt={alt ?? ""} loading="lazy" {...props} /> : null,
};

export function MarkdownRenderer({
	content,
	compact = false,
}: MarkdownRendererProps) {
	return (
		<div
			className={
				compact
					? "markdown-content markdown-content-compact"
					: "markdown-content"
			}
		>
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				urlTransform={safeUrl}
				components={components}
			>
				{content || "_Nothing to preview yet._"}
			</ReactMarkdown>
		</div>
	);
}
