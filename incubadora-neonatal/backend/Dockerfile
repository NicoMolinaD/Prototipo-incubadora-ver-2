FROM python:3.11-slim

# Define el directorio de trabajo
WORKDIR /app

# Evita que Python genere archivos .pyc y que bufferice la salida
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Instala dependencias de compilación necesarias para algunas librerías
# También instala bash que es necesario para el entrypoint script
RUN apt-get update && \
    apt-get install -y --no-install-recommends build-essential curl bash && \
    rm -rf /var/lib/apt/lists/*

# Copia requirements.txt e instala las dependencias de Python
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia el resto del codigo del backend
COPY backend/ .

# Da permiso de ejecucion al entrypoint
RUN chmod +x docker-entrypoint.sh

# Expone el puerto que usara uvicorn
EXPOSE 8000

# Usa el script de arranque que inicializa la base y lanza la API
ENTRYPOINT ["bash", "docker-entrypoint.sh"]
