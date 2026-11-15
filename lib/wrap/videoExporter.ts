import type { StitchWrapData } from './types';

/**
 * 9:16 Vertical Video Reel Exporter for Stitch Wrap (1080x1920)
 * Uses native HTML5 Canvas + MediaRecorder API to generate a video file
 * with the selected audio track baked in.
 */
export async function exportStitchWrapVideo({
  data,
  audioTrack,
  isClientMasked = true,
  isRevenueMasked = false,
  onProgress,
}: {
  data: StitchWrapData;
  audioTrack: MediaStreamTrack | null;
  isClientMasked?: boolean;
  isRevenueMasked?: boolean;
  onProgress?: (percent: number, status: string) => void;
}): Promise<{ blob: Blob; url: string; filename: string }> {
  if (typeof window === 'undefined') {
    throw new Error('Video export can only be run in the browser.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not initialize 2D canvas context.');

  const stream = canvas.captureStream(30); // 30 FPS

  // If audio track is provided, combine it
  if (audioTrack) {
    stream.addTrack(audioTrack);
  }

  // Determine supported mime type
  const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1,mp4a.40.2')
    ? 'video/mp4;codecs=avc1,mp4a.40.2'
    : MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
    ? 'video/webm;codecs=vp9,opus'
    : 'video/webm';

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 5_000_000, // 5 Mbps crisp 1080p
  });

  const recordedChunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };

  const totalSlides = 7;
  const durationPerSlideMs = 2000; // 2 seconds per chapter = 14s total reel
  const frameIntervalMs = 1000 / 30; // 30 FPS
  const totalFramesPerSlide = Math.floor(durationPerSlideMs / frameIntervalMs);
  const totalFrames = totalSlides * totalFramesPerSlide;

  recorder.start();

  let currentFrame = 0;

  for (let slideIdx = 0; slideIdx < totalSlides; slideIdx++) {
    for (let f = 0; f < totalFramesPerSlide; f++) {
      const slideProgress = f / totalFramesPerSlide;
      renderEditorialFrame({
        ctx,
        data,
        slideIdx,
        slideProgress,
        isClientMasked,
        isRevenueMasked,
      });

      currentFrame++;
      const overallPercent = Math.min(99, Math.round((currentFrame / totalFrames) * 100));
      onProgress?.(
        overallPercent,
        `Rendering chapter ${slideIdx + 1} of ${totalSlides} (${overallPercent}%)...`
      );

      // Yield frame timing
      await new Promise((resolve) => setTimeout(resolve, frameIntervalMs));
    }
  }

  onProgress?.(100, 'Finalizing video reel...');

  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const blob = new Blob(recordedChunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const filename = `${data.shopName.toLowerCase().replace(/\s+/g, '-')}-stitch-wrap-2026.${extension}`;
      resolve({ blob, url, filename });
    };
    recorder.onerror = (e) => reject(e);
    recorder.stop();
  });
}

/**
 * High-Fashion Editorial Frame Renderer (1080x1920)
 * Draws high-contrast typography, luxury care label tags, barcodes, and kinetic glows.
 */
