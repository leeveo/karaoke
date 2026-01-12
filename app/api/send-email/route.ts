import { NextResponse } from 'next/server';
import * as brevo from '@getbrevo/brevo';

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

    // Configuration de Brevo
    const apiInstance = new brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(
      brevo.TransactionalEmailsApiApiKeys.apiKey,
      process.env.BREVO_API_KEY || ''
    );

    // Définir le contenu de l'email
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    
    sendSmtpEmail.sender = {
      email: process.env.BREVO_FROM_EMAIL || 'waibooth.app@gmail.com',
      name: process.env.BREVO_FROM_NAME || 'Waibooth'
    };
    
    sendSmtpEmail.to = [
      {
        email: email,
        name: name
      }
    ];
    
    sendSmtpEmail.subject = subject || 'Votre performance karaoké 🎤';
    
    sendSmtpEmail.htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #6a11cb; margin: 0;">🎤 Performance Karaoké</h1>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Bonjour <strong>${name}</strong>,</p>
          
          <p style="font-size: 16px; color: #555; line-height: 1.6; margin-bottom: 30px;">
            ${message || "Voici le lien vers votre performance karaoké ! Cliquez sur le bouton ci-dessous pour la visionner et la partager avec vos amis."}
          </p>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${videoUrl}" 
              style="display: inline-block; background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%); 
                    color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; 
                    font-weight: bold; font-size: 18px; box-shadow: 0 4px 15px rgba(106, 17, 203, 0.4);">
              🎬 Voir ma performance
            </a>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e0e0e0;">
            <p style="color: #999; font-size: 13px; text-align: center; margin: 5px 0;">
              <strong>Lien direct :</strong><br>
              <a href="${videoUrl}" style="color: #6a11cb; text-decoration: none; word-break: break-all;">
                ${videoUrl}
              </a>
            </p>
          </div>
        </div>
        
        <div style="margin-top: 30px; padding: 20px; background-color: #fff3cd; border-radius: 8px; border-left: 4px solid #ffc107;">
          <p style="margin: 0; color: #856404; font-size: 14px;">
            💡 <strong>Astuce :</strong> Vous pouvez télécharger cette vidéo et la partager sur vos réseaux sociaux !
          </p>
        </div>
        
        <div style="margin-top: 40px; text-align: center;">
          <p style="color: #999; font-size: 12px; line-height: 1.6;">
            ID de session: <code style="background-color: #f0f0f0; padding: 2px 6px; border-radius: 3px;">${sessionId}</code><br>
            Cet email a été envoyé automatiquement par l'application Karaoké Waibooth.
          </p>
        </div>
      </div>
    `;

    // Envoyer l'email via Brevo
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    
    console.log('Email envoyé avec succès via Brevo:', data);

    return NextResponse.json({ 
      success: true,
      data: data.body
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email via Brevo:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi de l\'email' },
      { status: 500 }
    );
  }
}
