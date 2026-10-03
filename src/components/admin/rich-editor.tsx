'use client';

import Image from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyleKit } from '@tiptap/extension-text-style';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useRef, useState } from 'react';
import { RICH_FONTS, RICH_FONT_SIZES } from '@/lib/rich-format';

/**
 * WYSIWYG editor for page bodies (ADR-0005). Writes its HTML into a hidden
 * input named `name`, so it posts with the surrounding form like any field;
 * the server sanitizes it with the same allow-list (src/lib/rich-html.ts).
 */

const toPersian = (text: string) =>
  text.replace(/\d/g, (digit) => String.fromCharCode(0x06f0 + Number(digit)));

function ToolButton({
  label,
  onClick,
  active = false,
  disabled = false,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`inline-flex h-9 min-w-9 items-center justify-center rounded-chip px-2 text-sm ${
        active ? 'bg-primary/15 text-primary' : 'text-ink hover:bg-surface-2'
      } disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

function Separator() {
  return <span aria-hidden="true" className="mx-1 h-6 w-px bg-line" />;
}

const selectClass =
  'h-9 rounded-chip border border-line bg-white px-2 text-sm text-ink focus:border-primary focus:outline-none';

function Toolbar({ editor, onImage }: { editor: Editor; onImage: () => void }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      heading: ([2, 3, 4] as const).find((level) => e.isActive('heading', { level })) ?? 0,
      fontFamily: (e.getAttributes('textStyle').fontFamily as string | undefined) ?? '',
      fontSize: (e.getAttributes('textStyle').fontSize as string | undefined) ?? '',
      color: (e.getAttributes('textStyle').color as string | undefined) ?? '#0e1a33',
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      bulletList: e.isActive('bulletList'),
      orderedList: e.isActive('orderedList'),
      blockquote: e.isActive('blockquote'),
      link: e.isActive('link'),
      table: e.isActive('table'),
      align: (['right', 'center', 'left', 'justify'] as const).find((a) =>
        e.isActive({ textAlign: a }),
      ),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const chain = () => editor.chain().focus();

  const setLink = () => {
    const previous = (editor.getAttributes('link').href as string | undefined) ?? 'https://';
    const url = window.prompt('نشانی پیوند (مثلاً https://yazdccima.com یا /courses):', previous);
    if (url === null) return;
    if (url.trim() === '' || url.trim() === 'https://') {
      chain().extendMarkRange('link').unsetLink().run();
      return;
    }
    chain().extendMarkRange('link').setLink({ href: url.trim() }).run();
  };

  return (
    <div
      role="toolbar"
      aria-label="ابزار ویرایش متن"
      className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b border-line bg-white p-2"
    >
      <ToolButton label="واگرد" onClick={() => chain().undo().run()} disabled={!state.canUndo}>
        ↶
      </ToolButton>
      <ToolButton label="ازنو" onClick={() => chain().redo().run()} disabled={!state.canRedo}>
        ↷
      </ToolButton>
      <Separator />
      <select
        aria-label="نوع بند"
        className={selectClass}
        value={state.heading}
        onChange={(event) => {
          const level = Number(event.target.value) as 0 | 2 | 3 | 4;
          if (level === 0) chain().setParagraph().run();
          else chain().setHeading({ level }).run();
        }}
      >
        <option value={0}>متن عادی</option>
        <option value={2}>تیتر بزرگ</option>
        <option value={3}>تیتر متوسط</option>
        <option value={4}>تیتر کوچک</option>
      </select>
      <select
        aria-label="قلم"
        className={selectClass}
        value={state.fontFamily}
        onChange={(event) =>
          event.target.value
            ? chain().setFontFamily(event.target.value).run()
            : chain().unsetFontFamily().run()
        }
      >
        <option value="">قلم پیش‌فرض</option>
        {Object.entries(RICH_FONTS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <select
        aria-label="اندازهٔ قلم"
        className={selectClass}
        value={state.fontSize}
        onChange={(event) =>
          event.target.value
            ? chain().setFontSize(event.target.value).run()
            : chain().unsetFontSize().run()
        }
      >
        <option value="">اندازهٔ پیش‌فرض</option>
        {RICH_FONT_SIZES.map((size) => (
          <option key={size} value={size}>
            {toPersian(size.replace('px', ''))}
          </option>
        ))}
      </select>
      <Separator />
      <ToolButton label="پررنگ" onClick={() => chain().toggleBold().run()} active={state.bold}>
        <b>ب</b>
      </ToolButton>
      <ToolButton label="کج" onClick={() => chain().toggleItalic().run()} active={state.italic}>
        <i>ک</i>
      </ToolButton>
      <ToolButton
        label="زیرخط"
        onClick={() => chain().toggleUnderline().run()}
        active={state.underline}
      >
        <u>ز</u>
      </ToolButton>
      <ToolButton
        label="خط‌خورده"
        onClick={() => chain().toggleStrike().run()}
        active={state.strike}
      >
        <s>خ</s>
      </ToolButton>
      <label
        className="inline-flex h-9 items-center gap-1 rounded-chip px-1 text-sm text-ink hover:bg-surface-2"
        title="رنگ متن"
      >
        <span aria-hidden="true">رنگ</span>
        <input
          type="color"
          aria-label="رنگ متن"
          value={state.color.startsWith('#') ? state.color : '#0e1a33'}
          onChange={(event) => chain().setColor(event.target.value).run()}
          className="size-6 cursor-pointer border-0 bg-transparent p-0"
        />
      </label>
      <label
        className="inline-flex h-9 items-center gap-1 rounded-chip px-1 text-sm text-ink hover:bg-surface-2"
        title="رنگ زمینهٔ متن"
      >
        <span aria-hidden="true">زمینه</span>
        <input
          type="color"
          aria-label="رنگ زمینهٔ متن"
          defaultValue="#fff3a3"
          onChange={(event) => chain().setBackgroundColor(event.target.value).run()}
          className="size-6 cursor-pointer border-0 bg-transparent p-0"
        />
      </label>
      <ToolButton
        label="پاک کردن قالب‌بندی"
        onClick={() => chain().unsetAllMarks().clearNodes().run()}
      >
        ⌫
      </ToolButton>
      <Separator />
      {(
        [
          ['right', 'راست‌چین', '⇥'],
          ['center', 'وسط‌چین', '≡'],
          ['left', 'چپ‌چین', '⇤'],
          ['justify', 'تمام‌چین', '☰'],
        ] as const
      ).map(([value, label, icon]) => (
        <ToolButton
          key={value}
          label={label}
          onClick={() => chain().setTextAlign(value).run()}
          active={state.align === value}
        >
          {icon}
        </ToolButton>
      ))}
      <Separator />
      <ToolButton
        label="فهرست گلوله‌ای"
        onClick={() => chain().toggleBulletList().run()}
        active={state.bulletList}
      >
        •
      </ToolButton>
      <ToolButton
        label="فهرست شماره‌دار"
        onClick={() => chain().toggleOrderedList().run()}
        active={state.orderedList}
      >
        ۱.
      </ToolButton>
      <ToolButton
        label="نقل‌قول"
        onClick={() => chain().toggleBlockquote().run()}
        active={state.blockquote}
      >
        «»
      </ToolButton>
      <ToolButton label="خط جداکننده" onClick={() => chain().setHorizontalRule().run()}>
        ―
      </ToolButton>
      <Separator />
      <ToolButton label="افزودن یا ویرایش پیوند" onClick={setLink} active={state.link}>
        پیوند
      </ToolButton>
      {state.link ? (
        <ToolButton label="برداشتن پیوند" onClick={() => chain().unsetLink().run()}>
          حذف پیوند
        </ToolButton>
      ) : null}
      <ToolButton label="افزودن تصویر" onClick={onImage}>
        تصویر
      </ToolButton>
      <ToolButton
        label="افزودن جدول ۳ در ۳"
        onClick={() => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
      >
        جدول
      </ToolButton>
      {state.table ? (
        <>
          <ToolButton label="سطر بعد" onClick={() => chain().addRowAfter().run()}>
            + سطر
          </ToolButton>
          <ToolButton label="ستون بعد" onClick={() => chain().addColumnAfter().run()}>
            + ستون
          </ToolButton>
          <ToolButton label="حذف سطر" onClick={() => chain().deleteRow().run()}>
            − سطر
          </ToolButton>
          <ToolButton label="حذف ستون" onClick={() => chain().deleteColumn().run()}>
            − ستون
          </ToolButton>
          <ToolButton label="سطر عنوان" onClick={() => chain().toggleHeaderRow().run()}>
            عنوان
          </ToolButton>
          <ToolButton
            label="ادغام یا جدا کردن خانه‌ها"
            onClick={() => chain().mergeOrSplit().run()}
          >
            ادغام
          </ToolButton>
          <ToolButton label="حذف جدول" onClick={() => chain().deleteTable().run()}>
            حذف جدول
          </ToolButton>
        </>
      ) : null}
    </div>
  );
}

export function RichEditor({
  name,
  initialHtml,
  label,
  error,
  uploadUrl,
}: {
  name: string;
  initialHtml: string;
  label: string;
  error?: string;
  uploadUrl: string;
}) {
  const [html, setHtml] = useState(initialHtml);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: {
          openOnClick: false,
          autolink: true,
          protocols: ['http', 'https', 'mailto', 'tel'],
          HTMLAttributes: { rel: null, target: null },
        },
      }),
      TextStyleKit.configure({ lineHeight: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'], defaultAlignment: 'right' }),
      Image.configure({ inline: false, allowBase64: false }),
      TableKit.configure({ table: { resizable: false } }),
    ],
    content: initialHtml,
    editorProps: {
      attributes: {
        dir: 'rtl',
        class: 'rich-content min-h-80 px-4 py-3 focus:outline-none',
        'aria-label': label,
        'aria-multiline': 'true',
      },
    },
    onUpdate: ({ editor: e }) => setHtml(e.isEmpty ? '' : e.getHTML()),
  });

  const upload = async (file: File) => {
    if (!editor) return;
    setUploading(true);
    setUploadError(null);
    try {
      const body = new FormData();
      body.append('image', file);
      const response = await fetch(uploadUrl, { method: 'POST', body });
      const result = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!response.ok || !result.url) {
        setUploadError(result.error ?? 'بارگذاری تصویر انجام نشد.');
        return;
      }
      const alt = window.prompt('توضیح کوتاه تصویر (برای نابینایان و موتورهای جستجو):', '') ?? '';
      editor.chain().focus().setImage({ src: result.url, alt }).run();
    } catch {
      setUploadError('بارگذاری تصویر انجام نشد. اتصال را بررسی کنید.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-sm font-semibold text-ink">
        {label}
        <span aria-hidden="true" className="text-danger">
          {' '}
          *
        </span>
      </span>
      <div
        className={`overflow-hidden rounded-control border-[1.5px] bg-white ${
          error ? 'border-danger' : 'border-line focus-within:border-primary'
        }`}
      >
        {editor ? <Toolbar editor={editor} onImage={() => fileInput.current?.click()} /> : null}
        <EditorContent editor={editor} />
      </div>
      <input type="hidden" name={name} value={html} />
      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void upload(file);
        }}
      />
      {uploading ? <p className="text-[13px] text-ink-2">در حال بارگذاری تصویر…</p> : null}
      {uploadError ? <p className="text-[13px] font-semibold text-danger">{uploadError}</p> : null}
      {error ? <p className="text-[13px] font-semibold text-danger">{error}</p> : null}
      <p className="text-[12.5px] leading-[1.8] text-ink-2">
        متن را مثل یک واژه‌پرداز بنویسید و قالب‌بندی کنید. تصویر: JPG، PNG یا WebP تا ۱۰ مگابایت.
        برای کار با جدول، داخل یکی از خانه‌های آن کلیک کنید تا دکمه‌های جدول ظاهر شوند.
      </p>
    </div>
  );
}