function renderEditorialFrame({
  ctx,
  data,
  slideIdx,
  slideProgress,
  isClientMasked,
  isRevenueMasked,
}: {
  ctx: CanvasRenderingContext2D;
  data: StitchWrapData;
  slideIdx: number;
  slideProgress: number;
  isClientMasked: boolean;
  isRevenueMasked: boolean;
}) {
  const W = 1080;
  const H = 1920;
  const theme = data.theme;

  // 1. Deep Obsidian / Brand Background
  ctx.fillStyle = '#0a0a0c';
  ctx.fillRect(0, 0, W, H);

  // 2. High-Voltage Saturated Color Aura
  const grad = ctx.createRadialGradient(
    W * 0.5 + Math.sin(slideProgress * Math.PI * 2) * 80,
    H * 0.45,
    50,
    W * 0.5,
    H * 0.45,
    W * 0.85
  );
  grad.addColorStop(0, theme.blobColor1);
  grad.addColorStop(0.5, theme.blobColor2);
  grad.addColorStop(1, 'rgba(10, 10, 12, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // 3. Top Progress Tracks
  const totalSlides = 7;
  const trackGap = 12;
  const trackWidth = (W - 120 - (totalSlides - 1) * trackGap) / totalSlides;
  for (let i = 0; i < totalSlides; i++) {
    const x = 60 + i * (trackWidth + trackGap);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.roundRect(x, 60, trackWidth, 8, 4);
    ctx.fill();

    if (i < slideIdx) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(x, 60, trackWidth, 8, 4);
      ctx.fill();
    } else if (i === slideIdx) {
      ctx.fillStyle = theme.accentColor;
      ctx.beginPath();
      ctx.roundRect(x, 60, trackWidth * slideProgress, 8, 4);
      ctx.fill();
    }
  }

  // 4. Header Bar: Workshop Brand & Archetype Pill
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 34px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText(data.shopName.toUpperCase(), 60, 130);

  ctx.fillStyle = theme.accentColor;
  ctx.font = '700 24px monospace';
  ctx.fillText(`// ${theme.auraTitle.toUpperCase()}`, 60, 170);

  // 5. Luxury Garment Care Label Motif (Top Right)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(W - 360, 95, 300, 80);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '700 18px monospace';
  ctx.fillText('100% PURE CRAFT', W - 340, 128);
  ctx.font = '500 15px monospace';
  ctx.fillText('DO NOT TUMBLE DRY THE HUSTLE', W - 340, 155);

  // 6. Chapter Content Rendering
  switch (slideIdx) {
    case 0:
      drawChapter0(ctx, data, W, H, theme);
      break;
    case 1:
      drawChapter1(ctx, data, W, H, theme);
      break;
    case 2:
      drawChapter2(ctx, data, W, H, theme, isClientMasked);
      break;
    case 3:
      drawChapter3(ctx, data, W, H, theme);
      break;
    case 4:
      drawChapter4(ctx, data, W, H, theme);
      break;
    case 5:
      drawChapter5(ctx, data, W, H, theme, isRevenueMasked);
      break;
    case 6:
      drawChapter6(ctx, data, W, H, theme);
      break;
  }

  // 7. Bottom Barcode & Footer Watermark
  drawBarcode(ctx, 60, H - 150, 400, 50);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = '600 20px monospace';
  ctx.fillText('POWERED BY MYSTITCHBOOK // 2026 STITCH WRAP', 60, H - 80);
}

function drawChapter0(ctx: CanvasRenderingContext2D, data: StitchWrapData, W: number, H: number, theme: any) {
  ctx.fillStyle = theme.accentColor;
  ctx.font = '800 28px monospace';
  ctx.fillText('★ CHAPTER 01 // ORIGIN & TENURE', 60, 360);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 italic 82px -apple-system, BlinkMacSystemFont, sans-serif';
  const title1 = data.isMidYearJoiner ? 'JOINED THE RANKS' : '365 DAYS OF CRAFT';
  ctx.fillText(title1, 60, 460);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.font = '500 34px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(
    data.isMidYearJoiner
      ? `Started cutting cloth with us in ${data.joinedDate}.`
      : 'From January dawn to the December runway crush.',
    60,
    530
  );

  // Giant Stat Callout
  ctx.fillStyle = theme.accentColor;
  ctx.font = '900 italic 220px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(`${data.totalGarments}`, 60, 840);

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 46px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('BESPOKE GARMENTS CRAFTED', 60, 920);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '500 32px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(
    `Averaged ${(data.totalGarments / (data.monthsActive || 12)).toFixed(1)} completed fits every single month.`,
    60,
    980
  );
}

