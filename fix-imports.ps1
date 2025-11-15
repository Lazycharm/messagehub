# Fix imports in all page files
$pageFiles = Get-ChildItem "pages" -File -Filter "*.js" -Exclude "index.js","_app.js","_document.js"

foreach ($file in $pageFiles) {
    $content = Get-Content $file.FullName -Raw
    
    # Replace @ path imports with relative paths
    $content = $content -replace "from '@/api/", "from '../src/api/"
    $content = $content -replace "from '@/components/", "from '../src/MessageHub/components/"
    $content = $content -replace "from '@/entities/", "from '../src/MessageHub/entities/"
    
    # Also fix relative paths that reference components  
    $content = $content -replace "from '\.\./components/", "from '../src/MessageHub/components/"
    
    Set-Content $file.FullName $content -NoNewline
    Write-Host "Fixed: $($file.Name)"
}

# Fix admin files (one level deeper)
$adminFiles = Get-ChildItem "pages/admin" -File -Filter "*.js" -ErrorAction SilentlyContinue

foreach ($file in $adminFiles) {
    $content = Get-Content $file.FullName -Raw
    
    # Replace @ path imports with relative paths (one more ../)
    $content = $content -replace "from '@/api/", "from '../../src/api/"
    $content = $content -replace "from '@/components/", "from '../../src/MessageHub/components/"
    $content = $content -replace "from '@/entities/", "from '../../src/MessageHub/entities/"
    
    Set-Content $file.FullName $content -NoNewline
    Write-Host "Fixed: admin/$($file.Name)"
}

Write-Host "`nAll imports fixed!"
