# Starts the project's dedicated dev MongoDB (single-node replica set, required for
# multi-document transactions). Separate from any system-installed MongoDB service
# on port 27017 -- runs on 27018 with its own data directory, no admin rights needed.

$dataPath = "$env:USERPROFILE\.soso-dash-mongo\data"
$logPath = "$env:USERPROFILE\.soso-dash-mongo\log\mongod.log"

if (-not (Test-Path $dataPath)) { New-Item -ItemType Directory -Force -Path $dataPath | Out-Null }
if (-not (Test-Path (Split-Path $logPath))) { New-Item -ItemType Directory -Force -Path (Split-Path $logPath) | Out-Null }

if (Get-NetTCPConnection -LocalPort 27018 -ErrorAction SilentlyContinue) {
    Write-Output "Dev MongoDB already running on port 27018."
    exit 0
}

Start-Process -FilePath "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" `
    -ArgumentList @("--dbpath", $dataPath, "--port", "27018", "--replSet", "rs0", "--bind_ip", "127.0.0.1", "--logpath", $logPath, "--logappend") `
    -WindowStyle Hidden

Write-Output "Dev MongoDB starting on port 27018 (replica set rs0). Check $logPath for status."
