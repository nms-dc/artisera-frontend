'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import type { TextFieldProps } from '@mui/material/TextField';
import Iconify from '@/core/ui/Iconify';
import { DATE_FORMAT } from '@/lib/formatters';
import { format, isValid, parseISO } from 'date-fns';

/**
 * Date input that always shows the app's date style (12-Nov-2026), whatever the browser's locale.
 * The value stays a yyyy-MM-dd string and onChange receives the native input's change event,
 * so it is a drop-in replacement for <TextField type="date" />.
 */
export default function DateField({ value, onChange, inputProps, InputProps, disabled, placeholder, sx, fullWidth = true, ...rest }: TextFieldProps) {
  const text = typeof value === 'string' && value ? (isValid(parseISO(value)) ? format(parseISO(value), DATE_FORMAT) : '') : '';
  const label = (inputProps as Record<string, unknown> | undefined)?.['aria-label'] as string | undefined;
  return (
    <Box sx={{ position: 'relative', width: fullWidth ? '100%' : 'auto', display: fullWidth ? 'block' : 'inline-block', ...((sx as object) ?? {}) }}>
      <TextField
        {...rest}
        fullWidth
        disabled={disabled}
        value={text}
        placeholder={placeholder ?? 'dd-mmm-yyyy'}
        InputProps={{
          ...InputProps,
          readOnly: true,
          endAdornment: <Iconify icon="mdi:calendar-check-outline" width={18} />,
        }}
        inputProps={{ tabIndex: -1, 'aria-hidden': true }}
      />
      {/* Transparent native date input on top: it supplies the calendar popup, min/max and keyboard entry. */}
      <input
        type="date"
        value={(value as string) ?? ''}
        onChange={onChange as React.ChangeEventHandler<HTMLInputElement>}
        disabled={disabled}
        min={(inputProps as { min?: string } | undefined)?.min}
        max={(inputProps as { max?: string } | undefined)?.max}
        aria-label={label ?? (typeof rest.label === 'string' ? rest.label : 'Date')}
        onClick={(e) => {
          try {
            (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
          } catch {
            /* the browser opens its own picker */
          }
        }}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: disabled ? 'default' : 'pointer', border: 0, padding: 0 }}
      />
    </Box>
  );
}
