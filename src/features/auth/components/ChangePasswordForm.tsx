'use client';

import * as React from 'react';
import { useFormik } from 'formik';
import { useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import Box from '@mui/material/Box';
import TextField, { type TextFieldProps } from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Iconify from '@/core/ui/Iconify';
import { changePasswordSchema, PASSWORD_MIN_LENGTH } from '@/lib/schemas/changePasswordSchema';
import { handleSubmitError } from '@/core/ui/forms';
import { useAuth } from '@/core/auth/useAuth';
import { DEFAULT_USER_PASSWORD } from '@/core/auth/constants';
import { useChangePasswordMutation } from '../api';

function PasswordField(props: TextFieldProps) {
  const [visible, setVisible] = React.useState(false);
  return (
    <TextField
      autoComplete="new-password"
      {...props}
      type={visible ? 'text' : 'password'}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton edge="end" size="small" aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible((v) => !v)}>
              <Iconify icon={visible ? 'mdi:eye-off-outline' : 'mdi:eye-outline'} width={20} />
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );
}

export default function ChangePasswordForm() {
  const [changePassword, { isLoading }] = useChangePasswordMutation();
  const { user, logout } = useAuth();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const [formError, setFormError] = React.useState<string | null>(null);
  const forced = Boolean(user?.mustChangePassword);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: { email: user?.email ?? '', currentPassword: DEFAULT_USER_PASSWORD, newPassword: '', confirmPassword: '' },
    validationSchema: changePasswordSchema,
    onSubmit: async (values) => {
      setFormError(null);
      try {
        await changePassword(values).unwrap();
        enqueueSnackbar('Password changed. Please sign in with your new password.', { variant: 'success' });
        if (user) await logout();
        else router.replace('/login');
      } catch (err) {
        setFormError(handleSubmitError(err, formik.setErrors));
      }
    },
  });

  const fieldProps = (name: 'currentPassword' | 'newPassword' | 'confirmPassword', label: string): TextFieldProps => ({
    name,
    label,
    value: formik.values[name],
    onChange: formik.handleChange,
    onBlur: formik.handleBlur,
    error: formik.touched[name] && Boolean(formik.errors[name]),
    helperText: (formik.touched[name] && formik.errors[name]) || (name === 'newPassword' ? `Minimum ${PASSWORD_MIN_LENGTH} characters` : undefined),
  });

  return (
    <Paper elevation={0} sx={{ p: 4, width: 400, maxWidth: '90vw' }}>
      <Typography variant="h4" sx={{ mb: 0.5 }}>
        Change password
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {forced ? 'For security, set a new password before you continue.' : 'Set a new password for your Artisera CRM account.'}
      </Typography>
      {formError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {formError}
        </Alert>
      )}
      <Box component="form" noValidate onSubmit={formik.handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          name="email"
          label="Email"
          autoComplete="username"
          value={formik.values.email}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.touched.email && Boolean(formik.errors.email)}
          helperText={formik.touched.email && formik.errors.email}
          InputProps={{ readOnly: Boolean(user) }}
        />
        <PasswordField {...fieldProps('currentPassword', 'Current password')} autoComplete="current-password" />
        <PasswordField {...fieldProps('newPassword', 'New password')} />
        <PasswordField {...fieldProps('confirmPassword', 'Confirm password')} />
        <Stack direction="row" spacing={1.5}>
          {!forced && (
            <Button variant="outlined" size="large" fullWidth disabled={isLoading} onClick={() => router.push(user ? '/dashboard' : '/login')}>
              {user ? 'Cancel' : 'Back to sign in'}
            </Button>
          )}
          <Button type="submit" variant="contained" size="large" fullWidth disabled={isLoading}>
            {isLoading ? 'Saving…' : 'Change password'}
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
}
