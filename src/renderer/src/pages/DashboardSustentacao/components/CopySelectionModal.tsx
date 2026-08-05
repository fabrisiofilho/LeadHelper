/**
 * CopySelectionModal — simple lane-based copy with optional extras from other lanes.
 *
 * 1. User picks a base lane (Auditoria / Desenvolvimento / Análise)
 * 2. Optionally checks individual items from the OTHER lanes to inject into the output
 * 3. Injected items get a ⚠ <lane> tag appended — e.g. "| ⚠ Em desenvolvimento"
 * 4. The output follows the same priority structure as the regular copy:
 *    Com prioridade (Gestão → Chamada) → Sem prioridade (Gestão → Chamada)
 */
import { useState, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
  Stack,
  Button,
  Checkbox,
  Chip,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
  Paper,
  Tooltip,
  Alert,
} from '@mui/material';
import { Modal } from '@renderer/components/Modal';
import type { SustentacaoItemWithSLA } from '@main/application/services/dashboard-service';
import {
  buildPriorityList,
  copyToClipboard,
  isGestaoArea as isGestao,
  hasPriorityDate as hasPriority,
} from '../utils/copyPriorityList';

// ── Constants ─────────────────────────────────────────────────────────────────

const LANES = [
  { key: 'dev', label: 'Desenvolvimento' },
  { key: 'audit', label: 'Auditoria' },
  { key: 'analysis', label: 'Análise' },
] as const;
type LaneKey = (typeof LANES)[number]['key'];

// ── Props ─────────────────────────────────────────────────────────────────────

