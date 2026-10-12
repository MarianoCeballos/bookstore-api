import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import PDFDocument from 'pdfkit';
import nodemailer, { SendMailOptions, Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly transporter?: Transporter;
  private readonly sender: string;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('EMAIL_HOST');
    this.sender =
      this.config.get<string>('EMAIL_FROM') ??
      this.config.get<string>('EMAIL_USER') ??
      '';
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.config.get<number>('EMAIL_PORT', 587),
        secure: this.config.get<boolean>('EMAIL_SECURE', false),
        auth: {
          user: this.config.get<string>('EMAIL_USER'),
          pass: this.config.get<string>('EMAIL_PASSWORD'),
        },
      });
    }
  }

  async send(
    to: string,
    subject: string,
    html: string,
    attachments: SendMailOptions['attachments'] = [],
  ): Promise<void> {
    if (!this.transporter || !this.sender) {
      throw new ServiceUnavailableException('Email delivery is not configured');
    }
    await this.transporter.sendMail({
      from: this.sender,
      to,
      subject,
      html,
      attachments,
    });
  }

  async sendConfirmation(email: string, name: string, url: string): Promise<void> {
    await this.send(
      email,
      'Confirm your Bookstore account',
      `<p>Hello ${this.escape(name)},</p><p>Confirm your account using this link:</p><p><a href="${this.escape(url)}">Confirm account</a></p>`,
    );
  }

  async sendPasswordReset(email: string, name: string, code: string): Promise<void> {
    await this.send(
      email,
      'Your Bookstore password reset code',
      `<p>Hello ${this.escape(name)},</p><p>Your password reset code is <strong>${this.escape(code)}</strong>.</p>`,
    );
  }

  async sendOrderReceipt(
    email: string,
    orderId: number,
    items: Array<{ title: string; unitPrice: string; quantity: number }>,
    total: string,
  ): Promise<void> {
    const lines = items
      .map(
        (item) =>
          `<li>${this.escape(item.title)} × ${item.quantity} — ${this.escape(item.unitPrice)}</li>`,
      )
      .join('');
    await this.send(
      email,
      `Bookstore order ${orderId}`,
      `<p>Your order is confirmed.</p><ul>${lines}</ul><p>Total: ${this.escape(total)}</p>`,
      [
        {
          filename: `order-${orderId}.pdf`,
          contentType: 'application/pdf',
          content: await this.createPdf(
            `Order ${orderId}`,
            `Total items purchased: ${items.reduce((count, item) => count + item.quantity, 0)}\nTotal amount: ${total}\n${items.map((item) => `${item.title} x ${item.quantity} — ${item.unitPrice}`).join('\n')}`,
          ),
        },
      ],
    );
  }

  async sendEbooks(
    email: string,
    items: Array<{ title: string; description: string }>,
  ): Promise<void> {
    const links = items
      .map(
        (item) => `<li>${this.escape(item.title)}</li>`,
      )
      .join('');
    await this.send(
      email,
      'Your Bookstore ebooks',
      `<p>Thank you for your purchase.</p><ul>${links}</ul>`,
      await Promise.all(
        items.map(async (item) => ({
          filename: `${this.safeFilename(item.title)}.pdf`,
          contentType: 'application/pdf',
          content: await this.createPdf(item.title, item.description),
        })),
      ),
    );
  }

  async sendContact(sender: string, subject: string, message: string): Promise<void> {
    const destination = this.config.get<string>('CONTACT_EMAIL');
    if (!destination) {
      throw new ServiceUnavailableException('Contact email is not configured');
    }
    await this.send(
      destination,
      subject,
      `<p>From: ${this.escape(sender)}</p><p>${this.escape(message)}</p>`,
    );
  }

  private escape(value: string): string {
    return value.replace(/[&<>"']/g, (character) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };
      return entities[character] ?? character;
    });
  }

  private safeFilename(value: string): string {
    return value.replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || 'ebook';
  }

  private createPdf(title: string, content: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const document = new PDFDocument({ layout: 'landscape', margin: 48 });
      const chunks: Buffer[] = [];
      document.on('data', (chunk: Buffer) => chunks.push(chunk));
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.on('error', reject);
      document
        .fillColor('#72d5e7')
        .fontSize(28)
        .text(title, { align: 'left' })
        .moveDown()
        .fillColor('#000000')
        .fontSize(14)
        .text(content);
      document.end();
    });
  }
}
