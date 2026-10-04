param(
    [switch]$NoBrowser
)

$port = 8080
$prefix = "http://localhost:$port/"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
    Write-Host "==========================================================" -ForegroundColor Yellow
    Write-Host " Royal Palace VIP Blackjack Server Berjalan di:" -ForegroundColor Green
    Write-Host " $prefix" -ForegroundColor Cyan
    Write-Host " Tekan Ctrl+C untuk menghentikan server." -ForegroundColor Gray
    Write-Host "==========================================================" -ForegroundColor Yellow

    if (-not $NoBrowser) {
        Start-Process $prefix
    }

    $mimeMap = @{
        ".html" = "text/html; charset=utf-8"
        ".css"  = "text/css"
        ".js"   = "application/javascript"
        ".jpg"  = "image/jpeg"
        ".jpeg" = "image/jpeg"
        ".png"  = "image/png"
        ".ico"  = "image/x-icon"
        ".json" = "application/json"
    }

    $basePath = (Get-Location).Path

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $rawPath = $request.Url.LocalPath.TrimStart('/')
        if ([string]::IsNullOrWhiteSpace($rawPath)) {
            $rawPath = "index.html"
        }

        $filePath = Join-Path $basePath $rawPath

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = if ($mimeMap.ContainsKey($ext)) { $mimeMap[$ext] } else { "application/octet-stream" }

            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentType = $mime
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $response.OutputStream.Write($msg, 0, $msg.Length)
        }
        $response.Close()
    }
} catch {
    Write-Host "Server Error: $_" -ForegroundColor Red
} finally {
    $listener.Stop()
}
