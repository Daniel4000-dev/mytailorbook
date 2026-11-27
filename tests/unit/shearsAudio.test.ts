import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Bespoke Tailoring Notification Sound & Haptic Signature Suite', () => {
  const publicWavPath = path.join(process.cwd(), 'public/sounds/shears_snip.wav');
  const androidWavPath = path.join(process.cwd(), 'android/app/src/main/res/raw/shears_snip.wav');

  it('State 1 (Audio Asset Integrity): public shears_snip.wav exists with valid RIFF/WAVE header', () => {
    expect(fs.existsSync(publicWavPath)).toBe(true);
    const buffer = fs.readFileSync(publicWavPath);
    expect(buffer.length).toBeGreaterThan(10000); // ~37KB
    // Check RIFF header
    expect(buffer.toString('ascii', 0, 4)).toBe('RIFF');
    // Check WAVE identifier
    expect(buffer.toString('ascii', 8, 12)).toBe('WAVE');
  });

  it('State 2 (Android Native Channel Resource): android raw shears_snip.wav matches public audio asset', () => {
    expect(fs.existsSync(androidWavPath)).toBe(true);
    const publicBuf = fs.readFileSync(publicWavPath);
    const androidBuf = fs.readFileSync(androidWavPath);
    expect(publicBuf.equals(androidBuf)).toBe(true);
  });

  it('State 3 (Android Manifest & MainActivity Registration): MainActivity contains workshop_alerts channel with shears_snip sound', () => {
    const mainActivityPath = path.join(process.cwd(), 'android/app/src/main/java/com/mystitchbooks/app/MainActivity.java');
    const source = fs.readFileSync(mainActivityPath, 'utf-8');
    expect(source).toContain('workshop_alerts');
    expect(source).toContain('shears_snip');
    expect(source).toContain('createNotificationChannel');
  });

  it('State 4 (ServiceWorker Notification Options): app/sw.ts configures shears_snip audio and double-stitch haptic pattern', () => {
    const swPath = path.join(process.cwd(), 'app/sw.ts');
    const swSource = fs.readFileSync(swPath, 'utf-8');
    expect(swSource).toContain('/sounds/shears_snip.wav');
    expect(swSource).toContain('vibrate: [80, 50, 80]');
  });
});
