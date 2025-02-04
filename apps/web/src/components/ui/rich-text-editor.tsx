import { cn } from '@/lib/utils';
import Placeholder from '@tiptap/extension-placeholder';
import { type Editor, EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Code, Italic, List, Quote } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from './button';

// Add global styles for the placeholder
import './rich-text-editor.css';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  maxLength?: number;
  readOnly?: boolean;
  isExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  variant?: 'main' | 'reply';
  autoFocus?: boolean;
}

const MenuBar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) {
    return null;
  }

  const formatActions = [
    {
      icon: Bold,
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive('bold'),
      label: 'Bold',
    },
    {
      icon: Italic,
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive('italic'),
      label: 'Italic',
    },
    {
      icon: Code,
      action: () => editor.chain().focus().toggleCodeBlock().run(),
      isActive: editor.isActive('codeBlock'),
      label: 'Code block',
    },
    {
      icon: List,
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive('bulletList'),
      label: 'Bullet list',
    },
    {
      icon: Quote,
      action: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: editor.isActive('blockquote'),
      label: 'Quote',
    },
  ];

  return (
    <div className='flex flex-wrap gap-1 p-1 border-b'>
      {formatActions.map(({ icon: Icon, action, isActive, label }) => (
        <Button
          key={label}
          variant='ghost'
          size='sm'
          onClick={(e) => {
            e.preventDefault(); // Prevent form submission
            action();
          }}
          className={cn('h-8 w-8 p-0', isActive && 'bg-muted')}
          aria-label={label}>
          <Icon className='h-4 w-4' />
        </Button>
      ))}
    </div>
  );
};

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Write something...',
  className,
  maxLength,
  readOnly = false,
  isExpanded: controlledIsExpanded,
  onExpandedChange,
  variant = 'main',
  autoFocus = false,
}: RichTextEditorProps) {
  const [internalIsExpanded, setInternalIsExpanded] = useState(variant === 'reply');
  const isExpanded = variant === 'reply' ? true : (controlledIsExpanded ?? internalIsExpanded);

  const handleExpand = useCallback(() => {
    if (!readOnly && variant === 'main') {
      const newExpandedState = true;
      setInternalIsExpanded(newExpandedState);
      onExpandedChange?.(newExpandedState);
    }
  }, [readOnly, onExpandedChange, variant]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
        codeBlock: {
          HTMLAttributes: {
            class: 'rounded-md bg-muted p-4',
          },
        },
      }),
      Placeholder.configure({
        placeholder,
        showOnlyWhenEditable: true,
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm dark:prose-invert max-w-none focus:outline-none transition-[height] duration-200',
          variant === 'main'
            ? isExpanded
              ? 'min-h-[100px] p-3'
              : 'min-h-0 px-4 py-2'
            : 'min-h-[100px] p-3',
          className,
        ),
      },
    },
    onUpdate: ({ editor }) => {
      const newContent = editor.getHTML();
      if (maxLength && newContent.length > maxLength) {
        // Prevent further input if maxLength is reached
        return;
      }
      onChange(newContent);
    },
    onFocus: handleExpand,
    editable: !readOnly,
    autofocus: autoFocus,
  });

  // Handle autofocus when the editor is mounted
  useEffect(() => {
    if (editor && autoFocus) {
      editor.commands.focus();
    }
  }, [editor, autoFocus]);

  // Reset editor content when content prop changes
  useEffect(() => {
    if (editor && editor.getHTML() !== content) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  return (
    <div
      className={cn(
        'bg-background overflow-hidden',
        variant === 'main' && !isExpanded && 'hover:bg-accent/50 cursor-text',
      )}
      onClick={handleExpand}>
      {!readOnly && (variant === 'reply' || isExpanded) && <MenuBar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
