import * as Yup from 'yup';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const changePasswordSchema = Yup.object({
  email: Yup.string().email('Enter a valid email').required('Email is required'),
  currentPassword: Yup.string().required('Current password is required'),
  newPassword: Yup.string()
    .min(PASSWORD_MIN_LENGTH, `Minimum ${PASSWORD_MIN_LENGTH} characters`)
    .max(PASSWORD_MAX_LENGTH, `Maximum ${PASSWORD_MAX_LENGTH} characters`)
    .notOneOf([Yup.ref('currentPassword')], 'New password must be different from the current one')
    .required('New password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('newPassword')], 'Passwords do not match')
    .required('Confirm your new password'),
});

export type ChangePasswordValues = Yup.InferType<typeof changePasswordSchema>;