function drawChapter1(ctx: CanvasRenderingContext2D, data: StitchWrapData, W: number, H: number, theme: any) {
  ctx.fillStyle = theme.accentColor;
  ctx.font = '800 28px monospace';
  ctx.fillText('★ CHAPTER 02 // THE CUTTING TABLE', 60, 360);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 italic 80px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('FABRIC MILEAGE', 60, 460);

  ctx.fillStyle = theme.accentColor;
  ctx.font = '900 italic 200px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(`~${data.estimatedFabricYards}`, 60, 760);

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 50px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('YARDS OF CLOTH SLICED', 60, 840);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.font = '500 34px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('Enough luxury silk, wool, and brocade to wrap an Olympic stadium!', 60, 920);

  // Sub Card
  drawGlassCard(ctx, 60, 1020, W - 120, 240);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = '700 24px monospace';
  ctx.fillText('ON-TIME DELIVERY COMMITMENT', 100, 1080);
  ctx.fillStyle = '#10b981';
  ctx.font = '900 68px -apple-system, sans-serif';
  ctx.fillText(`${data.onTimeDeliveryRate}% PROMISES HONORED`, 100, 1170);
}

function drawChapter2(
  ctx: CanvasRenderingContext2D,
  data: StitchWrapData,
  W: number,
  H: number,
  theme: any,
  isClientMasked: boolean
) {
  ctx.fillStyle = theme.accentColor;
  ctx.font = '800 28px monospace';
  ctx.fillText('★ CHAPTER 03 // INNER CIRCLE', 60, 360);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 italic 80px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('DRESSED THE NATION', 60, 460);

  ctx.fillStyle = theme.accentColor;
  ctx.font = '900 italic 200px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(`${data.totalClients}`, 60, 740);

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 46px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('UNIQUE CLIENTS DRESSED', 60, 820);

  // VIP Patron Card
  drawGlassCard(ctx, 60, 930, W - 120, 360);
  ctx.fillStyle = '#f59e0b';
  ctx.font = '800 28px monospace';
  ctx.fillText('⭐ PATRON OF THE YEAR', 100, 990);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 60px -apple-system, sans-serif';
  const clientName = isClientMasked ? data.topClient.maskedName : data.topClient.name;
  ctx.fillText(clientName, 100, 1070);

  ctx.fillStyle = theme.accentColor;
  ctx.font = '700 36px -apple-system, sans-serif';
  ctx.fillText(`✂️ ${data.topClient.garmentCount} Bespoke Garments Commissioned`, 100, 1140);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = '500 28px -apple-system, sans-serif';
  ctx.fillText('Your biggest workshop believer in 2026.', 100, 1200);
}

function drawChapter3(ctx: CanvasRenderingContext2D, data: StitchWrapData, W: number, H: number, theme: any) {
  ctx.fillStyle = theme.accentColor;
  ctx.font = '800 28px monospace';
  ctx.fillText('★ CHAPTER 04 // SIGNATURE SILHOUETTE', 60, 360);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 italic 80px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('YOUR CROWN PIECE', 60, 460);

  ctx.fillStyle = theme.accentColor;
  ctx.font = '900 84px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(data.topGarmentStyle.toUpperCase(), 60, 680);

  ctx.fillStyle = '#ffffff';
  ctx.font = '600 36px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('Your most demanded silhouette on the cutting table.', 60, 750);

  // Busiest Month Card
  drawGlassCard(ctx, 60, 880, W - 120, 380);
  ctx.fillStyle = '#f97316';
  ctx.font = '800 28px monospace';
  ctx.fillText('⚡ PEAK RUNWAY MONTH', 100, 940);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 74px -apple-system, sans-serif';
  ctx.fillText(data.busiestMonth.name.toUpperCase(), 100, 1040);

  ctx.fillStyle = theme.accentColor;
  ctx.font = '700 36px -apple-system, sans-serif';
  ctx.fillText(`Delivered ${data.busiestMonth.garmentCount} completed garments in 30 days!`, 100, 1110);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.font = '500 28px -apple-system, sans-serif';
  ctx.fillText('Peak Owambe & celebration rush. Pure master tailor momentum.', 100, 1180);
}

