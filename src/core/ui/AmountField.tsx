'use client';

import * as React from 'react';
import TextField from '@mui/material/TextField';
import type { TextFieldProps } from '@mui/material/TextField';

/** Amount input that shows Indian digit grouping (4,00,000) while typing. `value` and onChange carry the plain number string. */
const group = (raw: string) => {
  const [int = '', dec] = raw.split('.');
  const grouped = int ? new Intl.NumberFormat('en-IN').format(Number(int)) : '';
  return dec === undefined ? grouped : `${grouped || '0'}.${dec}`;
};

export default function AmountField({ value, onChange, inputProps, ...rest }: TextFieldProps) {
  const plain = value === undefined || value === null ? '' : String(value);
  return (
    <TextField
      {...rest}
      type="text"
      value={group(plain)}
      inputProps={{ inputMode: 'decimal', ...inputProps }}
      onChange={(e) => {
        let next = e.target.value.replace(/[^0-9.]/g, '');
        const dot = next.indexOf('.');
        if (dot !== -1)
          next = `${next.slice(0, dot + 1)}${next
            .slice(dot + 1)
            .replace(/\./g, '')
            .slice(0, 2)}`;
        next = next.replace(/^0+(?=\d)/, '');
        onChange?.({ ...e, target: { ...e.target, value: next } } as React.ChangeEvent<HTMLInputElement>);
      }}
    />
  );
}
