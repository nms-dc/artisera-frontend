'use client';

import { errorMessage } from '@/core/api/errors';
import * as React from 'react';
import { useFormik } from 'formik';
import NextLink from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSnackbar } from 'notistack';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import { loginSchema } from '@/lib/schemas/loginSchema';
import { useLoginMutation } from '../api';
import { useAuth } from '@/core/auth/useAuth';
import { safeNext } from '@/lib/safeNext';
import { clearLoggedOut } from '@/core/auth/session';

export default function LoginForm() {
  const [login, { isLoading }] = useLoginMutation();
  const { login: setAuthSession, user, ready } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const { enqueueSnackbar } = useSnackbar();
  const [formError, setFormError] = React.useState<string | null>(null);

  React.useEffect(() => {
    // The sign-out redirect has been handled; later visits while signed out should remember the page they asked for.
    clearLoggedOut();
  }, []);

  React.useEffect(() => {
    if (ready && user) router.replace(safeNext(params.get('next')));
  }, [ready, user, router, params]);

  const formik = useFormik({
    initialValues: { email: '', password: '' },
    validationSchema: loginSchema,
    onSubmit: async (values) => {
      setFormError(null);
      try {
        const signedIn = await login(values).unwrap();
        setAuthSession(signedIn);
        enqueueSnackbar(`Welcome back, ${signedIn.name.split(' ')[0]}`, { variant: 'success' });
        router.push(safeNext(params.get('next')));
      } catch (err) {
        setFormError(errorMessage(err) ?? 'Unable to sign in.');
      }
    },
  });

  return (
    <Paper elevation={0} sx={{ p: 4, width: 400, maxWidth: '90vw' }}>
      <Typography variant="h4" sx={{ mb: 0.5 }}>
        Sign in
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Artisera CRM — sign in to continue
      </Typography>
      {formError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {formError}
        </Alert>
      )}
      <Box component="form" onSubmit={formik.handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          name="email"
          label="Email"
          value={formik.values.email}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.touched.email && Boolean(formik.errors.email)}
          helperText={formik.touched.email && formik.errors.email}
        />
        <TextField
          name="password"
          type="password"
          label="Password"
          value={formik.values.password}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.touched.password && Boolean(formik.errors.password)}
          helperText={formik.touched.password && formik.errors.password}
        />
        <Button type="submit" variant="contained" size="large" disabled={isLoading}>
          {isLoading ? 'Signing in…' : 'Sign in'}
        </Button>
        <Link component={NextLink} href="/change-password" variant="body2" underline="hover" sx={{ alignSelf: 'center' }}>
          Change password
        </Link>
      </Box>
    </Paper>
  );
}
