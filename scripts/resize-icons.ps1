Add-Type -AssemblyName System.Drawing

function Resize-Image($srcPath, $targetPath, $width, $height) {
    $src = [System.Drawing.Image]::FromFile($srcPath)
    $dest = New-Object System.Drawing.Bitmap($width, $height)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    $g.DrawImage($src, 0, 0, $width, $height)
    $dest.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $dest.Dispose()
    $src.Dispose()
    Write-Host "Created $targetPath ($width x $height)"
}

$source = "c:\Users\Admin\OneDrive\Desktop\focusflow-ai\frontend\public\brand\brand-simplified-icon.jpg"

Resize-Image $source "c:\Users\Admin\OneDrive\Desktop\focusflow-ai\extension\icons\icon16.png" 16 16
Resize-Image $source "c:\Users\Admin\OneDrive\Desktop\focusflow-ai\extension\icons\icon48.png" 48 48
Resize-Image $source "c:\Users\Admin\OneDrive\Desktop\focusflow-ai\extension\icons\icon128.png" 128 128
Resize-Image $source "c:\Users\Admin\OneDrive\Desktop\focusflow-ai\frontend\public\brand\icon-128.png" 128 128
Resize-Image $source "c:\Users\Admin\OneDrive\Desktop\focusflow-ai\frontend\public\brand\icon-48.png" 48 48
Resize-Image $source "c:\Users\Admin\OneDrive\Desktop\focusflow-ai\frontend\public\brand\icon-32.png" 32 32
Resize-Image $source "c:\Users\Admin\OneDrive\Desktop\focusflow-ai\frontend\public\brand\icon-16.png" 16 16
