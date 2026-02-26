$file = "c:\Users\juoza\Desktop\Tvarkingi Darbai\PropertyManagmentv2\apps\web\src\index.css"
$lines = Get-Content $file
$keep = $lines[0..1123]
$keep | Set-Content $file -Encoding UTF8
