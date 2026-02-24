import { ModalDanger, ModalDangerProps } from './ModalDanger';
import { ModalForm, ModalFormProps } from './ModalForm';

export enum ModalVariantEnum {
  DANGER = 'danger',
  FORM = 'form',
}

type ModalProps = ModalDangerProps | ModalFormProps;

export function Modal(props: Readonly<ModalProps>) {
  if (!props.open) return null;

  switch (props.variant) {
    case ModalVariantEnum.DANGER:
      return <ModalDanger {...props} />;

    case ModalVariantEnum.FORM:
      return <ModalForm {...props} />;

    default:
      return null;
  }
}
