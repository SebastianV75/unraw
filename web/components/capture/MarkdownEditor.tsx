"use client";

import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import Code2 from "reicon-react/icons/Code2";
import Link8 from "reicon-react/icons/Link8";
import List from "reicon-react/icons/List";
import List3 from "reicon-react/icons/List3";
import QuoteUp from "reicon-react/icons/QuoteUp";
import Text from "reicon-react/icons/Text";
import TextBold from "reicon-react/icons/TextBold";
import TextItalic from "reicon-react/icons/TextItalic";
import TextX from "reicon-react/icons/TextX";
import type { IconComponent } from "reicon-react/createIcon";
import { MarkdownRenderer } from "./MarkdownRenderer";

type MarkdownEditorProps = {
	value: string;
	onChangeAction: (value: string) => void;
	disabled?: boolean;
	maxLength?: number;
	variant?: "default" | "document" | "minimal";
	autoFocus?: boolean;
	livePreview?: boolean;
};

type ToolbarAction = {
	icon: IconComponent;
	hint: string;
	prefix: string;
	suffix?: string;
	placeholder: string;
	multiline?: boolean;
};

const toolbarActions: ToolbarAction[] = [
	{
		icon: Text,
		hint: "Título",
		prefix: "# ",
		placeholder: "Título",
		multiline: true,
	},
	{
		icon: TextBold,
		hint: "Negrita",
		prefix: "**",
		suffix: "**",
		placeholder: "bold text",
	},
	{
		icon: TextItalic,
		hint: "Cursiva",
		prefix: "*",
		suffix: "*",
		placeholder: "italic text",
	},
	{
		icon: TextX,
		hint: "Tachado",
		prefix: "~~",
		suffix: "~~",
		placeholder: "struck text",
	},
	{
		icon: List,
		hint: "Lista con viñetas",
		prefix: "- ",
		placeholder: "elemento de lista",
		multiline: true,
	},
	{
		icon: List3,
		hint: "Lista numerada",
		prefix: "1. ",
		placeholder: "elemento de lista",
		multiline: true,
	},
	{
		icon: QuoteUp,
		hint: "Cita",
		prefix: "> ",
		placeholder: "quote",
		multiline: true,
	},
	{
		icon: Code2,
		hint: "Código en línea",
		prefix: "`",
		suffix: "`",
		placeholder: "code",
	},
	{
		icon: Link8,
		hint: "Enlace",
		prefix: "[",
		suffix: "](https://)",
		placeholder: "link text",
	},
];

const getSelectedLines = (value: string, start: number, end: number) => {
	const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
	const nextLineBreak = value.indexOf("\n", end);
	const lineEnd = nextLineBreak === -1 ? value.length : nextLineBreak;
	return { lineStart, lineEnd, selected: value.slice(lineStart, lineEnd) };
};

