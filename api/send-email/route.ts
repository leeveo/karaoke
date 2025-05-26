import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, subject, message, videoUrl, sessionId } = body;

    // Validation des entrées
    if (!email || !name) {
      return NextResponse.json(
        { error: 'Tous les champs requis ne sont pas présents' },
        { status: 400 }
      );
    }

    // Créer le transporteur email
    // Vous pouvez utiliser un service comme Gmail, SendGrid, etc.
   const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.EMAIL_SMTP_PORT) || 587,
  secure: process.env.EMAIL_SMTP_SECURE === 'true', // true pour 465, false pour 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

    // Définir le contenu de l'email
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'votre-app@example.com',
      to: email,
      subject: subject || 'Votre performance karaoké',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6a11cb;">🎤 Performance Karaoké</h2>
          
          <p>Bonjour ${name},</p>
          
          <p>${message || "Voici le lien vers votre performance karaoké !"}</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${videoUrl}" 
              style="background-color: #6a11cb; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 4px; font-weight: bold;">
              Voir ma performance
            </a>
          </div>
          
          <p style="color: #666; font-size: 12px; text-align: center;">
            ID de session: ${sessionId}<br>
            Cet email a été envoyé automatiquement par l'application Karaoké.
          </p>
        </div>
      `
    };

    // Envoyer l'email
    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi de l\'email' },
      { status: 500 }
    );
  }
}