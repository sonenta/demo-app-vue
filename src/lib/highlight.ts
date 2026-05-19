/**
 * Tiny hand-rolled syntax highlighter — bash + tsx + vue (single-file).
 * Returns flat token streams classified into a few colour buckets so we can
 * render code blocks with no external deps and zero runtime download.
 */
export type Token = { kind: TokenKind; text: string };
export type TokenKind =
  | "plain"
  | "comment"
  | "keyword"
  | "string"
  | "number"
  | "type"
  | "tag"
  | "attr"
  | "fn"
  | "punct";

const TS_KEYWORDS = new Set([
  "import",
  "from",
  "export",
  "default",
  "const",
  "let",
  "var",
  "function",
  "return",
  "if",
  "else",
  "for",
  "while",
  "true",
  "false",
  "null",
  "undefined",
  "new",
  "this",
  "as",
  "type",
  "interface",
  "in",
  "of",
  "async",
  "await",
  "void",
  "ref",
  "computed",
  "watch",
  "createApp",
]);

const TYPES = new Set([
  "string",
  "number",
  "boolean",
  "any",
  "unknown",
  "never",
  "Promise",
  "Array",
  "Locale",
  "Namespace",
  "App",
]);

const VUE_TAGS = new Set([
  "template",
  "script",
  "style",
  "div",
  "h1",
  "h2",
  "h3",
  "p",
  "span",
  "section",
  "header",
  "footer",
  "nav",
  "ul",
  "li",
  "ol",
  "a",
  "button",
  "code",
  "pre",
  "main",
  "RouterView",
  "RouterLink",
]);

const push = (out: Token[], kind: TokenKind, text: string) => {
  if (text.length === 0) return;
  const last = out[out.length - 1];
  if (last && last.kind === kind) last.text += text;
  else out.push({ kind, text });
};

export function tokenizeBash(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i]!;
    if (ch === "#") {
      const end = src.indexOf("\n", i);
      const stop = end === -1 ? src.length : end;
      push(out, "comment", src.slice(i, stop));
      i = stop;
      continue;
    }
    if (ch === '"' || ch === "'") {
      const q = ch;
      let j = i + 1;
      while (j < src.length && src[j] !== q) {
        if (src[j] === "\\") j += 2;
        else j += 1;
      }
      j = Math.min(j + 1, src.length);
      push(out, "string", src.slice(i, j));
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i + 1;
      while (j < src.length && /[A-Za-z0-9_-]/.test(src[j]!)) j += 1;
      const word = src.slice(i, j);
      const isFirst = i === 0 || /\s/.test(src[i - 1] ?? " ");
      push(out, isFirst ? "keyword" : "plain", word);
      i = j;
      continue;
    }
    push(out, "plain", ch);
    i += 1;
  }
  return out;
}

export function tokenizeTsx(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i]!;
    const two = src.slice(i, i + 2);
    if (two === "//") {
      const end = src.indexOf("\n", i);
      const stop = end === -1 ? src.length : end;
      push(out, "comment", src.slice(i, stop));
      i = stop;
      continue;
    }
    if (two === "/*") {
      const end = src.indexOf("*/", i + 2);
      const stop = end === -1 ? src.length : end + 2;
      push(out, "comment", src.slice(i, stop));
      i = stop;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      const q = ch;
      let j = i + 1;
      while (j < src.length && src[j] !== q) {
        if (src[j] === "\\") j += 2;
        else j += 1;
      }
      j = Math.min(j + 1, src.length);
      push(out, "string", src.slice(i, j));
      i = j;
      continue;
    }
    if (/[A-Za-z_$]/.test(ch)) {
      let j = i + 1;
      while (j < src.length && /[A-Za-z0-9_$]/.test(src[j]!)) j += 1;
      const word = src.slice(i, j);
      let kind: TokenKind = "plain";
      if (TS_KEYWORDS.has(word)) kind = "keyword";
      else if (TYPES.has(word)) kind = "type";
      else if (VUE_TAGS.has(word)) kind = "tag";
      else if (src[j] === "(") kind = "fn";
      else if (/^[A-Z]/.test(word)) kind = "type";
      push(out, kind, word);
      i = j;
      continue;
    }
    if (/\d/.test(ch)) {
      let j = i + 1;
      while (j < src.length && /[0-9.]/.test(src[j]!)) j += 1;
      push(out, "number", src.slice(i, j));
      i = j;
      continue;
    }
    if (/[<>{}()[\];,.:=+\-*/!?&|]/.test(ch)) {
      push(out, "punct", ch);
      i += 1;
      continue;
    }
    push(out, "plain", ch);
    i += 1;
  }
  return out;
}
