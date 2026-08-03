import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  type SxProps,
  type Theme,
} from '@mui/material';
import type { AzureDevOpsProjectConfig } from '@shared/interfaces/config/index.types';

interface ProjectSelectorProps {
  projects: AzureDevOpsProjectConfig[];
  selectedId: number | null;
  onChange: (id: number) => void;
  size?: 'small' | 'medium';
  label?: string;
  sx?: SxProps<Theme>;
}

/**
 * Dropdown for selecting an Azure DevOps project.
 * Renders nothing if there is only one (or zero) projects — the caller
 * should guard with `projects.length > 1` before rendering.
 */
export function ProjectSelector({
  projects,
  selectedId,
  onChange,
  size = 'small',
  label = 'Projeto',
  sx,
}: ProjectSelectorProps) {
  if (projects.length <= 1) return null;

  return (
    <FormControl size={size} sx={{ minWidth: 200, ...sx }}>
      <InputLabel id="project-selector-label">{label}</InputLabel>
      <Select
        labelId="project-selector-label"
        value={selectedId ?? ''}
        label={label}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {projects.map((p) => (
          <MenuItem key={p.id} value={p.id}>
            {p.displayName}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

export default ProjectSelector;
