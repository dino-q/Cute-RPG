param([string]$RepoRoot = (Split-Path -Parent $PSScriptRoot))
$ErrorActionPreference = 'Stop'
function Invoke-Git([string[]]$GitArgs) {
  $result = & git -c core.excludesFile= @GitArgs
  if ($LASTEXITCODE -ne 0) { throw ('Git failed: ' + ($GitArgs -join ' ')) }
  return $result
}
$repo = (Resolve-Path -LiteralPath $RepoRoot).Path
$dist = (Resolve-Path -LiteralPath (Join-Path $repo 'dist')).Path
$gitDir = (Resolve-Path -LiteralPath (Join-Path $repo '.git')).Path
if (-not $dist.StartsWith($repo + [IO.Path]::DirectorySeparatorChar)) { throw 'Build output is outside the project.' }
if (-not (Test-Path -LiteralPath (Join-Path $dist 'index.html'))) { throw 'Missing built index.html.' }
$previousIndex = $env:GIT_INDEX_FILE
$index = Join-Path ([IO.Path]::GetTempPath()) ('cute-rpg-pages-' + [guid]::NewGuid().ToString('N') + '.index')
$previousLocation = Get-Location
try {
 Set-Location -LiteralPath $repo
 Invoke-Git -GitArgs @('fetch','origin') | Out-Host
 $parent = (Invoke-Git -GitArgs @('rev-parse','origin/gh-pages')).Trim()
 $source = (Invoke-Git -GitArgs @('rev-parse','HEAD')).Trim()
 $env:GIT_INDEX_FILE = $index
 Set-Location -LiteralPath $dist
 Invoke-Git -GitArgs @('--git-dir',$gitDir,'--work-tree',$dist,'read-tree','--empty') | Out-Host
 Invoke-Git -GitArgs @('--git-dir',$gitDir,'--work-tree',$dist,'add','-f','-A','--','.') | Out-Host
 $tree = (Invoke-Git -GitArgs @('--git-dir',$gitDir,'--work-tree',$dist,'write-tree')).Trim()
 $commit = (Invoke-Git -GitArgs @('--git-dir',$gitDir,'commit-tree',$tree,'-p',$parent,'-m',('deploy: formal game build from ' + $source))).Trim()
 $env:GIT_INDEX_FILE = $previousIndex
 Set-Location -LiteralPath $repo
 Invoke-Git -GitArgs @('push','origin',($commit + ':refs/heads/gh-pages')) | Out-Host
 Invoke-Git -GitArgs @('update-ref','refs/heads/gh-pages',$commit) | Out-Host
 Write-Output ('DEPLOY_COMMIT=' + $commit)
 Write-Output ('SOURCE_COMMIT=' + $source)
} finally {
 $env:GIT_INDEX_FILE = $previousIndex
 Set-Location -LiteralPath $previousLocation.Path
}
