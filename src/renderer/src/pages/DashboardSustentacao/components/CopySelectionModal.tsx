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

// ── Constants ─────────────────────────────────────────────────────────────────

const LANES = [
  { key: 'dev', label: 'Desenvolvimento' },
  { key: 'audit', label: 'Auditoria' },
  { key: 'analysis', label: 'Análise' },
] as const;
type LaneKey = (typeof LANES)[number]['key'];

const AZURE_BASE =
  'https://dev.azure.com/senaisc-solucoes-digitais/Tribo%20SEIF/_workitems/edit/';

// ── Props ─────────────────────────────────────────────────────────────────────

interface CopySelectionModalProps {
  open: boolean;
  onClose: () => void;
  devItems: SustentacaoItemWithSLA[];
  auditItems: SustentacaoItemWithSLA[];
  analysisItems: SustentacaoItemWithSLA[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function itemKey(item: SustentacaoItemWithSLA): string {
  return item.task.externalId ?? String(item.task.id);
}

function isGestao(areaPath?: string): boolean {
  return !!areaPath?.includes('Gestão de Terceiros');
}

function hasPriority(item: SustentacaoItemWithSLA): boolean {
  return !!item.expirationDate || item.localPriority > 0;
}

function buildUrl(id: string | number) {
  return `${AZURE_BASE}${id}/`;
}

function formatDateInfo(item: SustentacaoItemWithSLA, html: boolean): string {
  if (item.expirationDate) {
    const d = new Date(item.expirationDate);
    const label = item.slaViolated ? 'Término (vencido)' : 'Término';
    if (html) {
      const color = item.slaViolated ? '#DC2626' : '#0369A1';
      return ` | <span style="color:${color};">${label}: ${d.toLocaleDateString('pt-BR')}</span>`;
    }
    return ` | ${label}: ${d.toLocaleDateString('pt-BR')}`;
  }
  if (item.localPriority > 0) {
    const dateStr = item.localPriorityDeadline ?? item.localPriorityCreatedAt;
    if (dateStr) {
      const d = new Date(dateStr);
      if (html)
        return ` | <span style="color:#7C3AED;">Priorizado para: ${d.toLocaleDateString('pt-BR')}</span>`;
      return ` | Priorizado para: ${d.toLocaleDateString('pt-BR')}`;
    }
  }
  return '';
}

function formatBlockedInfo(
  item: SustentacaoItemWithSLA,
  html: boolean,
): string {
  const t = item.task;
  if (!t.isBlocked) return '';
  const motivo = t.blockedReason ? `: ${t.blockedReason}` : '';
  if (html)
    return ` | <span style="color:#DC2626;font-weight:700;">⚠ Impedimento${motivo}</span>`;
  return ` | ⚠ Impedimento${motivo}`;
}

/** Returns area label: Gestão or Chamada */
function areaTag(areaPath?: string): string {
  return isGestao(areaPath) ? '[Gestão]' : '[Chamada]';
}

function formatLaneWarning(laneLabel: string, html: boolean): string {
  if (html)
    return ` | <span style="color:#D97706;font-weight:600;">⚠ ${laneLabel}</span>`;
  return ` | ⚠ ${laneLabel}`;
}

function formatLine(
  item: SustentacaoItemWithSLA,
  idx: number,
  html: boolean,
  laneWarning?: string,
): string {
  const t = item.task;
  const id = t.externalId ?? String(t.id);
  const url = buildUrl(id);
  const warning = laneWarning ? formatLaneWarning(laneWarning, html) : '';
  const tag = areaTag(t.areaPath);
  const tagPart = html
    ? ` <span style="color:#64748B;font-size:0.8em;">${tag}</span>`
    : ` ${tag}`;
  const line = `${idx + 1}.${tagPart} ${html ? `<b><a href="${url}">#${id}</a></b>` : `#${id} (${url})`} - ${t.type}${formatDateInfo(item, html)}${formatBlockedInfo(item, html)}${warning}`;
  return line;
}

/** Renders items into the new flat structure:
 *  Com prioridade/SLA → Sem prioridade → Com impedimento
 *  Each item gets a Gestão/Chamada tag inline. No sub-headers.
 */
function buildOutput(
  title: string,
  items: SustentacaoItemWithSLA[],
  extraLaneMap: Map<string, string>,
  counterStart: number,
): { html: string[]; text: string[]; newCounter: number } {
  const html: string[] = [];
  const text: string[] = [];
  let counter = counterStart;

  if (items.length === 0) return { html, text, newCounter: counter };

  html.push(`<b>${title} - Ordem de Prioridade</b><br/><br/>`);
  text.push(`${title} - Ordem de Prioridade`, '');

  // Blocked → always last
  const blocked = items.filter((i) => i.task.isBlocked);
  const unblocked = items.filter((i) => !i.task.isBlocked);

  // Com prioridade: sorted by effective deadline ASC
  const withPrio = unblocked.filter(hasPriority);
  // Sem prioridade: Ticket before Improvement, then GT before CT within same type
  const withoutPrio = unblocked
    .filter((i) => !hasPriority(i))
    .sort((a, b) => {
      const aIsTicket = a.task.type === 'Ticket' ? 0 : 1;
      const bIsTicket = b.task.type === 'Ticket' ? 0 : 1;
      if (aIsTicket !== bIsTicket) return aIsTicket - bIsTicket;
      // Same type → GT before CT
      const aIsGt = isGestao(a.task.areaPath) ? 0 : 1;
      const bIsGt = isGestao(b.task.areaPath) ? 0 : 1;
      return aIsGt - bIsGt;
    });

  const appendGroup = (subItems: SustentacaoItemWithSLA[], label: string) => {
    if (subItems.length === 0) return;
    html.push(`<b>${label} (${subItems.length})</b><br/>`);
    text.push(`${label} (${subItems.length})`);
    subItems.forEach((item) => {
      const laneWarning = extraLaneMap.get(itemKey(item));
      html.push(formatLine(item, counter, true, laneWarning) + '<br/>');
      text.push(formatLine(item, counter, false, laneWarning));
      counter++;
    });
    html.push('<br/>');
    text.push('');
  };

  appendGroup(withPrio, 'Com prioridade/SLA');
  appendGroup(withoutPrio, 'Sem prioridade');
  appendGroup(blocked, 'Com impedimento');

  return { html, text, newCounter: counter };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CopySelectionModal({
  open,
  onClose,
  devItems,
  auditItems,
  analysisItems,
}: CopySelectionModalProps) {
  const [baseLane, setBaseLane] = useState<LaneKey>('audit');
  const [extraSelected, setExtraSelected] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [generatingPng, setGeneratingPng] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const laneItems: Record<LaneKey, SustentacaoItemWithSLA[]> = useMemo(
    () => ({ dev: devItems, audit: auditItems, analysis: analysisItems }),
    [devItems, auditItems, analysisItems],
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

  // Combined items: base lane items + selected extras, sorted: base first (in priority order), extras injected by priority
  const combinedItems = useMemo(() => {
    const base = laneItems[baseLane].filter((i) => !i.isHidden);
    const extras = LANES.filter((l) => l.key !== baseLane)
      .flatMap((l) => laneItems[l.key])
      .filter((i) => extraSelected.has(itemKey(i)) && !i.isHidden);

    // Merge: interleave extras into base by priority (same sort as dashboard)
    const all = [...base, ...extras];

    // Effective deadline: the single date used for sorting all prioritized items
    const effectiveDeadlineMs = (i: SustentacaoItemWithSLA): number => {
      if (i.expirationDate) return new Date(i.expirationDate).getTime();
      const d = i.localPriorityDeadline ?? i.localPriorityCreatedAt;
      if (d) return new Date(d).getTime();
      return Infinity;
    };

    // Sort: blocked last → violated (most overdue) → prioritized (earliest deadline) → unprioritized (Ticket>Improvement, GT>CT)
    all.sort((a, b) => {
      // Blocked always last
      const aBlocked = a.task.isBlocked ? 1 : 0;
      const bBlocked = b.task.isBlocked ? 1 : 0;
      if (aBlocked !== bBlocked) return aBlocked - bBlocked;

      const aViolated = a.slaViolated ? 1 : 0;
      const bViolated = b.slaViolated ? 1 : 0;
      if (aViolated !== bViolated) return bViolated - aViolated;
      if (aViolated && bViolated)
        return a.businessHoursRemaining - b.businessHoursRemaining;

      const aHasPrio = a.expirationDate != null || a.localPriority > 0 ? 1 : 0;
      const bHasPrio = b.expirationDate != null || b.localPriority > 0 ? 1 : 0;

      // Prioritized always before unprioritized
      if (aHasPrio !== bHasPrio) return bHasPrio - aHasPrio;

      // Both prioritized → earliest effective deadline first
      if (aHasPrio && bHasPrio) {
        const diff = effectiveDeadlineMs(a) - effectiveDeadlineMs(b);
        if (diff !== 0) return diff;
      }

      // Both unprioritized → Ticket before Improvement, then GT before CT
      const aIsTicket = a.task.type === 'Ticket' ? 0 : 1;
      const bIsTicket = b.task.type === 'Ticket' ? 0 : 1;
      if (aIsTicket !== bIsTicket) return aIsTicket - bIsTicket;
      const aIsGt = isGestao(a.task.areaPath) ? 0 : 1;
      const bIsGt = isGestao(b.task.areaPath) ? 0 : 1;
      return aIsGt - bIsGt;
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
    const { html, text } = buildOutput(
      baseTitle,
      combinedItems,
      extraLaneMap,
      0,
    );
    if (html.length === 0) return;

    const htmlStr = html.join('');
    const textStr = text.join('\n');

    const blob = new Blob([htmlStr], { type: 'text/html' });
    const textBlob = new Blob([textStr], { type: 'text/plain' });
    const clipItem = new ClipboardItem({
      'text/html': blob,
      'text/plain': textBlob,
    });
    navigator.clipboard.write([clipItem]).catch(() => {
      navigator.clipboard.writeText(textStr).catch(() => {});
    });

    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [baseTitle, combinedItems, extraLaneMap]);

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
