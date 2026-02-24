import { Typography, type TypographyProps } from '@mui/material';

export function FieldTitle(props: Readonly<TypographyProps>) {
  return (
    <Typography
      variant="body2"
      fontWeight="bold"
      whiteSpace="normal"
      {...props}
    >
      {props.children}
    </Typography>
  );
}
