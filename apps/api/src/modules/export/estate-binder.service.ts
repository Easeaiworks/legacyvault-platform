import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { Readable } from 'node:stream';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FieldCryptoService } from '../../common/crypto/field-crypto.service';
import { RequestUser } from '../auth/decorators/current-user.decorator';

/**
 * Generates an "estate binder" PDF — a printable summary of the user's estate:
 *   - Cover + generation metadata
 *   - Principal identity
 *   - Trusted contacts
 *   - Assets by category (with last-4 of account numbers only)
 *   - Beneficiaries
 *   - Instructions (titles + categories only — bodies are surfaced with
 *     explicit unlock by executors)
 *   - Documents index
 *
 * SECURITY NOTES:
 *   - We never include full account numbers, SSN/SIN, or instruction bodies
 *     in the base PDF. Those require an explicit "executor access PDF" with
 *     a separate audit event — added in Session 6.
 *   - The generation event is audited.
 */
@Injectable()
export class EstateBinderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: FieldCryptoService,
  ) {}

  async generate(user: RequestUser): Promise<Buffer> {
    const principal = await this.prisma.principal.findFirst({
      where: { tenantId: user.tenantId, deletedAt: null },
      include: {
        contacts: { where: { deletedAt: null }, orderBy: { lastName: 'asc' } },
        assets: {
          where: { deletedAt: null },
          include: { beneficiaries: { where: { deletedAt: null }, include: { person: true } } },
          orderBy: [{ category: 'asc' }, { nickname: 'asc' }],
        },
        documents: {
          where: { deletedAt: null },
          select: { title: true, category: true, documentDate: true, createdAt: true },
          orderBy: { category: 'asc' },
        },
        instructions: {
          where: { deletedAt: null },
          select: { category: true, title: true, createdAt: true },
          orderBy: { category: 'asc' },
        },
        trustedContacts: {
          where: { deletedAt: null },
          include: { person: true },
        },
      },
    });
    if (!principal) {
      return Buffer.from('No principal data to export.');
    }

    const doc = new PDFDocument({ size: 'LETTER', margin: 54 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

    // Cover page
    doc.fontSize(28).font('Helvetica-Bold').text('Estate Binder', { align: 'center' });
    doc.moveDown(0.5);
    doc
      .fontSize(14)
      .font('Helvetica')
      .text(`${principal.legalFirstName} ${principal.legalLastName}`, { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(10).fillColor('#666');
    doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.text('CONFIDENTIAL — for the Principal and authorized executors only.', {
      align: 'center',
    });
    doc.fillColor('black');
    doc.moveDown(3);

    // Sections
    this.sectionHeader(doc, 'Principal');
    doc.fontSize(10);
    if (principal.dateOfBirth) doc.text(`Date of birth: ${principal.dateOfBirth.toDateString()}`);
    if (principal.residenceCountry) {
      doc.text(
        `Residence: ${principal.residenceRegion ?? ''} ${principal.residenceCountry}`.trim(),
      );
    }
    doc.moveDown();

    this.sectionHeader(doc, 'Trusted contacts');
    if (principal.trustedContacts.length === 0) {
      doc.fontSize(10).fillColor('#888').text('None documented.').fillColor('black');
    } else {
      for (const tc of principal.trustedContacts) {
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .text(`${tc.person.firstName} ${tc.person.lastName}`, { continued: true })
          .font('Helvetica')
          .text(` — ${tc.person.relationship} · ${tc.accessTier}`);
        if (tc.person.email) doc.fontSize(10).fillColor('#555').text(tc.person.email).fillColor('black');
        doc.moveDown(0.5);
      }
    }
    doc.moveDown();

    this.sectionHeader(doc, 'Assets');
    const grouped = new Map<string, typeof principal.assets>();
    for (const a of principal.assets) {
      const list = grouped.get(a.category) ?? [];
      list.push(a);
      grouped.set(a.category, list);
    }
    for (const [cat, list] of grouped) {
      doc.fontSize(12).font('Helvetica-Bold').text(this.humanize(cat));
      doc.font('Helvetica').fontSize(10);
      for (const a of list) {
        const dollars = a.estimatedValueCents
          ? `$${(Number(a.estimatedValueCents) / 100).toLocaleString()} ${a.currency}`
          : '—';
        doc.text(
          `• ${a.nickname}${a.institutionName ? ` · ${a.institutionName}` : ''}${a.accountLast4 ? ` · ****${a.accountLast4}` : ''}  [${dollars}]`,
        );
        if (a.beneficiaries.length > 0) {
          for (const b of a.beneficiaries) {
            doc
              .fontSize(9)
              .fillColor('#555')
              .text(
                `     → ${b.designation} ${(b.shareBps / 100).toFixed(2)}%: ${b.person.firstName} ${b.person.lastName}`,
              )
              .fillColor('black')
              .fontSize(10);
          }
        }
      }
      doc.moveDown(0.5);
    }
    doc.moveDown();

    this.sectionHeader(doc, 'Documents on file');
    if (principal.documents.length === 0) {
      doc.fontSize(10).fillColor('#888').text('None uploaded.').fillColor('black');
    } else {
      for (const d of principal.documents) {
        doc
          .fontSize(10)
          .text(`• ${d.title} (${this.humanize(d.category)})`);
      }
    }
    doc.moveDown();

    this.sectionHeader(doc, 'Letters & wishes');
    if (principal.instructions.length === 0) {
      doc.fontSize(10).fillColor('#888').text('None documented.').fillColor('black');
    } else {
      for (const i of principal.instructions) {
        doc.fontSize(10).text(`• ${i.title} (${this.humanize(i.category)})`);
      }
      doc
        .moveDown(0.3)
        .fontSize(8)
        .fillColor('#888')
        .text('Letter bodies are released under separate executor access per your settings.')
        .fillColor('black');
    }

    doc.end();
    return done;
  }

  private sectionHeader(doc: PDFKit.PDFDocument, title: string) {
    doc.moveDown();
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#122038').text(title);
    doc.fillColor('black').font('Helvetica').moveTo(54, doc.y).lineTo(558, doc.y).stroke('#ccc');
    doc.moveDown(0.5);
  }

  private humanize(s: string): string {
    return s
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

// Fastify stream interop — not used yet but handy for streaming big PDFs later.
export function bufferToStream(buf: Buffer): Readable {
  return Readable.from(buf);
}
