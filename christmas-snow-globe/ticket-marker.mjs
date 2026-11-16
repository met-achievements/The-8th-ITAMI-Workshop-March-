import qrcode from './vendor/qrcode.mjs';
import { loadImage } from './media.mjs';

const markerWidth = 30;
const panelWidth = 16.15;
const symbolWidth = 13.5;
const iconWidth = 3.55;
const symbolInset = (panelWidth - symbolWidth) / 2;
const iconInset = (panelWidth - iconWidth) / 2;
const middle = panelWidth / 2;
const logoRadius = 1.98;
const iconUrl = new URL('./met-icon.png', import.meta.url);
export const ticketPatternRatio = panelWidth / markerWidth;

function createQr(value) {
  // Version 14 keeps its alignment patterns clear of the logo in the center.
  const hasRoomForLogo = value.length <= 194;
  const qr = qrcode(hasRoomForLogo ? 14 : 0, 'H');
  qr.addData(value, 'Byte');
  qr.make();
  return { qr, hasRoomForLogo };
}

export function ticketMarkerSvg(value) {
  const { qr, hasRoomForLogo } = createQr(value);
  const symbol = qr.createSvgTag({ cellSize: 1, margin: 0, scalable: true }).replace(
    '<svg ', `<svg x="${symbolInset}" y="${symbolInset}" width="${symbolWidth}" height="${symbolWidth}" `,
  );
  const logo = hasRoomForLogo ? `
    <circle cx="${middle}" cy="${middle}" r="${logoRadius}" fill="white"/>
    <image x="${iconInset}" y="${iconInset}" width="${iconWidth}" height="${iconWidth}" href="${iconUrl.href}" xlink:href="${iconUrl.href}"/>` : '';
  const inset = (markerWidth - panelWidth) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${markerWidth} ${markerWidth}" role="img" aria-label="写真のARを開くMETのQRコード">
    <rect width="${markerWidth}" height="${markerWidth}" fill="black"/>
    <svg x="${inset}" y="${inset}" width="${panelWidth}" height="${panelWidth}" viewBox="0 0 ${panelWidth} ${panelWidth}"><rect width="${panelWidth}" height="${panelWidth}" fill="white"/>${symbol}${logo}</svg>
  </svg>`;
}

export async function createTicketPattern(value) {
  const { qr, hasRoomForLogo } = createQr(value);
  const artwork = document.createElement('canvas');
  artwork.width = artwork.height = 512;
  const brush = artwork.getContext('2d');
  const scale = artwork.width / panelWidth;
  brush.scale(scale, scale);
  brush.fillStyle = 'white';
  brush.fillRect(0, 0, panelWidth, panelWidth);
  brush.fillStyle = 'black';
  const modules = qr.getModuleCount();
  const cell = symbolWidth / modules;
  for (let row = 0; row < modules; row++) {
    for (let column = 0; column < modules; column++) {
      if (qr.isDark(row, column)) {
        brush.fillRect(symbolInset + column * cell, symbolInset + row * cell, cell, cell);
      }
    }
  }
  if (hasRoomForLogo) {
    brush.fillStyle = 'white';
    brush.beginPath();
    brush.arc(middle, middle, logoRadius, 0, 2 * Math.PI);
    brush.fill();
    const icon = await loadImage(iconUrl.href);
    brush.drawImage(icon, iconInset, iconInset, iconWidth, iconWidth);
  }

  const side = 16;
  const block = artwork.width / side;
  const pixels = brush.getImageData(0, 0, artwork.width, artwork.height).data;
  // Average each cell of the pattern. The fine QR modules otherwise alias
  // when the artwork is reduced to the tracker's 16 × 16 samples.
  let cells = Array.from({ length: side }, (_, y) => Array.from({ length: side }, (_, x) => {
    const channels = [0, 0, 0];
    for (let dy = 0; dy < block; dy++) {
      for (let dx = 0; dx < block; dx++) {
        const offset = ((y * block + dy) * artwork.width + x * block + dx) * 4;
        channels[0] += pixels[offset];
        channels[1] += pixels[offset + 1];
        channels[2] += pixels[offset + 2];
      }
    }
    return channels.map(sum => Math.round(sum / (block * block)));
  }));
  const orientations = [];
  for (let turn = 0; turn < 4; turn++) {
    // ARToolKit pattern files store blue, green, then red for each orientation.
    const rows = [];
    for (const channel of [2, 1, 0]) {
      for (const row of cells) rows.push(row.map(cell => cell[channel]).join(' '));
    }
    orientations.push(rows.join('\n'));
    cells = cells.map((_, y) => cells.map(row => row[side - 1 - y]));
  }
  return new Blob([orientations.join('\n\n') + '\n'], { type: 'text/plain' });
}
