import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/AppLayout'
import { Cargando, ErrorCarga } from '@/components/QueryState'
import { Button } from '@/components/ui/button'
import { buttonClass } from '@/components/ui/button-variants'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input, Select } from '@/components/ui/form'
import { Table, Td, Th } from '@/components/ui/table'
import { useToast } from '@/components/ui/toast-context'
import { useAuth } from '@/lib/auth-context'
import { mensajeError } from '@/lib/bienes'
import { usePermisos } from '@/lib/permisos'
import { useRoles } from '@/lib/roles'
import { FUNCIONES, nombreCompleto, useEliminarUsuario, useUsuarios, type Usuario } from '@/lib/usuarios'

const POR_PAGINA = 10
/** Valor del filtro de función para los usuarios que no tienen una. */
const SIN_FUNCION = 'sin-funcion'

export default function ListadoUsuarios() {
  const { data: usuarios, isPending, isError, error } = useUsuarios()
  const { data: roles = [] } = useRoles()
  const { esAdmin, eliminarUsuarios } = usePermisos()
  const { session } = useAuth()
  const notificar = useToast()
  const eliminar = useEliminarUsuario()
  const [aEliminar, setAEliminar] = useState<Usuario | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [rolId, setRolId] = useState('')
  const [funcion, setFuncion] = useState('')
  const [pagina, setPagina] = useState(1)

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return (usuarios ?? []).filter(
      (u) =>
        (!rolId || String(u.rol_id) === rolId) &&
        (!funcion || (funcion === SIN_FUNCION ? u.funcion === null : u.funcion === funcion)) &&
        (!q || [nombreCompleto(u), u.email, u.telefono].some((v) => v?.toLowerCase().includes(q))),
    )
  }, [usuarios, busqueda, rolId, funcion])

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const visibles = filtrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA)

  async function confirmarEliminar() {
    if (!aEliminar) return
    try {
      await eliminar.mutateAsync(aEliminar)
      notificar('Usuario eliminado.')
    } catch (e) {
      notificar(mensajeError(e), 'error')
    } finally {
      setAEliminar(null)
    }
  }

  return (
    <>
      <PageHeader
        title="Listado de usuarios"
        subtitle="Personas con acceso al sistema de inventario."
        actions={
          <Link to="/usuarios/registro" className={buttonClass()}>
            <Plus className="size-4" /> Registrar usuario
          </Link>
        }
      />

      <Card className="p-0">
        <div className="flex flex-wrap gap-3 border-b border-border p-4">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <Input
              className="pl-9"
              placeholder="Buscar por nombre, email o teléfono"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value)
                setPagina(1)
              }}
              aria-label="Buscar"
            />
          </div>
          <Select
            className="w-auto min-w-40"
            value={rolId}
            onChange={(e) => {
              setRolId(e.target.value)
              setPagina(1)
            }}
            aria-label="Rol"
          >
            <option value="">Todos los roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </Select>
          <Select
            className="w-auto min-w-40"
            value={funcion}
            onChange={(e) => {
              setFuncion(e.target.value)
              setPagina(1)
            }}
            aria-label="Función"
          >
            <option value="">Todas las funciones</option>
            {FUNCIONES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
            <option value={SIN_FUNCION}>Sin función</option>
          </Select>
        </div>

        {isPending ? (
          <Cargando />
        ) : isError ? (
          <div className="p-4">
            <ErrorCarga error={error} />
          </div>
        ) : filtrados.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted">
            {usuarios.length === 0 ? 'Aún no hay usuarios registrados.' : 'Ningún usuario coincide con la búsqueda.'}
          </p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Nombres</Th>
                <Th>Email</Th>
                <Th>Teléfono</Th>
                <Th>Rol</Th>
                <Th>Función</Th>
                <Th>Sede</Th>
                <Th className="sr-only">Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((u) => (
                <tr key={u.id} className="hover:bg-background">
                  <Td className="font-medium">{nombreCompleto(u) || <span className="text-muted">Sin nombre</span>}</Td>
                  <Td>{u.email}</Td>
                  <Td className="whitespace-nowrap">{u.telefono}</Td>
                  <Td>
                    {u.roles ? (
                      <span className="rounded bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">{u.roles.nombre}</span>
                    ) : (
                      <span className="text-xs text-muted">Sin rol</span>
                    )}
                  </Td>
                  <Td>{u.funcion ?? <span className="text-xs text-muted">Sin función</span>}</Td>
                  <Td>{u.lugares?.nombre}</Td>
                  <Td>
                    {/* Solo un Administrador edita a otro Administrador. */}
                    {(esAdmin || u.roles?.codigo !== 'admin') && (
                      <div className="flex justify-end">
                        <Link to={`/usuarios/${u.id}`} className={buttonClass('ghost', 'icon')} aria-label={`Editar ${nombreCompleto(u) || u.email}`}>
                          <Pencil className="size-4" />
                        </Link>
                        {eliminarUsuarios && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-malo"
                            onClick={() => setAEliminar(u)}
                            disabled={u.id === session?.user.id}
                            title={u.id === session?.user.id ? 'No puedes eliminar tu propio usuario' : undefined}
                            aria-label={`Eliminar ${nombreCompleto(u) || u.email}`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        {filtrados.length > 0 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted">
            <span>
              {filtrados.length} {filtrados.length === 1 ? 'usuario' : 'usuarios'}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" disabled={paginaActual <= 1} onClick={() => setPagina(paginaActual - 1)} aria-label="Página anterior">
                <ChevronLeft className="size-4" />
              </Button>
              <span>
                Página {paginaActual} de {totalPaginas}
              </span>
              <Button variant="outline" size="icon" disabled={paginaActual >= totalPaginas} onClick={() => setPagina(paginaActual + 1)} aria-label="Página siguiente">
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={aEliminar !== null}
        title="Eliminar usuario"
        loading={eliminar.isPending}
        onConfirm={confirmarEliminar}
        onCancel={() => setAEliminar(null)}
      >
        ¿Seguro que deseas eliminar a <strong>{aEliminar && nombreCompleto(aEliminar)}</strong> ({aEliminar?.email})? Se borrará su cuenta de
        acceso y ya no podrá ingresar. Esta acción no se puede deshacer.
      </ConfirmDialog>
    </>
  )
}
