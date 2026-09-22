@echo off
chcp 65001 >nul
title WEBP Converter

cd /d "%~dp0"

echo.
echo ========================================
echo        IMAGE TO WEBP CONVERTER
echo ========================================
echo.

if not "%~1"=="" (
    set "folder=%~1"
) else (
    echo Вставьте путь к корневой папке с изображениями.
    echo Все вложенные папки будут обработаны автоматически.
    echo Например:
    echo D:\Фото товаров\Насосы
    echo.
    echo После вставки нажмите ENTER.
    echo.
    set /p "folder=Путь: "
)

:: Убираем кавычки, если путь был скопирован как "D:\Фото"
set "folder=%folder:"=%"

echo.
echo Запускаю рекурсивную конвертацию...
echo.

node "%~dp0converter.js" "%folder%"

echo.
echo ========================================
echo Нажмите любую клавишу для закрытия.
echo ========================================
pause >nul
