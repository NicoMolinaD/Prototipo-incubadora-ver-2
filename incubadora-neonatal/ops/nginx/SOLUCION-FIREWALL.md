# Solución: Error de Timeout al Obtener Certificados SSL

## Problema

Al ejecutar `setup-letsencrypt.sh`, obtienes este error:
```
Timeout during connect (likely firewall problem)
```

Esto significa que Let's Encrypt no puede conectarse al puerto 80 de tu servidor.

## Solución Paso a Paso

### Paso 1: Verificar Security Group en AWS

El problema más común es que el **Security Group** de tu instancia EC2 no tiene abierto el puerto 80.

1. **Ve a la consola de AWS EC2:**
   - https://console.aws.amazon.com/ec2/

2. **Selecciona tu instancia EC2**

3. **Ve a la pestaña "Security"** (abajo en los detalles)

4. **Haz clic en el Security Group** (el enlace azul)

5. **Edita las reglas de entrada (Inbound rules):**

   Haz clic en "Edit inbound rules" y asegúrate de tener estas reglas:

   **Regla 1 - HTTP:**
   - **Type:** HTTP
   - **Protocol:** TCP
   - **Port range:** 80
   - **Source:** 0.0.0.0/0 (permite acceso desde cualquier IP)
   - **Description:** Allow HTTP for Let's Encrypt

   **Regla 2 - HTTPS:**
   - **Type:** HTTPS
   - **Protocol:** TCP
   - **Port range:** 443
   - **Source:** 0.0.0.0/0
   - **Description:** Allow HTTPS

6. **Guarda las reglas** (Save rules)

### Paso 2: Verificar Firewall del Sistema Operativo

Si estás usando Ubuntu/Debian, verifica el firewall:

```bash
# Verificar estado de UFW
sudo ufw status

# Si está activo, permitir puertos 80 y 443
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Verificar que se agregaron las reglas
sudo ufw status numbered
```

Si estás usando CentOS/RHEL con firewalld:

```bash
# Verificar estado
sudo firewall-cmd --state

# Permitir puertos
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

# Verificar
sudo firewall-cmd --list-services
```

### Paso 3: Verificar que Nginx está Detenido

Certbot necesita usar el puerto 80, así que nginx debe estar detenido:

```bash
# Verificar si nginx está corriendo
docker compose -f ops/docker-compose.prod.yml ps nginx

# Si está corriendo, detenerlo
docker compose -f ops/docker-compose.prod.yml stop nginx

# Verificar que el puerto 80 está libre
sudo netstat -tlnp | grep ':80 '
# No debe mostrar nada (o solo el proceso de certbot cuando lo ejecutes)
```

### Paso 4: Ejecutar Script de Diagnóstico

Antes de intentar obtener los certificados nuevamente, ejecuta el script de diagnóstico:

```bash
cd incubadora-neonatal/ops/nginx
chmod +x diagnose-ssl.sh
./diagnose-ssl.sh
```

Este script te ayudará a identificar exactamente dónde está el problema.

### Paso 5: Probar Conectividad desde Fuera

Desde tu computadora local (no desde el servidor), prueba:

```bash
# Probar acceso HTTP
curl -I http://marsupia.online

# O desde un navegador, simplemente abre:
# http://marsupia.online
```

Si no puedes acceder, el problema está en el Security Group o firewall.

### Paso 6: Obtener Certificados Nuevamente

Una vez que hayas verificado todo:

```bash
cd incubadora-neonatal/ops/nginx

# Asegúrate de que nginx está detenido
docker compose -f ../../ops/docker-compose.prod.yml stop nginx

# Ejecuta el script
./setup-letsencrypt.sh tu-email@ejemplo.com
```

## Verificación Rápida

Ejecuta estos comandos en tu servidor EC2 para verificar rápidamente:

```bash
# 1. Verificar que el puerto 80 está escuchando (después de iniciar certbot)
sudo netstat -tlnp | grep ':80 '

# 2. Verificar conectividad desde el servidor mismo
curl -I http://marsupia.online

# 3. Verificar DNS
dig marsupia.online +short
# Debe mostrar: 3.148.116.136

# 4. Verificar IP pública del servidor
curl ifconfig.me
# Debe mostrar: 3.148.116.136
```

## Solución Alternativa: Usar Certbot con Nginx Plugin

Si sigues teniendo problemas con el modo standalone, puedes usar el plugin de nginx (pero requiere más configuración):

```bash
# Primero, asegúrate de que nginx está corriendo con una configuración básica
# Luego usa:
sudo certbot --nginx -d marsupia.online -d www.marsupia.online
```

**Nota:** Este método requiere que nginx esté corriendo y configurado correctamente.

## Checklist Final

Antes de ejecutar `setup-letsencrypt.sh`, verifica:

- [ ] Security Group tiene puerto 80 abierto (0.0.0.0/0)
- [ ] Security Group tiene puerto 443 abierto (0.0.0.0/0)
- [ ] Firewall del sistema permite puertos 80 y 443
- [ ] Nginx está detenido
- [ ] DNS apunta a 3.148.116.136
- [ ] Puedes acceder a http://marsupia.online desde fuera del servidor

## Si Nada Funciona

1. **Verifica los logs de certbot:**
   ```bash
   sudo tail -f /var/log/letsencrypt/letsencrypt.log
   ```

2. **Intenta con más verbosidad:**
   ```bash
   sudo certbot certonly --standalone \
       --verbose \
       --email tu-email@ejemplo.com \
       -d marsupia.online \
       -d www.marsupia.online
   ```

3. **Verifica que no hay otro proceso usando el puerto 80:**
   ```bash
   sudo lsof -i :80
   sudo lsof -i :443
   ```

4. **Prueba desde otra ubicación:**
   - Usa un servicio como https://www.yougetsignal.com/tools/open-ports/
   - Verifica que el puerto 80 está abierto desde internet

