// Infra (merge agent owns). Expo inlines EXPO_PUBLIC_* at build time.
export const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCKS === '1';
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
