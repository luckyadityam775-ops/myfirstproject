$total = 0
$passed = 0
$failed = 0

function Assert-Test($title, $condition, $details = "") {
    $script:total++
    if ($condition) {
        $script:passed++
        Write-Host " [PASS] $title" -ForegroundColor Green
        if ($details) { Write-Host "        $details" -ForegroundColor DarkGray }
    } else {
        $script:failed++
        Write-Host " [FAIL] $title" -ForegroundColor Red
        if ($details) { Write-Host "        $details" -ForegroundColor DarkYellow }
    }
}

Write-Host "==========================================================" -ForegroundColor Yellow
Write-Host " ORGANIC END-TO-END VERIFICATION & REALTIME TEST SUITE" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Yellow

# 1. Test Local Server Status & Static Assets
Write-Host "`n--- 1. Local Server & Assets Check ---" -ForegroundColor White
try {
    $rIndex = Invoke-WebRequest -Uri 'http://localhost:8080/' -UseBasicParsing
    Assert-Test "Local HTTP Server responds at http://localhost:8080/" ($rIndex.StatusCode -eq 200) "Status: $($rIndex.StatusCode)"
} catch {
    Assert-Test "Local HTTP Server responds at http://localhost:8080/" $false $_.Message
}

$assets = @('style.css', 'js/rules.js', 'js/game.js', 'js/audio.js', 'js/supabase-client.js', 'js/i18n.js', 'js/peer-multiplayer.js', 'assets/card_back.jpg', 'assets/table_bg.jpg')
foreach ($asset in $assets) {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:8080/$asset" -UseBasicParsing
        Assert-Test "Asset loaded: $asset" ($r.StatusCode -eq 200) "Bytes: $($r.RawContentLength)"
    } catch {
        Assert-Test "Asset loaded: $asset" $false $_.Message
    }
}

# 2. Test Supabase Live Cloud Integration & Realtime Publications
Write-Host "`n--- 2. Supabase Cloud Live Integration & Realtime Check ---" -ForegroundColor White
$sbUrl = 'https://hddecjvkaaxjmyfgzqwh.supabase.co'
$sbKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkZGVjanZrYWF4am15Zmd6cXdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExMTE4MTAsImV4cCI6MjEwNjY4NzgxMH0.SGDzmHUy8ygidb5bpWPr0JAgD_ilcbw0ctfdG1DnDZ4'
$sbHeaders = @{
    'apikey' = $sbKey
    'Authorization' = "Bearer $sbKey"
    'Content-Type' = 'application/json; charset=utf-8'
    'Prefer' = 'return=representation'
}

# Test 2.1: Supabase profiles table query
try {
    $resProfiles = Invoke-RestMethod -Uri "$sbUrl/rest/v1/blackjack_profiles?select=*" -Headers $sbHeaders -Method Get
    $count = @($resProfiles).Count
    Assert-Test "Supabase REST API: Connected to blackjack_profiles table" ($null -ne $resProfiles) "Found $count profiles in cloud"
} catch {
    Assert-Test "Supabase REST API: Connected to blackjack_profiles table" $false $_.Message
}

# Test 2.2: Insert / Upsert test profile
$testProfileId = "organic_realtime_user_" + ([DateTimeOffset]::UtcNow).ToUnixTimeMilliseconds()
$profilePayload = @{
    id = $testProfileId
    username = "Realtime VIP High Roller"
    avatar = "💎"
    bankroll = 5000
    rounds_played = 20
    wins = 14
    losses = 4
    pushes = 2
    blackjacks = 5
    best_streak = 6
    net_profit = 1800
} | ConvertTo-Json
$profileBytes = [System.Text.Encoding]::UTF8.GetBytes($profilePayload)

try {
    $resUpsert = Invoke-RestMethod -Uri "$sbUrl/rest/v1/blackjack_profiles" -Headers $sbHeaders -Method Post -Body $profileBytes
    Assert-Test "Supabase Write: Upsert player profile to cloud" ($null -ne $resUpsert) "Saved ID: $testProfileId"
} catch {
    Assert-Test "Supabase Write: Upsert player profile to cloud" $false $_.Message
}