interface CopySelectionModalProps {
  open: boolean;
  onClose: () => void;
  devItems: SustentacaoItemWithSLA[];
  auditItems: SustentacaoItemWithSLA[];
  analysisItems: SustentacaoItemWithSLA[];
  positionMap: Map<string, string[]>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function itemKey(item: SustentacaoItemWithSLA): string {
  return item.task.externalId ?? String(item.task.id);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CopySelectionModal({
  open,
  onClose,
  devItems,
  auditItems,
  analysisItems,
  positionMap,
}: CopySelectionModalProps) {
  const [baseLane, setBaseLane] = useState<LaneKey>('audit');
  const [extraSelected, setExtraSelected] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [generatingPng, setGeneratingPng] = useState(false);
  // 'all' | 'gestao' | 'chamada'
  const [areaFilter, setAreaFilter] = useState<'all' | 'gestao' | 'chamada'>(
    'all',
  );
  const previewRef = useRef<HTMLDivElement>(null);

  // Filter items by selected area
  const filterByArea = useCallback(
    (items: SustentacaoItemWithSLA[]) => {
      if (areaFilter === 'all') return items;
      return items.filter((i) =>
        areaFilter === 'gestao'
          ? isGestao(i.task.areaPath)
          : !isGestao(i.task.areaPath),
      );
    },
    [areaFilter],
  );

  const laneItems: Record<LaneKey, SustentacaoItemWithSLA[]> = useMemo(
    () => ({
      dev: filterByArea(devItems),
      audit: filterByArea(auditItems),
      analysis: filterByArea(analysisItems),
    }),
    [devItems, auditItems, analysisItems, filterByArea],
  );

  // Other lanes (not the base)
  const otherLanes = useMemo(
    () => LANES.filter((l) => l.key !== baseLane),
    [baseLane],
  );

  const toggleExtra = useCallback((key: string) => {
    setExtraSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleAllLane = useCallback(
    (laneKey: LaneKey) => {
      const keys = laneItems[laneKey].map(itemKey);
      setExtraSelected((prev) => {
        const allIn = keys.every((k) => prev.has(k));
        const next = new Set(prev);
        if (allIn) keys.forEach((k) => next.delete(k));
        else keys.forEach((k) => next.add(k));
        return next;
      });
    },
    [laneItems],
  );

  // When base lane changes, clear extras from the new base lane
  const handleBaseLaneChange = useCallback(
    (_: unknown, val: LaneKey | null) => {
      if (!val) return;
      setBaseLane(val);
      // Remove any selected extras that belong to the new base lane
      const newBaseKeys = new Set(laneItems[val].map(itemKey));
      setExtraSelected((prev) => {
        const next = new Set(prev);
        newBaseKeys.forEach((k) => next.delete(k));
        return next;
      });
    },
    [laneItems],
  );

  const handleAreaFilterChange = useCallback(
    (val: 'all' | 'gestao' | 'chamada') => {
      setAreaFilter(val);
      setExtraSelected(new Set());
    },
    [],
  );

  // Combined items: base lane items + selected extras, sorted: base first (in priority order), extras injected by priority
  const combinedItems = useMemo(() => {
    const base = laneItems[baseLane].filter((i) => !i.isHidden);
    const extras = LANES.filter((l) => l.key !== baseLane)
      .flatMap((l) => laneItems[l.key])
      .filter((i) => extraSelected.has(itemKey(i)) && !i.isHidden);

    // Merge: interleave extras into base by priority (same sort as dashboard)
    const all = [...base, ...extras];

    // Canonical sort — identical to backend and dashboardSort:
    // Violated → effective deadline ASC → Ticket>Improvement + GT>CT → azure priority
    // Blocked items are NOT sinked — impedimento label shown inline.
    const effDeadlineMs = (i: SustentacaoItemWithSLA): number => {
      if (i.expirationDate) return new Date(i.expirationDate).getTime();
      if (i.localPriorityDeadline)
        return new Date(i.localPriorityDeadline).getTime();
      if (i.localPriorityCreatedAt)
        return new Date(i.localPriorityCreatedAt).getTime();
      return Infinity;
    };
    const typeAreaW = (i: SustentacaoItemWithSLA): number => {
      const gt = isGestao(i.task.areaPath);
      const isT = i.task.type === 'Ticket';
      if (isT && gt) return 0;
      if (isT && !gt) return 1;
      if (!isT && gt) return 2;
      return 3;
    };

    all.sort((a, b) => {
      const aViolated = a.slaViolated ? 1 : 0;
      const bViolated = b.slaViolated ? 1 : 0;
      if (aViolated !== bViolated) return bViolated - aViolated;
      if (aViolated && bViolated)
        return a.businessHoursRemaining - b.businessHoursRemaining;

      const aD = effDeadlineMs(a);
      const bD = effDeadlineMs(b);
      const aH = aD !== Infinity ? 1 : 0;
      const bH = bD !== Infinity ? 1 : 0;
      if (aH !== bH) return bH - aH;
      if (aH && bH && aD !== bD) return aD - bD;

      const wa = typeAreaW(a);
      const wb = typeAreaW(b);
      if (wa !== wb) return wa - wb;

      const pOrd: Record<string, number> = {
        critical: 0,
        high: 1,
        medium: 2,
        low: 3,
      };
      return (pOrd[a.task.priority] ?? 99) - (pOrd[b.task.priority] ?? 99);
    });

    return all;
  }, [baseLane, laneItems, extraSelected]);

  // Map of extra item key → lane label (for warning in output)
  const extraLaneMap = useMemo(() => {
    const m = new Map<string, string>();
    LANES.filter((l) => l.key !== baseLane).forEach((l) => {
      laneItems[l.key].forEach((item) => {
        if (extraSelected.has(itemKey(item))) m.set(itemKey(item), l.label);
      });
    });
    return m;
  }, [baseLane, laneItems, extraSelected]);

  const baseLaneLabel =
    LANES.find((l) => l.key === baseLane)?.label ?? baseLane;
  const baseTitle = `${baseLaneLabel} - Sustentação`;

  const handleCopy = useCallback(() => {
    const { htmlLines, textLines } = buildPriorityList({
      title: baseTitle,
      items: combinedItems,
      positionMap,
      laneWarningMap: extraLaneMap,
      counterStart: 1,
    });
    copyToClipboard(htmlLines, textLines);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [baseTitle, combinedItems, extraLaneMap, positionMap]);

  const handleGeneratePng = useCallback(async () => {
    if (!previewRef.current) return;
    setGeneratingPng(true);
    try {
      const { default: html2canvas } = await import('html2canvas');

      const el = previewRef.current;

      // Temporarily expand the element to its full scroll height so html2canvas
      // captures the entire list, not just the visible portion
      const originalOverflow = el.style.overflow;
      const originalMaxHeight = el.style.maxHeight;
      el.style.overflow = 'visible';
      el.style.maxHeight = 'none';

      const canvas = await html2canvas(el, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
        // Capture the full scroll height
        height: el.scrollHeight,
        windowHeight: el.scrollHeight,
      });

      // Restore styles
      el.style.overflow = originalOverflow;
      el.style.maxHeight = originalMaxHeight;

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${baseLaneLabel}-prioridade.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch {
      // fallback: nothing
    } finally {
      setGeneratingPng(false);
    }
  }, [baseLaneLabel]);

  const handleClose = useCallback(() => {
    setExtraSelected(new Set());
    setAreaFilter('all');
    setCopied(false);
    onClose();
  }, [onClose]);

  return (
    <Modal
      variant="form"
      open={open}
      title="Copiar lista de prioridade"
      handleClose={handleClose}
      cancelLabel="Fechar"
      noFooter
      setMaxWidth="960px"
      width="90vw"
      height="80vh"
    >
      <Stack sx={{ height: '100%', minHeight: 0 }} spacing={2}>
        {/* ── Lane selector ── */}
        <Box>
          <Typography
            variant="caption"
            color="text.secondary"
            fontWeight={600}
            display="block"
            mb={0.75}
          >
            ETAPA BASE (todos os itens desta etapa serão incluídos)
          </Typography>
          <ToggleButtonGroup
            value={baseLane}
            exclusive
            onChange={handleBaseLaneChange}
            size="small"
          >
            {LANES.map((l) => (
              <ToggleButton key={l.key} value={l.key}>
                {l.label}
                <Chip
                  label={laneItems[l.key].filter((i) => !i.isHidden).length}
                  size="small"
                  sx={{ ml: 0.75, height: 18, fontSize: '0.65rem' }}
                />
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        {/* ── Area filter ── */}
        <Box>
          <Typography
            variant="caption"
            color="text.secondary"
            fontWeight={600}
            display="block"
            mb={0.75}
          >
            FILTRAR POR ÁREA
          </Typography>
          <Stack direction="row" spacing={0.75}>
            {(
              [
                { value: 'all', label: 'Todos' },
                { value: 'gestao', label: 'Gestão de Terceiros' },
                { value: 'chamada', label: 'Chamada Tecnológica' },
              ] as const
            ).map((opt) => (
              <Chip
                key={opt.value}
                label={opt.label}
                size="small"
                variant={areaFilter === opt.value ? 'filled' : 'outlined'}
                color={areaFilter === opt.value ? 'primary' : 'default'}
                onClick={() => handleAreaFilterChange(opt.value)}
                sx={{ fontWeight: areaFilter === opt.value ? 700 : 400 }}
              />
            ))}
          </Stack>
        </Box>

        <Divider />

        {/* ── Content area: extra selectors + preview ── */}
        <Stack direction="row" spacing={2} sx={{ flex: 1, minHeight: 0 }}>
          {/* Left: other lanes to cherry-pick from */}
          <Box sx={{ flex: '0 0 42%', overflowY: 'auto', pr: 1 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
              display="block"
              mb={1}
            >
              ADICIONAR ITENS DE OUTRAS ETAPAS (opcional)
            </Typography>
            {otherLanes.map(({ key, label }) => {
              const items = laneItems[key].filter((i) => !i.isHidden);
              if (items.length === 0) return null;
              const allSelected = items.every((i) =>
                extraSelected.has(itemKey(i)),
              );
              return (
                <Box key={key} mb={2}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    mb={0.5}
                  >
                    <Typography
                      variant="subtitle2"
                      fontWeight={700}
                      sx={{ fontSize: '0.75rem' }}
                    >
                      {label}
                    </Typography>
                    <Chip
                      label={items.length}
                      size="small"
                      sx={{ height: 18, fontSize: '0.65rem' }}
                    />
                    <Tooltip
                      title={
                        allSelected ? 'Desmarcar todos' : 'Selecionar todos'
                      }
                    >
                      <Button
                        size="small"
                        variant="text"
                        sx={{ minWidth: 0, px: 0.5, fontSize: '0.65rem' }}
                        onClick={() => toggleAllLane(key)}
                      >
                        {allSelected ? 'Desmarcar todos' : 'Todos'}
                      </Button>
                    </Tooltip>
                  </Stack>
                  <Stack spacing={0.1}>
                    {items.map((item) => {
                      const k = itemKey(item);
                      const checked = extraSelected.has(k);
                      const t = item.task;
                      return (
                        <Stack
                          key={k}
                          direction="row"
                          alignItems="flex-start"
                          spacing={0.5}
                          onClick={() => toggleExtra(k)}
                          sx={{
                            cursor: 'pointer',
                            borderRadius: 1,
                            px: 0.5,
                            py: 0.35,
                            bgcolor: checked
                              ? 'action.selected'
                              : 'transparent',
                            '&:hover': { bgcolor: 'action.hover' },
                          }}
                        >
                          <Checkbox
                            checked={checked}
                            size="small"
                            sx={{ p: 0, mt: 0.15, flexShrink: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            onChange={() => toggleExtra(k)}
                          />
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Stack
                              direction="row"
                              spacing={0.5}
                              alignItems="center"
                              flexWrap="wrap"
                            >
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                fontWeight={600}
                              >
                                #{t.externalId ?? t.id}
                              </Typography>
                              <Chip
                                label={t.type}
                                size="small"
                                sx={{ height: 16, fontSize: '0.6rem' }}
                              />
                              {hasPriority(item) && (
                                <Chip
                                  label={
                                    item.expirationDate
                                      ? `Término: ${new Date(item.expirationDate).toLocaleDateString('pt-BR')}`
                                      : (() => {
                                          const d =
                                            item.localPriorityDeadline ??
                                            item.localPriorityCreatedAt;
                                          return d
                                            ? `Priorizado: ${new Date(d).toLocaleDateString('pt-BR')}`
                                            : 'Priorizado';
                                        })()
                                  }
                                  size="small"
                                  color={
                                    item.slaViolated ? 'error' : 'secondary'
                                  }
                                  variant="outlined"
                                  sx={{ height: 16, fontSize: '0.6rem' }}
                                />
                              )}
                              {t.isBlocked && (
                                <Chip
                                  label="⚠ Impede."
                                  size="small"
                                  color="error"
                                  variant="outlined"
                                  sx={{ height: 16, fontSize: '0.6rem' }}
                                />
                              )}
                            </Stack>
                            <Typography
                              variant="body2"
                              sx={{
                                fontSize: '0.72rem',
                                lineHeight: 1.3,
                                mt: 0.1,
                                color: 'text.secondary',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {t.title}
                            </Typography>
                          </Box>
                        </Stack>
                      );
                    })}
                  </Stack>
                  <Divider sx={{ mt: 1 }} />
                </Box>
              );
            })}
          </Box>

          {/* Right: preview of what will be copied */}
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              borderLeft: '1px solid',
              borderColor: 'divider',
              pl: 2,
              minHeight: 0,
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              mb={1}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
              >
                PRÉVIA — {combinedItems.length} itens
                {extraSelected.size > 0 && (
                  <span style={{ color: '#D97706' }}>
                    {' '}
                    (+{extraSelected.size} de outras etapas)
                  </span>
                )}
              </Typography>
            </Stack>

            {/* Scrollable preview list — this element is captured for PNG */}
            <Box
              ref={previewRef}
              sx={{
                flex: 1,
                overflowY: 'auto',
                bgcolor: 'background.paper',
                borderRadius: 1,
              }}
            >
              {combinedItems.length === 0 ? (
                <Typography variant="body2" color="text.disabled">
                  Nenhum item encontrado.
                </Typography>
              ) : (
                <Stack spacing={0.25}>
                  {combinedItems.map((item, idx) => {
                    const t = item.task;
                    const k = itemKey(item);
                    const laneWarning = extraLaneMap.get(k);
                    return (
                      <Paper
                        key={k}
                        variant="outlined"
                        sx={{
                          px: 1.25,
                          py: 0.5,
                          borderRadius: 1,
                          borderColor: laneWarning ? '#F59E0B' : 'divider',
                          bgcolor: laneWarning ? '#FFFBEB' : 'transparent',
                        }}
                      >
                        <Stack
                          direction="row"
                          spacing={0.75}
                          alignItems="flex-start"
                        >
                          <Typography
                            variant="caption"
                            color="text.disabled"
                            sx={{
                              flexShrink: 0,
                              minWidth: 22,
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {idx + 1}.
                          </Typography>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Stack
                              direction="row"
                              spacing={0.5}
                              flexWrap="wrap"
                              alignItems="center"
                            >
                              <Typography
                                variant="caption"
                                color="text.disabled"
                                sx={{
                                  fontSize: '0.6rem',
                                  fontWeight: 700,
                                  flexShrink: 0,
                                }}
                              >
                                {isGestao(t.areaPath)
                                  ? '[Gestão]'
                                  : '[Chamada]'}
                              </Typography>
                              <Typography variant="caption" fontWeight={700}>
                                #{t.externalId ?? t.id}
                              </Typography>
                              <Chip
                                label={t.type}
                                size="small"
                                sx={{ height: 16, fontSize: '0.6rem' }}
                              />
                              {hasPriority(item) && (
                                <Chip
                                  label={
                                    item.expirationDate
                                      ? item.slaViolated
                                        ? `Vencido: ${new Date(item.expirationDate).toLocaleDateString('pt-BR')}`
                                        : `Término: ${new Date(item.expirationDate).toLocaleDateString('pt-BR')}`
                                      : (() => {
                                          const d =
                                            item.localPriorityDeadline ??
                                            item.localPriorityCreatedAt;
                                          return d
                                            ? `Priorizado: ${new Date(d).toLocaleDateString('pt-BR')}`
                                            : 'Priorizado';
                                        })()
                                  }
                                  size="small"
                                  color={item.slaViolated ? 'error' : 'primary'}
                                  variant="outlined"
                                  sx={{ height: 16, fontSize: '0.6rem' }}
                                />
                              )}
                              {t.isBlocked && (
                                <Chip
                                  label="⚠ Impedimento"
                                  size="small"
                                  color="error"
                                  sx={{ height: 16, fontSize: '0.6rem' }}
                                />
                              )}
                              {laneWarning && (
                                <Chip
                                  label={`⚠ ${laneWarning}`}
                                  size="small"
                                  sx={{
                                    height: 18,
                                    fontSize: '0.6rem',
                                    fontWeight: 700,
                                    bgcolor: '#D97706',
                                    color: '#fff',
                                    '& .MuiChip-label': { px: 0.75 },
                                  }}
                                />
                              )}
                            </Stack>
                            <Typography
                              variant="body2"
                              sx={{
                                fontSize: '0.75rem',
                                lineHeight: 1.35,
                                mt: 0.2,
                                color: 'text.secondary',
                              }}
                            >
                              {t.title}
                            </Typography>
                          </Box>
                        </Stack>
                      </Paper>
                    );
                  })}
                </Stack>
              )}
            </Box>

            {/* Action buttons */}
            <Stack
              direction="row"
              spacing={1}
              mt={1.5}
              justifyContent="flex-end"
            >
              <Button
                variant="outlined"
                size="small"
                onClick={handleGeneratePng}
                disabled={combinedItems.length === 0 || generatingPng}
              >
                {generatingPng ? 'Gerando...' : 'Gerar PNG'}
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={handleCopy}
                disabled={combinedItems.length === 0}
              >
                {copied ? '✓ Copiado!' : 'Copiar lista'}
              </Button>
            </Stack>
          </Box>
        </Stack>

        {copied && (
          <Alert severity="success" sx={{ mt: 0 }}>
            Lista copiada para a área de transferência!
          </Alert>
        )}
      </Stack>
    </Modal>
  );
}
export default CopySelectionModal;
