# Guía: Asignar IP Elástica a Instancia EC2

## Problema Actual

- **Dominio:** `marsupia.online` → apunta a `3.148.116.136` ✓
- **Servidor:** tiene IP `3.17.73.92` ✗
- **www.marsupia.online:** apunta a `13.248.243.5` ✗

## Solución: Asignar IP Elástica

### Paso 1: Asignar IP Elástica en AWS

1. **Ve a la consola de AWS EC2:**
   - https://console.aws.amazon.com/ec2/

2. **En el menú lateral izquierdo, haz clic en "Elastic IPs"** (bajo "Network & Security")

3. **Busca la IP `3.148.116.136`** en la lista

4. **Selecciona la IP** (marca la casilla)

5. **Haz clic en "Actions"** (arriba) → **"Associate Elastic IP address"**

6. **En el formulario:**
   - **Resource type:** Instance
   - **Instance:** Selecciona tu instancia actual (la que tiene IP 3.17.73.92)
   - **Private IP address:** Déjalo en blanco (se asignará automáticamente)
   - **Allow Elastic IP to be reassociated:** Puedes marcarlo si quieres

7. **Haz clic en "Associate"**

8. **Espera unos segundos** para que se complete la asociación

### Paso 2: Verificar que la IP se Asignó

En tu servidor EC2, ejecuta:

```bash
# Verificar la nueva IP
curl ifconfig.me

# Debe mostrar: 3.148.116.136
```

O desde la consola de AWS, ve a tu instancia y verifica que la "Public IPv4 address" sea `3.148.116.136`.

### Paso 3: Corregir DNS de www.marsupia.online

El registro `www` está apuntando a `13.248.243.5` (probablemente Cloudflare). Necesitas corregirlo en GoDaddy:

1. **Inicia sesión en GoDaddy**

2. **Ve a "Mis Productos" → "DNS"**

3. **Busca el dominio `marsupia.online`**

4. **Busca el registro A para `www`** (o créalo si no existe)

5. **Configura:**
   - **Nombre:** `www`
   - **Valor:** `3.148.116.136` (la misma IP elástica)
   - **TTL:** 600 (o el valor por defecto)

6. **Guarda los cambios**

7. **Espera unos minutos** para que se propague el DNS

### Paso 4: Verificar DNS

Ejecuta nuevamente el script de verificación:

```bash
./verificar-dns.sh
```

Ahora debería mostrar:
- ✓ `marsupia.online` → `3.148.116.136`
- ✓ `www.marsupia.online` → `3.148.116.136`
- ✓ IP del servidor: `3.148.116.136`

### Paso 5: Obtener Certificados SSL

Una vez que todo esté correcto:

```bash
# Asegúrate de que nginx está detenido
docker compose -f ../../ops/docker-compose.prod.yml stop nginx

# Ejecuta el script
./setup-letsencrypt.sh nicolas-0413@hotmail.com
```

## Alternativa: Si No Puedes Asignar la IP Elástica

Si por alguna razón no puedes asignar la IP elástica, puedes actualizar el DNS para que apunte a la IP actual:

1. **En GoDaddy, actualiza el registro A:**
   - **Nombre:** `@` (o en blanco)
   - **Valor:** `3.17.73.92` (IP actual del servidor)

2. **Actualiza también www:**
   - **Nombre:** `www`
   - **Valor:** `3.17.73.92`

**⚠️ ADVERTENCIA:** Si usas esta opción, la IP puede cambiar si reinicias o detienes la instancia EC2. La IP elástica es más estable.

## Verificación Final

Después de asignar la IP elástica y actualizar el DNS, verifica:

```bash
# Desde tu servidor
curl ifconfig.me
# Debe mostrar: 3.148.116.136

# Verificar DNS
dig marsupia.online +short
# Debe mostrar: 3.148.116.136

dig www.marsupia.online +short
# Debe mostrar: 3.148.116.136

# Probar conectividad HTTP
curl -I http://marsupia.online
# Debe responder (aunque sea con error, está bien)
```

## Troubleshooting

### La IP elástica ya está asociada a otra instancia

Si la IP `3.148.116.136` ya está asociada a otra instancia:

1. Ve a Elastic IPs
2. Selecciona la IP
3. Actions → Disassociate Elastic IP address
4. Luego asóciala a tu instancia actual

### No puedo encontrar la IP elástica

Si no encuentras la IP elástica en la lista:

1. Ve a Elastic IPs
2. Haz clic en "Allocate Elastic IP address"
3. Selecciona "Amazon's pool of IPv4 addresses"
4. Asigna la IP a tu instancia
5. **IMPORTANTE:** Actualiza el DNS en GoDaddy para que apunte a la nueva IP

### El DNS no se actualiza

- Espera 5-15 minutos para la propagación DNS
- Usa `dig marsupia.online +short` para verificar
- Puede tardar hasta 48 horas en algunos casos

