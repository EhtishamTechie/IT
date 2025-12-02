# Cloudflare Quick Test Script for Windows PowerShell
# Tests if Cloudflare CDN is working properly

Write-Host ""
Write-Host "Testing Cloudflare CDN for internationaltijarat.com..." -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

$domain = "https://internationaltijarat.com"
$testUrls = @(
    "/",
    "/uploads/homepage-cards/card-1.jpeg"
)

$results = @()

foreach ($url in $testUrls) {
    $fullUrl = $domain + $url
    Write-Host "Testing: $url" -ForegroundColor Blue
    
    try {
        # Use .NET WebClient to avoid PowerShell SSL issues
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $webClient = New-Object System.Net.WebClient
        $webClient.Headers.Add('User-Agent', 'Mozilla/5.0')
        
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        $response = $webClient.DownloadString($fullUrl)
        $stopwatch.Stop()
        
        $headers = $webClient.ResponseHeaders
        
        # Extract key headers
        $cfRay = $headers.Get('CF-Ray')
        $cfCacheStatus = $headers.Get('CF-Cache-Status')
        $server = $headers.Get('Server')
        $cacheControl = $headers.Get('Cache-Control')
        $contentEncoding = $headers.Get('Content-Encoding')
        $age = $headers.Get('Age')
        
        # Analyze results
        $isCloudflareActive = ($cfRay -ne $null) -or ($server -eq 'cloudflare')
        $isCached = $cfCacheStatus -in @('HIT', 'REVALIDATED', 'UPDATING')
        $isCompressed = $contentEncoding -ne $null
        
        Write-Host "  Response time: $($stopwatch.ElapsedMilliseconds)ms" -ForegroundColor Green
        
        if ($isCloudflareActive) {
            Write-Host "  Cloudflare Active: Yes (CF-Ray: $cfRay)" -ForegroundColor Green
        } else {
            Write-Host "  Cloudflare Active: No" -ForegroundColor Red
        }
        
        if ($cfCacheStatus) {
            if ($isCached) {
                Write-Host "  Cache Status: $cfCacheStatus" -ForegroundColor Green
            } else {
                Write-Host "  Cache Status: $cfCacheStatus" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  Cache Status: Not detected" -ForegroundColor Red
        }
        
        if ($isCompressed) {
            Write-Host "  Compression: $contentEncoding" -ForegroundColor Green
        } else {
            Write-Host "  Compression: None" -ForegroundColor Yellow
        }
        
        if ($cacheControl) {
            Write-Host "  Cache-Control: $cacheControl" -ForegroundColor Gray
        }
        
        if ($age) {
            Write-Host "  Age: $age seconds (cached)" -ForegroundColor Gray
        }
        
        $results += [PSCustomObject]@{
            Url = $url
            CloudflareActive = $isCloudflareActive
            Cached = $isCached
            Compressed = $isCompressed
            ResponseTime = $stopwatch.ElapsedMilliseconds
        }
        
    } catch {
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
}

# Summary
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

$cfActive = ($results | Where-Object { $_.CloudflareActive }).Count
$cached = ($results | Where-Object { $_.Cached }).Count
$compressed = ($results | Where-Object { $_.Compressed }).Count
$avgResponseTime = ($results | Measure-Object -Property ResponseTime -Average).Average

Write-Host "Cloudflare Active: $cfActive/$($results.Count) URLs" -ForegroundColor $(if ($cfActive -eq $results.Count) { 'Green' } else { 'Red' })
Write-Host "Cached Responses: $cached/$($results.Count) URLs" -ForegroundColor $(if ($cached -gt 0) { 'Green' } else { 'Yellow' })
Write-Host "Compressed: $compressed/$($results.Count) URLs" -ForegroundColor $(if ($compressed -gt 0) { 'Green' } else { 'Yellow' })
Write-Host "Average Response: $([math]::Round($avgResponseTime, 0))ms" -ForegroundColor Gray
Write-Host ""

if ($cfActive -eq 0) {
    Write-Host "CRITICAL: Cloudflare is NOT active!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Quick Fixes:" -ForegroundColor Yellow
    Write-Host "1. Check Cloudflare DNS: Ensure records are 'Proxied' (orange cloud)" -ForegroundColor White
    Write-Host "2. Verify nameservers: Domain must use Cloudflare nameservers" -ForegroundColor White
    Write-Host "3. Check SSL/TLS: Set to 'Full' or 'Full (Strict)'" -ForegroundColor White
} elseif ($cached -eq 0) {
    Write-Host "Cloudflare is active but not caching" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Quick Fixes:" -ForegroundColor Yellow
    Write-Host "1. Set up Page Rules for /uploads/* and /assets/*" -ForegroundColor White
    Write-Host "2. Set Cache Level to 'Cache Everything'" -ForegroundColor White
    Write-Host "3. Visit URLs 2-3 times to warm up cache" -ForegroundColor White
    Write-Host "4. Check if backend sends Cache-Control: private (remove it)" -ForegroundColor White
} else {
    Write-Host "Cloudflare is working correctly!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Optimization tips:" -ForegroundColor Cyan
    Write-Host "- Enable HTTP/3 in Cloudflare dashboard" -ForegroundColor White
    Write-Host "- Enable Auto Minify (HTML, CSS, JS)" -ForegroundColor White
    Write-Host "- Set up more Page Rules for better caching" -ForegroundColor White
}

Write-Host ""
Write-Host "For detailed diagnostics, run: node check-cloudflare.js" -ForegroundColor Cyan
Write-Host "Full guide: See CLOUDFLARE_OPTIMIZATION_GUIDE.md" -ForegroundColor Cyan
Write-Host ""
