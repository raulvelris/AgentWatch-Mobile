// IP de la PC en la red WiFi local.
// Usamos esta IP para TODAS las plataformas porque:
// - PC browser:    accede a 192.168.1.49:8000 (misma máquina, funciona)
// - Celular WiFi:  accede a 192.168.1.49:8000 (misma red, funciona)
// - NOTA: 127.0.0.1 en el celular apunta al PROPIO celular, no a la PC

export const API_BASE_URL = 'http://192.168.1.49:8000/api/v1';
