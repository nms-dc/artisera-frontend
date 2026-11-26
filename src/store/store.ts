import { configureStore } from '@reduxjs/toolkit';
import { apiSlice } from './apiSlice';

export const store = configureStore({
  reducer: { [apiSlice.reducerPath]: apiSlice.reducer },
  middleware: (getDefault) =>
    getDefault({
      serializableCheck: { ignoredActionPaths: ['meta.arg.originalArgs.file'], ignoredPaths: [`${apiSlice.reducerPath}.mutations`] },
    }).concat(apiSlice.middleware),
});
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
