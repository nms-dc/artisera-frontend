'use client';

import * as React from 'react';
import NextLink from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useSnackbar } from 'notistack';
import { FieldLabel, FilterSelect, Pill, SearchBox } from '@/core/ui/common';
import Iconify from '@/core/ui/Iconify';
import { tokens } from '@/core/theme/palette';
import { downloadFile } from '@/core/api/download';
import { handleSubmitError } from '@/core/ui/forms';
import { MEDIA_ACCEPT, MEDIA_MAX_BYTES } from '@/lib/constants';
import { fDateTime } from '@/lib/formatters';
import type { LogEntry } from '@/lib/types';
import DateField from '@/core/ui/DateField';

export type ListFilters = { from: string; to: string; customerId: string; status: string; certificate: string; courier: string; q: string };
export const emptyFilters: ListFilters = { from: '', to: '', customerId: '', status: '', certificate: '', courier: '', q: '' };

export function useListFilters(initial: Partial<ListFilters> = {}) {
  const [draft, setDraft] = React.useState<ListFilters>(() => ({ ...emptyFilters, ...initial }));
  const [applied, setApplied] = React.useState<ListFilters>(() => ({ ...emptyFilters, ...initial }));
  const patch = React.useCallback((changes: Partial<ListFilters>) => setDraft((d) => ({ ...d, ...changes })), []);
  const apply = React.useCallback(() => setApplied(draft), [draft]);
  const clear = React.useCallback(() => {
    setDraft(emptyFilters);
    setApplied(emptyFilters);
  }, []);
  return { draft, applied, patch, apply, clear };
}

type Option = { value: string; label: string };
type SelectSpec = { key: 'customerId' | 'status' | 'certificate' | 'courier'; label: string; all: string; options: Option[]; width?: number };

export function FilterBar({
  filters,
  specs,
  placeholder,
  controller,
}: {
  filters: ListFilters;
  specs: SelectSpec[];
  placeholder: string;
  controller: ReturnType<typeof useListFilters>;
}) {
  const { patch, apply, clear } = controller;
  return (
    <Stack
      direction="row"
      spacing={1.5}
      alignItems="flex-end"
      sx={{ flexWrap: 'wrap', rowGap: 1.5, p: 2, mb: 2, bgcolor: '#fff', border: `1px solid ${tokens.border}`, borderRadius: 2 }}
    >
      <FieldLabel label="Date Range">
        <Stack direction="row" spacing={0.75} alignItems="center">
          <DateField value={filters.from} onChange={(e) => patch({ from: e.target.value })} sx={{ width: 150 }} />
          <span>–</span>
          <DateField value={filters.to} onChange={(e) => patch({ to: e.target.value })} sx={{ width: 150 }} />
        </Stack>
      </FieldLabel>
      {specs.map((spec) => (
        <Box key={spec.key}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, color: tokens.ink }}>
            {spec.label}
          </Typography>
          <FilterSelect value={filters[spec.key]} onChange={(v) => patch({ [spec.key]: v })} options={spec.options} all={spec.all} width={spec.width ?? 170} />
        </Box>
      ))}
      <Box sx={{ flex: '1 1 260px', maxWidth: 380 }}>
        <SearchBox value={filters.q} onChange={(q) => patch({ q })} placeholder={placeholder} />
      </Box>
      <Button sx={{ fontWeight: 600 }} onClick={clear}>
        Clear Filters
      </Button>
      <Button variant="contained" onClick={apply}>
        Apply Filters
      </Button>
    </Stack>
  );
}

export const toParams = (f: ListFilters) => ({ from: f.from || undefined, to: f.to || undefined, customerId: f.customerId || undefined, q: f.q || undefined });

