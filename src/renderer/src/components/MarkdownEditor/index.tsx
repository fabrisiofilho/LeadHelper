import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  Box,
  IconButton,
  Stack,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
  Typography,
  Divider,
} from '@mui/material';
import {
  FormatBold as BoldIcon,
  FormatItalic as ItalicIcon,
  StrikethroughS as StrikeIcon,
  Code as CodeIcon,
  FormatListBulleted as ListIcon,
  FormatListNumbered as OrderedListIcon,
  Link as LinkIcon,
  FormatQuote as QuoteIcon,
  HorizontalRule as HrIcon,
  Title as HeadingIcon,
  Visibility as PreviewIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import TurndownService from 'turndown';
import {
  richContentSx,
  handleExternalLinkClick,
} from '@renderer/components/HtmlContent';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minRows?: number;
}

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});

/** Convert HTML to Markdown */
function htmlToMarkdown(html: string): string {
  if (!html?.trim()) return '';
  try {
    return turndown.turndown(html).trim();
  } catch {
    return html;
  }
}

const isHtmlString = (str: string) => /<[a-z][\s\S]*>/i.test(str);

marked.setOptions({ async: false, breaks: true, gfm: true });

type FormatAction =
  | 'bold'
  | 'italic'
  | 'strike'
  | 'code'
  | 'heading'
  | 'quote'
  | 'ul'
  | 'ol'
  | 'link'
  | 'hr';

const FORMAT_CONFIG: Record<
  FormatAction,
  { prefix: string; suffix?: string; block?: boolean; placeholder?: string }
