import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as nodemailer from 'nodemailer'
import { PrismaService } from '../../common/prisma/prisma.service'

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)
  private transporter: nodemailer.Transporter

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get('SMTP_HOST', 'smtp.gmail.com'),
      port: this.config.get<number>('SMTP_PORT', 587),
      secure: false,
      auth: {
        user: this.config.get('SMTP_USER'),
        pass: this.config.get('SMTP_PASS'),
      },
    })
  }

  async envoyerAlerteEcheance(
    email: string,
    prenom: string,
    titreAO: string,
    joursRestants: number,
    aoId: string,
  ): Promise<void> {
    const urgence = joursRestants <= 3 ? '🚨 URGENT' : joursRestants <= 7 ? '⚠️ Rappel' : 'ℹ️ Info'
    const couleur = joursRestants <= 3 ? '#ef4444' : joursRestants <= 7 ? '#f59e0b' : '#3b82f6'

    await this.transporter.sendMail({
      from: `"GuineaTender AI" <${this.config.get('SMTP_FROM', 'noreply@guineatender.gn')}>`,
      to: email,
      subject: `${urgence} — Échéance dans ${joursRestants}j : ${titreAO}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1a1a2e; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: #f97316; margin: 0; font-size: 24px;">🇬🇳 GuineaTender AI</h1>
          </div>
          <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
            <p>Bonjour <strong>${prenom}</strong>,</p>
            <div style="border-left: 4px solid ${couleur}; padding: 16px; background: #f9fafb; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; font-weight: bold; color: ${couleur};">${urgence}</p>
              <p style="margin: 8px 0 0; font-size: 18px;"><strong>${titreAO}</strong></p>
              <p style="margin: 4px 0 0; color: #6b7280;">Échéance dans <strong style="color: ${couleur};">${joursRestants} jours</strong></p>
            </div>
            <p>Ne laissez pas passer cette opportunité. Votre dossier peut être généré en 8 minutes avec notre IA.</p>
            <a href="${this.config.get('APP_URL', 'https://app.guineatender.gn')}/appels-offres/${aoId}"
               style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 10px;">
              Voir l'appel d'offres →
            </a>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
            <p style="color: #9ca3af; font-size: 12px;">
              GuineaTender AI — La plateforme n°1 pour les marchés publics en Guinée<br>
              <a href="${this.config.get('APP_URL')}/parametres/notifications" style="color: #9ca3af;">Se désabonner des alertes</a>
            </p>
          </div>
        </div>
      `,
    }).catch(err => this.logger.error(`Email failed to ${email}: ${err.message}`))
  }

  async envoyerRapportHebdomadaire(
    email: string,
    prenom: string,
    stats: {
      nouveauxAOs: number
      enCours: number
      scoreMoyen: number
      echeancessemaine: number
    },
  ): Promise<void> {
    const semaine = new Date().toLocaleDateString('fr-FR', { week: 'long', year: 'numeric' } as any)

    await this.transporter.sendMail({
      from: `"GuineaTender AI" <${this.config.get('SMTP_FROM', 'noreply@guineatender.gn')}>`,
      to: email,
      subject: `Votre rapport hebdomadaire GuineaTender — ${new Date().toLocaleDateString('fr-FR')}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1a1a2e; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: #f97316; margin: 0; font-size: 24px;">🇬🇳 GuineaTender AI</h1>
            <p style="color: #9ca3af; margin: 4px 0 0;">Rapport hebdomadaire</p>
          </div>
          <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
            <p>Bonjour <strong>${prenom}</strong>, voici votre résumé de la semaine :</p>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 20px 0;">
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; text-align: center;">
                <div style="font-size: 32px; font-weight: bold; color: #16a34a;">${stats.nouveauxAOs}</div>
                <div style="color: #6b7280; font-size: 14px;">Nouveaux AOs détectés</div>
              </div>
              <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; text-align: center;">
                <div style="font-size: 32px; font-weight: bold; color: #2563eb;">${stats.enCours}</div>
                <div style="color: #6b7280; font-size: 14px;">Dossiers en cours</div>
              </div>
              <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; text-align: center;">
                <div style="font-size: 32px; font-weight: bold; color: #d97706;">${stats.scoreMoyen}%</div>
                <div style="color: #6b7280; font-size: 14px;">Score moyen pipeline</div>
              </div>
              <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; text-align: center;">
                <div style="font-size: 32px; font-weight: bold; color: #dc2626;">${stats.echeancessemaine}</div>
                <div style="color: #6b7280; font-size: 14px;">Échéances cette semaine</div>
              </div>
            </div>
            <a href="${this.config.get('APP_URL', 'https://app.guineatender.gn')}/dashboard"
               style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 10px;">
              Voir le tableau de bord →
            </a>
          </div>
        </div>
      `,
    }).catch(err => this.logger.error(`Rapport hebdo email failed to ${email}: ${err.message}`))
  }

  async envoyerAlerteScoringGO(
    email: string,
    prenom: string,
    titreAO: string,
    score: number,
    aoId: string,
  ): Promise<void> {
    await this.transporter.sendMail({
      from: `"GuineaTender AI" <${this.config.get('SMTP_FROM', 'noreply@guineatender.gn')}>`,
      to: email,
      subject: `✅ GO — Score ${score}% sur : ${titreAO}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1a1a2e; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: #f97316; margin: 0; font-size: 24px;">🇬🇳 GuineaTender AI</h1>
          </div>
          <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
            <p>Bonjour <strong>${prenom}</strong>,</p>
            <div style="background: #f0fdf4; border: 2px solid #16a34a; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
              <div style="font-size: 48px; font-weight: bold; color: #16a34a;">${score}%</div>
              <div style="font-size: 20px; color: #16a34a; font-weight: bold;">✅ RECOMMANDATION : GO</div>
              <div style="color: #374151; margin-top: 8px;">${titreAO}</div>
            </div>
            <p>Notre IA a analysé cet appel d'offres et recommande de <strong>postuler</strong>. Commencez dès maintenant.</p>
            <a href="${this.config.get('APP_URL', 'https://app.guineatender.gn')}/dossiers/nouveau?aoId=${aoId}"
               style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 10px;">
              Générer le dossier maintenant →
            </a>
          </div>
        </div>
      `,
    }).catch(err => this.logger.error(`Scoring GO email failed to ${email}: ${err.message}`))
  }

  async notifierNouvelAO(
    organisationId: string,
    titreAO: string,
    aoId: string,
    secteur: string,
  ): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: { organisationId, isActive: true },
      select: { email: true, prenom: true },
    })

    await Promise.all(
      users.map(u =>
        this.transporter.sendMail({
          from: `"GuineaTender AI" <${this.config.get('SMTP_FROM', 'noreply@guineatender.gn')}>`,
          to: u.email,
          subject: `🔔 Nouvel AO détecté — ${secteur} : ${titreAO.substring(0, 60)}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #1a1a2e; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="color: #f97316; margin: 0; font-size: 24px;">🇬🇳 GuineaTender AI</h1>
              </div>
              <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
                <p>Bonjour <strong>${u.prenom}</strong>,</p>
                <p>Un nouvel appel d'offres dans votre secteur a été détecté :</p>
                <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 20px 0;">
                  <div style="display: inline-block; background: #f97316; color: white; padding: 4px 10px; border-radius: 4px; font-size: 12px; margin-bottom: 8px;">${secteur}</div>
                  <p style="margin: 0; font-size: 16px; font-weight: bold;">${titreAO}</p>
                </div>
                <a href="${this.config.get('APP_URL', 'https://app.guineatender.gn')}/appels-offres/${aoId}"
                   style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
                  Voir et scorer →
                </a>
              </div>
            </div>
          `,
        }).catch(err => this.logger.error(`Nouvel AO email failed: ${err.message}`)),
      ),
    )
  }

  async envoyerAlerteValidation(
    email: string,
    prenom: string,
    titreAO: string,
    dossierId: string,
    soumetteurPrenom: string,
  ): Promise<void> {
    await this.transporter.sendMail({
      from: `"GuineaTender AI" <${this.config.get('SMTP_FROM', 'noreply@guineatender.gn')}>`,
      to: email,
      subject: `🔍 Dossier à valider — ${titreAO.substring(0, 60)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1a1a2e; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: #f97316; margin: 0; font-size: 24px;">🇬🇳 GuineaTender AI</h1>
          </div>
          <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
            <p>Bonjour <strong>${prenom}</strong>,</p>
            <p><strong>${soumetteurPrenom}</strong> a soumis un dossier pour validation :</p>
            <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0; font-size: 16px; font-weight: bold; color: #1e40af;">${titreAO}</p>
              <p style="margin: 8px 0 0; color: #6b7280;">En attente de votre validation</p>
            </div>
            <p>Veuillez examiner le dossier et l'approuver ou le rejeter avec commentaires.</p>
            <a href="${this.config.get('APP_URL', 'https://app.guineatender.gn')}/dossiers/${dossierId}"
               style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
              Examiner le dossier →
            </a>
          </div>
        </div>
      `,
    }).catch(err => this.logger.error(`Validation alert email failed to ${email}: ${err.message}`))
  }

  async envoyerResultatValidation(
    email: string,
    prenom: string,
    titreAO: string,
    decision: 'APPROUVE' | 'REJETE',
    commentaire: string,
    dossierId: string,
  ): Promise<void> {
    const isApprouve = decision === 'APPROUVE'
    const couleur = isApprouve ? '#16a34a' : '#dc2626'
    const bg = isApprouve ? '#f0fdf4' : '#fef2f2'
    const border = isApprouve ? '#bbf7d0' : '#fecaca'
    const emoji = isApprouve ? '✅' : '❌'
    const label = isApprouve ? 'VALIDÉ — Vous pouvez soumettre officiellement' : 'REJETÉ — Corrections nécessaires'
    const cta = isApprouve ? 'Soumettre officiellement →' : 'Corriger le dossier →'
    const ctaBg = isApprouve ? '#16a34a' : '#dc2626'

    await this.transporter.sendMail({
      from: `"GuineaTender AI" <${this.config.get('SMTP_FROM', 'noreply@guineatender.gn')}>`,
      to: email,
      subject: `${emoji} Dossier ${isApprouve ? 'validé' : 'rejeté'} — ${titreAO.substring(0, 50)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1a1a2e; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: #f97316; margin: 0; font-size: 24px;">🇬🇳 GuineaTender AI</h1>
          </div>
          <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
            <p>Bonjour <strong>${prenom}</strong>,</p>
            <div style="background: ${bg}; border: 2px solid ${border}; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0; font-weight: bold; color: ${couleur}; font-size: 16px;">${emoji} ${label}</p>
              <p style="margin: 8px 0 0; color: #374151; font-weight: bold;">${titreAO}</p>
            </div>
            <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0; font-size: 13px; font-weight: bold; color: #374151;">Commentaire du valideur :</p>
              <p style="margin: 8px 0 0; color: #4b5563; font-style: italic;">"${commentaire}"</p>
            </div>
            <a href="${this.config.get('APP_URL', 'https://app.guineatender.gn')}/dossiers/${dossierId}"
               style="display: inline-block; background: ${ctaBg}; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
              ${cta}
            </a>
          </div>
        </div>
      `,
    }).catch(err => this.logger.error(`Validation result email failed to ${email}: ${err.message}`))
  }
}
