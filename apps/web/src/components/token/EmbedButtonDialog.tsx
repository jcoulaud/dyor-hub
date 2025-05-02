'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { CheckIcon, ClipboardCopy } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';

type Theme = 'default' | 'light' | 'dark';
type DisplayMode = 'text-and-icon' | 'icon-only';

interface EmbedButtonDialogProps {
  tokenId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const THEMES = {
  default: {
    background: '#6366f1', // indigo-500
    text: '#ffffff',
    icon: '#ffffff',
  },
  light: {
    background: '#f3f4f6', // gray-100
    text: '#1f2937', // gray-800
    icon: '#1f2937', // gray-800
  },
  dark: {
    background: '#111827', // gray-900
    text: '#f9fafb',
    icon: '#f9fafb',
  },
};

const BUTTON_STYLES = {
  textAndIcon: {
    padding: '8px 12px',
    iconSize: 20,
    iconMargin: '8px',
    fontSize: '14px',
    minHeight: '36px',
  },
  iconOnly: {
    padding: '3px 8px',
    iconSize: 24,
    iconMargin: '0',
    fontSize: '14px',
  },
};

const BASE_BUTTON_STYLE = `
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  font-weight: 500;
  text-decoration: none;
  border-radius: 6px;
  /* border: 1px solid; */ /* Border removed */
  transition: opacity 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  line-height: 1;
  cursor: pointer;
  white-space: nowrap;
  vertical-align: middle;
`;

const getSvgIcon = (color: string, width: number, height: number) => {
  return `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' viewBox='0 0 24 24' preserveAspectRatio='none'>
    <g transform='scale(1.15 1) translate(-2 0)'>
      <path d='M5 3H14C17.866 3 21 6.13401 21 10C21 13.866 17.866 17 14 17H5V3Z' fill='${color}'/>
    </g>
  </svg>`;
};

export const EmbedButtonDialog = memo<EmbedButtonDialogProps>(
  ({ tokenId, isOpen, onOpenChange }) => {
    const [selectedTheme, setSelectedTheme] = useState<Theme>('default');
    const [displayMode, setDisplayMode] = useState<DisplayMode>('text-and-icon');
    const [copied, setCopied] = useState(false);
    const { toast } = useToast();

    const discussionUrl = useMemo(
      () =>
        `https://dyorhub.com/token/${tokenId}?utm_source=embed_button&utm_medium=website&utm_campaign=${tokenId}`,
      [tokenId],
    );

    const generatedSnippet = useMemo(() => {
      const themeConfig = THEMES[selectedTheme];
      const isIconOnly = displayMode === 'icon-only';
      const styles = isIconOnly ? BUTTON_STYLES.iconOnly : BUTTON_STYLES.textAndIcon;
      const iconWidth = styles.iconSize;
      const iconHeight = Math.round(iconWidth * 1.4);
      const iconHtml = getSvgIcon(themeConfig.icon, iconWidth, iconHeight);

      const dynamicStyles = `font-size: ${styles.fontSize}; padding: ${styles.padding}; background-color: ${themeConfig.background}; color: ${themeConfig.text};`;
      const finalStyle = !isIconOnly
        ? `${dynamicStyles} min-height: ${(styles as typeof BUTTON_STYLES.textAndIcon).minHeight};`
        : dynamicStyles;
      const textSpan = !isIconOnly
        ? `<span style="margin-left: ${(styles as typeof BUTTON_STYLES.textAndIcon).iconMargin};">Discuss on DYORHUB</span>`
        : '';

      return `<a
  href="${discussionUrl}"
  target="_blank"
  rel="noopener noreferrer"
  style="${BASE_BUTTON_STYLE.replace(/\n\s*/g, ' ')} ${finalStyle}"
  onmouseover="this.style.opacity='0.8';"
  onmouseout="this.style.opacity='1';"
>
  {/* Set container span size */}
  <span style="display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: ${iconWidth}px; height: ${iconHeight}px; position: relative; top: 2px;">${iconHtml}</span>
  ${textSpan}
</a>`;
    }, [selectedTheme, displayMode, discussionUrl]);

    const PreviewButton = useMemo(() => {
      const themeConfig = THEMES[selectedTheme];
      const isIconOnly = displayMode === 'icon-only';
      const styles = isIconOnly ? BUTTON_STYLES.iconOnly : BUTTON_STYLES.textAndIcon;
      const iconWidth = styles.iconSize;
      const iconHeight = Math.round(iconWidth * 1.4);
      const iconHtml = getSvgIcon(themeConfig.icon, iconWidth, iconHeight);

      const buttonDynamicStyles: React.CSSProperties = {
        padding: styles.padding,
      };
      let textSpanElement: React.ReactNode = null;
      if (!isIconOnly) {
        const textStyles = styles as typeof BUTTON_STYLES.textAndIcon;
        buttonDynamicStyles.minHeight = textStyles.minHeight;
        textSpanElement = (
          <span style={{ marginLeft: textStyles.iconMargin }}>Discuss on DYORHUB</span>
        );
      }

      return (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            fontSize: styles.fontSize,
            fontWeight: 500,
            textDecoration: 'none',
            borderRadius: '6px',
            backgroundColor: themeConfig.background,
            color: themeConfig.text,
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
            lineHeight: 1,
            whiteSpace: 'nowrap',
            verticalAlign: 'middle',
            boxSizing: 'border-box',
            ...buttonDynamicStyles,
          }}>
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              width: `${iconWidth}px`,
              height: `${iconHeight}px`,
              position: 'relative',
              top: '2px',
            }}
            dangerouslySetInnerHTML={{ __html: iconHtml }}
          />
          {textSpanElement}
        </div>
      );
    }, [selectedTheme, displayMode]);

    const handleCopy = useCallback(async () => {
      try {
        await navigator.clipboard.writeText(generatedSnippet);
        setCopied(true);
        toast({ title: 'Copied to clipboard!' });
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy embed code: ', err);
        toast({
          title: 'Error Copying Code',
          description: 'Could not copy the code to your clipboard.',
          variant: 'destructive',
        });
      }
    }, [generatedSnippet, toast]);

    const handleThemeChange = useCallback((theme: Theme) => {
      setSelectedTheme(theme);
    }, []);

    const handleDisplayModeChange = useCallback((value: string) => {
      setDisplayMode(value as DisplayMode);
    }, []);

    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className='sm:max-w-3xl'>
          <DialogHeader>
            <DialogTitle>Embed Button</DialogTitle>
            <DialogDescription>
              Customize the button&apos;s appearance and copy the HTML snippet to embed it on your
              site.
            </DialogDescription>
          </DialogHeader>

          <div className='grid grid-cols-1 gap-8 pt-4 md:grid-cols-2 md:gap-10'>
            {/* Configuration Section */}
            <div className='space-y-6'>
              {/* Theme Selection */}
              <fieldset className='space-y-3'>
                <legend className='text-sm font-medium'>Theme</legend>
                <div className='grid grid-cols-3 gap-3'>
                  {(Object.keys(THEMES) as Theme[]).map((themeKey) => {
                    const themeConfig = THEMES[themeKey];
                    return (
                      <button
                        key={themeKey}
                        type='button'
                        onClick={() => handleThemeChange(themeKey)}
                        className={cn(
                          'flex flex-col items-center rounded-md border p-3 transition-all hover:shadow-sm',
                          selectedTheme === themeKey
                            ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-background'
                            : 'border-border hover:border-muted-foreground/80',
                        )}
                        aria-pressed={selectedTheme === themeKey}>
                        <div
                          className='mb-2 h-8 w-full rounded-sm'
                          style={{
                            backgroundColor: themeConfig.background,
                          }}
                        />
                        <span className='text-xs capitalize'>{themeKey}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {/* Display Mode Selection */}
              <fieldset className='space-y-3'>
                <legend className='text-sm font-medium'>Display</legend>
                <RadioGroup
                  value={displayMode}
                  onValueChange={handleDisplayModeChange}
                  className='flex space-x-4'>
                  <div className='flex items-center space-x-2'>
                    <RadioGroupItem value='text-and-icon' id='display-text-icon' />
                    <Label htmlFor='display-text-icon' className='cursor-pointer'>
                      Icon + Text
                    </Label>
                  </div>
                  <div className='flex items-center space-x-2'>
                    <RadioGroupItem value='icon-only' id='display-icon' />
                    <Label htmlFor='display-icon' className='cursor-pointer'>
                      Icon Only
                    </Label>
                  </div>
                </RadioGroup>
              </fieldset>
            </div>

            {/* Preview Section */}
            <div className='space-y-3'>
              <Label className='text-sm font-medium'>Preview</Label>
              <div className='flex min-h-[135px] items-center justify-center rounded-lg border bg-muted p-6 shadow-inner'>
                {PreviewButton}
              </div>
              <p className='text-xs text-muted-foreground'>
                Your button will link to your token&apos;s page on DYORHUB.
              </p>
            </div>
          </div>

          {/* Snippet Section */}
          <div className='mt-6 space-y-2'>
            <Label htmlFor='snippet-code' className='text-sm font-medium'>
              Embed Code
            </Label>
            <div>
              <textarea
                id='snippet-code'
                readOnly
                className='h-24 w-full resize-none rounded-md border bg-background p-3 font-mono text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 scrollbar-thin scrollbar-thumb-muted-foreground scrollbar-track-background'
                value={generatedSnippet}
                aria-label='Embed code snippet'
              />
            </div>
          </div>

          <DialogFooter className='mt-6'>
            <Button onClick={handleCopy}>
              {copied ? (
                <>
                  <CheckIcon className='h-4 w-4 mr-1.5' />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <ClipboardCopy className='h-4 w-4 mr-1.5' />
                  <span>Copy Code</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  },
);

EmbedButtonDialog.displayName = 'EmbedButtonDialog';
