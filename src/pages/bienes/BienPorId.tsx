import { Navigate, useParams } from 'react-router-dom'
import { usePermisos } from '@/lib/permisos'
import Registro from './Registro'

/**
 * /bienes/:id es el destino del QR de las etiquetas. Quien puede editar abre el formulario;
 * Revisor y Aprobador (solo lectura) van a la ficha de la pantalla de escaneo.
 */
export default function BienPorId() {
  const { id } = useParams()
  const { editarBienes } = usePermisos()
  return editarBienes ? <Registro /> : <Navigate to={`/escanear?bien=${id ?? ''}`} replace />
}
