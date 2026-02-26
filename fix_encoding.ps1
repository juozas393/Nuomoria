# Fix the corrupted index.css:
# 1. Read original good content (first 1124 lines, which are clean UTF-8)
# 2. Append the floating circles CSS from append_css.txt (also UTF-8)
# 3. Write everything back as clean UTF-8 without BOM

$indexPath = "c:\Users\juoza\Desktop\Tvarkingi Darbai\PropertyManagmentv2\apps\web\src\index.css"
$appendPath = "c:\Users\juoza\Desktop\Tvarkingi Darbai\PropertyManagmentv2\append_css.txt"

# Read the raw bytes to handle mixed encoding
$bytes = [System.IO.File]::ReadAllBytes($indexPath)

# Find the UTF-8 portion (before null bytes start appearing)
# Convert to string first as UTF-8
$fullText = [System.Text.Encoding]::UTF8.GetString($bytes)

# Split into lines, take first 1124
$lines = $fullText -split "`r?`n"
$goodLines = $lines[0..1123]
$baseContent = ($goodLines -join "`r`n")

# Read the append content - force UTF-8
$appendBytes = [System.IO.File]::ReadAllBytes($appendPath)

# Check for UTF-8 BOM and skip it
$startIndex = 0
if ($appendBytes.Length -ge 3 -and $appendBytes[0] -eq 0xEF -and $appendBytes[1] -eq 0xBB -and $appendBytes[2] -eq 0xBF) {
    $startIndex = 3
}
$appendText = [System.Text.Encoding]::UTF8.GetString($appendBytes, $startIndex, $appendBytes.Length - $startIndex)

# Combine
$combined = $baseContent + "`r`n" + $appendText

# Write as clean UTF-8 without BOM  
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText($indexPath, $combined, $utf8NoBom)

Write-Host "Done - file cleaned and rewritten as UTF-8 without BOM"
Write-Host "Total lines in good base: $($goodLines.Count)"
Write-Host "Append content length: $($appendText.Length)"
