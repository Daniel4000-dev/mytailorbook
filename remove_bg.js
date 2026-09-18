const { removeBackground } = require('@imgly/background-removal-node');
const fs = require('fs');
const path = require('path');

async function processImage(inputPath) {
    try {
        console.log(`Processing ${inputPath}...`);
        const blob = await removeBackground(inputPath);
        const buffer = Buffer.from(await blob.arrayBuffer());
        fs.writeFileSync(inputPath, buffer);
        console.log(`Saved transparent image to ${inputPath}`);
    } catch (e) {
        console.error(`Error processing ${inputPath}:`, e);
    }
}

async function main() {
    const outputDir = '/Users/mac/Desktop/mytailorbook/public/mascots';

    const files = [
        'female_1.png', 'female_2.png', 'female_3.png',
        'male_1.png', 'male_2.png', 'male_3.png'
    ];

    for (const file of files) {
        const fullPath = path.join(outputDir, file);
        await processImage(fullPath);
    }
}

main();
