export function getLocalStorageItem(name: string): unknown {
  const item = localStorage.getItem(name);

  try {
    return item ? JSON.parse(item) : null;
  } catch {
    return item;
  }
}

export function setLocalStorageItem(name: string, item: unknown): void {
  const stringItem = JSON.stringify(item);
  localStorage.setItem(name, stringItem);
}
