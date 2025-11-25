# Guía de Despliegue Pt.1  
**Instancia EC2 + Dominio GoDaddy + Acceso SSH + Instalación de Git y Docker**

---

## 1. Creación y configuración de la nube (AWS)

### 1.1. Crear la instancia EC2

1. Entra a la consola de **AWS**:  
   https://console.aws.amazon.com
2. Verifica que estás en la **región** correcta (ej: `us-east-1`).
3. Ve al servicio **EC2 → Instances → Launch instance**.
4. Completa el asistente:

   **a) Nombre**
   - `Nombre de la instancia`: algo descriptivo, por ejemplo: `marsupia-prod`.

   **b) Imagen de máquina (AMI)**
   - Selecciona: **Ubuntu Server 22.04 LTS (x86_64)**.

   **c) Tipo de instancia**
   - Para pruebas: `t2.micro` o `t3.micro` (si tienes capa gratuita).

   **d) Par de claves (Key pair)**
   - Opción **Create new key pair** si no tienes uno.
   - Tipo: `RSA`.
   - Nombre: por ejemplo `marsupia-key`.
   - Descarga el archivo `marsupia-key.pem` y guárdalo en un lugar seguro.  
     > **IMPORTANTE:** sin este `.pem` no podrás entrar por SSH.

   **e) Network settings (seguridad y red)**  
   Crea un nuevo **Security Group** o usa uno existente, pero asegúrate de:

   - **SSH (TCP 22)**:  
     - Source: tu IP (`My IP`) o `0.0.0.0/0` (solo para pruebas; menos seguro).
   - **HTTP (TCP 80)**:  
     - Source: `0.0.0.0/0`.
   - **HTTPS (TCP 443)**:  
     - Source: `0.0.0.0/0`.

   **f) Storage**
   - 20 GB en gp3/gp2 suele ser suficiente para proyectos pequeños.

5. Haz clic en **Launch instance**.

---

### 1.2. Asignar una Elastic IP (IP fija)

Si no haces esto, cada vez que apagues/prendas la instancia la IP pública cambiará.

1. En el menú de EC2, ve a **Elastic IPs**.
2. Clic en **Allocate Elastic IP address** → **Allocate**.
3. Selecciona la IP elástica creada.
4. Clic en **Actions → Associate Elastic IP address**.
5. Configura:

   - **Resource type**: `Instance`.
   - **Instance**: selecciona tu instancia (ej: `marsupia-prod`).
   - **Private IP**: deja la que aparece por defecto (IP privada principal).
   - Marca **Allow this Elastic IP address to be reassociated**.

6. Clic en **Associate**.

> A partir de ahora tu instancia tendrá **SIEMPRE la misma IP pública** (la Elastic IP).

---

## 2. Configuración con GoDaddy (vincular dominio y DNS)

### 2.1. Obtener la Elastic IP

1. En **EC2 → Instances**, selecciona tu instancia.
2. En los detalles, busca **Public IPv4 address**:  
   - Ejemplo: `3.148.116.136`  
   (esta es la IP que vas a usar en GoDaddy).

### 2.2. Configurar registros DNS en GoDaddy

Suponiendo que tu dominio es: `tudominio.com`

1. Entra a tu cuenta de **GoDaddy**.
2. Ve a **My Products → Domain → DNS / Manage DNS**.
3. En la sección **Records**, configura:

#### a) Registro A para el dominio raíz

- **Type**: `A`
- **Name**: `@`
- **Value**: la **Elastic IP** de tu instancia (ej: `3.148.116.136`)
- **TTL**: `1/2 hour` o `600 seconds`.

Este registro hace que `tudominio.com` apunte directamente a tu instancia EC2.

#### b) CNAME para `www`

Busca si ya existe un registro con **Name = www**:

- Si existe: **edítalo**.
- Si no existe: crea uno nuevo con “Add Record”.

Configúralo así:

- **Type**: `CNAME`
- **Name**: `www`
- **Value**: `@`  (o directamente `tudominio.com`)
- **TTL**: `1/2 hour`.

Con esto:

- `tudominio.com` → IP de tu EC2.
- `www.tudominio.com` → `tudominio.com` → IP de tu EC2.

#### c) Desactivar redirecciones/constructores de GoDaddy

Al final de la página de DNS revisa:

- Si hay **Forwarding / Redirección de dominio**, elimínalo.
- Si el dominio está ligado a un **Website Builder** de GoDaddy, quita esa asociación (para que sólo se usen tus DNS).

> Los cambios pueden tardar varios minutos en propagarse.  
> Puedes probar desde el navegador o con `ping tudominio.com` para ver cuándo resuelve a la Elastic IP.

---

## 3. Pasos para poder ingresar a la instancia (SSH)

### 3.1. Dar permisos correctos al archivo `.pem` (Linux / macOS / WSL)

