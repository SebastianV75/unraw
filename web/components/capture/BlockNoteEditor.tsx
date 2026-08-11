"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type BlockType =
	| "paragraph"
	| "heading1"
	| "heading2"
	| "heading3"
	| "bulleted-list"
	| "numbered-list"
	| "checklist"
	| "quote"
	| "code"
	| "divider";

type NoteBlock = {
	id: string;
	type: BlockType;
	text: string;
};

type SlashCommand = {
	label: string;
	description: string;
	type: BlockType;
};

const commands: SlashCommand[] = [
	{ label: "Texto", description: "Párrafo normal", type: "paragraph" },
	{ label: "Título 1", description: "Título principal", type: "heading1" },
	{ label: "Título 2", description: "Subtítulo", type: "heading2" },
	{ label: "Título 3", description: "Sección pequeña", type: "heading3" },
	{ label: "Lista", description: "Lista con viñetas", type: "bulleted-list" },
	{
		label: "Lista numerada",
		description: "Pasos ordenados",
		type: "numbered-list",
	},
	{ label: "Checklist", description: "Lista de tareas", type: "checklist" },
	{ label: "Cita", description: "Una idea destacada", type: "quote" },
	{ label: "Código", description: "Bloque monoespaciado", type: "code" },
	{ label: "Separador", description: "Línea divisoria", type: "divider" },
];

let nextId = 0;

function createBlock(type: BlockType = "paragraph", text = ""): NoteBlock {
	nextId += 1;
	return { id: `block-${Date.now()}-${nextId}`, type, text };
}

