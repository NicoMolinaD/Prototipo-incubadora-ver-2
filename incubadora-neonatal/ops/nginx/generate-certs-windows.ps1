# Script PowerShell para generar certificados SSL autofirmados en Windows
# Requiere OpenSSL instalado o Docker

param(
    [string]$Domain = "marsupia.online"
)

$CertDir = Join-Path $PSScriptRoot "certs"
$ScriptDir = $PSScriptRoot

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Generación de Certificados SSL Autofirmados" -ForegroundColor Cyan
Write-Host "Dominio: $Domain" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Crear directorio de certificados si no existe
if (-not (Test-Path $CertDir)) {
    New-Item -ItemType Directory -Path $CertDir | Out-Null
}

# Intentar usar Docker primero
$dockerAvailable = $false
try {
    $null = docker --version 2>&1
    $dockerAvailable = $true
} catch {
    $dockerAvailable = $false
}

if ($dockerAvailable) {
    Write-Host "Usando Docker para generar certificados..." -ForegroundColor Yellow
    
    $certPath = (Resolve-Path $CertDir).Path
    $scriptPath = (Resolve-Path $ScriptDir).Path
    
    docker run --rm -v "${certPath}:/certs" alpine/openssl sh -c @"
        openssl genrsa -out /certs/privkey.pem 2048
        openssl req -new -x509 -key /certs/privkey.pem -out /certs/fullchain.pem -days 365 -subj '/C=ES/ST=State/L=City/O=Incubadora/CN=$Domain' -addext 'subjectAltName=DNS:$Domain,DNS:www.$Domain,DNS:localhost,DNS:*.localhost,IP:127.0.0.1,IP:::1'
        chmod 600 /certs/privkey.pem
        chmod 644 /certs/fullchain.pem
"@
    
    Write-Host ""
    Write-Host "✓ Certificados generados exitosamente usando Docker!" -ForegroundColor Green
} else {
    # Intentar usar OpenSSL directamente
    $opensslAvailable = $false
    try {
        $null = openssl version 2>&1
        $opensslAvailable = $true
    } catch {
        $opensslAvailable = $false
    }
    
    if ($opensslAvailable) {
        Write-Host "Usando OpenSSL para generar certificados..." -ForegroundColor Yellow
        
        $privkeyPath = Join-Path $CertDir "privkey.pem"
        $fullchainPath = Join-Path $CertDir "fullchain.pem"
        
        openssl genrsa -out $privkeyPath 2048
        openssl req -new -x509 -key $privkeyPath -out $fullchainPath -days 365 -subj "/C=ES/ST=State/L=City/O=Incubadora/CN=$Domain" -addext "subjectAltName=DNS:$Domain,DNS:www.$Domain,DNS:localhost,DNS:*.localhost,IP:127.0.0.1,IP:::1"
        
        Write-Host ""
        Write-Host "✓ Certificados generados exitosamente usando OpenSSL!" -ForegroundColor Green
    } else {
        Write-Host "ERROR: No se encontró Docker ni OpenSSL." -ForegroundColor Red
        Write-Host ""
        Write-Host "Opciones:" -ForegroundColor Yellow
        Write-Host "1. Instalar Docker Desktop para Windows" -ForegroundColor Yellow
        Write-Host "2. Instalar OpenSSL para Windows desde: https://slproweb.com/products/Win32OpenSSL.html" -ForegroundColor Yellow
        Write-Host "3. Ejecutar el script generate-certs.sh en el servidor Linux" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host ""
Write-Host "Ubicación de los certificados:" -ForegroundColor Cyan
Write-Host "  - $(Join-Path $CertDir 'fullchain.pem')" -ForegroundColor White
Write-Host "  - $(Join-Path $CertDir 'privkey.pem')" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  NOTA: Estos son certificados autofirmados para desarrollo." -ForegroundColor Yellow
Write-Host "   Los navegadores mostrarán una advertencia de seguridad." -ForegroundColor Yellow
Write-Host "   Para producción, usa certificados de Let's Encrypt con setup-letsencrypt.sh" -ForegroundColor Yellow
Write-Host ""

