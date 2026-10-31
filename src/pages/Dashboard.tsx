import type { ComponentType } from 'react'
import { Link } from 'react-router-dom'
import { Boxes, Coins, MapPin, Package } from 'lucide-react'
import { EstadoBadge } from '@/components/EstadoBadge'
import { PageHeader } from '@/components/layout/AppLayout'
import { Cargando, ErrorCarga } from '@/components/QueryState'
import { buttonClass } from '@/components/ui/button-variants'
import { Card, CardTitle } from '@/components/ui/card'
import { Table, Td, Th } from '@/components/ui/table'
import { resumen, useBienes, type Estado } from '@/lib/bienes'
import { useSedeActiva } from '@/lib/auth-context'
import { formatFecha, formatMoneda } from '@/lib/utils'

function Kpi({ label, value, icon: Icon }: { label: string; value: string | number; icon: ComponentType<{ className?: string }> }) {
  return (
    <Card>
      <div className="flex items-start justify-between text-sm text-muted">
        {label}
        <Icon className="size-4" />
      </div>
      <p className="mt-4 font-serif text-3xl font-semibold">{value}</p>
    </Card>
  )
}

export default function Dashboard() {
  const { data: bienes, isPending, isError, error } = useBienes()
  const sede = useSedeActiva()

  if (isPending) return <Cargando />
  if (isError) return <ErrorCarga error={error} />

  const r = resumen(bienes)
  const ultimos = [...bienes].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5)

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Resumen del inventario de bienes y enseres de la sede." />

      <div className="mb-6 flex items-center gap-4 rounded-xl bg-boton px-5 py-4 text-white">
        <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-white/15">
          <MapPin className="size-6" />
        </span>
        <div className="min-w-0">
          <p className="text-xs tracking-wider text-white/70 uppercase">Sede</p>
          <p className="truncate font-serif text-2xl font-semibold">{sede.nombre}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Bienes registrados" value={r.registrados} icon={Package} />
        <Kpi label="Unidades totales" value={r.unidades} icon={Boxes} />
        <Kpi label="Valor total" value={formatMoneda(r.valor)} icon={Coins} />
        <Kpi label="Ubicaciones" value={r.ubicaciones} icon={MapPin} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_2fr]">
        <Card>
          <CardTitle>Estado de los bienes</CardTitle>
          <ul className="mt-5 flex flex-col gap-4">
            {(['B', 'R', 'M'] as Estado[]).map((e) => {
              const n = r.porEstado[e]
              const pct = r.registrados ? Math.round((n / r.registrados) * 100) : 0
              return (
                <li key={e} className="flex items-center justify-between gap-3">
                  <EstadoBadge estado={e} />
                  <span className="text-sm">
                    <span className="font-semibold">{n}</span>
                    <span className="ml-2 text-muted">{pct}%</span>
                  </span>
                </li>
              )
            })}
          </ul>
        </Card>

        <Card className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Últimos bienes registrados</CardTitle>
            <Link to="/bienes" className={buttonClass('outline', 'sm')}>
              Ver listado completo
            </Link>
          </div>
          {ultimos.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">
              Aún no hay bienes.{' '}
              <Link to="/bienes/nuevo" className="font-medium text-primary underline">
                Registra el primero
              </Link>
              .
            </p>
          ) : (
            <Table className="mt-4">
              <thead>
                <tr>
                  <Th>N°</Th>
                  <Th>Descripción</Th>
                  <Th>Ubicación</Th>
                  <Th>Fecha adq.</Th>
                  <Th>Estado</Th>
                  <Th className="text-right">Valor unit.</Th>
                </tr>
              </thead>
              <tbody>
                {ultimos.map((b) => (
                  <tr key={b.id}>
                    <Td>{b.id}</Td>
                    <Td>
                      <Link to={`/bienes/${b.id}`} className="hover:underline">
                        {b.descripcion}
                      </Link>
                    </Td>
                    <Td>{b.ubicacion}</Td>
                    <Td className="whitespace-nowrap">{formatFecha(b.fecha_adquisicion)}</Td>
                    <Td>
                      <EstadoBadge estado={b.estado} />
                    </Td>
                    <Td className="text-right whitespace-nowrap">{formatMoneda(b.valor_unitario)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </>
  )
}
