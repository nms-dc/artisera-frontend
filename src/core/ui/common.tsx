'use client';

import * as React from 'react';
import NextLink from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputBase from '@mui/material/InputBase';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import TableCell from '@mui/material/TableCell';
import TableSortLabel from '@mui/material/TableSortLabel';
import FormControl from '@mui/material/FormControl';
import { keyframes } from '@mui/material/styles';
import { useRouter, useSearchParams } from 'next/navigation';
import Iconify from './Iconify';
import { PILL } from '@/lib/constants';
import { tokens } from '@/core/theme/palette';
import { fNum, initials } from '@/lib/formatters';
import type { SxProps, Theme } from '@mui/material/styles';
import { errorMessage } from '@/core/api/errors';

export function PageHeader({
  title,
  subtitle,
  crumbs,
  actions,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  crumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
}) {
  return (
    <Box sx={{ mb: 2.5 }}>
      {crumbs && (
        <Breadcrumbs separator={<Iconify icon="mdi:chevron-right" width={14} />} sx={{ fontSize: 12, mb: 0.5 }}>
          {crumbs.map((c, i) =>
            c.href && i < crumbs.length - 1 ? (
              <NextLink key={c.label} href={c.href} style={{ color: tokens.muted, textDecoration: 'none' }}>
                {c.label}
              </NextLink>
            ) : (
              <Typography key={c.label} variant="caption" sx={{ color: i === crumbs.length - 1 ? tokens.ink : tokens.muted, fontWeight: i === crumbs.length - 1 ? 700 : 400 }}>
                {c.label}
              </Typography>
            ),
          )}
        </Breadcrumbs>
      )}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
        <Box>
          <Typography variant="h4">{title}</Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {actions && (
          <Stack direction="row" spacing={1.5} alignItems="center">
            {actions}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}

export function Pill({ label, kind }: { label: string; kind?: string }) {
  const c = PILL[kind ?? label] ?? { bg: '#ECEFF4', fg: tokens.muted };
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        px: 1.5,
        py: 0.4,
        borderRadius: 1,
        fontSize: 12,
        fontWeight: 600,
        bgcolor: c.bg,
        color: c.fg,
        whiteSpace: 'nowrap',
        minWidth: 64,
        textAlign: 'center',
      }}
    >
      {label}
    </Box>
  );
}

export function RepeatTag() {
  return <Pill label="Repeat Prospect" />;
}

export function AvatarInitials({ name, size = 30 }: { name: string; size?: number }) {
  const hues = ['#E7D9FF', '#DCE8FF', '#FFDDF0', '#DDF5E3', '#FFE9C7', '#E4DBFF'];
  const h = hues[name.length % hues.length];
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        bgcolor: h,
        color: tokens.ink,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.38,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initials(name)}
    </Box>
  );
}

export function KpiCard({
  label,
  value,
  sub,
  icon,
  tone = 'blue',
  valueColor,
  href,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon: string;
  tone?: 'blue' | 'red' | 'green' | 'orange' | 'purple';
  valueColor?: string;
  /** Makes the card clickable. A `_` timestamp is added so the destination highlight re-runs on every click. */
  href?: string;
}) {
  const router = useRouter();
  const go = () => href && router.push(`${href}${href.includes('?') ? '&' : '?'}_=${Date.now()}`);
  const t = {
    blue: { bg: '#EAF2FF', ic: '#DCEAFF', fg: '#1665F5' },
    red: { bg: '#FFECEC', ic: '#FFD9D9', fg: '#D32F2F' },
    green: { bg: '#E9F8EE', ic: '#D3F1DC', fg: '#1E8E3E' },
    orange: { bg: '#FFF3E3', ic: '#FFE3BD', fg: '#F59E0B' },
    purple: { bg: '#F1EAFF', ic: '#E3D5FF', fg: '#7C4DFF' },
  }[tone];
  return (
    <Card
      onClick={href ? go : undefined}
      onKeyDown={href ? (e) => (e.key === 'Enter' || e.key === ' ') && go() : undefined}
      role={href ? 'link' : undefined}
      tabIndex={href ? 0 : undefined}
      sx={{
        p: 2,
        bgcolor: t.bg,
        borderColor: t.ic,
        display: 'flex',
        alignItems: 'center',
        gap: 1.75,
        height: '100%',
        ...(href && {
          cursor: 'pointer',
          transition: 'transform .12s, box-shadow .12s',
          '&:hover, &:focus-visible': { transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(16,24,40,.12)', outline: 'none' },
        }),
      }}
    >
      <Box sx={{ width: 46, height: 46, borderRadius: '50%', bgcolor: t.ic, color: t.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Iconify icon={icon} width={24} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ color: tone === 'red' ? '#C62828' : tokens.ink, fontWeight: 500 }}>
          {label}
        </Typography>
        <Typography sx={{ fontSize: 28, fontWeight: 800, lineHeight: 1.15, color: valueColor ?? tokens.ink }}>{typeof value === 'number' ? fNum(value) : value}</Typography>
        {sub && (
          <Typography variant="caption" sx={{ color: tokens.muted }}>
            {sub}
          </Typography>
        )}
      </Box>
    </Card>
  );
}

export function Panel({ title, action, children, sx }: { title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; sx?: SxProps<Theme> }) {
  return (
    <Card sx={{ p: 2.25, ...sx }}>
      {(title || action) && (
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Typography variant="subtitle1">{title}</Typography>
          {action}
        </Stack>
      )}
      {children}
    </Card>
  );
}

export function SearchBox({ value, onChange, placeholder, width = '100%' }: { value: string; onChange: (v: string) => void; placeholder: string; width?: string | number }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, height: 38, bgcolor: '#fff', border: `1px solid ${tokens.border}`, borderRadius: 1.5, width }}>
      <Iconify icon="mdi:magnify" width={18} sx={{ color: tokens.muted }} />
      <InputBase value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} sx={{ flex: 1, fontSize: 13 }} />
    </Box>
  );
}

