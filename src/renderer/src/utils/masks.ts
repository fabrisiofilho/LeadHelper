export function removeMask(text: string) {
  if (!text) return;

  return text.replace(/[-./*]/g, '');
}

export function applyCNPJMask(text: string) {
  if (!text) return;

  return text
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

export function applyCPFMask(text: string) {
  if (!text) return;

  return text
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}
