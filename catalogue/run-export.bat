@echo off
echo.
echo ====================================
echo  Facebook Catalog Export
echo ====================================
echo.
echo Starting export...
echo.

cd /d "%~dp0.."
node catalogue/export-catalog-simple.js

echo.
echo ====================================
echo  Export Complete!
echo ====================================
echo.
echo The CSV file is ready in:
echo %~dp0facebook-product-catalog.csv
echo.
pause
