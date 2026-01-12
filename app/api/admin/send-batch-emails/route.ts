import { NextResponse } from 'next/server';
import * as brevo from '@getbrevo/brevo';

interface VideoItem {
  url: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { eventId, emailGroups } = body;

    // Validation
    if (!eventId || !emailGroups || Object.keys(emailGroups).length === 0) {
      return NextResponse.json(
        { error: 'eventId et emailGroups sont requis' },
        { status: 400 }
      );
    }

    // Configuration de Brevo
    const apiInstance = new brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(
      brevo.TransactionalEmailsApiApiKeys.apiKey,
      process.env.BREVO_API_KEY || ''
    );

    let successCount = 0;
    let videosCount = 0;
    let failureCount = 0;
    const errors: string[] = [];

    // Pour chaque email utilisateur
    for (const [userEmail, videosArray] of Object.entries(emailGroups)) {
      try {
        const videos = videosArray as VideoItem[];
        videosCount += videos.length; // Compter le nombre de vidéos
        
        // Construire le contenu avec les liens des vidéos
        const videoLinks = videos
          .map((video, index) => {
            // URL-encoder l'URL S3 entière pour que les % deviennent %25
            const encodedUrl = video.url.split('/').map((part, i) => {
              // Ne pas encoder le protocole et le domaine
              if (i < 3) return part;
              return encodeURIComponent(part);
            }).join('/');
            
            return `
            <div style="margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 8px;">
              <p><strong>Vidéo ${index + 1}:</strong></p>
              <a href="${encodedUrl}" 
                 style="display: inline-block; background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%); 
                        color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; 
                        font-weight: bold; margin-top: 10px;">
                🎬 Regarder la vidéo
              </a>
            </div>
          `;
          })
          .join('');

        const sendSmtpEmail = new brevo.SendSmtpEmail();
        
        sendSmtpEmail.sender = {
          email: process.env.BREVO_FROM_EMAIL || 'waibooth.app@gmail.com',
          name: process.env.BREVO_FROM_NAME || 'Waibooth'
        };
        
        sendSmtpEmail.to = [
          {
            email: userEmail,
            name: 'Participant'
          }
        ];
        
        sendSmtpEmail.subject = `🎤 Vos performances karaoké (${videos.length} vidéo(s))`;
        
        sendSmtpEmail.htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #6a11cb; margin: 0;">🎤 Vos Performances Karaoké</h1>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
              <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
                Bonjour,
              </p>
              
              <p style="font-size: 16px; color: #555; line-height: 1.6; margin-bottom: 30px;">
                Nous avons le plaisir de vous partager vos performances karaoké enregistrées lors de l'événement <strong>${process.env.NEXT_PUBLIC_APP_NAME || 'Karaoke'}</strong>.
              </p>

              <p style="font-size: 16px; color: #333; font-weight: bold; margin-bottom: 20px;">
                ${videos.length} vidéo(s) disponible(s):
              </p>

              ${videoLinks}

              <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd;">
                <p style="font-size: 14px; color: #888; text-align: center;">
                  Merci d'avoir participé! 🎉<br>
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://example.com'}" 
                     style="color: #6a11cb; text-decoration: none;">
                    Retourner à l'application
                  </a>
                </p>
              </div>
            </div>

            <div style="margin-top: 30px; padding: 20px; background: #f5f5f5; border-radius: 8px; text-align: center;">
              <p style="font-size: 12px; color: #999; margin: 0;">
                © ${new Date().getFullYear()} ${process.env.BREVO_FROM_NAME || 'Waibooth'}. Tous droits réservés.<br>
                Cet email contient vos vidéos personalisées et confidentielles.
              </p>
            </div>
          </div>
        `;

        // Envoyer l'email
        await apiInstance.sendTransacEmail(sendSmtpEmail);
        
        console.log(`✅ Email envoyé à ${userEmail}`);
        successCount++;
      } catch (emailError) {
        const errorMsg = emailError instanceof Error ? emailError.message : 'Erreur inconnue';
        console.error(`❌ Erreur lors de l'envoi à ${userEmail}:`, emailError);
        errors.push(`${userEmail}: ${errorMsg}`);
        failureCount++;
      }
    }

    // Retourner le résultat
    return NextResponse.json({
      success: failureCount === 0,
      successCount,
      videosCount,
      failureCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `${videosCount} vidéo(s) envoyée(s) avec succès${
        failureCount > 0 ? `, ${failureCount} erreur(s)` : ''
      }`
    });
  } catch (error) {
    console.error('Erreur lors du traitement batch:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Erreur inconnue lors de l\'envoi batch',
        success: false 
      },
      { status: 500 }
    );
  }
}