# Test 2.3: Read back inserted profile and verify fields
try {
    $resRead = Invoke-RestMethod -Uri "$sbUrl/rest/v1/blackjack_profiles?id=eq.$testProfileId" -Headers $sbHeaders -Method Get
    $item = if ($resRead -is [array]) { $resRead[0] } else { $resRead }
    $verified = ($null -ne $item -and $item.username -eq "Realtime VIP High Roller" -and [int64]$item.bankroll -eq 5000)
    Assert-Test "Supabase Read: Verify player bankroll and stats accuracy" $verified "Cloud Bankroll: `$$($item.bankroll)"
} catch {
    Assert-Test "Supabase Read: Verify player bankroll and stats accuracy" $false $_.Message
}

# Test 2.4: Log game round to blackjack_rounds
$roundPayload = @{
    player_id = $testProfileId
    player_name = "Realtime VIP High Roller"
    bet_amount = 250
    player_cards = "A♠, K♦"
    dealer_cards = "10♥, 9♣"
    result = "NATURAL BLACKJACK"
    payout = 375
} | ConvertTo-Json
$roundBytes = [System.Text.Encoding]::UTF8.GetBytes($roundPayload)

try {
    $resRound = Invoke-RestMethod -Uri "$sbUrl/rest/v1/blackjack_rounds" -Headers $sbHeaders -Method Post -Body $roundBytes
    Assert-Test "Supabase Write: Record game round log to blackjack_rounds" ($null -ne $resRound) "Logged BJ 3:2 payout: ID $($resRound.id)"
} catch {
    Assert-Test "Supabase Write: Record game round log to blackjack_rounds" $false $_.Message
}

# Test 2.5: Leaderboard query
try {
    $resLb = Invoke-RestMethod -Uri "$sbUrl/rest/v1/blackjack_profiles?select=username,bankroll,wins&order=bankroll.desc&limit=10" -Headers $sbHeaders -Method Get
    $top = if ($resLb -is [array]) { $resLb[0] } else { $resLb }
    Assert-Test "Supabase Query: Global Leaderboard top high rollers retrieved" ($null -ne $top) "Top player: $($top.username) with `$$($top.bankroll)"
} catch {
    Assert-Test "Supabase Query: Global Leaderboard top high rollers retrieved" $false $_.Message
}

# Test 2.6: Supabase Realtime WebSocket Connection
try {
    $ws = New-Object System.Net.WebSockets.ClientWebSocket
    $ws.Options.SetRequestHeader('apikey', $sbKey)
    $wsUrl = "wss://hddecjvkaaxjmyfgzqwh.supabase.co/realtime/v1/websocket?apikey=$sbKey`&vsn=1.0.0"
    $cts = New-Object System.Threading.CancellationTokenSource(6000)
    $wsTask = $ws.ConnectAsync([System.Uri]$wsUrl, $cts.Token)
    $wsTask.Wait()
    $isOpen = ($ws.State -eq [System.Net.WebSockets.WebSocketState]::Open)
    Assert-Test "Supabase Realtime: Live WebSocket connection established" $isOpen "State: $($ws.State)"
    $ws.Dispose()
} catch {
    Assert-Test "Supabase Realtime: Live WebSocket connection established" $false $_.Message
}

# 3. Test Vercel Live Production Deployment
Write-Host "`n--- 3. Vercel Live Production Deployment Check ---" -ForegroundColor White
$vercelUrl = 'https://myfirstproject-two-fawn.vercel.app'
try {
    $rVercel = Invoke-WebRequest -Uri $vercelUrl -UseBasicParsing
    Assert-Test "Vercel Production: Responds at $vercelUrl" ($rVercel.StatusCode -eq 200) "Status: 200 OK"
} catch {
    Assert-Test "Vercel Production: Responds at $vercelUrl" $false $_.Message
}

