import { Typography, type TypographyProps } from '@mui/material';

export function FieldDescription(props: Readonly<TypographyProps>) {
  return (
    <Typography variant="body2" whiteSpace="normal" {...props}>
      {props.children}
    </Typography>
  );
}
