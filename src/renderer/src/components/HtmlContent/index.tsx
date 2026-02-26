import { useMemo } from 'react';
import { Box, type SxProps, type Theme } from '@mui/material';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

interface HtmlContentProps {
  /** Raw HTML or Markdown string */
  html: string;
  /** Max lines to show before truncating (CSS line-clamp). 0 = no limit */
  maxLines?: number;
  sx?: SxProps<Theme>;
}

/** Shared sx styles for rendered rich content (used by HtmlContent and MarkdownEditor preview) */
export const richContentSx: SxProps<Theme> = {
  fontSize: '0.875rem',
  lineHeight: 1.6,
  wordBreak: 'break-word',
  color: 'text.secondary',
  '& a': {
    color: 'primary.main',
    textDecoration: 'underline',
    '&:hover': { textDecoration: 'none' },
  },
  '& img': {
    maxWidth: '100%',
    height: 'auto',
    borderRadius: '4px',
    mt: 1,
    mb: 1,
  },
  '& strong, & b': { fontWeight: 600, color: 'text.primary' },
  '& p': { m: 0, mb: 0.5 },
  '& div': { mb: 0.25 },
  '& ul, & ol': { pl: 2.5, mb: 1 },
  '& li': { mb: 0.25 },
  '& blockquote': {
    borderLeft: '3px solid',
    borderColor: 'divider',
    pl: 1.5,
    ml: 0,
    color: 'text.secondary',
    fontStyle: 'italic',
  },
  '& pre': {
    fontFamily: 'monospace',
    fontSize: '0.8rem',
    bgcolor: 'action.hover',
    borderRadius: '4px',
    p: 1,
    overflow: 'auto',
  },
  '& code': {
    fontFamily: 'monospace',
    fontSize: '0.8rem',
    bgcolor: 'action.hover',
    borderRadius: '4px',
    px: 0.5,
    py: 0.25,
  },
  '& pre code': { bgcolor: 'transparent', p: 0 },
  '& table': {
    borderCollapse: 'collapse',
    width: '100%',
    mb: 1,
    '& td, & th': {
      border: '1px solid',
      borderColor: 'divider',
      p: 0.5,
      fontSize: '0.8rem',
    },
  },
  '& hr': {
    border: 'none',
    borderTop: '1px solid',
    borderColor: 'divider',
    my: 1,
  },
  '& h1, & h2, & h3, & h4, & h5, & h6': {
    color: 'text.primary',
    mt: 1,
    mb: 0.5,
  },
};

const isHtmlString = (str: string) => /<[a-z][\s\S]*>/i.test(str);

/** Click handler that opens links in the external browser instead of navigating inside Electron */
export function handleExternalLinkClick(e: React.MouseEvent<HTMLElement>) {
  const target = (e.target as HTMLElement).closest('a');
  if (target?.href) {
    e.preventDefault();
    window.electronAPI.openExternalUrl(target.href);
  }
}

/** Configure marked for synchronous rendering */
marked.setOptions({ async: false, breaks: true, gfm: true });

/**
 * Renders sanitized HTML or Markdown content safely.
 * Detects whether input is HTML or Markdown and renders accordingly.
 */
export function HtmlContent({ html, maxLines = 0, sx }: HtmlContentProps) {
  const sanitized = useMemo(() => {
    let rawHtml: string;
    if (isHtmlString(html)) {
      rawHtml = html;
    } else {
      rawHtml = marked.parse(html) as string;
    }
    return DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: [
        'p',
        'br',
        'b',
        'i',
        'u',
        'strong',
        'em',
        'a',
        'ul',
        'ol',
        'li',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'span',
        'div',
        'font',
        'img',
        'table',
        'thead',
        'tbody',
        'tr',
        'td',
        'th',
        'hr',
        'blockquote',
        'pre',
        'code',
        'sub',
        'sup',
        'del',
        'input',
      ],
      ALLOWED_ATTR: [
        'href',
        'target',
        'rel',
        'style',
        'color',
        'face',
        'size',
        'src',
        'alt',
        'width',
        'height',
        'class',
        'colspan',
        'rowspan',
        'align',
        'valign',
        'type',
        'checked',
        'disabled',
      ],
      ALLOW_DATA_ATTR: false,
    });
  }, [html]);

  if (!html?.trim()) return null;

  return (
    <Box
      className="html-content"
      dangerouslySetInnerHTML={{ __html: sanitized }}
      onClick={handleExternalLinkClick}
      sx={{
        ...richContentSx,
        ...(maxLines > 0 && {
          display: '-webkit-box',
          WebkitLineClamp: maxLines,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }),
        ...(sx as object),
      }}
    />
  );
}

export default HtmlContent;
