import { useToast } from '@/hooks/use-toast';
import { uploads, users } from '@/lib/api';
import { cn } from '@/lib/utils';
import { PresignedUrlRequest, PresignedUrlResponse, UserSearchResult } from '@dyor-hub/types';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { Range, type Editor as CoreEditor } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import Mention, { MentionOptions } from '@tiptap/extension-mention';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, ReactRenderer, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { SuggestionKeyDownProps, SuggestionProps } from '@tiptap/suggestion';
import { AtSign, Bold, Code, Image as ImageIcon, Italic, List, Quote, Smile } from 'lucide-react';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { TbGif } from 'react-icons/tb';
import tippy, { Instance, Props } from 'tippy.js';
import { v4 as uuidv4 } from 'uuid';
import { GifPicker } from '../gif-picker/GifPicker';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

import 'tippy.js/dist/tippy.css';
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
      'data-uploading': {
        default: null,
        parseHTML: (element) => element.getAttribute('data-uploading'),
        renderHTML: (attributes) => {
          if (!attributes['data-uploading']) {
            return {};
          }
          return { 'data-uploading': attributes['data-uploading'] };
        },
      },
    };
  },

  // Add a custom render function to display loading spinner
  addNodeView() {
    return ({ node, HTMLAttributes }) => {
      const dom = document.createElement('div');
      dom.classList.add('image-container');
      dom.style.position = 'relative';
      dom.style.display = 'inline-block';

      const img = document.createElement('img');
      Object.entries(HTMLAttributes).forEach(([key, value]) => {
        img.setAttribute(key, value);
      });

      dom.appendChild(img);

      // Add loading overlay if image is uploading
      if (node.attrs['data-upload-id']) {
        const overlay = document.createElement('div');
        overlay.classList.add('image-upload-overlay');

        const spinner = document.createElement('div');
        spinner.className =
          'animate-spin rounded-full border-t-2 border-b-2 border-primary h-8 w-8';

        overlay.appendChild(spinner);
        dom.appendChild(overlay);
      }

      return {
        dom,
        update: (updatedNode) => {
          // Check if the upload has completed
          if (updatedNode.attrs['data-upload-id'] !== node.attrs['data-upload-id']) {
            const overlay = dom.querySelector('.image-upload-overlay');
            if (overlay) {
              overlay.remove();
            }
          }
          return true;
        },
      };
    };
  },
});

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
              'data-uploading': 'true',
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
      } catch (error: unknown) {
        console.error('Failed to get presigned URL:', error);
        const errorMsg = error instanceof Error ? error.message : 'Could not prepare upload.';
        toast({
          variant: 'destructive',
          title: 'Upload Failed',
          description: errorMsg,
        });

        // Remove placeholder if getting presigned URL fails
        removeUploadPlaceholder(editor, placeholderId);
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
              'data-uploading': null,
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
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : 'Could not upload file.';
        toast({ variant: 'destructive', title: 'Upload Failed', description: errorMsg });

        // Remove placeholder if S3 upload fails
        removeUploadPlaceholder(editor, placeholderId);
      }
    },
    [editor, toast],
  );

  // Helper function to remove upload placeholder
  const removeUploadPlaceholder = (editor: Editor, placeholderId: string) => {
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
  };

  const insertMention = () => {
    if (editor) {
      editor.chain().focus().insertContent('@').run();
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
      {/* Hidden file input */}
      <input
        type='file'
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept={ALLOWED_TYPES.join(',')}
        style={{ display: 'none' }}
      />
      <div className='flex flex-wrap gap-1 p-1 border-b border-zinc-700/30 bg-zinc-900/20'>
        {/* Format Buttons */}
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

        {/* Mention Button */}
        <Button
          variant='ghost'
          size='sm'
          onClick={(e) => {
            e.preventDefault();
            insertMention();
          }}
          className={cn('h-8 w-8 p-0 relative group')}
          aria-label='Mention user'
          title='Mention user (@)'>
          <AtSign className='h-4 w-4' />
          <span className='sr-only'>Mention user</span>
          <div className='absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 before:content-[""] before:absolute before:top-full before:left-1/2 before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-zinc-800'>
            Mention user
            <span className='ml-2 opacity-75'>@</span>
          </div>
        </Button>

        {/* Emoji Popover */}
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
          <ImageIcon className='h-4 w-4' />
          <span className='sr-only'>Upload Image</span>
        </Button>

        {/* GIF Popover */}
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

// Suggestion List
interface SuggestionListProps {
  items: UserSearchResult[];
  command: (user: { id: string; label: string }) => void;
}

export interface SuggestionListRef {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

const SuggestionList = forwardRef<SuggestionListRef, SuggestionListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command({ id: item.username, label: item.username });
    }
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: SuggestionKeyDownProps): boolean => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
        return true;
      }
      if (event.key === 'Enter') {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  return (
    <div className='z-50 w-80 rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent hover:scrollbar-thumb-zinc-600'>
      {props.items.length ? (
        props.items.map((item, index) => (
          <button
            key={item.id}
            className={cn(
              'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full text-left gap-2',
              index === selectedIndex && 'bg-accent text-accent-foreground',
            )}
            onClick={() => selectItem(index)}>
            <Avatar className='h-7 w-7'>
              <AvatarImage src={item.avatarUrl} alt={item.username} />
              <AvatarFallback>{item.displayName?.charAt(0)?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className='flex flex-col'>
              <span className='font-medium leading-none'>{item.displayName}</span>
              <span className='text-xs text-muted-foreground mt-1'>@{item.username}</span>
            </div>
          </button>
        ))
      ) : (
        <div className='p-2 text-sm text-muted-foreground flex items-center justify-center py-4'>
          No users found
        </div>
      )}
    </div>
  );
});
SuggestionList.displayName = 'SuggestionList';

