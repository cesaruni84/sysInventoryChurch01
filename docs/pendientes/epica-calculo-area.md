# Épica: Cálculo de área (largo × ancho) en el formulario de bien

**Pedido (31/10/2026):** al registrar un bien medido en longitudes, poder multiplicar para obtener la cantidad.

## Decisiones tomadas

- Se multiplica **largo × ancho = área** (ej. 4 m × 2.5 m = 10 m²).
- El resultado **llena el campo Cantidad**; no se guardan largo ni ancho (sin migración, sin cambios en reporte ni Excel).

## Contexto

- El catálogo `unidades_medida` (`0018`) tiene una sola unidad de superficie: **MTK · Metro cuadrado**
  (MTR y CMT son longitudes lineales).
- `cantidad` es hoy un entero (`z.number().int().min(1)`) y el valor total es `cantidad × valor_unitario`.
  Un área como 10.5 m² no cabe: hay que decidir cómo tratarla (ver Decisiones abiertas).

## Decisiones abiertas

1. **Decimales en Cantidad.** Para MTK, ¿permitir decimales (10.5 m²)? Requiere cambiar `bienes.cantidad`
   de entero a `numeric` (migración `0019`), el esquema zod y revisar Reporte/Excel/Etiquetas
   (copias por defecto = `cantidad`). Alternativa sin migración: redondear el área al entero más cercano.
2. **Dónde se activa.** Solo para MTK (propuesto), o también una calculadora genérica para MTR/CMT.

## HU1. Calculadora de área al elegir metro cuadrado

Como encargado quiero ingresar largo y ancho para que el sistema calcule la cantidad en m².

**Criterios de aceptación**
- Al elegir la unidad MTK aparece una fila "Largo (m) × Ancho (m) = Área" junto a Cantidad.
- Al escribir largo y ancho, Cantidad se actualiza con el producto; el Valor total se recalcula.
- Para otras unidades la fila no aparece y el formulario se comporta como hoy.
- Al editar un bien MTK la cantidad guardada se conserva (largo y ancho no se guardan y parten vacíos).
- Validación: largo y ancho > 0; el producto debe cumplir el mínimo de Cantidad.

**Tareas**
- [ ] Resolver la decisión abierta 1 (y, si aplica, migración `0019` y ajustes de `Bien`, zod y renderers).
- [ ] Campos auxiliares `largo` y `ancho` en `Registro.tsx` fuera del esquema guardado (estado local).
- [ ] Mostrar la fila solo si `unidad_medida === 'MTK'` (por código, constante en `src/lib/unidades.ts`).
- [ ] Calcular y escribir en `cantidad` con `setValue(..., { shouldValidate: true })`.
- [ ] Probar: crear MTK con 4 × 2.5, editar, cambiar a otra unidad y volver.

## Riesgos

- Si Cantidad sigue entera, el área se redondea y el usuario podría no notarlo: mostrar el valor exacto junto al campo.
- Cambiar `cantidad` a decimal afecta el copiado de etiquetas y los totales del reporte.

## Verificación

- `npm run build` y `npm run lint` sin errores.
- Registrar y editar un bien MTK; confirmar Cantidad, Valor total y que el Reporte coincide.
