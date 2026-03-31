"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExt from "@tiptap/extension-link";
import ImageExt from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import DOMPurify from "dompurify";
import { useRef, useEffect, useCallback } from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Highlighter,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link2,
  ImageIcon,
  Quote,
  Code,
  Minus,
  Undo,
  Redo,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    "p", "br", "strong", "b", "em", "i", "u", "s",
    "h1", "h2", "h3",
    "ul", "ol", "li",
    "a", "img",
    "blockquote", "pre", "code",
    "div", "span", "mark", "hr",
  ],
  ALLOWED_ATTR: [
    "href", "src", "alt", "title", "target",
    "class", "style",
  ],
};

function sanitizeHtml(html: string): string {
  if (typeof window === "undefined") return html;
  return DOMPurify.sanitize(html, SANITIZE_CONFIG);
}

const extensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
  }),
  LinkExt.configure({
    openOnClick: false,
    HTMLAttributes: { class: "text-accent underline" },
  }),
  ImageExt.configure({
    HTMLAttributes: { class: "max-w-full rounded-lg" },
  }),
  Placeholder.configure({ placeholder: "Начните писать..." }),
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  Underline,
  Highlight.configure({
    HTMLAttributes: { class: "bg-yellow-200" },
  }),
];

function ToolBtn({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      className={cn(
        "rounded p-1.5 transition-colors",
        active
          ? "bg-accent text-white"
          : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary",
      )}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
    >
      {children}
    </button>
  );
}

function MenuBar({ editor }: { editor: Editor }) {
  const setLink = useCallback(() => {
    const prev = editor.getAttributes("link").href ?? "";
    const url = window.prompt("URL ссылки:", prev);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  }, [editor]);

  const addImage = useCallback(() => {
    const url = window.prompt("URL изображения:");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  const s = 14;

  return (
    <div className="flex flex-wrap gap-0.5 border-b border-border bg-bg-tertiary px-2 py-1.5">
      <ToolBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Жирный">
        <Bold size={s} />
      </ToolBtn>
      <ToolBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Курсив">
        <Italic size={s} />
      </ToolBtn>
      <ToolBtn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Подчёркнутый">
        <UnderlineIcon size={s} />
      </ToolBtn>
      <ToolBtn active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="Зачёркнутый">
        <Strikethrough size={s} />
      </ToolBtn>
      <ToolBtn active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()} title="Выделение">
        <Highlighter size={s} />
      </ToolBtn>

      <div className="mx-1 w-px bg-border" />

      <ToolBtn active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Заголовок 1">
        <Heading1 size={s} />
      </ToolBtn>
      <ToolBtn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Заголовок 2">
        <Heading2 size={s} />
      </ToolBtn>
      <ToolBtn active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Заголовок 3">
        <Heading3 size={s} />
      </ToolBtn>

      <div className="mx-1 w-px bg-border" />

      <ToolBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Маркированный список">
        <List size={s} />
      </ToolBtn>
      <ToolBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Нумерованный список">
        <ListOrdered size={s} />
      </ToolBtn>

      <div className="mx-1 w-px bg-border" />

      <ToolBtn active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="По левому краю">
        <AlignLeft size={s} />
      </ToolBtn>
      <ToolBtn active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="По центру">
        <AlignCenter size={s} />
      </ToolBtn>
      <ToolBtn active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="По правому краю">
        <AlignRight size={s} />
      </ToolBtn>

      <div className="mx-1 w-px bg-border" />

      <ToolBtn active={editor.isActive("link")} onClick={setLink} title="Ссылка">
        <Link2 size={s} />
      </ToolBtn>
      <ToolBtn active={false} onClick={addImage} title="Изображение">
        <ImageIcon size={s} />
      </ToolBtn>
      <ToolBtn active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Цитата">
        <Quote size={s} />
      </ToolBtn>
      <ToolBtn active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Блок кода">
        <Code size={s} />
      </ToolBtn>
      <ToolBtn active={false} onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Горизонтальная линия">
        <Minus size={s} />
      </ToolBtn>

      <div className="mx-1 w-px bg-border" />

      <ToolBtn active={false} onClick={() => editor.chain().focus().undo().run()} title="Отменить">
        <Undo size={s} />
      </ToolBtn>
      <ToolBtn active={false} onClick={() => editor.chain().focus().redo().run()} title="Повторить">
        <Redo size={s} />
      </ToolBtn>
    </div>
  );
}

interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function RichTextEditor({
  value,
  onChange,
  disabled,
}: RichTextEditorProps) {
  const lastEmittedRef = useRef<string | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: value,
    editable: !disabled,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none p-4 min-h-[300px] focus:outline-none text-text-primary",
      },
    },
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML();
      const sanitized = sanitizeHtml(html);
      lastEmittedRef.current = sanitized;
      onChange?.(sanitized);
    },
  });

  useEffect(() => {
    if (!editor || !value) return;
    if (value === lastEmittedRef.current) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(sanitizeHtml(value), { emitUpdate: false });
    }
  }, [editor, value]);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-bg-primary">
      {editor && <MenuBar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
