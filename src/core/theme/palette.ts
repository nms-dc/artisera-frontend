export const tokens = {
  navy: '#0A2342',
  navySide: '#0B2545',
  navyLine: 'rgba(255,255,255,0.10)',
  blue: '#1665F5',
  ink: '#0B1F6B',
  text: '#26324B',
  muted: '#5B6B8C',
  border: '#DCE6F5',
  bg: '#F5F8FD',
  headBg: '#EEF4FC',
  card: '#FFFFFF',
};

export const palette = {
  primary: { main: tokens.blue, dark: '#0F4FC4', light: '#E3EDFF', contrastText: '#fff' },
  secondary: { main: '#7C4DFF' },
  success: { main: '#1E8E3E', light: '#DDF5E3', contrastText: '#fff' },
  warning: { main: '#F59E0B', light: '#FFF1D6' },
  error: { main: '#D32F2F', light: '#FFE3E3' },
  info: { main: '#1665F5', light: '#E3EDFF' },
  text: { primary: tokens.text, secondary: tokens.muted },
  divider: tokens.border,
  background: { default: tokens.bg, paper: tokens.card },
};
export default palette;
