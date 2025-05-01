import { cn } from '@/lib/utils';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { type Editor, EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Code, Italic, List, Quote, Smile } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { TbGif } from 'react-icons/tb';
import { GifPicker } from '../gif-picker/GifPicker';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

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

interface EmojiMartData {
  native: string;
}

const MenuBar = ({ editor }: { editor: Editor | null }) => {
  const [isEmojiPopoverOpen, setIsEmojiPopoverOpen] = useState(false);
  const [isGifPopoverOpen, setIsGifPopoverOpen] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const gifPickerRef = useRef<HTMLDivElement>(null);

  const handleEmojiSelect = (emojiData: EmojiMartData) => {
    if (editor) {
      setIsEmojiPopoverOpen(false);
      editor.chain().focus().insertContent(emojiData.native).run();
    }
  };

  const handleGifSelect = (url: string, alt: string) => {
    if (editor) {
      setIsGifPopoverOpen(false);
      editor
        .chain()
        .focus()
        .setImage({ src: url, alt: alt || 'GIF' })
        .run();
    }
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
        <Popover open={isEmojiPopoverOpen} onOpenChange={setIsEmojiPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant='ghost'
              size='sm'
              className={cn('h-8 w-8 p-0 relative group')}
              aria-label='Emoji'
              title='Emoji'>
              <Smile className='h-4 w-4' />
              <span className='sr-only'>Emoji</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className='w-auto p-0'
            align='start'
            onInteractOutside={(event: Event) => {
              if (emojiPickerRef.current?.contains(event.target as Node)) {
                event.preventDefault();
              }
            }}>
            <div ref={emojiPickerRef}>
              <Picker data={data} onEmojiSelect={handleEmojiSelect} theme='dark' />
            </div>
          </PopoverContent>
        </Popover>
        <Popover open={isGifPopoverOpen} onOpenChange={setIsGifPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant='ghost'
              size='sm'
              className={cn('h-8 w-8 p-0 relative group')}
              aria-label='Insert GIF'
              title='Insert GIF'>
              <TbGif className='h-5 w-5' />
              <span className='sr-only'>Insert GIF</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className='w-auto p-0 border-none shadow-none bg-transparent'
            align='start'
            sideOffset={5}
            onInteractOutside={(event: Event) => {
              if (gifPickerRef.current?.contains(event.target as Node)) {
                event.preventDefault();
              }
            }}>
            <div ref={gifPickerRef}>
              <GifPicker onSelect={handleGifSelect} onClose={() => setIsGifPopoverOpen(false)} />
            </div>
          </PopoverContent>
        </Popover>
      </div>
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
  isExpanded = false,
  onExpandedChange,
  variant = 'main',
  autoFocus = false,
}: RichTextEditorProps) {
  const handleMenuBarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

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
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          style: 'max-width: 100%; height: auto;',
        },
      }),
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const newContent = editor.getHTML();
      if (maxLength && newContent.length > maxLength) {
        return;
      }
      onChange(newContent);
    },
    editorProps: {
      attributes: {
        class: cn('prose prose-sm dark:prose-invert max-w-none focus:outline-none', className),
      },
      handleDrop: () => true,
    },
    immediatelyRender: false,
    autofocus: autoFocus,
  });

  useEffect(() => {
    if (editor && autoFocus) {
      editor.commands.focus();
    }
  }, [editor, autoFocus]);

  useEffect(() => {
    if (editor && editor.getHTML() !== content) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  const handleRequestExpand = () => {
    if (!readOnly && variant === 'main' && !isExpanded) {
      onExpandedChange?.(true);
    }
  };

  return (
    <div
      className={cn(
        'bg-background overflow-hidden',
        variant === 'main' && !isExpanded && 'hover:bg-accent/50 cursor-text',
      )}
      onClick={handleRequestExpand}>
      {!readOnly && isExpanded && (
        <div onClick={handleMenuBarClick}>
          <MenuBar editor={editor} />
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