> = {
  bold: { prefix: '**', suffix: '**', placeholder: 'texto' },
  italic: { prefix: '_', suffix: '_', placeholder: 'texto' },
  strike: { prefix: '~~', suffix: '~~', placeholder: 'texto' },
  code: { prefix: '`', suffix: '`', placeholder: 'código' },
  heading: { prefix: '### ', block: true, placeholder: 'Título' },
  quote: { prefix: '> ', block: true, placeholder: 'citação' },
  ul: { prefix: '- ', block: true, placeholder: 'item' },
  ol: { prefix: '1. ', block: true, placeholder: 'item' },
  link: { prefix: '[', suffix: '](url)', placeholder: 'texto do link' },
  hr: { prefix: '\n---\n', block: true },
};

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Descreva a tarefa usando Markdown...',
  disabled = false,
  minRows = 6,
}: MarkdownEditorProps) {
  // Convert HTML to Markdown on first load
  const [mdValue, setMdValue] = useState(() =>
    isHtmlString(value) ? htmlToMarkdown(value) : value,
  );
  const [mode, setMode] = useState<'preview' | 'edit'>('preview');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync external value changes (e.g. form reset)
  useEffect(() => {
    const newMd = isHtmlString(value) ? htmlToMarkdown(value) : value;
    setMdValue(newMd);
  }, [value]);

  const handleChange = useCallback(
    (newMd: string) => {
      setMdValue(newMd);
      onChange(newMd);
    },
    [onChange],
  );

  const applyFormat = useCallback(
    (action: FormatAction) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const {
        prefix,
        suffix = '',
        block,
        placeholder: ph = '',
      } = FORMAT_CONFIG[action];
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = mdValue.substring(start, end);
      const text = selected || ph;

      let newValue: string;
      let cursorPos: number;

      if (block) {
        // Ensure we're on a new line
        const before = mdValue.substring(0, start);
        const needsNewline = before.length > 0 && !before.endsWith('\n');
        const linePrefix = needsNewline ? '\n' : '';
        newValue = before + linePrefix + prefix + text + mdValue.substring(end);
        cursorPos = start + linePrefix.length + prefix.length + text.length;
      } else {
        newValue =
          mdValue.substring(0, start) +
          prefix +
          text +
          suffix +
          mdValue.substring(end);
        cursorPos = start + prefix.length + text.length;
      }

      handleChange(newValue);

      // Restore cursor position after React re-render
      requestAnimationFrame(() => {
        textarea.focus();
        if (!selected) {
          // Select the placeholder text
          const selectStart = block
            ? start +
              (mdValue.substring(0, start).length > 0 &&
              !mdValue.substring(0, start).endsWith('\n')
                ? 1
                : 0) +
              prefix.length
            : start + prefix.length;
          textarea.setSelectionRange(selectStart, selectStart + ph.length);
        } else {
          textarea.setSelectionRange(cursorPos, cursorPos);
        }
      });
    },
    [mdValue, handleChange],
  );

  const previewHtml = useMemo(() => {
    if (!mdValue?.trim()) return '';
    const raw = marked.parse(mdValue) as string;
    return DOMPurify.sanitize(raw);
  }, [mdValue]);

  const hasContent = mdValue?.trim().length > 0;

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden',
        opacity: disabled ? 0.6 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      {/* Toolbar — preventDefault on mouseDown keeps textarea focused and avoids scroll-to-top */}
      <Stack
        direction="row"
        alignItems="center"
        onMouseDown={(e) => e.preventDefault()}
        sx={{
          px: 0.5,
          py: 0.25,
          bgcolor: 'action.hover',
          borderBottom: '1px solid',
          borderColor: 'divider',
          flexWrap: 'wrap',
          gap: 0.25,
        }}
      >
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(_, v) => v && setMode(v)}
          size="small"
          sx={{
            mr: 1,
            '& .MuiToggleButton-root': {
              px: 1,
              py: 0.25,
              fontSize: '0.75rem',
              textTransform: 'none',
            },
          }}
        >
          <ToggleButton value="preview">
            <PreviewIcon sx={{ fontSize: 16, mr: 0.5 }} />
            Preview
          </ToggleButton>
          <ToggleButton value="edit">
            <EditIcon sx={{ fontSize: 16, mr: 0.5 }} />
            Editar
          </ToggleButton>
        </ToggleButtonGroup>

        {mode === 'edit' && (
          <>
            <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />
            <Tooltip title="Negrito (Ctrl+B)">
              <IconButton
                size="small"
                onClick={() => applyFormat('bold')}
                sx={{ p: 0.5 }}
              >
                <BoldIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Itálico (Ctrl+I)">
              <IconButton
                size="small"
                onClick={() => applyFormat('italic')}
                sx={{ p: 0.5 }}
              >
                <ItalicIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Tachado">
              <IconButton
                size="small"
                onClick={() => applyFormat('strike')}
                sx={{ p: 0.5 }}
              >
                <StrikeIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Código">
              <IconButton
                size="small"
                onClick={() => applyFormat('code')}
                sx={{ p: 0.5 }}
              >
                <CodeIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />
            <Tooltip title="Título">
              <IconButton
                size="small"
                onClick={() => applyFormat('heading')}
                sx={{ p: 0.5 }}
              >
                <HeadingIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Citação">
              <IconButton
                size="small"
                onClick={() => applyFormat('quote')}
                sx={{ p: 0.5 }}
              >
                <QuoteIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Lista">
              <IconButton
                size="small"
                onClick={() => applyFormat('ul')}
                sx={{ p: 0.5 }}
              >
                <ListIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Lista numerada">
              <IconButton
                size="small"
                onClick={() => applyFormat('ol')}
                sx={{ p: 0.5 }}
              >
                <OrderedListIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />
            <Tooltip title="Link">
              <IconButton
                size="small"
                onClick={() => applyFormat('link')}
                sx={{ p: 0.5 }}
              >
                <LinkIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Linha horizontal">
              <IconButton
                size="small"
                onClick={() => applyFormat('hr')}
                sx={{ p: 0.5 }}
              >
                <HrIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Stack>

      {/* Content area */}
      {mode === 'edit' ? (
        <Box
          component="textarea"
          ref={textareaRef}
          value={mdValue}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            handleChange(e.target.value)
          }
          onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.ctrlKey || e.metaKey) {
              if (e.key === 'b') {
                e.preventDefault();
                applyFormat('bold');
              }
              if (e.key === 'i') {
                e.preventDefault();
                applyFormat('italic');
              }
            }
          }}
          placeholder={placeholder}
          rows={minRows}
          sx={{
            width: '100%',
            border: 'none',
            outline: 'none',
            resize: 'vertical',
            p: 1.5,
            fontFamily: 'monospace',
            fontSize: '0.85rem',
            lineHeight: 1.6,
            bgcolor: 'background.paper',
            color: 'text.primary',
            '&::placeholder': { color: 'text.secondary', opacity: 0.7 },
          }}
        />
      ) : (
        <Box
          sx={{
            p: 1.5,
            minHeight: `${minRows * 1.6}em`,
            maxHeight: 300,
            overflow: 'auto',
            bgcolor: 'background.paper',
            cursor: 'text',
          }}
          onClick={() => !hasContent && setMode('edit')}
        >
          {hasContent ? (
            <Box
              className="md-preview"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
              onClick={handleExternalLinkClick}
              sx={richContentSx}
            />
          ) : (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ opacity: 0.7, fontStyle: 'italic' }}
            >
              {placeholder}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}

export default MarkdownEditor;