1. Copia tu archivo `marsupia-key.pem` a una carpeta segura, por ejemplo:

   ```bash
   mkdir -p ~/.ssh
   mv /ruta/donde/descargaste/marsupia-key.pem ~/.ssh/


2. Ajusta los permisos del archivo (solo lectura para tu usuario):

    chmod 400 ~/.ssh/marsupia-key.pem

   Esto evita el error de `permissions are too open` al usar SSH.

---

### 3.2. Conectarse por SSH desde Linux / macOS / WSL

1. Abre una terminal en tu sistema (Linux, macOS o WSL).

2. Conéctate a la instancia usando la Elastic IP:

    ssh -i ~/.ssh/marsupia-key.pem ubuntu@IP_ELASTICA
    # Ejemplo:
    # ssh -i ~/.ssh/marsupia-key.pem ubuntu@3.148.116.136

3. La primera vez, el sistema preguntará si confías en la huella del servidor:

    Are you sure you want to continue connecting (yes/no/[fingerprint])?

   Escribe:

    yes

   y presiona **Enter**.

4. Si la conexión es correcta, verás un prompt similar a:

    ubuntu@ip-172-31-xx-yy:~$

   Esto indica que ya estás dentro de la instancia EC2.

---

### 3.3. Conectarse por SSH desde Windows (PowerShell con OpenSSH)

1. Crea la carpeta `.ssh` en tu usuario de Windows (si no existe):

    mkdir %USERPROFILE%\.ssh

2. Copia el archivo `marsupia-key.pem` a esa carpeta, por ejemplo:

    copy C:\ruta\de\descarga\marsupia-key.pem "%USERPROFILE%\.ssh\marsupia-key.pem"

3. Abre **PowerShell**.

4. Conéctate a la instancia con:

    ssh -i "$env:USERPROFILE\.ssh\marsupia-key.pem" ubuntu@IP_ELASTICA
    # Ejemplo:
    # ssh -i "$env:USERPROFILE\.ssh\marsupia-key.pem" ubuntu@3.148.116.136

5. Acepta la huella (`yes`) la primera vez.

6. Si ves algo como:

    ubuntu@ip-172-31-xx-yy:~$

   significa que ya tienes acceso a la instancia.

> Nota: si Windows muestra advertencias sobre permisos del archivo `.pem`, puedes marcarlo como “Sólo lectura” en las propiedades del archivo o usar WSL y seguir los pasos de la sección 3.2.

---

## 4. Instalación de librerías: Git y Docker en la instancia

> A partir de aquí, todos los comandos se ejecutan **dentro de la instancia**, ya conectado como usuario `ubuntu`.

---

### 4.1. Actualizar el sistema

1. Actualiza el índice de paquetes:

    sudo apt update

2. Actualiza los paquetes instalados:

    sudo apt upgrade -y

3. (Opcional) Instala utilidades básicas necesarias para Docker:

    sudo apt install -y ca-certificates curl gnupg lsb-release

---

### 4.2. Instalar Git

1. Instala Git con APT:

    sudo apt install -y git

2. Configura tu nombre y correo (para que queden registrados en los commits):

    git config --global user.name "Tu Nombre"
    git config --global user.email "tu_correo@example.com"

3. Verifica que Git quedó instalado:

    git --version

   Deberías ver algo como:

    git version 2.x.x

---

### 4.3. Instalar Docker (método oficial recomendado)

#### 4.3.1. Añadir la clave GPG de Docker

1. Crea la carpeta de claves (si no existe):

    sudo install -m 0755 -d /etc/apt/keyrings

2. Descarga y registra la clave de Docker:

    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
      sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

3. Ajusta permisos de la clave:

    sudo chmod a+r /etc/apt/keyrings/docker.gpg

#### 4.3.2. Añadir el repositorio de Docker

1. Añade el repositorio estable de Docker para Ubuntu:

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
      https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

2. Actualiza el índice de paquetes para incluir el nuevo repositorio:

    sudo apt update

#### 4.3.3. Instalar Docker Engine y herramientas

1. Instala Docker y componentes relacionados:

    sudo apt install -y docker-ce docker-ce-cli containerd.io \
      docker-buildx-plugin docker-compose-plugin

2. Habilita el servicio de Docker para que inicie automáticamente con el sistema:

    sudo systemctl enable docker

3. Inicia Docker (si aún no está iniciado):

    sudo systemctl start docker

#### 4.3.4. Permitir usar Docker sin `sudo`

1. Añade tu usuario (`ubuntu`) al grupo `docker`:

    sudo usermod -aG docker $USER

2. Cierra la sesión SSH (comando `exit`) y vuelve a conectarte para que se apliquen los cambios de grupo.

3. Comprueba que ahora puedes ejecutar Docker sin `sudo`:

    docker ps

   Si no hay contenedores, verás una lista vacía pero **sin errores de permisos**.

#### 4.3.5. Probar Docker con un contenedor de prueba

1. Ejecuta el contenedor de prueba oficial de Docker:

    docker run hello-world

2. Si todo está correcto, verás un mensaje indicando que Docker se ha instalado correctamente y que el contenedor se ejecutó con éxito.

---

### 4.4. (Opcional) Clonar tu proyecto con Git

1. Ve al directorio de trabajo donde quieras clonar tu proyecto (por ejemplo, el home):

    cd ~

2. Clona tu repositorio (ejemplo con GitHub):

    git clone https://github.com/tu_usuario/tu_repositorio.git

3. Entra en la carpeta del proyecto:

    cd tu_repositorio

4. A partir de aquí podrás:

    # Construir imágenes:
    docker build -t nombre_imagen .

    # O levantar servicios si tienes docker-compose.yml:
    docker compose up -d

---

## 5. Resumen de la Guía de Despliegue Pt.1

- Ya tienes una **instancia EC2** creada y en ejecución.
- Le asignaste una **Elastic IP**, asegurando una IP pública fija.
- Configuraste los **DNS en GoDaddy** para que tu dominio apunte a la instancia.
- Aprendiste a conectarte por **SSH** desde Linux/macOS/WSL y desde Windows.
- Instalaste y configuraste **Git** y **Docker** dentro de la instancia para poder desplegar aplicaciones contenerizadas.