function drawChapter4(ctx: CanvasRenderingContext2D, data: StitchWrapData, W: number, H: number, theme: any) {
  ctx.fillStyle = theme.accentColor;
  ctx.font = '800 28px monospace';
  ctx.fillText('★ CHAPTER 05 // TABLE RESILIENCE', 60, 360);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 italic 80px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('DAILY MASTERY', 60, 460);

  ctx.fillStyle = '#f97316';
  ctx.font = '900 italic 220px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(`${data.longestStreak}`, 60, 760);

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 48px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('DAY CRAFT STREAK UNBROKEN', 60, 840);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '500 34px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('Showing up at your sewing machine every single day.', 60, 910);

  drawGlassCard(ctx, 60, 1010, W - 120, 260);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = '700 24px monospace';
  ctx.fillText('ACTIVE WORKSHOP LOG', 100, 1070);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 64px -apple-system, sans-serif';
  ctx.fillText(`${data.totalActiveDays} DAYS LOGGED IN 2026`, 100, 1160);
}

function drawChapter5(
  ctx: CanvasRenderingContext2D,
  data: StitchWrapData,
  W: number,
  H: number,
  theme: any,
  isRevenueMasked: boolean
) {
  ctx.fillStyle = theme.accentColor;
  ctx.font = '800 28px monospace';
  ctx.fillText('★ CHAPTER 06 // WORKSHOP COMMERCE', 60, 360);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 italic 80px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('ANNUAL TURNOVER', 60, 460);

  ctx.fillStyle = '#10b981';
  ctx.font = '900 italic 120px -apple-system, BlinkMacSystemFont, sans-serif';
  const rev = isRevenueMasked ? '₦ •••••••••••' : `₦${data.totalRevenue.toLocaleString()}`;
  ctx.fillText(rev, 60, 680);

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 42px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('TOTAL BESPOKE PRODUCTION VALUE', 60, 760);

  drawGlassCard(ctx, 60, 900, W - 120, 320);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = '700 24px monospace';
  ctx.fillText('AVERAGE FIT VALUATION', 100, 960);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 64px -apple-system, sans-serif';
  const avg = isRevenueMasked ? '₦ •••' : `₦${Math.round(data.totalRevenue / data.totalGarments).toLocaleString()}`;
  ctx.fillText(avg, 100, 1050);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '500 28px -apple-system, sans-serif';
  ctx.fillText('100% deposit health · Zero lost client balances', 100, 1120);
}

function drawChapter6(ctx: CanvasRenderingContext2D, data: StitchWrapData, W: number, H: number, theme: any) {
  ctx.fillStyle = theme.accentColor;
  ctx.font = '800 28px monospace';
  ctx.fillText('★ CHAPTER 07 // 2026 TAILOR TROPHY', 60, 360);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 italic 82px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(data.archetype.title.toUpperCase(), 60, 480);

  ctx.fillStyle = theme.accentColor;
  ctx.font = '700 40px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(data.archetype.subtitle, 60, 550);

  drawGlassCard(ctx, 60, 650, W - 120, 620);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = '500 32px -apple-system, BlinkMacSystemFont, sans-serif';
  wrapText(ctx, data.archetype.description, 100, 740, W - 200, 46);

  // Summary Metrics Table inside Card
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(100, 900);
  ctx.lineTo(W - 100, 900);
  ctx.stroke();

  ctx.fillStyle = theme.accentColor;
  ctx.font = '900 52px -apple-system, sans-serif';
  ctx.fillText(`${data.totalGarments}`, 100, 980);
  ctx.fillText(`~${data.estimatedFabricYards} yds`, 400, 980);
  ctx.fillText(`${data.longestStreak}d`, 760, 980);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = '700 20px monospace';
  ctx.fillText('GARMENTS', 100, 1020);
  ctx.fillText('CLOTH CUT', 400, 1020);
  ctx.fillText('STREAK', 760, 1020);
}

function drawGlassCard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 28);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawBarcode(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = '#ffffff';
  let curX = x;
  while (curX < x + w) {
    const barW = Math.random() > 0.5 ? 4 : 8;
    ctx.fillRect(curX, y, barW, h);
    curX += barW + (Math.random() > 0.5 ? 4 : 6);
  }
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(' ');
  let line = '';
  let curY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, curY);
      line = words[n] + ' ';
      curY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, curY);
}