export function MarkdownEditor({
	value,
	onChangeAction,
	disabled = false,
	maxLength = 12000,
	variant = "default",
	autoFocus = false,
	livePreview = false,
}: MarkdownEditorProps) {
	const documentVariant = variant === "document";
	const minimalVariant = variant === "minimal";
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const [mode, setMode] = useState<"write" | "preview">("write");

	function applyAction(action: ToolbarAction) {
		const textarea = textareaRef.current;
		if (!textarea) return;

		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const selected = value.slice(start, end);
		let nextValue = value;
		let nextStart = start;
		let nextEnd = end;

		if (action.multiline) {
			const lines = getSelectedLines(value, start, end);
			const replacement = lines.selected
				.split("\n")
				.map((line) => `${action.prefix}${line}`)
				.join("\n");
			nextValue = `${value.slice(0, lines.lineStart)}${replacement}${value.slice(lines.lineEnd)}`;
			nextStart = lines.lineStart;
			nextEnd = lines.lineStart + replacement.length;
		} else {
			const text = selected || action.placeholder;
			const suffix = action.suffix ?? action.prefix;
			const replacement = `${action.prefix}${text}${suffix}`;
			nextValue = `${value.slice(0, start)}${replacement}${value.slice(end)}`;
			nextStart = start + action.prefix.length;
			nextEnd = nextStart + text.length;
		}

		if (nextValue.length > maxLength) return;
		onChangeAction(nextValue);
		requestAnimationFrame(() => {
			textarea.focus();
			textarea.setSelectionRange(nextStart, nextEnd);
		});
	}

	function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
		if (!(event.metaKey || event.ctrlKey)) return;
		const shortcut = event.key.toLowerCase();
		const action =
			shortcut === "b"
				? toolbarActions[1]
				: shortcut === "i"
					? toolbarActions[2]
					: shortcut === "k"
						? toolbarActions[8]
						: null;
		if (!action) return;
		event.preventDefault();
		applyAction(action);
	}

	const remaining = maxLength - value.length;
	const editorTextarea = (
		<textarea
			ref={textareaRef}
			className={
				documentVariant
					? "markdown-document-textarea"
					: minimalVariant
						? "markdown-minimal-textarea"
						: "min-h-[22rem] w-full resize-y border-0 bg-transparent px-6 py-5 text-[1.05rem] leading-8 text-base-content outline-none placeholder:text-base-content/35"
			}
			placeholder={
				minimalVariant
					? "Escribe lo que tengas en mente..."
					: documentVariant
						? "Empieza a escribir…\n\nUsa la barra de formato cuando la necesites."
						: "Escribe lo que tengas en mente. Nosotros nos encargamos de ordenarlo.\n\nPuedes usar Markdown cuando lo necesites."
			}
			autoFocus={autoFocus}
			value={value}
			onChange={(event) => onChangeAction(event.target.value)}
			onKeyDown={handleKeyDown}
			maxLength={maxLength}
			disabled={disabled}
			aria-label="Nota en Markdown"
		/>
	);
	const previewPanel = (
		<div
			className={
				documentVariant
					? "markdown-document-preview"
					: "min-h-[22rem] px-6 py-5"
			}
		>
			<MarkdownRenderer content={value} />
		</div>
	);

	return (
		<div
			className={
				documentVariant
					? "markdown-editor markdown-editor-document"
					: minimalVariant
						? "markdown-editor markdown-editor-minimal"
						: "overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm transition-shadow focus-within:border-primary/50 focus-within:shadow-md"
			}
		>
			{!minimalVariant && (
				<div
					className={
						documentVariant
							? "markdown-editor-toolbar markdown-editor-toolbar-document"
							: "flex flex-wrap items-center justify-between gap-3 border-b border-base-300 px-3 py-2"
					}
				>
					<div
						className="flex items-center gap-1"
						aria-label="Formato Markdown"
					>
						{toolbarActions.map((action) => {
							const Icon = action.icon;
							return (
								<button
									className={
										documentVariant
											? "markdown-toolbar-button"
											: "btn btn-ghost btn-sm min-w-8 px-2 font-mono text-sm"
									}
									key={action.hint}
									type="button"
									onClick={() => applyAction(action)}
									disabled={disabled}
									title={action.hint}
									aria-label={action.hint}
								>
									<Icon
										size={15}
										color="currentColor"
										weight="Outline"
										strokeWidth={1.7}
										aria-hidden="true"
									/>
								</button>
							);
						})}
					</div>
					{!livePreview && (
						<div
							className={
								documentVariant
									? "markdown-editor-tabs"
									: "join rounded-lg bg-base-200 p-1"
							}
							role="tablist"
							aria-label="Vista del editor"
						>
							{(["write", "preview"] as const).map((tab) => (
								<button
									className={
										documentVariant
											? `markdown-editor-tab ${mode === tab ? "is-active" : ""}`
											: `join-item btn btn-xs ${mode === tab ? "btn-base-100 shadow-sm" : "btn-ghost"}`
									}
									key={tab}
									type="button"
									role="tab"
									aria-selected={mode === tab}
									onClick={() => setMode(tab)}
									disabled={disabled && tab === "write"}
								>
									{tab === "write" ? "Escribir" : "Vista previa"}
								</button>
							))}
						</div>
					)}
				</div>
			)}

			{livePreview ? (
				<div className="markdown-editor-live-grid">
					{editorTextarea}
					{previewPanel}
				</div>
			) : mode === "write" ? (
				editorTextarea
			) : (
				previewPanel
			)}

			{!minimalVariant && (
				<div
					className={
						documentVariant
							? "markdown-editor-footer markdown-editor-footer-document"
							: "flex flex-wrap items-center justify-between gap-3 border-t border-base-300 bg-base-200/50 px-5 py-3 text-xs text-base-content/55"
					}
				>
					<span>
						{documentVariant
							? "Escritura libre · formato cuando lo necesites"
							: "Markdown · tablas GFM, listas y tachado"}
					</span>
					<span className={remaining < 500 ? "text-warning" : ""}>
						{value.length.toLocaleString()} / {maxLength.toLocaleString()}
					</span>
				</div>
			)}
		</div>
	);
}
