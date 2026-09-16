@echo off
rem O auxiliar inicia exclusivamente o backend oficial irmao e o frontend.
PowerShell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-erp-local.ps1" -ProjectRoot "%~dp0." %*
