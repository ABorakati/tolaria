import { describe, expect, it } from "vitest";
import { readEmbeddedPreElement } from "./embeddedBlockParsing";

function codeElement(language: string, text: string) {
	const pre = document.createElement("pre");
	const code = document.createElement("code");
	code.setAttribute("data-language", language);
	code.textContent = text;
	pre.append(code);
	return pre;
}

describe("embedded block parsing", () => {
	it.each([
		"html",
		"HTML extra",
	])("preserves source and blocked scripts for %s code", (language) => {
		expect(readEmbeddedPreElement(codeElement(language, "source"))).toEqual({
			height: "320",
			html: "source\n",
			scripts: "blocked",
		});
	});
	it("preserves a terminating newline and a language class", () => {
		const pre = codeElement("", "source\n");
		const code = pre.firstElementChild;
		if (!code) throw new Error("Missing code fixture");
		code.removeAttribute("data-language");
		code.className = "language-html";
		expect(readEmbeddedPreElement(pre)).toEqual({
			height: "320",
			html: "source\n",
			scripts: "blocked",
		});
	});
	it("rejects other languages and mixed elements", () => {
		expect(
			readEmbeddedPreElement(codeElement("javascript", "source")),
		).toBeUndefined();
		const mixed = codeElement("html", "source");
		mixed.append(document.createElement("span"));
		expect(readEmbeddedPreElement(mixed)).toBeUndefined();
	});
});