// Mention Suggestion Configuration

type SuggestionRenderProps = SuggestionProps<UserSearchResult>;

const suggestionConfig: MentionOptions['suggestion'] = {
  items: async ({ query }: { query: string }): Promise<UserSearchResult[]> => {
    if (!query || query.length < 1) {
      return users.search('', 5);
    }
    return users.search(query, 7);
  },

  render: () => {
    let component: ReactRenderer<SuggestionListRef, SuggestionListProps>;
    let popup: Instance<Props>[];

    return {
      onStart: (props: SuggestionRenderProps) => {
        /* eslint-disable @typescript-eslint/no-explicit-any */
        component = new ReactRenderer(SuggestionList, {
          props,
          editor: props.editor as any,
        });

        const clientRect = props.clientRect?.();
        if (!clientRect) {
          return;
        }

        popup = tippy('body', {
          getReferenceClientRect: () => clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
          animation: 'shift-away',
          theme: 'mention',
          maxWidth: 'none',
        });
      },

      onUpdate(props: SuggestionRenderProps) {
        component.updateProps(props);

        const clientRect = props.clientRect?.();
        if (!clientRect) {
          return;
        }

        popup[0].setProps({
          getReferenceClientRect: () => clientRect,
        });
      },

      onKeyDown(props: SuggestionKeyDownProps) {
        if (props.event.key === 'Escape') {
          popup[0].hide();
          return true;
        }
        return !!component.ref?.onKeyDown(props);
      },

      onExit() {
        if (popup && popup[0]) {
          popup[0].destroy();
        }
        if (component) {
          component.destroy();
        }
      },

      command: ({
        editor,
        range,
        props,
      }: {
        editor: CoreEditor;
        range: Range;
        props: UserSearchResult & { label?: string };
      }) => {
        const nodeAfter = editor.view.state.doc.nodeAt(range.to);
        const overrideSpace = nodeAfter?.text?.startsWith(' ');

        if (overrideSpace) {
          range.to += 1;
        }

        editor
          .chain()
          .focus()
          .insertContentAt(range, [
            {
              type: 'mention',
              attrs: {
                id: props.username,
                label: props.username,
              },
            },
            { type: 'text', text: ' ' },
          ])
          .run();

        window.getSelection()?.collapseToEnd();
      },

      allow: ({ editor, range }: { editor: CoreEditor; range: Range }) => {
        const $from = editor.state.doc.resolve(range.from);
        const type = editor.schema.nodes.mention;
        if (!type) return false;
        const allow = !!$from.parent.type.contentMatch.matchType(type);
        return allow;
      },
    };
  },
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

  const editorInstance = useEditor({
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
      Mention.configure({
        renderLabel({ node }) {
          return `@${node.attrs.label}`;
        },
        HTMLAttributes: {
          class: 'mention bg-blue-400/20 text-primary rounded px-1 py-0.5 font-semibold',
        },
        suggestion: suggestionConfig,
      }) as any,
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
    if (editorInstance && autoFocus) {
      editorInstance.commands.focus('end');
    }
  }, [editorInstance, autoFocus]);

  useEffect(() => {
    if (editorInstance && editorInstance.getHTML() !== content) {
      editorInstance.commands.setContent(content, false);
    }
  }, [editorInstance, content]);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .tippy-box[data-theme~='mention'] {
        background-color: transparent;
        border: none;
        box-shadow: none;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const handleRequestExpand = () => {
    if (!readOnly && variant === 'main' && !isExpanded) {
      onExpandedChange?.(true);
    }
  };

  return (
    <div
      className={cn(
        'bg-transparent overflow-hidden',
        variant === 'main' &&
          !isExpanded &&
          'hover:bg-zinc-800/20 cursor-text transition-colors duration-200',
        !readOnly && 'border-0',
      )}
      onClick={handleRequestExpand}>
      {!readOnly && isExpanded && (
        <div onClick={handleMenuBarClick}>
          <MenuBar editor={editorInstance} />
        </div>
      )}
      <EditorContent editor={editorInstance} />
    </div>
  );
}