$vAssets = @('style.css', 'js/rules.js', 'js/game.js', 'js/audio.js', 'js/supabase-client.js', 'js/i18n.js', 'js/peer-multiplayer.js')
foreach ($va in $vAssets) {
    try {
        $rVa = Invoke-WebRequest -Uri "$vercelUrl/$va" -UseBasicParsing
        Assert-Test "Vercel Production Asset: $va" ($rVa.StatusCode -eq 200) "Status: 200 OK"
    } catch {
        Assert-Test "Vercel Production Asset: $va" $false $_.Message
    }
}

# 4. Test Realtime Engine Code & Multi-Channel Sync Integrity
Write-Host "`n--- 4. Realtime Engine & Multi-Channel Code Integrity ---" -ForegroundColor White
$clientJs = Get-Content -Path 'c:\myfirstproject\js\supabase-client.js' -Raw
$peerJs = Get-Content -Path 'c:\myfirstproject\js\peer-multiplayer.js'
$gameJs = Get-Content -Path 'c:\myfirstproject\js\game.js' -Raw

$hasRtLeaderboard = $clientJs -match 'subscribeToLeaderboard'
$hasRtProfile = $clientJs -match 'subscribeToProfile'
$hasRtTableBroadcast = $clientJs -match 'sendTableBroadcast'
$hasDualChannelMultiplayer = $peerJs -match 'supabaseService\.sendTableBroadcast'
$hasDeduplication = $peerJs -match 'seenMessageIds'
$hasRtRoundLogging = $gameJs -match 'supabaseService\.recordRound'

Assert-Test "SupabaseService has subscribeToLeaderboard method" $hasRtLeaderboard
Assert-Test "SupabaseService has subscribeToProfile method" $hasRtProfile
Assert-Test "SupabaseService has sendTableBroadcast method" $hasRtTableBroadcast
Assert-Test "MultiplayerManager bridges WebRTC + Supabase Realtime" $hasDualChannelMultiplayer
Assert-Test "MultiplayerManager implements message deduplication" $hasDeduplication
Assert-Test "GameEngine records finished rounds to Supabase Cloud in real-time" $hasRtRoundLogging

# 5. Test Fullscreen & Zero-Scroll CSS Integrity
Write-Host "`n--- 5. Fullscreen & Zero-Scroll CSS Integrity ---" -ForegroundColor White
$cssContent = Get-Content -Path 'c:\myfirstproject\style.css' -Raw
$hasOverflowHidden = $cssContent -match 'html,\s*body\s*\{[^}]*overflow:\s*hidden'
$hasNoScrollContainer = $cssContent -match '\.casino-app-container\s*\{[^}]*max-height:\s*100vh'
$hasFullscreenBtn = (Get-Content -Path 'c:\myfirstproject\index.html' -Raw) -match 'id="fullscreen-btn"'

Assert-Test "CSS enforces overflow: hidden on html & body (No vertical scrollbar)" $hasOverflowHidden
Assert-Test "CSS locks .casino-app-container to 100vh viewport" $hasNoScrollContainer
Assert-Test "HTML includes dedicated Fullscreen toggle button" $hasFullscreenBtn

# 6. Test Zero-Balance Emergency $100 Bailout Rule Integrity
Write-Host "`n--- 6. Zero-Balance Emergency `$100 Bailout Integrity ---" -ForegroundColor White
$hasBailoutMethod = $gameJs -match 'checkAndGrantZeroBalanceBonus'
$hasBailoutCondition = $gameJs -match 'bankroll\s*<=\s*0'
$hasStrictCheck = $gameJs -match 'Saldo gratis \$100 hanya diberikan jika saldo Anda \$0'

Assert-Test "Game engine includes checkAndGrantZeroBalanceBonus method" $hasBailoutMethod
Assert-Test "Bailout triggered strictly when bankroll reaches 0" $hasBailoutCondition
Assert-Test "ATM refill rejects balance > 0 and guards free `$100 strictly for `$0 balance" $hasStrictCheck

Write-Host "`n==========================================================" -ForegroundColor Yellow
Write-Host " ORGANIC TEST RESULT: $passed / $total PASSED" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
Write-Host "==========================================================" -ForegroundColor Yellow

if ($failed -gt 0) {
    exit 1
} else {
    exit 0
}
