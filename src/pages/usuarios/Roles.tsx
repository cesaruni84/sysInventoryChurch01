import { useState, type FormEvent } from 'react'
import { Check, Pencil, X } from 'lucide-react'
import { PageHeader } from '@/components/layout/AppLayout'
import { Cargando, ErrorCarga } from '@/components/QueryState'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/form'
import { Table, Td, Th } from '@/components/ui/table'
import { useToast } from '@/components/ui/toast-context'
import { mensajeError } from '@/lib/bienes'
import { useActualizarRol, useRoles } from '@/lib/roles'
import { useUsuarios } from '@/lib/usuarios'

export default function Roles() {
  const { data: roles, isPending, isError, error } = useRoles()
  const { data: usuarios = [] } = useUsuarios()
  const actualizar = useActualizarRol()
  const notificar = useToast()
  const [editando, setEditando] = useState<{ id: number; nombre: string; descripcion: string } | null>(null)

  const usuariosPorRol = (id: number) => usuarios.filter((u) => u.rol_id === id).length

  async function guardar(e: FormEvent) {
    e.preventDefault()
    if (!editando) return
    const nombre = editando.nombre.trim()
    if (!nombre) return
    try {
      await actualizar.mutateAsync({ id: editando.id, nombre, descripcion: editando.descripcion.trim() || null })
      setEditando(null)
      notificar('Rol actualizado.')
    } catch (err) {
      notificar(mensajeError(err), 'error')
    }
  }

  return (
    <>
      <PageHeader
        title="Roles"
        subtitle="Roles del sistema. Puedes cambiar su nombre y descripción; los permisos de cada rol son fijos. Solo el Administrador accede a todas las sedes."
      />

      <Card className="max-w-4xl p-0">
        {isPending ? (
          <Cargando />
        ) : isError ? (
          <div className="p-4">
            <ErrorCarga error={error} />
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th className="w-12">N°</Th>
                <Th>Rol</Th>
                <Th>Qué puede hacer</Th>
                <Th className="text-right">Usuarios</Th>
                <Th className="sr-only">Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {roles.map((r, i) =>
                editando?.id === r.id ? (
                  <tr key={r.id}>
                    <Td className="text-muted">{i + 1}</Td>
                    <Td colSpan={4}>
                      <form onSubmit={guardar} className="flex flex-wrap items-center gap-2">
                        <Input
                          autoFocus
                          className="h-8 w-48"
                          value={editando.nombre}
                          maxLength={60}
                          onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
                          onKeyDown={(e) => e.key === 'Escape' && setEditando(null)}
                          aria-label="Nombre del rol"
                        />
                        <Input
                          className="h-8 min-w-64 flex-1"
                          value={editando.descripcion}
                          maxLength={200}
                          placeholder="Descripción"
                          onChange={(e) => setEditando({ ...editando, descripcion: e.target.value })}
                          onKeyDown={(e) => e.key === 'Escape' && setEditando(null)}
                          aria-label="Descripción del rol"
                        />
                        <Button type="submit" variant="ghost" size="icon" disabled={actualizar.isPending} aria-label="Guardar">
                          <Check className="size-4 text-bueno" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setEditando(null)} aria-label="Cancelar">
                          <X className="size-4" />
                        </Button>
                      </form>
                    </Td>
                  </tr>
                ) : (
                  <tr key={r.id}>
                    <Td className="text-muted">{i + 1}</Td>
                    <Td className="font-medium">{r.nombre}</Td>
                    <Td className="text-muted">{r.descripcion}</Td>
                    <Td className="text-right">{usuariosPorRol(r.id)}</Td>
                    <Td>
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditando({ id: r.id, nombre: r.nombre, descripcion: r.descripcion ?? '' })}
                          aria-label={`Editar ${r.nombre}`}
                        >
                          <Pencil className="size-4" />
                        </Button>
                      </div>
                    </Td>
                  </tr>
                ),
              )}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  )
}
