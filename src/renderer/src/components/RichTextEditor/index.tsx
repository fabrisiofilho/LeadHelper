import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Box, IconButton, Divider, Stack, Tooltip } from '@mui/material';
import {
  FormatBold as BoldIcon,
  FormatItalic as ItalicIcon,
  FormatUnderlined as UnderlineIcon,
  FormatListBulleted as BulletListIcon,
  FormatListNumbered as OrderedListIcon,
  Code as CodeBlockIcon,
} from '@mui/icons-material';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  editable?: boolean;
}

interface ToolbarButtonProps {
  title: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function ToolbarButton({
  title,
  active,
  onClick,
  children,
}: ToolbarButtonProps) {
  return (
    <Tooltip title={title}>
      <IconButton
        size="small"
        onClick={onClick}
        sx={{
          p: 0.5,
          borderRadius: 0.5,
          bgcolor: active ? 'action.selected' : 'transparent',
        }}
      >
        {children}
      </IconButton>
    </Tooltip>
  );
}

export function RichTextEditor({
  content,
  onChange,
  editable = true,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content,
    editable,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
  });

  useEffect(() => {
    if (editor && editor.isEditable !== editable) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  if (!editor) return null;

  const iconSx = { fontSize: 18 };

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Toolbar */}
      {editable && (
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
          {/* Headings */}
          <ToolbarButton
            title="Título 1"
            active={editor.isActive('heading', { level: 1 })}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
          >
            <Box
              component="span"
              sx={{ fontSize: 14, fontWeight: 700, lineHeight: 1 }}
            >
              H1
            </Box>
          </ToolbarButton>
          <ToolbarButton
            title="Título 2"
            active={editor.isActive('heading', { level: 2 })}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            <Box
              component="span"
              sx={{ fontSize: 14, fontWeight: 700, lineHeight: 1 }}
            >
              H2
            </Box>
          </ToolbarButton>
          <ToolbarButton
            title="Título 3"
            active={editor.isActive('heading', { level: 3 })}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
          >
            <Box
              component="span"
              sx={{ fontSize: 14, fontWeight: 700, lineHeight: 1 }}
            >
              H3
            </Box>
          </ToolbarButton>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />

          {/* Inline formatting */}
          <ToolbarButton
            title="Negrito"
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <BoldIcon sx={iconSx} />
          </ToolbarButton>
          <ToolbarButton
            title="Itálico"
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <ItalicIcon sx={iconSx} />
          </ToolbarButton>
          <ToolbarButton
            title="Sublinhado"
            active={editor.isActive('underline')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon sx={iconSx} />
          </ToolbarButton>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />

          {/* Lists */}
          <ToolbarButton
            title="Lista com marcadores"
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <BulletListIcon sx={iconSx} />
          </ToolbarButton>
          <ToolbarButton
            title="Lista numerada"
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <OrderedListIcon sx={iconSx} />
          </ToolbarButton>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />

          {/* Code block */}
          <ToolbarButton
            title="Bloco de código"
            active={editor.isActive('codeBlock')}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          >
            <CodeBlockIcon sx={iconSx} />
          </ToolbarButton>
        </Stack>
      )}

      {/* Editor content */}
      <Box
        sx={{
          p: 1.5,
          flex: 1,
          minHeight: '150px',
          overflow: 'auto',
          bgcolor: 'background.paper',
          '& .tiptap': {
            outline: 'none',
            minHeight: '120px',
            fontSize: '0.875rem',
            lineHeight: 1.6,
            color: 'text.primary',
          },
          '& .tiptap h1': {
            fontSize: '1.5rem',
            fontWeight: 700,
            mt: 1,
            mb: 0.5,
          },
          '& .tiptap h2': {
            fontSize: '1.25rem',
            fontWeight: 600,
            mt: 1,
            mb: 0.5,
          },
          '& .tiptap h3': {
            fontSize: '1.1rem',
            fontWeight: 600,
            mt: 1,
            mb: 0.5,
          },
          '& .tiptap p': { my: 0.5 },
          '& .tiptap ul, & .tiptap ol': { pl: 3, my: 0.5 },
          '& .tiptap pre': {
            bgcolor: 'action.hover',
            borderRadius: 1,
            p: 1.5,
            my: 1,
            fontFamily: 'monospace',
            fontSize: '0.85rem',
            overflow: 'auto',
          },
          '& .tiptap code': {
            bgcolor: 'action.hover',
            borderRadius: 0.5,
            px: 0.5,
            fontFamily: 'monospace',
            fontSize: '0.85rem',
          },
          '& .tiptap pre code': {
            bgcolor: 'transparent',
            p: 0,
          },
        }}
      >
        <EditorContent editor={editor} />
      </Box>
    </Box>
  );
}

export default RichTextEditor;
