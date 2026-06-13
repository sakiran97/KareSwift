import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_PASS;

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 5000,
      });
    } else {
      console.warn('[EmailService] GMAIL_USER / GMAIL_PASS not set. Emails will be logged to console only.');
    }
  }

}