export function ExportButton({ url, params, filename }: { url: string; params: Record<string, unknown>; filename: string }) {
  const { enqueueSnackbar } = useSnackbar();
  const [busy, setBusy] = React.useState(false);
  const run = async () => {
    setBusy(true);
    try {
      await downloadFile(url, params, filename);
    } catch (e) {
      enqueueSnackbar(handleSubmitError(e), { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button variant="outlined" disabled={busy} startIcon={<Iconify icon="mdi:download" width={18} />} onClick={run}>
      Export
    </Button>
  );
}

export const InfoCard = ({ children, tone = 'blue' }: { children: React.ReactNode; tone?: 'blue' | 'amber' }) => (
  <Box sx={{ p: 2, height: '100%', borderRadius: 2, border: `1px solid ${tokens.border}`, bgcolor: tone === 'amber' ? '#FFF6E0' : '#EEF5FF' }}>{children}</Box>
);
export const InfoLabel = ({ children }: { children: React.ReactNode }) => <Typography variant="body2">{children}</Typography>;
export const InfoValue = ({ children, size = 16 }: { children: React.ReactNode; size?: number }) => (
  <Typography sx={{ fontWeight: 700, color: tokens.ink, fontSize: size }}>{children}</Typography>
);

/** How the certificate for an order travels: with the shipment, or separately afterwards. */
export const CertificateTag = ({ separately, sent }: { separately: boolean; sent?: boolean }) => (
  <Pill label={!separately ? 'Certificate: With Shipment' : sent === undefined ? 'Certificate: Sent Separately' : sent ? 'Certificate: Sent' : 'Certificate: Pending'} />
);

export const YesNo = ({ value }: { value: boolean }) => <Pill label={value ? 'Yes' : 'No'} />;

export const EntityLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <NextLink href={href} style={{ color: tokens.blue, fontWeight: 700, textDecoration: 'underline' }}>
    {children}
  </NextLink>
);

export function MediaDropzone({ onFiles, disabled }: { onFiles: (files: File[]) => void; disabled?: boolean }) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { enqueueSnackbar } = useSnackbar();
  const accept = MEDIA_ACCEPT.split(',');
  const handle = (list: FileList | null) => {
    if (!list) return;
    const files = Array.from(list);
    const bad = files.find((f) => !accept.includes(f.type) || f.size > MEDIA_MAX_BYTES);
    if (bad) {
      enqueueSnackbar(`${bad.name}: only JPG, PNG or MP4 up to 100 MB are allowed`, { variant: 'warning' });
      return;
    }
    onFiles(files);
  };
  return (
    <Box
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (!disabled) handle(e.dataTransfer.files);
      }}
      sx={{
        border: `2px dashed ${tokens.blue}`,
        borderRadius: 2,
        p: 2.5,
        textAlign: 'center',
        bgcolor: '#F6FAFF',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Iconify icon="mdi:cloud-upload-outline" width={36} sx={{ color: tokens.blue }} />
      <Typography variant="body2" sx={{ color: tokens.ink }}>
        Drag & drop files here, or <u style={{ color: tokens.blue }}>click to browse</u>
      </Typography>
      <Typography variant="caption">Supports JPG, PNG, MP4 (Max 100 MB per file)</Typography>
      <input
        ref={inputRef}
        type="file"
        hidden
        multiple
        accept={MEDIA_ACCEPT}
        onChange={(e) => {
          handle(e.target.files);
          e.target.value = '';
        }}
      />
    </Box>
  );
}

export const Timeline = ({ items }: { items: LogEntry[] }) => (
  <Stack spacing={0}>
    {items.length === 0 && (
      <Typography variant="body2" color="text.secondary">
        No activity yet.
      </Typography>
    )}
    {items.map((a) => (
      <Stack key={a.id} direction="row" spacing={2} alignItems="center" sx={{ py: 1.5, borderBottom: `1px solid ${tokens.border}` }}>
        <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: '#1E8E3E', color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Iconify icon="mdi:check" width={18} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 700, color: tokens.ink }}>{a.title}</Typography>
          <Typography variant="body2">{a.text}</Typography>
        </Box>
        <Typography variant="body2" sx={{ width: 190 }}>
          {fDateTime(a.at)}
        </Typography>
        <Typography variant="body2" sx={{ width: 150, fontWeight: 600, color: tokens.ink }}>
          {a.by.name}
        </Typography>
      </Stack>
    ))}
  </Stack>
);
