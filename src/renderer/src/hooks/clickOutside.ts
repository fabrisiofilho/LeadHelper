import { useEffect } from 'react';

type Params = {
  ref: React.RefObject<HTMLElement>;
  action: () => void;
};

export function useOnClickOutside({ ref, action }: Params) {
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        action();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ref, action]);
}
