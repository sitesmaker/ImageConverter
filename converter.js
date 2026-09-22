const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

// Получаем путь из BAT
const folder = process.argv[2];

const WEBP_QUALITY = 85;
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png"];

if (!folder) {
    console.error("Не указан путь к папке.");
    process.exit(1);
}

if (!fs.existsSync(folder)) {
    console.error(`Папка не найдена: ${folder}`);
    process.exit(1);
}

if (!fs.statSync(folder).isDirectory()) {
    console.error(`Указанный путь не является папкой: ${folder}`);
    process.exit(1);
}

function isSupportedImage(filePath) {
    const extension = path.extname(filePath).toLowerCase();
    return ALLOWED_EXTENSIONS.includes(extension);
}

function findImagesRecursively(rootFolder) {
    const images = [];
    const directories = [rootFolder];

    while (directories.length > 0) {
        const currentFolder = directories.pop();
        const entries = fs.readdirSync(currentFolder, {
            withFileTypes: true
        });

        for (const entry of entries) {
            const entryPath = path.join(currentFolder, entry.name);

            if (entry.isDirectory()) {
                directories.push(entryPath);
            } else if (entry.isFile() && isSupportedImage(entry.name)) {
                images.push(entryPath);
            }
        }
    }

    return images.sort((left, right) =>
        left.localeCompare(right, "ru", { sensitivity: "base" })
    );
}

async function convertImage(inputPath) {
    const extension = path.extname(inputPath).toLowerCase();
    const fileName = path.basename(inputPath);
    const fileNameWithoutExtension = path.basename(inputPath);
    const baseName = fileNameWithoutExtension.slice(0, -extension.length);
    const imageFolder = path.dirname(inputPath);
    const outputPath = path.join(imageFolder, `${baseName}.webp`);
    const relativeInputPath = path.relative(folder, inputPath);
    const relativeOutputPath = path.relative(folder, outputPath);

    try {
        // Защита от перезаписи существующего WebP
        if (fs.existsSync(outputPath)) {
            console.log(`ПРОПУСК: ${relativeInputPath}`);
            console.log(`Уже существует: ${relativeOutputPath}\n`);

            return {
                status: "exists"
            };
        }

        // Конвертируем с теми же параметрами, что и раньше
        await sharp(inputPath)
            .rotate()
            .webp({
                quality: WEBP_QUALITY
            })
            .toFile(outputPath);

        // Проверяем результат
        if (!fs.existsSync(outputPath)) {
            throw new Error("WebP не был создан");
        }

        const stats = fs.statSync(outputPath);

        if (stats.size === 0) {
            throw new Error("Создан пустой WebP");
        }

        // Проверяем, что Sharp может прочитать созданный файл
        await sharp(outputPath).metadata();

        // Сохраняем прежнюю логику: удаляем оригинал только после всех проверок
        fs.unlinkSync(inputPath);

        console.log(`OK: ${relativeInputPath}`);
        console.log(` -> ${relativeOutputPath}`);
        console.log("Исходник удален.\n");

        return {
            status: "success"
        };

    } catch (error) {
        console.error(`ОШИБКА: ${relativeInputPath}`);
        console.error(error.message);
        console.error("Исходник оставлен.\n");

        // Если WebP создался поврежденным —
        // пытаемся удалить только WebP
        if (fs.existsSync(outputPath)) {
            try {
                fs.unlinkSync(outputPath);
            } catch {}
        }

        return {
            status: "error"
        };
    }
}

async function start() {
    console.log("");
    console.log("========================================");
    console.log("       IMAGE -> WEBP CONVERTER");
    console.log("========================================");
    console.log(`Корневая папка: ${folder}`);
    console.log(`Качество WebP: ${WEBP_QUALITY}`);
    console.log("Режим: рекурсивный обход подпапок");
    console.log("========================================");
    console.log("");

    let images;

    try {
        images = findImagesRecursively(folder);
    } catch (error) {
        console.error("Не удалось прочитать одну из папок:");
        console.error(error.message);
        process.exitCode = 1;
        return;
    }

    if (images.length === 0) {
        console.log("JPG/JPEG/PNG не найдены в выбранной папке и подпапках.");
        return;
    }

    console.log(`Найдено изображений: ${images.length}\n`);

    let success = 0;
    let errors = 0;
    let exists = 0;

    for (let i = 0; i < images.length; i++) {

        console.log(`[${i + 1}/${images.length}]`);

        const result = await convertImage(images[i]);

        if (result.status === "success") {
            success++;
        }

        if (result.status === "error") {
            errors++;
        }

        if (result.status === "exists") {
            exists++;
        }
    }

    console.log("========================================");
    console.log("ГОТОВО");
    console.log("========================================");
    console.log(`Успешно: ${success}`);
    console.log(`Ошибок: ${errors}`);
    console.log(`Пропущено: ${exists}`);
    console.log("========================================");
}

start().catch(error => {
    console.error("Критическая ошибка:");
    console.error(error.message);
    process.exitCode = 1;
});
