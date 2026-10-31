import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/components/AuthProvider'
import { AppLayout } from '@/components/layout/AppLayout'
import { RequireAuth } from '@/components/RequireAuth'
import { RequierePermiso } from '@/components/RequierePermiso'
import ConfirmarCorreo from '@/pages/ConfirmarCorreo'
import CrearCuenta from '@/pages/CrearCuenta'
import Dashboard from '@/pages/Dashboard'
import Login from '@/pages/Login'
import BienPorId from '@/pages/bienes/BienPorId'
import Escanear from '@/pages/bienes/Escanear'
import Etiquetas from '@/pages/bienes/Etiquetas'
import Listado from '@/pages/bienes/Listado'
import Registro from '@/pages/bienes/Registro'
import Reporte from '@/pages/bienes/Reporte'
import Categorias from '@/pages/configuracion/Categorias'
import UnidadesMedida from '@/pages/configuracion/UnidadesMedida'
import Sedes from '@/pages/configuracion/Sedes'
import Ubicaciones from '@/pages/configuracion/Ubicaciones'
import ListadoUsuarios from '@/pages/usuarios/Listado'
import RegistroUsuario from '@/pages/usuarios/Registro'
import Roles from '@/pages/usuarios/Roles'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="login" element={<Login />} />
          <Route path="crear-cuenta" element={<CrearCuenta />} />
          <Route path="confirmar-correo" element={<ConfirmarCorreo />} />
          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="bienes" element={<Listado />} />
              <Route path="reporte" element={<Reporte />} />
              <Route path="escanear" element={<Escanear />} />
              <Route path="bienes/:id" element={<BienPorId />} />
              <Route element={<RequierePermiso permiso="editarBienes" />}>
                <Route path="bienes/nuevo" element={<Registro />} />
                <Route path="bienes/etiquetas" element={<Etiquetas />} />
              </Route>
              <Route element={<RequierePermiso permiso="gestionarUsuarios" />}>
                <Route path="usuarios" element={<ListadoUsuarios />} />
                <Route path="usuarios/registro" element={<RegistroUsuario />} />
                <Route path="usuarios/:id" element={<RegistroUsuario />} />
              </Route>
              <Route element={<RequierePermiso permiso="gestionarUbicaciones" />}>
                <Route path="configuracion/ubicaciones" element={<Ubicaciones />} />
              </Route>
              <Route element={<RequierePermiso permiso="gestionarConfiguracion" />}>
                <Route path="usuarios/roles" element={<Roles />} />
                <Route path="configuracion/categorias" element={<Categorias />} />
                <Route path="configuracion/unidades-medida" element={<UnidadesMedida />} />
                <Route path="configuracion/sedes" element={<Sedes />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