export function FilterSelect({
  value,
  onChange,
  options,
  all,
  width = 140,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  all: string;
  width?: number;
}) {
  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value as string)}
      displayEmpty
      sx={{ width, height: 38, fontSize: 13, bgcolor: '#fff' }}
      IconComponent={(p) => <Iconify icon="mdi:chevron-down" width={18} {...p} sx={{ mr: 1, color: tokens.muted }} />}
    >
      <MenuItem value="">{all}</MenuItem>
      {options.map((o) => (
        <MenuItem key={o.value} value={o.value}>
          {o.label}
        </MenuItem>
      ))}
    </Select>
  );
}

export function LabeledSelect({
  label,
  value,
  onChange,
  options,
  required,
  error,
  helper,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  error?: boolean;
  helper?: string;
  disabled?: boolean;
}) {
  return (
    <FormControl size="small" fullWidth error={error} disabled={disabled}>
      <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, color: tokens.ink }}>
        {label}
        {required && <span style={{ color: '#D32F2F' }}> *</span>}
      </Typography>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value as string)}
        displayEmpty
        IconComponent={(p) => <Iconify icon="mdi:chevron-down" width={18} {...p} sx={{ mr: 1 }} />}
      >
        <MenuItem value="" disabled>
          <span style={{ color: '#98A2B8' }}>Select {label}</span>
        </MenuItem>
        {options.map((o) => (
          <MenuItem key={o.value} value={o.value}>
            {o.label}
          </MenuItem>
        ))}
      </Select>
      {helper && (
        <Typography variant="caption" color={error ? 'error' : 'text.secondary'}>
          {helper}
        </Typography>
      )}
    </FormControl>
  );
}

export function FieldLabel({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, color: tokens.ink }}>
        {label}
        {required && <span style={{ color: '#D32F2F' }}> *</span>}
      </Typography>
      {children}
    </Box>
  );
}

export function usePageReset(setPage: (page: number) => void, key: string) {
  React.useEffect(() => {
    setPage(1);
  }, [setPage, key]);
}

export function usePaging(initialSize = 10) {
  const [page, setPage] = React.useState(1);
  const [size, setSize] = React.useState(initialSize);
  return { page, size, setPage, setSize };
}

export function useDebounced<T>(value: T, ms = 400) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function Pager({ paging, total, noun, sizes = [10, 20, 50] }: { paging: ReturnType<typeof usePaging>; total: number; noun: string; sizes?: number[] }) {
  const { page, size, setPage, setSize } = paging;
  const pages = Math.max(1, Math.ceil(total / size));
  const from = total ? (page - 1) * size + 1 : 0;
  const to = Math.min(page * size, total);
  const nums: (number | '…')[] = [];
  for (let i = 1; i <= pages; i++)
    if (i <= 3 || i === pages || Math.abs(i - page) <= 1) nums.push(i);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  const btn = (active = false) => ({
    minWidth: 34,
    height: 34,
    p: 0,
    borderColor: tokens.border,
    color: active ? '#fff' : tokens.ink,
    bgcolor: active ? tokens.blue : '#fff',
    '&:hover': { bgcolor: active ? tokens.blue : '#F0F5FF' },
  });
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
      <Typography variant="body2" color="text.secondary">
        Showing {from} to {to} of {total} {noun}
      </Typography>
      <Stack direction="row" spacing={0.75}>
        <Button variant="outlined" sx={btn()} disabled={page <= 1} onClick={() => setPage(page - 1)}>
          <Iconify icon="mdi:chevron-left" />
        </Button>
        {nums.map((n, i) =>
          n === '…' ? (
            <Box key={`e${i}`} sx={{ px: 0.5, alignSelf: 'center', color: tokens.muted }}>
              …
            </Box>
          ) : (
            <Button key={n} variant="outlined" sx={btn(n === page)} onClick={() => setPage(n)}>
              {n}
            </Button>
          ),
        )}
        <Button variant="outlined" sx={btn()} disabled={page >= pages} onClick={() => setPage(page + 1)}>
          <Iconify icon="mdi:chevron-right" />
        </Button>
      </Stack>
      <Select
        value={size}
        onChange={(e) => {
          setSize(Number(e.target.value));
          setPage(1);
        }}
        sx={{ height: 36, fontSize: 13, bgcolor: '#fff' }}
      >
        {sizes.map((n) => (
          <MenuItem key={n} value={n}>
            {n} / page
          </MenuItem>
        ))}
      </Select>
    </Stack>
  );
}

