import { htmlBlockMarkdownCodec as embeddedCodec } from "../utils/htmlBlockMarkdown";

interface EmbeddedPayload {
	height: string;
	html: string;
}

function codeLanguage(element: Element): string | undefined {
	const declared = element.getAttribute("data-language");
	const classLanguage = Array.from(element.classList)
		.find((value) => value.startsWith("language-"))
		?.slice(9);
	return (declared ?? classLanguage)?.trim().split(/\s+/u)[0]?.toLowerCase();
}

function embeddedCodeElement(element: HTMLElement): Element | null {
	if (element.tagName !== "PRE") return null;
	if (element.childElementCount !== 1) return null;
	const code = element.firstElementChild;
	return code?.tagName === "CODE" ? code : null;
}

export function readEmbeddedPreElement(
	element: HTMLElement,
): EmbeddedPayload | undefined {
	const code = embeddedCodeElement(element);
	if (!code) return undefined;
	if (codeLanguage(code) !== "html") return undefined;
	const markup = code.textContent ?? "";
	const payload = embeddedCodec.readCodeBlock?.({
		type: "codeBlock",
		props: { language: "html" },
		content: [
			{ type: "text", text: markup.endsWith("\n") ? markup : `${markup}\n` },
		],
	});
	return payload ? (payload as EmbeddedPayload) : undefined;
}
