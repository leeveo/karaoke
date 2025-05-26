import nodemailer from 'nodemailer';

// Config SMTP Nodemailer
export async function sendEmail(to: string, videoUrl: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.NEXT_PUBLIC_SMTP_HOST!,
    port: Number(process.env.NEXT_PUBLIC_SMTP_PORT!),
    auth: {
      user: process.env.NEXT_PUBLIC_SMTP_USER!,
      pass: process.env.NEXT_PUBLIC_SMTP_PASS!,
    },
  });

  const mailOptions = {
    from: process.env.NEXT_PUBLIC_EMAIL_FROM!,
    to,
    subject: 'Votre vidéo Karaoke 🎤',
    text: `Voici votre vidéo: ${videoUrl}`,
    html: `<p>Merci d'avoir chanté avec nous 🎶!</p><p>Voici votre lien: <a href="${videoUrl}">${videoUrl}</a></p>`,
  };

  await transporter.sendMail(mailOptions);
}
