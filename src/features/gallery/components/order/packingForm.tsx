'use client';

import * as React from 'react';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { useSnackbar } from 'notistack';
import ConfirmDialog from '@/core/ui/ConfirmDialog';
import { handleSubmitError } from '@/core/ui/forms';
import { dayOf, todayDay } from '@/lib/dates';
import { useSaveDispatchMutation } from '../../api';
import type { Courier, OrderDetail, OrderPackage } from '@/lib/types';

export const blankPackage = (): OrderPackage => ({ packagingType: '', lengthCm: null, widthCm: null, heightCm: null, weightKg: null, notes: '' });

type ShipmentFields = { courier: string; waybill: string; dispatchDate: string; certificateIncluded: boolean; invoiceIncluded: boolean };
export type PackingForm = ShipmentFields & { packages: OrderPackage[] };
type Section = 'packing' | 'shipment';

const shipmentFields = (o: OrderDetail): ShipmentFields => ({
  courier: o.courier ?? '',
  waybill: o.waybill ?? '',
  dispatchDate: o.actualDispatchDate ? dayOf(o.actualDispatchDate) : '',
  certificateIncluded: o.certificateIncluded,
  invoiceIncluded: o.invoiceIncluded,
});
const initial = (o: OrderDetail): PackingForm => ({ packages: o.packages.length ? o.packages : [blankPackage()], ...shipmentFields(o) });

/**
 * Form state shared by the Packing and Shipment Details tabs. The two tabs are saved separately:
 * "Save Packing" stores only the packages (the day the order is packed), and "Save Shipment Details"
 * stores courier, waybill and the dispatch date (which can be days later). Both stay editable after dispatch.
 *
 * The order is refetched after every upload or save. A section the user has edited but not saved is
 * never overwritten by that refetch, so typed details are not lost while photos are being added.
 */
