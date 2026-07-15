/**
 * Notification — RF22 CA-01
 *
 * El campo `criticidad` es el nivel formal del RF22:
 *   - "CRITICAL" → fallo total / violación de política
 *   - "WARNING"  → degradación / 80% del budget
 *   - "INFO"     → tarea completada / reporte
 */
export interface Notification {
  id: number;
  tipo: 'promotion_pendiente' | 'promotion_expirada' | 'deploy_fallido';
  /** RF22 CA-01: nivel de criticidad formal */
  criticidad: 'CRITICAL' | 'WARNING' | 'INFO';
  destinatario_rol: string;
  mensaje: string;
  agent_id: string | null;
  fecha: string;
  leida: boolean;
}
