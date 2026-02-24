import { FieldDescription } from './FieldDescription';
import { FieldTitle } from './FieldTitle';

type Props = {
  title: string;
  description?: string;
};

export function FormFieldView({ title, description }: Readonly<Props>) {
  return (
    <>
      <FieldTitle>{title}</FieldTitle>
      <FieldDescription>{description ?? '---'}</FieldDescription>
    </>
  );
}