function parseMarkdown(markdown: string): NoteBlock[] {
	const lines = markdown.split("\n");
	const blocks: NoteBlock[] = [];
	let codeLines: string[] | null = null;

	for (const line of lines) {
		if (line.trim().startsWith("```")) {
			if (codeLines) {
				blocks.push(createBlock("code", codeLines.join("\n")));
				codeLines = null;
			} else {
				codeLines = [];
			}
			continue;
		}
		if (codeLines) {
			codeLines.push(line);
			continue;
		}
		if (/^\s*$/.test(line)) {
			if (blocks.length > 0 && blocks.at(-1)?.type !== "paragraph")
				blocks.push(createBlock());
			continue;
		}
		if (/^---+$/.test(line.trim())) {
			blocks.push(createBlock("divider"));
		} else if (/^###\s+/.test(line)) {
			blocks.push(createBlock("heading3", line.replace(/^###\s+/, "")));
		} else if (/^##\s+/.test(line)) {
			blocks.push(createBlock("heading2", line.replace(/^##\s+/, "")));
		} else if (/^#\s+/.test(line)) {
			blocks.push(createBlock("heading1", line.replace(/^#\s+/, "")));
		} else if (/^- \[[ xX]\]\s+/.test(line) || /^\[\]\s+/.test(line)) {
			blocks.push(
				createBlock(
					"checklist",
					line.replace(/^- \[[ xX]\]\s+/, "").replace(/^\[\]\s+/, ""),
				),
			);
		} else if (/^\d+\.\s+/.test(line)) {
			blocks.push(createBlock("numbered-list", line.replace(/^\d+\.\s+/, "")));
		} else if (/^[-*+]\s+/.test(line)) {
			blocks.push(createBlock("bulleted-list", line.replace(/^[-*+]\s+/, "")));
		} else if (/^(>|\")\s?/.test(line)) {
			blocks.push(createBlock("quote", line.replace(/^(>|\")\s?/, "")));
		} else {
			blocks.push(createBlock("paragraph", line));
		}
	}
	if (codeLines) blocks.push(createBlock("code", codeLines.join("\n")));
	return blocks.length > 0 ? blocks : [createBlock()];
}

function serializeMarkdown(blocks: NoteBlock[]) {
	return blocks
		.map((block) => {
			switch (block.type) {
				case "heading1":
					return `# ${block.text}`;
				case "heading2":
					return `## ${block.text}`;
				case "heading3":
					return `### ${block.text}`;
				case "bulleted-list":
					return `- ${block.text}`;
				case "numbered-list":
					return `1. ${block.text}`;
				case "checklist":
					return `- [ ] ${block.text}`;
				case "quote":
					return `> ${block.text}`;
				case "code":
					return `\`\`\`\n${block.text}\n\`\`\``;
				case "divider":
					return "---";
				default:
					return block.text;
			}
		})
		.join("\n");
}

function blockPrefix(type: BlockType) {
	switch (type) {
		case "heading1":
			return "H1";
		case "heading2":
			return "H2";
		case "heading3":
			return "H3";
		case "bulleted-list":
			return "•";
		case "numbered-list":
			return "1.";
		case "checklist":
			return "□";
		case "quote":
			return "“";
		case "code":
			return "</>";
		default:
			return "";
	}
}

export type BlockNoteEditorProps = {
	value: string;
	onChangeAction: (value: string) => void;
	maxLength?: number;
	autoFocus?: boolean;
};

export function BlockNoteEditor({
	value,
	onChangeAction,
	maxLength = 10000,
	autoFocus = false,
}: BlockNoteEditorProps) {
	const [blocks, setBlocks] = useState<NoteBlock[]>(() => parseMarkdown(value));
	const [slash, setSlash] = useState<{ id: string; query: string } | null>(
		null,
	);
	const [slashIndex, setSlashIndex] = useState(0);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [draggedId, setDraggedId] = useState<string | null>(null);
	const refs = useRef(new Map<string, HTMLTextAreaElement>());
	const lastSerialized = useRef(value);

	useEffect(() => {
		if (value === lastSerialized.current) return;
		const serialized = serializeMarkdown(blocks);
		if (value !== serialized) setBlocks(parseMarkdown(value));
		lastSerialized.current = value;
	}, [blocks, value]);

	const filteredCommands = useMemo(() => {
		if (!slash) return [];
		const query = slash.query.toLowerCase();
		return commands.filter(
			(command) =>
				!query ||
				command.label.toLowerCase().includes(query) ||
				command.description.toLowerCase().includes(query),
		);
	}, [slash]);

	function commit(next: NoteBlock[]) {
		setBlocks(next);
		const serialized = serializeMarkdown(next);
		lastSerialized.current = serialized;
		if (serialized.length <= maxLength) onChangeAction(serialized);
	}

	function focusBlock(id: string, position?: number) {
		requestAnimationFrame(() => {
			const textarea = refs.current.get(id);
			if (!textarea) return;
			textarea.focus();
			const cursor = position ?? textarea.value.length;
			textarea.setSelectionRange(cursor, cursor);
		});
	}

	function updateBlock(id: string, rawText: string) {
		let text = rawText;
		let type: BlockType | undefined;
		if (/^###\s/.test(text)) {
			type = "heading3";
			text = text.replace(/^###\s/, "");
		} else if (/^##\s/.test(text)) {
			type = "heading2";
			text = text.replace(/^##\s/, "");
		} else if (/^#\s/.test(text)) {
			type = "heading1";
			text = text.replace(/^#\s/, "");
		} else if (/^- \[[ xX]\]\s/.test(text) || /^\[\]\s/.test(text)) {
			type = "checklist";
			text = text.replace(/^- \[[ xX]\]\s/, "").replace(/^\[\]\s/, "");
		} else if (/^\d+\.\s/.test(text)) {
			type = "numbered-list";
			text = text.replace(/^\d+\.\s/, "");
		} else if (/^[-*+]\s/.test(text)) {
			type = "bulleted-list";
			text = text.replace(/^[-*+]\s/, "");
		} else if (/^(>|\")\s?/.test(text)) {
			type = "quote";
			text = text.replace(/^(>|\")\s?/, "");
		}
		const next = blocks.map((block) =>
			block.id === id ? { ...block, text, type: type ?? block.type } : block,
		);
		commit(next);
		const match = rawText.match(/(^|\s)\/([^\s]*)$/);
		setSlash(match ? { id, query: match[2] } : null);
		setSlashIndex(0);
	}

	function insertAfter(id: string, type: BlockType = "paragraph", text = "") {
		const index = blocks.findIndex((block) => block.id === id);
		const nextBlock = createBlock(type, text);
		const next = [...blocks];
		next.splice(index + 1, 0, nextBlock);
		commit(next);
		setSlash(null);
		focusBlock(nextBlock.id);
	}

	function applyCommand(command: SlashCommand) {
		if (!slash) return;
		const block = blocks.find((item) => item.id === slash.id);
		if (!block) return;
		const textarea = refs.current.get(block.id);
		const source = textarea?.value ?? block.text;
		const slashIndex = source.lastIndexOf("/");
		const next = blocks.map((item) =>
			item.id === block.id
				? {
						...item,
						type: command.type,
						text: source.slice(0, slashIndex).trim(),
					}
				: item,
		);
		commit(next);
		setSlash(null);
		focusBlock(block.id);
	}

	function handleKeyDown(
		event: React.KeyboardEvent<HTMLTextAreaElement>,
		block: NoteBlock,
	) {
		if (slash && filteredCommands.length > 0) {
			if (event.key === "ArrowDown" || event.key === "ArrowUp") {
				event.preventDefault();
				return;
			}
			if (event.key === "Enter") {
				event.preventDefault();
				applyCommand(filteredCommands[0]);
				return;
			}
			if (event.key === "Escape") {
				event.preventDefault();
				setSlash(null);
				return;
			}
		}
		if (event.key === "Enter" && !event.shiftKey && block.type !== "code") {
			event.preventDefault();
			const textarea = event.currentTarget;
			const start = textarea.selectionStart;
			const before = block.text.slice(0, start);
			const after = block.text.slice(textarea.selectionEnd);
			const continuesList = [
				"bulleted-list",
				"numbered-list",
				"checklist",
				"quote",
			].includes(block.type);
			const nextType = continuesList && before ? block.type : "paragraph";
			const replacement = blocks.map((item) =>
				item.id === block.id ? { ...item, type: nextType, text: before } : item,
			);
			const index = replacement.findIndex((item) => item.id === block.id);
			const newBlock = createBlock(nextType, after);
			replacement.splice(index + 1, 0, newBlock);
			commit(replacement);
			focusBlock(newBlock.id);
			return;
		}
		if (event.key === "Backspace" && event.currentTarget.selectionStart === 0) {
			event.preventDefault();
			const index = blocks.findIndex((item) => item.id === block.id);
			if (index === 0) return;
			const previous = blocks[index - 1];
			if (!block.text) {
				const next = blocks.filter((item) => item.id !== block.id);
				commit(next);
				focusBlock(previous.id);
				return;
			}
			const merged = `${previous.text}${previous.text ? " " : ""}${block.text}`;
			const next = blocks
				.filter((item) => item.id !== block.id)
				.map((item) =>
					item.id === previous.id ? { ...item, text: merged } : item,
				);
			commit(next);
			focusBlock(previous.id, previous.text.length);
		}
	}

	function duplicateBlock(id: string) {
		const index = blocks.findIndex((block) => block.id === id);
		if (index < 0) return;
		const duplicate = createBlock(blocks[index].type, blocks[index].text);
		const next = [...blocks];
		next.splice(index + 1, 0, duplicate);
		commit(next);
		focusBlock(duplicate.id);
	}

	function moveByOffset(id: string, offset: number) {
		const from = blocks.findIndex((block) => block.id === id);
		const to = from + offset;
		if (from < 0 || to < 0 || to >= blocks.length) return;
		const next = [...blocks];
		const [moved] = next.splice(from, 1);
		next.splice(to, 0, moved);
		commit(next);
		focusBlock(id);
	}

	function moveBlock(targetId: string) {
		if (!draggedId || draggedId === targetId) return;
		const from = blocks.findIndex((block) => block.id === draggedId);
		const to = blocks.findIndex((block) => block.id === targetId);
		if (from < 0 || to < 0) return;
		const next = [...blocks];
		const [moved] = next.splice(from, 1);
		next.splice(to, 0, moved);
		commit(next);
		setDraggedId(null);
	}

	return (
		<div className="block-note-editor">
			{blocks.map((block, index) => (
				<div
					className={`block-note-row is-${block.type}`}
					key={block.id}
					draggable
					onDragStart={() => setDraggedId(block.id)}
					onDragOver={(event) => event.preventDefault()}
					onDrop={() => moveBlock(block.id)}
				>
					<div className="block-note-gutter">
						<button
							className="block-note-plus"
							type="button"
							onClick={() =>
								insertAfter(index > 0 ? blocks[index - 1].id : block.id)
							}
							aria-label="Añadir bloque"
						>
							+
						</button>
						<span className="block-note-drag" aria-hidden="true">
							⋮⋮
						</span>
					</div>
					{block.type === "divider" ? (
						<hr className="block-note-divider" />
					) : (
						<div className="block-note-content">
							<span className="block-note-prefix" aria-hidden="true">
								{blockPrefix(block.type)}
							</span>
							<textarea
								ref={(node) => {
									if (node) refs.current.set(block.id, node);
									else refs.current.delete(block.id);
								}}
								className="block-note-input"
								value={block.text}
								autoFocus={autoFocus && index === 0}
								rows={block.type === "code" ? 3 : 1}
								placeholder={index === 0 ? "Empieza a escribir…" : ""}
								onChange={(event) => updateBlock(block.id, event.target.value)}
								onKeyDown={(event) => handleKeyDown(event, block)}
								aria-label={`${block.type} bloque ${index + 1}`}
							/>
						</div>
					)}
					{slash?.id === block.id && filteredCommands.length > 0 && (
						<div className="block-note-slash-menu" role="listbox">
							{filteredCommands.map((command) => (
								<button
									className="block-note-command"
									key={command.label}
									type="button"
									onMouseDown={(event) => event.preventDefault()}
									onClick={() => applyCommand(command)}
								>
									<strong>{command.label}</strong>
									<span>{command.description}</span>
								</button>
							))}
						</div>
					)}
				</div>
			))}
		</div>
	);
}
