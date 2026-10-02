import path from 'node:path';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { certificateCopy } from '@/content/certificate';
import { attachmentDisposition } from '@/lib/csv';
import { formatDate } from '@/lib/format';
import { layoutLine, wrapText } from '@/lib/rtl-text';
import { certificateDates, type CertificateRecord } from './certificates';

/**
 * Renders a certificate as a one-page A4 landscape PDF. Persian lines go
 * through src/lib/rtl-text.ts (PDFKit alone gets right-to-left word order
 * wrong). Fonts are the static Vazirmatn TTFs in src/fonts (OFL); the files
 * are read at run time, so next.config.ts traces them into the build.
 */

const FONT_REGULAR = path.join(process.cwd(), 'src/fonts/Vazirmatn-Regular.ttf');
const FONT_BOLD = path.join(process.cwd(), 'src/fonts/Vazirmatn-Bold.ttf');
const LOGO = path.join(process.cwd(), 'public/brand/bdc-logo.png');

/** Mirrors the tokens in src/app/globals.css (a PDF cannot read CSS variables). */
const colors = {
  brand: '#0b2257', // --color-brand-900
  primary: '#1450c8', // --color-primary
  accent: '#14a3a8', // --color-accent
  ink2: '#3a4660', // --color-ink-2
  line: '#e1e6ee', // --color-line
};

type Align = 'center' | 'right' | 'left';
type Box = { x: number; width: number };

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '');
}

export function verificationUrl(siteUrl: string, code: string): string {
  return new URL(`/certificates/${code}`, siteUrl).toString();
}

export async function renderCertificatePdf(
  certificate: CertificateRecord,
  siteUrl: string,
): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margin: 0,
    font: FONT_REGULAR,
    info: {
      Title: `${certificateCopy.title} — ${certificate.fullName}`,
      Author: certificateCopy.issuer,
      Subject: certificate.courseTitle,
    },
  });
  doc.registerFont('regular', FONT_REGULAR);
  doc.registerFont('bold', FONT_BOLD);

  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const W = doc.page.width;
  const H = doc.page.height;
  const full: Box = { x: 90, width: W - 180 };

  /** One right-to-left line, placed by hand piece by piece. */
  function line(
    text: string,
    y: number,
    size: number,
    font: 'regular' | 'bold',
    color: string,
    box = full,
    align: Align = 'center',
  ) {
    doc.font(font).fontSize(size).fillColor(color);
    const space = doc.widthOfString(' ');
    const pieces = layoutLine(text);
    const widths = pieces.map((p) =>
      p.kind === 'space' ? p.count * space : doc.widthOfString(p.text),
    );
    const total = widths.reduce((sum, w) => sum + w, 0);
    let x =
      align === 'center'
        ? box.x + (box.width - total) / 2
        : align === 'right'
          ? box.x + box.width - total
          : box.x;
    pieces.forEach((piece, i) => {
      if (piece.kind === 'text') doc.text(piece.text, x, y, { lineBreak: false });
      x += widths[i]!;
    });
  }

  /** Wrapped lines; returns the y below the last one. */
  function paragraph(
    text: string,
    y: number,
    size: number,
    font: 'regular' | 'bold',
    color: string,
    lineHeight: number,
    box = full,
  ) {
    doc.font(font).fontSize(size);
    const lines = wrapText(text, box.width, (t) => doc.widthOfString(t));
    lines.forEach((text, i) => line(text, y + i * lineHeight, size, font, color, box));
    return y + lines.length * lineHeight;
  }

  // Frame: a navy outer border and a thin turquoise inner one.
  doc
    .lineWidth(3)
    .strokeColor(colors.brand)
    .rect(24, 24, W - 48, H - 48)
    .stroke();
  doc
    .lineWidth(0.8)
    .strokeColor(colors.accent)
    .rect(34, 34, W - 68, H - 68)
    .stroke();

  doc.image(LOGO, (W - 64) / 2, 52, { width: 64 });
  line(certificateCopy.title, 122, 30, 'bold', colors.brand);
  line(certificateCopy.issuer, 170, 12, 'regular', colors.ink2);
  doc
    .lineWidth(0.8)
    .strokeColor(colors.line)
    .moveTo(W / 2 - 120, 196)
    .lineTo(W / 2 + 120, 196)
    .stroke();

  let y = 214;
  line(certificateCopy.intro, y, 15, 'regular', colors.ink2);
  y = paragraph(certificate.fullName, y + 30, 26, 'bold', colors.primary, 40);
  line(certificateCopy.beforeCourse, y + 2, 15, 'regular', colors.ink2);
  y = paragraph(certificate.courseTitle, y + 30, 21, 'bold', colors.brand, 34);
  line(
    fill(certificateCopy.outro, { dates: certificateDates(certificate) }),
    y + 4,
    15,
    'regular',
    colors.ink2,
  );

  // Bottom right: verification (QR, code, address). Bottom left: signatory.
  const bottom = H - 64;
  const url = verificationUrl(siteUrl, certificate.code);
  const qr = QRCode.create(url, { errorCorrectionLevel: 'M' });
  const qrSize = 74;
  const cell = qrSize / qr.modules.size;
  const qrX = W - 66 - qrSize;
  const qrY = bottom - qrSize;
  doc.fillColor(colors.brand);
  for (let row = 0; row < qr.modules.size; row++) {
    for (let col = 0; col < qr.modules.size; col++) {
      if (qr.modules.get(row, col)) doc.rect(qrX + col * cell, qrY + row * cell, cell, cell).fill();
    }
  }
  const textBox: Box = { x: W / 2, width: qrX - 12 - W / 2 };
  line(
    fill(certificateCopy.issuedOn, { date: formatDate(certificate.issuedAt) }),
    qrY + 2,
    10,
    'regular',
    colors.ink2,
    textBox,
    'right',
  );
  line(
    fill(certificateCopy.code, { code: certificate.code }),
    qrY + 20,
    11,
    'bold',
    colors.brand,
    textBox,
    'right',
  );
  line(certificateCopy.verifyHint, qrY + 40, 8.5, 'regular', colors.ink2, textBox, 'right');
  line(
    new URL('/certificates', siteUrl).host + '/certificates',
    qrY + 56,
    9,
    'regular',
    colors.primary,
    textBox,
    'right',
  );

  if (certificate.signatory) {
    const signBox: Box = { x: 70, width: 220 };
    doc
      .lineWidth(0.8)
      .strokeColor(colors.ink2)
      .moveTo(signBox.x + 30, qrY + 22)
      .lineTo(signBox.x + signBox.width - 30, qrY + 22)
      .stroke();
    line(certificate.signatory, qrY + 30, 12, 'bold', colors.brand, signBox);
    if (certificate.signatoryTitle)
      line(certificate.signatoryTitle, qrY + 50, 10, 'regular', colors.ink2, signBox);
  }

  doc.end();
  return done;
}

/** The PDF as a download response (route handlers only map input to this). */
export async function certificateResponse(certificate: CertificateRecord): Promise<Response> {
  // Not the request URL: behind a proxy that is the server's own address.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3010';
  const pdf = await renderCertificatePdf(certificate, siteUrl);
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': attachmentDisposition(`certificate-${certificate.code}.pdf`),
      'Cache-Control': 'private, no-store',
    },
  });
}
