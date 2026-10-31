# Épica: Combos con buscador interno

**Pedido (31/10/2026):** en el formulario Registrar/Editar bien, los combos de **Categoría** y **Unidad de medida**
deben tener un buscador interno para ubicar el ítem escribiendo.

## Contexto

- Hoy son `<select>` nativos (`Select` en `src/components/ui/form.tsx`), que no se pueden filtrar.
- La unidad de medida tiene 17 opciones en 4 grupos (`optgroup`); las categorías crecen con el uso.
- `Registro.tsx` registra los combos con react-hook-form (`register`) y, en Categoría, además dispara
  `alElegirCategoria` para sugerir el código de clasificación.

## Decisiones propuestas

1. Crear un componente propio `Combobox` en `src/components/ui/combobox.tsx` (sin librerías nuevas), con
   estilo igual al de `Input`/`Select`, teclado completo y soporte de grupos.
2. Integrarlo con react-hook-form mediante `Controller`; el valor guardado no cambia (id de categoría, `codigo` de unidad).
3. **Ubicación del bien** también lo usaría (mismo formulario, lista que crece por sede). Lo incluyo salvo que digas lo contrario.
4. Fuera de alcance: los `Select` de filtros (Listado, Usuarios) y los combos del ubigeo en Sedes.

## HU1. Componente Combobox reutilizable

Como usuario quiero escribir en el combo para filtrar las opciones y elegir una.

**Criterios de aceptación**
- Al enfocar o hacer clic se abre la lista; al escribir se filtra sin distinguir mayúsculas ni tildes.
- Flechas ↑/↓ navegan, Enter elige, Esc cierra, Tab sale sin cambiar el valor.
- Muestra "Sin resultados" si nada coincide; admite una opción vacía ("Sin categoría").
- Soporta grupos con título (tipos de unidad) y respeta `aria-invalid` y el estilo de error.
- Es accesible (`role="combobox"`, `aria-expanded`, `aria-activedescendant`, label vinculado por `htmlFor`).

**Tareas**
- [ ] Crear `src/components/ui/combobox.tsx` (props: `opciones`, `valor`, `onChange`, `placeholder`, `vacioLabel`, grupos opcionales).
- [ ] Función de normalización de texto (sin tildes) en `utils.ts`, si no existe.
- [ ] Cerrar al hacer clic fuera y al perder el foco.
- [ ] Lista con scroll máximo y resaltado de la opción activa.

## HU2. Categoría y Unidad de medida con buscador en el formulario de bien

**Criterios de aceptación**
- Categoría: filtra por nombre; al elegir se sigue sugiriendo el código `PREFIJO-NNN` si está vacío.
- Unidad de medida: filtra por código o nombre (ej. "kil" encuentra KG), agrupada por tipo.
- Al editar, se muestra el valor guardado; una unidad inactiva o fuera del catálogo se conserva como opción extra.
- La validación (unidad obligatoria) y el guardado siguen igual.

**Tareas**
- [ ] Reemplazar ambos `Select` en `src/pages/bienes/Registro.tsx` por `Combobox` con `Controller`.
- [ ] Mantener `alElegirCategoria` y la opción extra de unidad legada.
- [ ] Aplicar también a Ubicación (decisión 3).

## Riesgos

- Los valores de formulario son strings: el `Combobox` debe emitir el mismo formato que hoy (`''` para vacío).
- En móvil, el teclado puede tapar la lista: limitar su alto y abrirla hacia arriba si falta espacio.

## Verificación

- `npm run build` y `npm run lint` sin errores.
- Crear un bien eligiendo categoría y unidad por búsqueda; editar uno existente y comprobar que muestra el valor guardado.
- Probar solo con teclado y en el teléfono.
