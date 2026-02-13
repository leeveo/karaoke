# Script pour uploader les style packs sur S3
# Usage: .\upload-style-packs-to-s3.ps1 [-Pack nom-du-pack] [-DryRun]

param(
    [string]$Pack = "",  # Pack specifique a uploader, ou tous si vide
    [switch]$DryRun = $false  # Mode simulation sans upload reel
)

$ErrorActionPreference = "Stop"

# Configuration
$BUCKET = "leeveostockage"
$REGION = "eu-west-3"
$BASE_PATH = "karaokeStylePack"
$LOCAL_DIR = "public\style-packs"

Write-Host "[>>] Upload des Style Packs vers S3" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Verifier AWS CLI
Write-Host "[CHECK] Verification d'AWS CLI..." -ForegroundColor Yellow
try {
    $awsVersion = aws --version 2>&1
    Write-Host "[OK] AWS CLI trouve: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] AWS CLI n'est pas installe!" -ForegroundColor Red
    Write-Host "Installer depuis: https://aws.amazon.com/cli/" -ForegroundColor Yellow
    exit 1
}

# Verifier la configuration AWS
Write-Host "[CHECK] Verification de la configuration AWS..." -ForegroundColor Yellow
try {
    $identity = aws sts get-caller-identity --region $REGION 2>&1 | ConvertFrom-Json
    Write-Host "[OK] Connecte en tant que: $($identity.Arn)" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Erreur de configuration AWS!" -ForegroundColor Red
    Write-Host "Configurer avec: aws configure" -ForegroundColor Yellow
    exit 1
}

# Verifier que le dossier local existe
if (-not (Test-Path $LOCAL_DIR)) {
    Write-Host "[ERROR] Le dossier $LOCAL_DIR n'existe pas!" -ForegroundColor Red
    exit 1
}

# Fonction pour uploader un pack
function Upload-Pack {
    param(
        [string]$PackName
    )
    
    $localPath = Join-Path $LOCAL_DIR $PackName
    $s3Path = "s3://$BUCKET/$BASE_PATH/$PackName/"
    
    if (-not (Test-Path $localPath)) {
        Write-Host "[WARN] Pack '$PackName' introuvable dans $localPath" -ForegroundColor Yellow
        return
    }
    
    Write-Host ""
    Write-Host "[PACK] Upload du pack: $PackName" -ForegroundColor Cyan
    Write-Host "   Local:  $localPath" -ForegroundColor Gray
    Write-Host "   S3:     $s3Path" -ForegroundColor Gray
    
    # Compter les fichiers
    $files = Get-ChildItem -Path $localPath -Recurse -File
    $totalFiles = $files.Count
    $totalSize = ($files | Measure-Object -Property Length -Sum).Sum
    $sizeMB = [math]::Round($totalSize / 1MB, 2)
    
    Write-Host "   Fichiers: $totalFiles ($sizeMB Mo)" -ForegroundColor Gray
    
    if ($DryRun) {
        Write-Host "   [DRY RUN] Mode simulation - Aucun upload effectue" -ForegroundColor Yellow
        return
    }
    
    # Upload avec AWS CLI
    try {
        Write-Host "   [>>] Upload en cours..." -ForegroundColor Yellow
        
        $output = aws s3 sync $localPath $s3Path `
            --region $REGION `
            --acl public-read `
            --delete `
            --exclude "*.DS_Store" `
            --exclude "Thumbs.db" `
            2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   [OK] Upload reussi!" -ForegroundColor Green
        } else {
            Write-Host "   [ERROR] Erreur lors de l'upload" -ForegroundColor Red
            Write-Host $output -ForegroundColor Red
        }
    } catch {
        Write-Host "   [ERROR] Erreur: $_" -ForegroundColor Red
    }
}

# Liste des packs disponibles
$availablePacks = Get-ChildItem -Path $LOCAL_DIR -Directory | Select-Object -ExpandProperty Name

Write-Host "[LIST] Packs disponibles:" -ForegroundColor Yellow
foreach ($p in $availablePacks) {
    Write-Host "   * $p" -ForegroundColor Gray
}

Write-Host ""

# Upload
if ($Pack) {
    # Upload un pack specifique
    if ($availablePacks -contains $Pack) {
        Upload-Pack -PackName $Pack
    } else {
        Write-Host "[ERROR] Pack '$Pack' introuvable!" -ForegroundColor Red
        Write-Host "Packs disponibles: $($availablePacks -join ', ')" -ForegroundColor Yellow
        exit 1
    }
} else {
    # Upload tous les packs
    Write-Host "[>>] Upload de tous les packs..." -ForegroundColor Cyan
    
    foreach ($packName in $availablePacks) {
        Upload-Pack -PackName $packName
    }
}

Write-Host ""
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "[*] Upload termine!" -ForegroundColor Green
Write-Host ""

if (-not $DryRun) {
    Write-Host "[NOTE] Prochaines etapes:" -ForegroundColor Yellow
    Write-Host "   1. Verifier les fichiers sur: https://s3.console.aws.amazon.com/s3/buckets/$BUCKET" -ForegroundColor Gray
    Write-Host "   2. (Optionnel) Configurer CloudFront pour de meilleures performances" -ForegroundColor Gray
    Write-Host "   3. Ajouter dans .env.production:" -ForegroundColor Gray
    Write-Host "      NEXT_PUBLIC_STYLE_PACK_CDN_URL=https://$BUCKET.s3.$REGION.amazonaws.com/$BASE_PATH" -ForegroundColor Cyan
    Write-Host ""
}
