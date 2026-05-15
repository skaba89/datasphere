import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'

export interface ScoringDimension {
  nom: string
  score: number
  poids: number
  scoresPondere: number
  raison: string
}

export interface ScoringResult {
  scoreFinal: number
  dimensions: ScoringDimension[]
  recommandation: 'GO' | 'MAYBE' | 'NO_GO'
  alertes: string[]
}

@Injectable()
export class ScoringService {
  constructor(private prisma: PrismaService) {}

  async calculerScore(aoId: string, organisationId: string): Promise<ScoringResult> {
    const [ao, org] = await Promise.all([
      this.prisma.appelOffre.findFirst({
        where: { id: aoId, organisationId },
      }),
      this.prisma.organisation.findUnique({
        where: { id: organisationId },
        include: {
          references: true,
          experts: true,
          documents: true,
        },
      }),
    ])

    if (!ao || !org) throw new NotFoundException('AO ou organisation introuvable')

    const config = org.scoringConfig as any || {}
    const dimensions: ScoringDimension[] = []
    const alertes: string[] = []

    // ── Dimension 1 : Alignement sectoriel (25%) ────────────────────────────
    const secteursOrg = org.secteurs || []
    const alignement = this.calculerAlignementSectoriel(ao.secteur, secteursOrg)
    dimensions.push({
      nom: 'Alignement sectoriel',
      score: alignement.score,
      poids: 0.25,
      scoresPondere: alignement.score * 0.25,
      raison: alignement.raison,
    })

    // ── Dimension 2 : Capacité financière (20%) ──────────────────────────────
    const capaciteFinanciere = this.evaluerCapaciteFinanciere(ao.budgetEstimeGNF, org.caAnnuelGNF)
    dimensions.push({
      nom: 'Capacité financière',
      score: capaciteFinanciere.score,
      poids: 0.20,
      scoresPondere: capaciteFinanciere.score * 0.20,
      raison: capaciteFinanciere.raison,
    })
    if (capaciteFinanciere.score < 30) alertes.push('Budget du marché potentiellement trop élevé vs. votre CA')

    // ── Dimension 3 : Critères d'éligibilité (20%) ──────────────────────────
    const eligibilite = this.evaluerEligibilite(ao.criteresEligibilite as any, org)
    dimensions.push({
      nom: 'Critères d\'éligibilité',
      score: eligibilite.score,
      poids: 0.20,
      scoresPondere: eligibilite.score * 0.20,
      raison: eligibilite.raison,
    })
    if (eligibilite.manquants?.length > 0) {
      alertes.push(`Critères potentiellement non satisfaits: ${eligibilite.manquants.join(', ')}`)
    }

    // ── Dimension 4 : Concurrence estimée (15%) ─────────────────────────────
    const concurrence = this.estimerConcurrence(ao.secteur, ao.budgetEstimeGNF)
    dimensions.push({
      nom: 'Concurrence estimée',
      score: concurrence.score,
      poids: 0.15,
      scoresPondere: concurrence.score * 0.15,
      raison: concurrence.raison,
    })

    // ── Dimension 5 : Relation institutionnelle (10%) ────────────────────────
    const relationScore = await this.evaluerRelation(ao.entiteAdj, organisationId)
    dimensions.push({
      nom: 'Relation institutionnelle',
      score: relationScore.score,
      poids: 0.10,
      scoresPondere: relationScore.score * 0.10,
      raison: relationScore.raison,
    })

    // ── Dimension 6 : Délai de réponse (10%) ────────────────────────────────
    const delai = this.evaluerDelai(ao.dateLimite)
    dimensions.push({
      nom: 'Délai de réponse',
      score: delai.score,
      poids: 0.10,
      scoresPondere: delai.score * 0.10,
      raison: delai.raison,
    })
    if (delai.joursRestants < 7) alertes.push(`Délai critique: seulement ${delai.joursRestants} jours restants`)

    const scoreFinal = Math.round(dimensions.reduce((sum, d) => sum + d.scoresPondere, 0))
    const seuil = config.seuilGo ?? 65

    const recommandation: 'GO' | 'MAYBE' | 'NO_GO' =
      scoreFinal >= seuil ? 'GO' : scoreFinal >= seuil - 15 ? 'MAYBE' : 'NO_GO'

    // Sauvegarder le score en base
    await this.prisma.appelOffre.update({
      where: { id: aoId },
      data: {
        score: scoreFinal,
        scoreDetails: { dimensions, recommandation, alertes } as any,
        scoreUpdatedAt: new Date(),
      },
    })

    return { scoreFinal, dimensions, recommandation, alertes }
  }

