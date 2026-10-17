param(
    [string]$SourceImage,
    [string]$OutputDir
)

Add-Type -AssemblyName System.Drawing

if (-not (Test-Path $SourceImage)) {
    Write-Error "Source image not found at $SourceImage"
    exit 1
}

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$src = [System.Drawing.Bitmap]::FromFile($SourceImage)
Write-Host "Loaded source image: $($src.Width)x$($src.Height)"

# Feather edges to seamlessly melt into #07070a dark background
$feathered = New-Object System.Drawing.Bitmap($src.Width, $src.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$featherTop = 26
$featherBottom = 16
$featherSide = 22

for ($y = 0; $y -lt $src.Height; $y++) {
    for ($x = 0; $x -lt $src.Width; $x++) {
        $p = $src.GetPixel($x, $y)
        $factor = 1.0
        if ($y -lt $featherTop) { $factor = [Math]::Min($factor, ($y / $featherTop)) }
        if ($y -ge ($src.Height - $featherBottom)) { $factor = [Math]::Min($factor, (($src.Height - 1 - $y) / $featherBottom)) }
        if ($x -lt $featherSide) { $factor = [Math]::Min($factor, ($x / $featherSide)) }
        if ($x -ge ($src.Width - $featherSide)) { $factor = [Math]::Min($factor, (($src.Width - 1 - $x) / $featherSide)) }
        
        $factor = (1.0 - [Math]::Cos($factor * [Math]::PI)) / 2.0
        
        $baseR = 7; $baseG = 7; $baseB = 10
        $newR = [int]($baseR + ($p.R - $baseR) * $factor)
        $newG = [int]($baseG + ($p.G - $baseG) * $factor)
        $newB = [int]($baseB + ($p.B - $baseB) * $factor)
        
        $feathered.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, [Math]::Max(0, [Math]::Min(255, $newR)), [Math]::Max(0, [Math]::Min(255, $newG)), [Math]::Max(0, [Math]::Min(255, $newB))))
    }
}

# 1024x1024 Master
$master = New-Object System.Drawing.Bitmap(1024, 1024, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($master)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

$bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 7, 7, 10))
$g.FillRectangle($bgBrush, 0, 0, 1024, 1024)

# Center fit feathered image: width 900, proportional height
$targetW = 900
$targetH = [int]($feathered.Height * ($targetW / $feathered.Width))
$targetX = [int]((1024 - $targetW) / 2)
$targetY = [int]((1024 - $targetH) / 2)

$g.DrawImage($feathered, $targetX, $targetY, $targetW, $targetH)
$g.Dispose()
$feathered.Dispose()
$src.Dispose()

# Function to resize bitmap
function Resize-Bmp($srcBmp, $w, $h) {
    $res = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $gr = [System.Drawing.Graphics]::FromImage($res)
    $gr.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gr.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $gr.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $gr.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $gr.DrawImage($srcBmp, 0, 0, $w, $h)
    $gr.Dispose()
    return $res
}

$sizes = @(16, 32, 48, 64, 128, 256, 512, 1024)
foreach ($sz in $sizes) {
    $resized = Resize-Bmp $master $sz $sz
    $targetFile = Join-Path $OutputDir "focusflow_$sz.png"
    $resized.Save($targetFile, [System.Drawing.Imaging.ImageFormat]::Png)
    if ($sz -eq 1024) {
        $jpgFile = Join-Path $OutputDir "focusflow_1024.jpg"
        $resized.Save($jpgFile, [System.Drawing.Imaging.ImageFormat]::Jpeg)
    }
    $resized.Dispose()
    Write-Host "Created $targetFile"
}
$master.Dispose()
Write-Host "All PNGs generated successfully in $OutputDir"
