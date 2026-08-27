import { usePermix } from "permix/vue";

import { permix } from "../lib/permix";

export function usePermissions() {
  return usePermix(permix);
}
