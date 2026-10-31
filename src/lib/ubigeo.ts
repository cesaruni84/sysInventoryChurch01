import { useQuery } from '@tanstack/react-query'

// Departamentos, provincias y distritos del Perú (ubigeo INEI, 25 / 196 / 1893), en
// ubigeo-peru.json. Se generó del CSV de github.com/jmcastagnetto/ubigeo-peru-aumentado.
// Los nombres van en mayúsculas y sin tildes, como en el INEI.

/** { DEPARTAMENTO: { PROVINCIA: [DISTRITO, ...] } }, en orden alfabético. */
export type Ubigeo = Record<string, Record<string, string[]>>

/** Carga el ubigeo bajo demanda (~26 kB) para no sumarlo al bundle principal. */
export function useUbigeo() {
  return useQuery({
    queryKey: ['ubigeo'],
    queryFn: async () => (await import('./ubigeo-peru.json')).default as Ubigeo,
    staleTime: Infinity,
  })
}
