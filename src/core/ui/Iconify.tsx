'use client';

import { Icon, IconProps } from '@iconify/react';
import './icons.generated';
import Box, { BoxProps } from '@mui/material/Box';

type Props = BoxProps & { icon: IconProps['icon']; width?: number };

export default function Iconify({ icon, width = 20, sx, ...other }: Props) {
  return <Box component={Icon} icon={icon} sx={{ width, height: width, ...sx }} {...other} />;
}
