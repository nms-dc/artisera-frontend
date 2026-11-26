import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Panel, tableWrap } from '@/core/ui/common';
import Iconify from '@/core/ui/Iconify';
import { tokens } from '@/core/theme/palette';
import { PRODUCT_STATUSES, requiresReadyDate } from '@/lib/constants';
import { fINR } from '@/lib/formatters';
import { emptyRow, productsTotal } from './form';
import { numberInputSx } from './parts';
import type { ProductRowState, WonErrors, WonFormState } from './form';
import type { MasterOption, ProductStatus } from '@/lib/types';
import DateField from '@/core/ui/DateField';
import AmountField from '@/core/ui/AmountField';

type Props = { form: WonFormState; errors: WonErrors; artists: MasterOption[]; update: (patch: Partial<WonFormState>) => void };

const HEADERS = [
  '#',
  'Product Name / Description *',
  'Artist',
  'URL (optional)',
  'Listed Price (₹)',
  'Quantity',
  'Product Status *',
  'Ready Date * (required for With Artist / Commission)',
  '',
];
const STATUS_DOT: Record<ProductStatus, string> = { 'In Stock': '#1E8E3E', 'With Artist': '#F59E0B', Commission: '#7C4DFF' };

const StatusLabel = ({ status }: { status: ProductStatus }) => (
  <Stack direction="row" spacing={1} alignItems="center">
    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: STATUS_DOT[status] }} />
    <span>{status}</span>
  </Stack>
);

const isOpenable = (url: string) => /^https?:\/\/\S+$/.test(url);

const cell = { py: 0.75, verticalAlign: 'top' } as const;

export function ProductsStep({ form, errors, artists, update }: Props) {
  const { rows } = form;
  const total = productsTotal(rows);
  const setRow = (key: number, patch: Partial<ProductRowState>) => update({ rows: rows.map((r) => (r.key === key ? { ...r, ...patch } : r)) });
  const addRow = () => update({ rows: [...rows, emptyRow(Math.max(...rows.map((r) => r.key)) + 1)] });
  const removeRow = (key: number) => update({ rows: rows.filter((r) => r.key !== key) });

  return (
    <Panel
      title="3. Products Purchased"
      action={
        <Button variant="outlined" startIcon={<Iconify icon="mdi:plus" width={18} />} onClick={addRow}>
          Add Product
        </Button>
      }
    >
      <Typography variant="body2" sx={{ mb: 1.5 }}>
        Add the products purchased as part of this inquiry. The Gallery Manager will group them into orders for preparation and dispatch.
      </Typography>
      <Box sx={tableWrap}>
        <Table size="small" sx={{ minWidth: 1180 }}>
          <TableHead>
            <TableRow>
              {HEADERS.map((h) => (
                <TableCell key={h}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, n) => (
              <TableRow key={r.key}>
                <TableCell sx={cell}>{n + 1}</TableCell>
                <TableCell sx={{ ...cell, minWidth: 200 }}>
                  <TextField size="small" value={r.name} error={Boolean(errors[`name-${r.key}`])} onChange={(e) => setRow(r.key, { name: e.target.value })} />
                </TableCell>
                <TableCell sx={{ ...cell, minWidth: 150 }}>
                  <TextField select size="small" value={r.artistId} onChange={(e) => setRow(r.key, { artistId: e.target.value })} SelectProps={{ native: true }}>
                    <option value="">— Select —</option>
                    {artists.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </TextField>
                </TableCell>
                <TableCell sx={{ ...cell, minWidth: 160 }}>
                  <TextField
                    size="small"
                    placeholder="https://artisera…"
                    value={r.url}
                    error={Boolean(errors[`url-${r.key}`])}
                    helperText={errors[`url-${r.key}`]}
                    onChange={(e) => setRow(r.key, { url: e.target.value })}
                    InputProps={{
                      endAdornment: isOpenable(r.url) && (
                        <InputAdornment position="end">
                          <IconButton size="small" component="a" href={r.url} target="_blank" rel="noopener noreferrer" aria-label="Open link">
                            <Iconify icon="mdi:open-in-new" width={16} />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </TableCell>
                <TableCell sx={{ ...cell, minWidth: 130 }}>
                  <AmountField
                    size="small"
                    sx={numberInputSx}
                    value={r.listedPrice}
                    error={Boolean(errors[`price-${r.key}`])}
                    onChange={(e) => setRow(r.key, { listedPrice: e.target.value })}
                  />
                </TableCell>
                <TableCell sx={{ ...cell, minWidth: 90 }}>
                  <TextField
                    size="small"
                    type="number"
                    sx={numberInputSx}
                    inputProps={{ min: 1 }}
                    value={r.quantity}
                    error={Boolean(errors[`qty-${r.key}`])}
                    onChange={(e) => setRow(r.key, { quantity: e.target.value })}
                  />
                </TableCell>
                <TableCell sx={{ ...cell, minWidth: 140 }}>
                  <Select
                    size="small"
                    fullWidth
                    value={r.productStatus}
                    onChange={(e) => setRow(r.key, { productStatus: e.target.value as ProductStatus })}
                    renderValue={(value) => <StatusLabel status={value} />}
                    inputProps={{ 'aria-label': 'Product status' }}
                  >
                    {PRODUCT_STATUSES.map((x) => (
                      <MenuItem key={x} value={x}>
                        <StatusLabel status={x} />
                      </MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell sx={{ ...cell, minWidth: 170 }}>
                  {!requiresReadyDate(r.productStatus) ? (
                    <TextField size="small" disabled value="N/A" inputProps={{ 'aria-label': 'Ready date not applicable' }} />
                  ) : (
                    <DateField
                      size="small"
                      value={r.commissionReadyDate}
                      required
                      error={Boolean(errors[`date-${r.key}`])}
                      helperText={errors[`date-${r.key}`]}
                      onChange={(e) => setRow(r.key, { commissionReadyDate: e.target.value })}
                      inputProps={{ 'aria-label': 'Ready date' }}
                    />
                  )}
                </TableCell>
                <TableCell sx={cell}>
                  <IconButton size="small" color="error" aria-label="Remove product" disabled={rows.length === 1} onClick={() => removeRow(r.key)}>
                    <Iconify icon="mdi:trash-can-outline" width={20} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
      <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1.5 }}>
        <Typography variant="body2">
          Products total: <b style={{ color: tokens.ink }}>{fINR(total)}</b>
        </Typography>
      </Stack>
      {total > 0 && total !== Number(form.totalValue) && (
        <Alert severity="info" sx={{ mt: 1 }}>
          The products total differs from the sale value of {fINR(Number(form.totalValue))}.
        </Alert>
      )}
    </Panel>
  );
}
