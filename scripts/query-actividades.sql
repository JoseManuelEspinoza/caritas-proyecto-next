SELECT
  p.nombre AS parroquia,
  ap."idTipoActividadPreventiva" AS tipo,
  ap."estadoActividad" AS estado,
  ap."fechaRegistro"::date AS fecha
FROM actividad_preventiva ap
LEFT JOIN parroquia p ON p."idParroquia" = ap."idParroquia"
ORDER BY p.nombre, ap."fechaRegistro" DESC;
