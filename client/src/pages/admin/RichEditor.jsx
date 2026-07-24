import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { useEffect, useState } from 'react';
import { Bold, Italic, List, ListOrdered, Heading2, Heading3, Quote, Link2, ImagePlus, Undo, Redo } from 'lucide-react';
import MediaPicker from './MediaPicker.jsx';
import { cx } from '../../lib/format.js';

/** Trình soạn thảo nội dung bài viết (TipTap) — xuất ra HTML. */
export default function RichEditor({ value, onChange }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener' } }),
      Image.configure({ HTMLAttributes: { class: 'rounded-xl' } }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Đồng bộ khi mở item khác
  useEffect(() => {
    if (editor && value !== editor.getHTML()) editor.commands.setContent(value || '', false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  if (!editor) return null;

  const Btn = ({ onClick, active, children, title }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cx('grid h-8 w-8 place-items-center rounded-lg text-sm', active ? 'bg-jade-600 text-white' : 'text-jade-600 hover:bg-jade-100 dark:text-jade-200 dark:hover:bg-jade-800')}
    >
      {children}
    </button>
  );

  const addLink = () => {
    const url = prompt('Nhập đường dẫn (URL):', 'https://');
    if (url) editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="rounded-xl border border-jade-200 dark:border-jade-700">
      <div className="flex flex-wrap items-center gap-1 border-b border-jade-200 p-2 dark:border-jade-700">
        <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Đậm"><Bold size={15} /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Nghiêng"><Italic size={15} /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Tiêu đề 2"><Heading2 size={15} /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Tiêu đề 3"><Heading3 size={15} /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Danh sách"><List size={15} /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Danh sách số"><ListOrdered size={15} /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Trích dẫn"><Quote size={15} /></Btn>
        <Btn onClick={addLink} active={editor.isActive('link')} title="Chèn liên kết"><Link2 size={15} /></Btn>
        <Btn onClick={() => setPickerOpen(true)} title="Chèn ảnh"><ImagePlus size={15} /></Btn>
        <span className="mx-1 h-5 w-px bg-jade-200 dark:bg-jade-700" />
        <Btn onClick={() => editor.chain().focus().undo().run()} title="Hoàn tác"><Undo size={15} /></Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()} title="Làm lại"><Redo size={15} /></Btn>
      </div>
      <EditorContent editor={editor} className="prose-vn max-h-[40vh] max-w-none overflow-y-auto p-4 focus:outline-none [&_.ProseMirror]:min-h-[12rem] [&_.ProseMirror]:outline-none" />
      <MediaPicker open={pickerOpen} onClose={() => setPickerOpen(false)} mode="single" onSelect={(url) => editor.chain().focus().setImage({ src: url }).run()} />
    </div>
  );
}
