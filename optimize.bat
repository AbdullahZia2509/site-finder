@echo off
echo Building and running GeoJSON optimization in Docker...

docker build -t geojson-optimizer .
if %ERRORLEVEL% NEQ 0 (
    echo Error building Docker image. Make sure Docker Desktop is running.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ===================================================
echo Starting GeoJSON optimization...
echo ===================================================
echo.

docker run --rm -v "%CD%\public:/app/public" -v "%CD%\public:/public" geojson-optimizer

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ===================================================
    echo Optimization complete!
    echo Optimized files are in: %CD%\public\optimized
    echo Vector tiles are in: %CD%\public\vector-tiles
    echo ===================================================
) else (
    echo.
    echo ===================================================
    echo Error during optimization. Check the error messages above.
    echo ===================================================
)

pause
