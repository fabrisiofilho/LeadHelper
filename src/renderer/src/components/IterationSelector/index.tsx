import { useState, useEffect, useMemo } from 'react';
import { Autocomplete, TextField, CircularProgress } from '@mui/material';
import { useAzureDevOps } from '@renderer/hooks/useAzureDevOps';
import type { IterationNode } from '@shared/interfaces/config/index.types';

interface FlatIteration {
  path: string;
  label: string;
  depth: number;
}

interface IterationSelectorProps {
  value: string | null;
  onChange: (path: string | null) => void;
  disabled?: boolean;
}

function flattenIterations(nodes: IterationNode[], depth = 0): FlatIteration[] {
  const result: FlatIteration[] = [];
  for (const node of nodes) {
    result.push({
      path: node.path,
      label: '\u00A0'.repeat(depth * 4) + node.name,
      depth,
    });
    if (node.children.length > 0) {
      result.push(...flattenIterations(node.children, depth + 1));
    }
  }
  return result;
}

export function IterationSelector({
  value,
  onChange,
  disabled = false,
}: IterationSelectorProps) {
  const { fetchIterations } = useAzureDevOps();
  const [iterations, setIterations] = useState<IterationNode[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchIterations().then((data) => {
      if (!cancelled) {
        setIterations(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [fetchIterations]);

  const options = useMemo(() => flattenIterations(iterations), [iterations]);

  const selectedOption = options.find((opt) => opt.path === value) ?? null;

  return (
    <Autocomplete
      size="small"
      options={options}
      value={selectedOption}
      loading={loading}
      disabled={disabled}
      onChange={(_e, option) => onChange(option?.path ?? null)}
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(option, val) => option.path === val.path}
      renderOption={(props, option) => (
        <li {...props} key={option.path}>
          {option.label}
        </li>
      )}
      sx={{ minWidth: 280 }}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder="Selecionar iteration..."
          label="Iteration"
          slotProps={{
            input: {
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress size={16} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            },
            inputLabel: { shrink: true },
          }}
        />
      )}
      noOptionsText="Nenhuma iteration encontrada"
      loadingText="Carregando..."
    />
  );
}

export default IterationSelector;