export function QueryState({ loading, error, empty, colSpan, emptyText }: { loading?: boolean; error?: unknown; empty?: boolean; colSpan: number; emptyText: string }) {
  if (!loading && !error && !empty) return null;
  return (
    <tr>
      <td colSpan={colSpan} style={{ padding: '36px 12px', textAlign: 'center', color: error ? '#D32F2F' : tokens.muted }}>
        {loading ? 'Loading…' : error ? `Could not load data: ${errorMessage(error) ?? 'Unknown error'}` : emptyText}
      </td>
    </tr>
  );
}

export const TabsUnderline = ({ tabs, value, onChange }: { tabs: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) => (
  <Stack direction="row" spacing={3} sx={{ borderBottom: `1px solid ${tokens.border}`, mb: 2 }}>
    {tabs.map((t) => (
      <Box
        key={t.value}
        onClick={() => onChange(t.value)}
        sx={{
          py: 1.25,
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 600,
          color: value === t.value ? tokens.blue : tokens.muted,
          borderBottom: `2px solid ${value === t.value ? tokens.blue : 'transparent'}`,
          mb: '-1px',
        }}
      >
        {t.label}
      </Box>
    ))}
  </Stack>
);

export const tableWrap = { bgcolor: '#fff', border: `1px solid ${tokens.border}`, borderRadius: 2, overflowX: 'auto' } as const;

const flash = keyframes`0%{background-color:#FFF3C4;box-shadow:inset 4px 0 0 #F59E0B}70%{background-color:#FFF3C4;box-shadow:inset 4px 0 0 #F59E0B}100%{background-color:transparent;box-shadow:inset 0 0 0 transparent}`;

export function useHighlight(ready: boolean) {
  const sp = useSearchParams();
  const id = sp.get('highlight');
  const nonce = sp.get('_'); // changes on every notification click, so the same row can be highlighted again
  const [active, setActive] = React.useState<string | null>(id);
  React.useEffect(() => {
    setActive(id);
    if (id) {
      const t = setTimeout(() => setActive(null), 4000);
      return () => clearTimeout(t);
    }
  }, [id, nonce]);
  React.useEffect(() => {
    if (active && ready) document.querySelector(`[data-row="${active}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [active, ready]);
  return active;
}
export const highlightSx = (on: boolean) => (on ? { animation: `${flash} 4s ease-out 1` } : {});

const flashFrame = keyframes`0%{background-color:#FFF3C4;box-shadow:0 0 0 6px #FFF3C4,0 0 0 8px #F59E0B}70%{background-color:#FFF3C4;box-shadow:0 0 0 6px #FFF3C4,0 0 0 8px #F59E0B}100%{background-color:transparent;box-shadow:0 0 0 6px transparent,0 0 0 8px transparent}`;

/** Column sorting: click cycles ascending → descending → default. `ordering` follows the API ("field" / "-field"). */
export function useSort() {
  const [ordering, setOrdering] = React.useState('');
  const toggle = React.useCallback((field: string) => setOrdering((o) => (o === field ? `-${field}` : o === `-${field}` ? '' : field)), []);
  return { ordering, toggle };
}

export function SortHead({
  field,
  ordering,
  onSort,
  children,
  sx,
}: {
  field: string;
  ordering: string;
  onSort: (field: string) => void;
  children: React.ReactNode;
  sx?: SxProps<Theme>;
}) {
  const active = ordering.replace('-', '') === field;
  return (
    <TableCell sx={sx} sortDirection={active ? (ordering.startsWith('-') ? 'desc' : 'asc') : false}>
      <TableSortLabel
        active={active}
        direction={active && ordering.startsWith('-') ? 'desc' : 'asc'}
        onClick={() => onSort(field)}
        sx={{ '&& .MuiTableSortLabel-icon': { opacity: active ? 1 : 0.55, color: active ? 'primary.main' : 'text.secondary' } }}
      >
        {children}
      </TableSortLabel>
    </TableCell>
  );
}

/** Flashes its content for 4 seconds when the page was opened from a notification (?highlight=<match>). */
export function HighlightFrame({ match, scroll = true, children }: { match: string; scroll?: boolean; children: React.ReactNode }) {
  const sp = useSearchParams();
  const key = sp.get('highlight');
  const nonce = sp.get('_');
  const [on, setOn] = React.useState(key === match);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    setOn(key === match);
    if (key !== match) return;
    if (scroll) ref.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const t = setTimeout(() => setOn(false), 4000);
    return () => clearTimeout(t);
  }, [key, nonce, match, scroll]);
  return (
    <Box ref={ref} sx={{ borderRadius: 2, mb: 2, ...(on && { animation: `${flashFrame} 4s ease-out 1` }) }}>
      {children}
    </Box>
  );
}
