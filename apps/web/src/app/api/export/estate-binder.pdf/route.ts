import { prisma } from '@/lib/prisma';
import { requireAuth, getCurrentPrincipal } from '@/lib/auth';
import PDFDocument from 'pdfkit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Generates and streams an "estate binder" PDF summary.
 * Sensitive fields (account numbers, instruction bodies, SSN/SIN) are
 * NEVER included here — executors get those through a separate audited flow.
 */
export async function GET() {
  try {
    const user = await requireAuth();
    const principal = await getCurrentPrincipal(user.tenantId);
    if (!principal) return new Response('No principal data', { status: 404 });

    const [full] = await Promise.all([
      prisma.principal.findUnique({
        where: { id: principal.id },
        include: {
          contacts: { where: { deletedAt: null }, orderBy: { lastName: 'asc' } },
          assets: {
            where: { deletedAt: null },
            include: {
              beneficiaries: { where: { deletedAt: null }, include: { person: true } },
            },
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
      }),
    ]);
    if (!full) return new Response('Principal not found', { status: 404 });

    const doc = new PDFDocument({ size: 'LETTER', margin: 54 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));

    const done = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    // Cover
    doc.fontSize(28).font('Helvetica-Bold').text('Estate Binder', { align: 'center' });
    doc.moveDown(0.5);
    doc
      .fontSize(14)
      .font('Helvetica')
      .text(`${full.legalFirstName} ${full.legalLastName}`, { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(10).fillColor('#666');
    doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.text('CONFIDENTIAL — for the Principal and authorized executors only.', {
      align: 'center',
    });
    doc.fillColor('black').moveDown(3);

    // Principal
    sectionHeader(doc, 'Principal');
    doc.fontSize(10);
    if (full.dateOfBirth) doc.text(`Date of birth: ${full.dateOfBirth.toDateString()}`);
    if (full.residenceCountry) {
      doc.text(
        `Residence: ${full.residenceRegion ?? ''} ${full.residenceCountry}`.trim(),
      );
    }
    doc.moveDown();

    // Trusted contacts
    sectionHeader(doc, 'Trusted contacts');
    if (full.trustedContacts.length === 0) {
      doc.fontSize(10).fillColor('#888').text('None documented.').fillColor('black');
    } else {
      for (const tc of full.trustedContacts) {
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .text(`${tc.person.firstName} ${tc.person.lastName}`, { continued: true })
          .font('Helvetica')
          .text(` — ${tc.person.relationship} · ${tc.accessTier}`);
        if (tc.person.email) {
          doc.fontSize(10).fillColor('#555').text(tc.person.email).fillColor('black');
        }
        doc.moveDown(0.5);
      }
    }
    doc.moveDown();

    // Assets
    sectionHeader(doc, 'Assets');
    const grouped = new Map<string, typeof full.assets>();
    for (const a of full.assets) {
      const list = grouped.get(a.category) ?? [];
      list.push(a);
      grouped.set(a.category, list);
    }
    for (const [cat, list] of grouped) {
      doc.fontSize(12).font('Helvetica-Bold').text(humanize(cat));
      doc.font('Helvetica').fontSize(10);
      for (const a of list) {
        const dollars = a.estimatedValueCents
          ? `$${(Number(a.estimatedValueCents) / 100).toLocaleString()} ${a.currency}`
          : '—';
        doc.text(
          `• ${a.nickname}${a.institutionName ? ` · ${a.institutionName}` : ''}${a.accountLast4 ? ` · ****${a.accountLast4}` : ''}  [${dollars}]`,
        );
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
      doc.moveDown(0.5);
    }
    doc.moveDown();

    // Documents
    sectionHeader(doc, 'Documents on file');
    if (full.documents.length === 0) {
      doc.fontSize(10).fillColor('#888').text('None uploaded.').fillColor('black');
    } else {
      for (const d of full.documents) {
        doc.fontSize(10).text(`• ${d.title} (${humanize(d.category)})`);
      }
    }
    doc.moveDown();

    // Instructions
    sectionHeader(doc, 'Letters & wishes');
    if (full.instructions.length === 0) {
      doc.fontSize(10).fillColor('#888').text('None documented.').fillColor('black');
    } else {
      for (const i of full.instructions) {
        doc.fontSize(10).text(`• ${i.title} (${humanize(i.category)})`);
      }
      doc
        .moveDown(0.3)
        .fontSize(8)
        .fillColor('#888')
        .text('Letter bodies are released under separate executor access per your settings.')
        .fillColor('black');
    }

    doc.end();
    const pdf = await done;

    return new Response(pdf as unknown as BodyInit, {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="estate-binder-${Date.now()}.pdf"`,
        'cache-control': 'private, no-store',
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error(err);
    return new Response('PDF generation failed', { status: 500 });
  }
}

function sectionHeader(doc: PDFKit.PDFDocument, title: string) {
  doc.moveDown();
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#122038').text(title);
  doc.fillColor('black').font('Helvetica').moveTo(54, doc.y).lineTo(558, doc.y).stroke('#ccc');
  doc.moveDown(0.5);
}

function humanize(s: string): string {
  return s
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
