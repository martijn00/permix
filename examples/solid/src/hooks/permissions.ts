import { usePermix } from 'permix/solid';

import { permix } from '../lib/permix';

export function usePermissions() {
  return usePermix(permix);
}
