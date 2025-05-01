import { useToast } from '@/hooks/use-toast';
import { uploads } from '@/lib/api';
import { cn } from '@/lib/utils';
import { PresignedUrlRequest, PresignedUrlResponse } from '@dyor-hub/types';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { type Editor, EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Code, ImageUp, Italic, List, Quote, Smile } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { TbGif } from 'react-icons/tb';
import { v4 as uuidv4 } from 'uuid';
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

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// Configure Image Extension to Allow Custom Attributes
const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      'data-upload-id': {
        default: null,
        parseHTML: (element) => element.getAttribute('data-upload-id'),
        renderHTML: (attributes) => {
          if (!attributes['data-upload-id']) {
            return {};
          }
          return { 'data-upload-id': attributes['data-upload-id'] };
        },
      },
      'data-s3-key': {
        default: null,
        parseHTML: (element) => element.getAttribute('data-s3-key'),
        renderHTML: (attributes) => {
          if (!attributes['data-s3-key']) {
            return {};
          }
          return { 'data-s3-key': attributes['data-s3-key'] };
        },
      },
    };
  },
});
// --- End Image Extension Configuration ---

const MenuBar = ({ editor }: { editor: Editor | null }) => {
  const [isEmojiPopoverOpen, setIsEmojiPopoverOpen] = useState(false);
  const [isGifPopoverOpen, setIsGifPopoverOpen] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const gifPickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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

  const handleImageUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!editor) return;
      const file = event.target.files?.[0];
      event.target.value = '';

      if (!file) return;

      // 1. Client-side Validation
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast({
          variant: 'destructive',
          title: 'Upload Failed',
          description: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`,
        });
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({
          variant: 'destructive',
          title: 'Upload Failed',
          description: `File too large. Max size: ${MAX_FILE_SIZE_MB}MB`,
        });
        return;
      }

      // Store placeholder ID
      const placeholderId = `upload-${uuidv4()}`;

      // 2. Insert Placeholder using a transaction
      try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        await new Promise<void>((resolve, reject) => {
          reader.onload = (e) => {
            const placeholderSrc = e.target?.result as string;
            if (!placeholderSrc) {
              reject(new Error('Could not read file for placeholder'));
              return;
            }

            // Use a transaction to insert the image node with custom attributes
            const { state } = editor;
            const { tr } = state;
            const node = state.schema.nodes.image.create({
              src: placeholderSrc,
              alt: 'Uploading...',
              title: file.name,
              'data-upload-id': placeholderId,
            });

            const insertPos = state.selection.$from.pos;
            tr.insert(insertPos, node);
            editor.view.dispatch(tr);
            resolve();
          };
          reader.onerror = (e) => reject(e);
        });
      } catch (readError: unknown) {
        console.error('Error creating placeholder:', readError);
        toast({
          variant: 'destructive',
          title: 'Upload Failed',
          description: readError instanceof Error ? readError.message : 'Could not read file.',
        });
        return;
      }

      // 3. Get Presigned URL
      let presignedResponse: PresignedUrlResponse;
      try {
        const requestData: PresignedUrlRequest = {
          filename: file.name,
          contentType: file.type,
          contentLength: file.size,
        };
        presignedResponse = await uploads.getPresignedImageUrl(requestData);
        toast({ title: 'Uploading image...' });
      } catch (error: unknown) {
        console.error('Failed to get presigned URL:', error);
        const errorMsg = error instanceof Error ? error.message : 'Could not prepare upload.';
        toast({
          variant: 'destructive',
          title: 'Upload Failed',
          description: errorMsg,
        });
        return;
      }

      // 4. Upload to S3
      try {
        const uploadResponse = await fetch(presignedResponse.presignedUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (!uploadResponse.ok) {
          throw new Error(
            `S3 Upload Failed: ${uploadResponse.status} ${uploadResponse.statusText}`,
          );
        }

        // 5. Finalize in Tiptap - Find node by ID and update via Transaction
        const finalImageUrl = `https://${process.env.NEXT_PUBLIC_S3_UPLOAD_BUCKET}.s3.${process.env.NEXT_PUBLIC_AWS_REGION}.amazonaws.com/${presignedResponse.objectKey}`;
        let nodeFound = false;

        // Use doc.descendants to find the node reliably by its unique ID
        editor.state.doc.descendants((node, pos) => {
          if (nodeFound) return false;

          if (node.type.name === 'image' && node.attrs['data-upload-id'] === placeholderId) {
            const { tr } = editor.state;
            tr.setNodeMarkup(pos, undefined, {
              // Use the found position (pos)
              src: finalImageUrl,
              alt: file.name,
              title: file.name,
              'data-s3-key': presignedResponse.objectKey,
              'data-upload-id': null,
            });
            editor.view.dispatch(tr);
            nodeFound = true;
            return false;
          }
          return true;
        });

        if (!nodeFound) {
          console.warn(`Could not find placeholder node with ID ${placeholderId} to update.`);
        }

        toast({ title: 'Image uploaded successfully!' });
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : 'Could not upload file.';
        toast({ variant: 'destructive', title: 'Upload Failed', description: errorMsg });

        // Remove placeholder if S3 upload fails - find node by ID first
        let nodeToRemoveFound = false;
        editor.state.doc.descendants((node, pos) => {
          if (nodeToRemoveFound) return false;
          if (node.type.name === 'image' && node.attrs['data-upload-id'] === placeholderId) {
            const { tr } = editor.state;
            tr.delete(pos, pos + node.nodeSize);
            editor.view.dispatch(tr);
            nodeToRemoveFound = true;
            return false;
          }
          return true;
        });
        if (!nodeToRemoveFound) {
          console.warn(
            `Could not find placeholder node with ID ${placeholderId} to remove after error.`,
          );
        }
      }
    },
    [editor, toast],
  );

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
      {/* Hidden file input */}
      <input
        type='file'
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept={ALLOWED_TYPES.join(',')}
        style={{ display: 'none' }}
      />
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

        {/* Image Upload Button */}
        <Button
          variant='ghost'
          size='sm'
          onClick={(e) => {
            e.preventDefault();
            fileInputRef.current?.click();
          }}
          className={cn('h-8 w-8 p-0 relative group')}
          aria-label='Upload Image'
          title='Upload Image'>
          <ImageUp className='h-4 w-4' />
          <span className='sr-only'>Upload Image</span>
        </Button>

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
      CustomImage.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          style: 'max-width: 100%; height: auto;',
          class: 'uploaded-image',
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
