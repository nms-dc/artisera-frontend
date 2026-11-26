import * as React from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Iconify from '@/core/ui/Iconify';
import { tokens } from '@/core/theme/palette';
import { STEPS } from './form';

export const numberInputSx = {
  '& input[type=number]': { MozAppearance: 'textfield' },
  '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 },
} as const;

export const SECTION_IDS = ['won-sale', 'won-products', 'won-additional', 'won-save'] as const;

export function Stepper({ active, onSelect }: { active: number; onSelect: (index: number) => void }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 1 }}>
      {STEPS.map((label, i) => (
        <React.Fragment key={label}>
          <Stack
            component="button"
            type="button"
            direction="row"
            spacing={1}
            alignItems="center"
            onClick={() => onSelect(i)}
            sx={{
              px: 1.5,
              py: 0.75,
              borderRadius: 2,
              cursor: 'pointer',
              font: 'inherit',
              border: `1px solid ${i === active ? tokens.blue : 'transparent'}`,
              bgcolor: i === active ? '#fff' : 'transparent',
            }}
          >
            <Box
              sx={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                fontSize: 13,
                fontWeight: 700,
                bgcolor: i === active ? tokens.blue : '#E1E7F2',
                color: i === active ? '#fff' : tokens.muted,
              }}
            >
              {i + 1}
            </Box>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: i === active ? tokens.ink : tokens.muted }}>{label}</Typography>
          </Stack>
          {i < STEPS.length - 1 && <Iconify icon="mdi:arrow-right" width={16} sx={{ color: tokens.muted }} />}
        </React.Fragment>
      ))}
    </Stack>
  );
}

export const Info = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <Stack direction="row" spacing={2} sx={{ py: 0.5 }}>
    <Typography variant="body2" sx={{ width: 120, flexShrink: 0 }}>
      {label}
    </Typography>
    <Box sx={{ fontSize: 13, fontWeight: 600, color: tokens.ink }}>{children}</Box>
  </Stack>
);
