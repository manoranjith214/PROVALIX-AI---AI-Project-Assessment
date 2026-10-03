import { StorageProvider } from './StorageProvider.interface';
import { LocalStorageProvider, defaultStorageProvider } from './LocalStorageProvider';
import { SupabaseStorageProvider } from './SupabaseStorageProvider';
import { config } from '../../config/env';

let activeStorageProvider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (activeStorageProvider) {
    return activeStorageProvider;
  }

  const requestedDriver = (config.storage.driver || '').toLowerCase();
  const isProduction = config.nodeEnv === 'production';

  if (requestedDriver === 'supabase' || (isProduction && requestedDriver !== 'local')) {
    activeStorageProvider = new SupabaseStorageProvider();
  } else {
    activeStorageProvider = new LocalStorageProvider();
  }

  return activeStorageProvider;
}

export function resetStorageProvider(): void {
  activeStorageProvider = null;
}

export {
  StorageProvider,
  LocalStorageProvider,
  SupabaseStorageProvider,
  defaultStorageProvider,
};
