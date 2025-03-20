import { cn } from '@/lib/utils';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { type Editor, EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Code, Italic, Link as LinkIcon, List, Quote } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import { Button } from './button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './dialog';
import { Input } from './input';

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
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);

  const urlSchema = z.string().url().or(z.literal(''));

  const validateUrl = (url: string): boolean => {
    // Allow empty string (validation will be handled by disabled state)
    if (!url.trim()) return true;

    // If no protocol is specified, prepend https:// for validation
    const urlToValidate = url.match(/^https?:\/\//) ? url : `https://${url}`;

    const result = urlSchema.safeParse(urlToValidate);
    return result.success;
  };

  const handleLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setLinkUrl(newUrl);

    if (!validateUrl(newUrl)) {
      setUrlError('Please enter a valid URL (e.g., https://example.com)');
    } else {
      setUrlError(null);
    }
  };

  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!editor || !linkUrl.trim() || !validateUrl(linkUrl)) {
      return;
    }

    // Add https:// if no protocol is specified
    const formattedUrl = linkUrl.match(/^https?:\/\//) ? linkUrl : `https://${linkUrl}`;
    editor.chain().focus().extendMarkRange('link').setLink({ href: formattedUrl }).run();

    setIsLinkDialogOpen(false);
    setLinkUrl('');
    setUrlError(null);
  };

  if (!editor) {
    return null;
  }

  const formatActions = [
    {
      icon: Bold,
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive('bold'),
      label: 'Bold',
      shortcut: '⌘+B',
    },
    {
      icon: Italic,
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive('italic'),
      label: 'Italic',
      shortcut: '⌘+I',
    },
    {
      icon: Code,
      action: () => editor.chain().focus().toggleCodeBlock().run(),
      isActive: editor.isActive('codeBlock'),
      label: 'Code block',
      shortcut: '⌘+E',
    },
    {
      icon: List,
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive('bulletList'),
      label: 'Bullet list',
      shortcut: '⌘+Shift+8',
    },
    {
      icon: Quote,
      action: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: editor.isActive('blockquote'),
      label: 'Quote',
      shortcut: '⌘+Shift+B',
    },
    {
      icon: LinkIcon,
      action: () => {
        const previousUrl = editor.getAttributes('link').href;
        setLinkUrl(previousUrl || '');
        setIsLinkDialogOpen(true);
      },
      isActive: editor.isActive('link'),
      label: 'Link',
      shortcut: '⌘+K',
    },
  ];

  return (
    <>
      <div className='flex flex-wrap gap-1 p-1 border-b'>
        {formatActions.map(({ icon: Icon, action, isActive, label, shortcut }) => (
          <Button
            key={label}
            variant='ghost'
            size='sm'
            onClick={(e) => {
              e.preventDefault();
              action();
            }}
            className={cn('h-8 w-8 p-0 relative group', isActive && 'bg-muted')}
            aria-label={label}
            title={`${label} ${shortcut}`}>
            <Icon className='h-4 w-4' />
            <span className='sr-only'>{label}</span>
            <div className='absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 before:content-[""] before:absolute before:top-full before:left-1/2 before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-zinc-800'>
              {label}
              <span className='ml-2 opacity-75'>{shortcut}</span>
            </div>
          </Button>
        ))}
      </div>

      <Dialog
        open={isLinkDialogOpen}
        onOpenChange={(open) => {
          setIsLinkDialogOpen(open);
          if (!open) {
            setLinkUrl('');
            setUrlError(null);
          }
        }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Link</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLinkSubmit} onClick={(e) => e.stopPropagation()}>
            <div className='py-4'>
              <Input
                placeholder='Enter URL'
                value={linkUrl}
                onChange={handleLinkChange}
                autoFocus
                className={cn(urlError && 'border-red-500')}
              />
              {urlError && <p className='text-sm text-red-500 mt-1'>{urlError}</p>}
            </div>
            <DialogFooter>
              <Button
                type='button'
                variant='ghost'
                onClick={(e) => {
                  e.stopPropagation();
                  setIsLinkDialogOpen(false);
                  setLinkUrl('');
                  setUrlError(null);
                }}>
                Cancel
              </Button>
              <Button type='submit' disabled={!linkUrl.trim() || !!urlError}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
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
        showOnlyWhenEditable: false,
        emptyEditorClass: 'is-editor-empty',
      }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          class: 'text-blue-500 hover:underline cursor-pointer',
        },
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm dark:prose-invert max-w-none focus:outline-hidden transition-[height] duration-200',
          variant === 'main'
            ? isExpanded
              ? 'min-h-[100px] p-3'
              : 'min-h-0 px-4 py-2'
            : 'min-h-[100px] p-3',
          className,
        ),
      },
      handleDrop: () => true, // Prevent default drop behavior
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
