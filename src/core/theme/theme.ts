'use client';

import { createTheme } from '@mui/material/styles';
import palette, { tokens } from './palette';
import typography from './typography';

const theme = createTheme({
  palette,
  typography,
  shape: { borderRadius: 8 },
  components: {
    MuiCssBaseline: { styleOverrides: { body: { backgroundColor: tokens.bg } } },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 8, fontWeight: 600 }, outlined: { borderColor: tokens.blue } },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiCard: { styleOverrides: { root: { borderRadius: 10, border: `1px solid ${tokens.border}`, boxShadow: 'none' } } },
    MuiTextField: { defaultProps: { size: 'small', fullWidth: true } },
    MuiSelect: { defaultProps: { size: 'small' } },
    MuiOutlinedInput: { styleOverrides: { root: { backgroundColor: '#fff', fontSize: 13 } } },
    MuiTableCell: {
      styleOverrides: {
        root: { fontSize: 13, color: tokens.text, borderBottom: `1px solid ${tokens.border}`, padding: '10px 12px' },
        head: { fontWeight: 700, color: tokens.ink, backgroundColor: tokens.headBg, whiteSpace: 'nowrap' },
      },
    },
    MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600, minHeight: 44 } } },
  },
});

export default theme;