export function usePackingForm(order: OrderDetail, canEdit: boolean) {
  const { enqueueSnackbar } = useSnackbar();
  const [save, { isLoading }] = useSaveDispatchMutation();
  const [form, setForm] = React.useState<PackingForm>(() => initial(order));
  const [dirty, setDirty] = React.useState<Record<Section, boolean>>({ packing: false, shipment: false });
  const dirtyRef = React.useRef(dirty);
  dirtyRef.current = dirty;
  const [packingAttempted, setPackingAttempted] = React.useState(false);
  const [shipmentAttempted, setShipmentAttempted] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);
  const locked = !canEdit || !order.readyForPacking;

  React.useEffect(() => {
    const { packing, shipment } = dirtyRef.current;
    setForm((f) => ({ ...f, ...(packing ? {} : { packages: initial(order).packages }), ...(shipment ? {} : shipmentFields(order)) }));
  }, [order]);

  const touch = (section: Section) => setDirty((d) => ({ ...d, [section]: true }));
  const updatePacking = (packages: OrderPackage[]) => {
    touch('packing');
    setForm((f) => ({ ...f, packages }));
  };
  const update = (patch: Partial<ShipmentFields>) => {
    touch('shipment');
    setForm((f) => ({ ...f, ...patch }));
  };
  const setPackage = (index: number, patch: Partial<OrderPackage>) => updatePacking(form.packages.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  const addPackage = () => updatePacking([...form.packages, blankPackage()]);
  const removePackage = (index: number) => updatePacking(form.packages.filter((_, i) => i !== index));

  const packingMediaCount = order.media.filter((m) => m.kind === 'packing').length;
  const packageMissing = form.packages.some((p) => !p.packagingType);
  const courierMissing = !form.courier;
  const futureDispatch = Boolean(form.dispatchDate) && form.dispatchDate > todayDay();
  const packingSaved = order.packages.length > 0;
  const dispatched = Boolean(order.actualDispatchDate);

  const run = async (section: Section, changes: Parameters<typeof save>[0]['changes'], success: string) => {
    try {
      await save({ id: order.id, changes }).unwrap();
      setDirty((d) => ({ ...d, [section]: false }));
      enqueueSnackbar(success, { variant: 'success' });
      return true;
    } catch (e) {
      enqueueSnackbar(handleSubmitError(e), { variant: 'error' });
      return false;
    }
  };

  const savePacking = () => {
    setPackingAttempted(true);
    if (packageMissing) {
      enqueueSnackbar('Select a packaging type for every package.', { variant: 'warning' });
      return;
    }
    if (packingMediaCount === 0) {
      enqueueSnackbar('Upload at least one packing photo or video before saving.', { variant: 'warning' });
      return;
    }
    return run('packing', { packages: form.packages }, 'Packing saved. Continue to the Shipment Details tab when you are ready to ship.');
  };

  const requestShipment = () => {
    setShipmentAttempted(true);
    if (courierMissing) {
      enqueueSnackbar('Select the courier.', { variant: 'warning' });
      return;
    }
    if (futureDispatch) {
      enqueueSnackbar('Dispatch date cannot be in the future.', { variant: 'warning' });
      return;
    }
    if (dispatched && !form.dispatchDate) {
      enqueueSnackbar('The dispatch date cannot be removed once the order is dispatched.', { variant: 'warning' });
      return;
    }
    if (form.dispatchDate && !packingSaved) {
      enqueueSnackbar('Save the packing details (Packing tab) before dispatching.', { variant: 'warning' });
      return;
    }
    if (form.dispatchDate && packingMediaCount === 0) {
      enqueueSnackbar('Upload at least one packing photo or video (Packing tab) before dispatching.', { variant: 'warning' });
      return;
    }
    // The first dispatch changes the order status, so ask first. Later edits and saves without a date are plain saves.
    if (form.dispatchDate && !dispatched) setConfirming(true);
    else void saveShipment();
  };

  const saveShipment = async () => {
    setConfirming(false);
    await run(
      'shipment',
      {
        courier: form.courier as Courier,
        waybill: form.waybill.trim(),
        actualDispatchDate: form.dispatchDate || null,
        certificateIncluded: form.certificateIncluded,
        invoiceIncluded: form.invoiceIncluded,
      },
      form.dispatchDate ? (dispatched ? 'Shipment details updated.' : 'Order marked as Dispatched.') : 'Shipment details saved. Add the dispatch date once the order is shipped.',
    );
  };

  return {
    canEdit,
    form,
    update,
    setPackage,
    addPackage,
    removePackage,
    packingAttempted,
    shipmentAttempted,
    packageMissing,
    courierMissing,
    futureDispatch,
    packingMediaCount,
    packingSaved,
    packingDirty: dirty.packing,
    dispatched,
    locked,
    isLoading,
    confirming,
    setConfirming,
    savePacking,
    requestShipment,
    saveShipment,
  };
}
export type PackingCtl = ReturnType<typeof usePackingForm>;

export function PackingSaveBar({ ctl, onContinue }: { ctl: PackingCtl; onContinue: () => void }) {
  if (ctl.locked) return null;
  const canContinue = ctl.packingSaved && !ctl.packingDirty;
  return (
    <Stack direction="row" spacing={1.5} justifyContent="flex-end">
      <Button variant={canContinue ? 'outlined' : 'contained'} size="large" disabled={ctl.isLoading} onClick={ctl.savePacking}>
        Save Packing
      </Button>
      {canContinue && (
        <Button variant="contained" size="large" onClick={onContinue}>
          Continue to Shipment Details
        </Button>
      )}
    </Stack>
  );
}

export function ShipmentSaveBar({ ctl }: { ctl: PackingCtl }) {
  const firstDispatch = Boolean(ctl.form.dispatchDate) && !ctl.dispatched;
  return (
    <>
      {!ctl.locked && (
        <Stack direction="row" justifyContent="flex-end">
          <Button variant="contained" size="large" disabled={ctl.isLoading} onClick={ctl.requestShipment}>
            {firstDispatch ? 'Save & Mark as Dispatched' : 'Save Shipment Details'}
          </Button>
        </Stack>
      )}
      <ConfirmDialog
        open={ctl.confirming}
        title="Mark this order as Dispatched?"
        message="The order will be marked Dispatched. You can still edit the packing and shipment details afterwards."
        confirmLabel="Dispatch"
        busy={ctl.isLoading}
        onConfirm={ctl.saveShipment}
        onCancel={() => ctl.setConfirming(false)}
      />
    </>
  );
}