  private calculerAlignementSectoriel(secteurAO: string, secteursOrg: string[]) {
    const mappings: Record<string, string[]> = {
      NUMERIQUE: ['NUMERIQUE', 'IA', 'SAAS', 'WEB', 'MOBILE', 'DATA'],
      SANTE: ['SANTE', 'TELEMEDECINE', 'EHEALTH'],
      EDUCATION: ['EDUCATION', 'LMS', 'ELEARNING'],
      FINANCE: ['FINANCE', 'FINTECH', 'PAIEMENT'],
      GOUVERNANCE: ['GOUVERNANCE', 'EGOVERNMENT', 'ADMINISTRATION'],
    }

    const motsClesSecteur = mappings[secteurAO] || [secteurAO]
    const matches = secteursOrg.filter((s) =>
      motsClesSecteur.some((m) => s.toUpperCase().includes(m))
    )

    if (matches.length >= 2) return { score: 90, raison: `Correspondance forte: ${matches.join(', ')}` }
    if (matches.length === 1) return { score: 65, raison: `Correspondance partielle: ${matches[0]}` }
    return { score: 20, raison: 'Secteur hors de vos domaines déclarés' }
  }

  private evaluerCapaciteFinanciere(budgetAO: bigint | null, caOrg: bigint | null) {
    if (!budgetAO) return { score: 50, raison: 'Budget non communiqué' }
    if (!caOrg) return { score: 40, raison: 'CA de l\'entreprise non renseigné' }

    const ratio = Number(budgetAO) / Number(caOrg)
    if (ratio <= 0.3) return { score: 90, raison: 'Budget du marché très accessible (< 30% de votre CA)' }
    if (ratio <= 0.6) return { score: 70, raison: 'Budget accessible (30-60% de votre CA)' }
    if (ratio <= 1) return { score: 50, raison: 'Budget élevé mais dans les limites (60-100% de votre CA)' }
    if (ratio <= 2) return { score: 30, raison: 'Budget dépassant votre CA — caution élevée requise' }
    return { score: 10, raison: 'Budget très largement supérieur à votre CA — risque financier élevé' }
  }

  private evaluerEligibilite(criteres: any, org: any) {
    const manquants: string[] = []
    let score = 100

    if (criteres?.anneesExperience) {
      const annees = new Date().getFullYear() - (org.anneeFondation || new Date().getFullYear())
      if (annees < criteres.anneesExperience) {
        score -= 30
        manquants.push(`${criteres.anneesExperience} ans d'expérience requis (vous: ${annees})`)
      }
    }

    if (criteres?.certifications?.length > 0) {
      const missing = criteres.certifications.filter(
        (c: string) => !org.certifications?.includes(c)
      )
      if (missing.length > 0) {
        score -= 20 * missing.length
        manquants.push(...missing)
      }
    }

    const docsValides = (org.documents || []).filter((d: any) => d.isValid).length
    if (docsValides < 3) {
      score -= 15
      manquants.push('Dossier administratif incomplet')
    }

    return { score: Math.max(0, score), raison: manquants.length === 0 ? 'Critères d\'éligibilité satisfaits' : `${manquants.length} critère(s) à vérifier`, manquants }
  }

  private estimerConcurrence(secteur: string, budget: bigint | null) {
    const secteursCompetitifs = ['NUMERIQUE', 'SANTE']
    const estCompetitif = secteursCompetitifs.includes(secteur)
    const budgetGNF = Number(budget || 0)

    if (budgetGNF > 1_000_000_000 && estCompetitif) {
      return { score: 25, raison: 'Marché très concurrentiel — acteurs internationaux attendus' }
    }
    if (budgetGNF > 500_000_000) {
      return { score: 45, raison: 'Concurrence modérée — plusieurs acteurs régionaux probables' }
    }
    if (budgetGNF > 100_000_000) {
      return { score: 65, raison: 'Concurrence limitée aux acteurs locaux' }
    }
    return { score: 85, raison: 'Marché de niche — peu de concurrents attendus' }
  }

  private async evaluerRelation(entiteAdj: string, organisationId: string) {
    const contacts = await this.prisma.contact.findMany({
      where: {
        organisationId,
        entite: { nom: { contains: entiteAdj.split(' ')[0], mode: 'insensitive' } },
      },
      select: { scoreProximite: true },
    })

    if (contacts.length === 0) {
      return { score: 20, raison: 'Aucun contact identifié dans cette entité' }
    }

    const scoreMax = Math.max(...contacts.map((c) => c.scoreProximite))
    const scoresMoyen = contacts.reduce((s, c) => s + c.scoreProximite, 0) / contacts.length

    if (scoreMax >= 80) return { score: 90, raison: `Relation forte (${contacts.length} contact(s) chaud(s))` }
    if (scoresMoyen >= 50) return { score: 65, raison: `Relation modérée (${contacts.length} contact(s))` }
    return { score: 35, raison: `Relation froide (${contacts.length} contact(s) à activer)` }
  }

  private evaluerDelai(dateLimite: Date) {
    const maintenant = new Date()
    const joursRestants = Math.floor((dateLimite.getTime() - maintenant.getTime()) / (1000 * 60 * 60 * 24))

    if (joursRestants >= 21) return { score: 90, raison: `${joursRestants} jours — délai confortable`, joursRestants }
    if (joursRestants >= 14) return { score: 70, raison: `${joursRestants} jours — délai raisonnable`, joursRestants }
    if (joursRestants >= 7) return { score: 45, raison: `${joursRestants} jours — délai serré`, joursRestants }
    if (joursRestants >= 3) return { score: 20, raison: `${joursRestants} jours — délai critique!`, joursRestants }
    return { score: 5, raison: `${joursRestants} jour(s) — quasi impossible`, joursRestants }
  }
}
