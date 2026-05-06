import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Anthropic from '@anthropic-ai/sdk'
import { PrismaService } from '../../common/prisma/prisma.service'

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name)
  private anthropic: Anthropic

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.anthropic = new Anthropic({
      apiKey: this.config.get<string>('ANTHROPIC_API_KEY'),
    })
  }

  async genererMemTechnique(aoId: string, organisationId: string, options?: { solutionId?: string }): Promise<string> {
    const [ao, org] = await Promise.all([
      this.prisma.appelOffre.findFirst({ where: { id: aoId, organisationId } }),
      this.prisma.organisation.findUnique({
        where: { id: organisationId },
        include: { references: { take: 5 }, experts: { take: 10 } },
      }),
    ])

    if (!ao || !org) throw new Error('AO ou organisation introuvable')

    let solutionContext = ''
    if (options?.solutionId) {
      const solution = await this.prisma.solution.findUnique({ where: { id: options.solutionId } })
      if (solution) {
        solutionContext = `\n\nSOLUTION TECHNIQUE PROPOSÉE:\n${solution.description}\n\nARCHITECTURE: ${solution.archDescription}\nSTACK: ${solution.techStack.join(', ')}`
      }
    }

    const referencesContext = org.references.map((r) =>
      `- ${r.titre} (${r.client}, ${r.secteur}, ${new Date(r.dateDebut).getFullYear()})`
    ).join('\n')

    const expertsContext = org.experts.map((e) =>
      `- ${e.prenom} ${e.nom} — ${e.titre} — ${e.specialites.join(', ')} (${e.anneesExp} ans d'exp.)`
    ).join('\n')

    const prompt = `Tu es un expert en rédaction de dossiers de réponse aux appels d'offres publics en Guinée.

CONTEXTE DE L'APPEL D'OFFRES:
- Titre: ${ao.titre}
- Entité adjudicatrice: ${ao.entiteAdj}
- Objet: ${ao.objet}
- Secteur: ${ao.secteur}
- Durée du marché: ${ao.dureeMarche || 'Non précisée'} mois
- Budget estimé: ${ao.budgetEstimeGNF ? Number(ao.budgetEstimeGNF).toLocaleString('fr-FR') + ' GNF' : 'Non communiqué'}
${solutionContext}

ENTREPRISE SOUMISSIONNAIRE:
- Nom: ${org.nom}
- Secteurs d'expertise: ${org.secteurs.join(', ')}
- Effectif: ${org.effectif || 'NC'} collaborateurs
- Certifications: ${org.certifications.join(', ') || 'NC'}

RÉFÉRENCES TECHNIQUES:
${referencesContext || 'Aucune référence disponible'}

EXPERTS DISPONIBLES:
${expertsContext || 'Aucun expert renseigné'}

MISSION: Rédige un mémoire technique professionnel et structuré en français pour répondre à cet appel d'offres. Le document doit:

1. COMPRÉHENSION DU BESOIN
   - Reformuler l'objet du marché dans vos propres mots
   - Identifier les enjeux clés pour l'entité adjudicatrice
   - Montrer que vous avez bien compris les attentes

2. MÉTHODOLOGIE PROPOSÉE
   - Approche générale et principes directeurs
   - Phases détaillées (avec objectifs, livrables, durée)
   - Jalons clés et points de contrôle
   - Gestion du projet et outils

3. SOLUTION TECHNIQUE
   - Description de la solution proposée
   - Architecture technique (adaptée au contexte guinéen: offline-first, Mobile Money, etc.)
   - Technologies utilisées et justification
   - Sécurité et conformité réglementaire
   - Scalabilité et maintenance

4. ÉQUIPE PROJET
   - Organisation de l'équipe (organigramme textuel)
   - Profils clés et responsabilités
   - Expérience des experts sur des projets similaires

5. RÉFÉRENCES PERTINENTES
   - Projets réalisés similaires
   - Résultats obtenus et valeur créée

6. PLAN DE FORMATION & TRANSFERT DE COMPÉTENCES
   - Programme de formation des utilisateurs finaux
   - Documentation technique et utilisateur
   - Accompagnement post-déploiement

7. GESTION DES RISQUES
   - Risques identifiés (technique, opérationnel, calendaire)
   - Mesures d'atténuation pour chaque risque

8. GARANTIES & MAINTENANCE
   - Engagement sur la qualité et les délais
   - Plan de maintenance préventive et corrective
   - Support technique (SLA, niveaux d'intervention)

Utilise un style professionnel, convainquant et adapté aux administrations publiques guinéennes. Intègre les réalités locales (connectivité variable, Mobile Money, formation des utilisateurs, etc.). Le mémoire doit faire environ 3000 à 4000 mots.`

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') throw new Error('Réponse IA invalide')

    this.logger.log(`Mémoire technique généré pour AO ${aoId} — ${content.text.length} caractères`)
    return content.text
  }

  async genererOffreFinanciere(
    aoId: string,
    organisationId: string,
    params: { margePercent?: number; dureeM?: number },
  ) {
    const ao = await this.prisma.appelOffre.findFirst({
      where: { id: aoId, organisationId },
      include: { dossiers: { include: { solution: true }, take: 1 } },
    })

    if (!ao) throw new Error('AO introuvable')

    const prompt = `Tu es un expert financier en marchés publics en Guinée. Génère une offre financière détaillée et réaliste.

CONTEXTE:
- Objet: ${ao.objet}
- Secteur: ${ao.secteur}
- Budget estimé: ${ao.budgetEstimeGNF ? Number(ao.budgetEstimeGNF).toLocaleString('fr-FR') + ' GNF' : 'Non communiqué'}
- Durée: ${params.dureeM || ao.dureeMarche || 12} mois
- Marge cible: ${params.margePercent || 15}%

CONSIGNE: Génère un tableau de décomposition du prix en JSON avec la structure suivante:
{
  "postes": [
    {
      "numero": "1",
      "designation": "...",
      "unite": "forfait|mois|jour",
      "quantite": number,
      "prixUnitaireGNF": number,
      "montantGNF": number,
      "detail": "..."
    }
  ],
  "sousTotal": number,
  "tvaPercent": 18,
  "tva": number,
  "total": number,
  "notes": "..."
}

Inclure les postes standards: développement logiciel, infrastructure/hébergement, formation, maintenance (12 mois), management de projet, documentation. Utilise des prix réalistes du marché guinéen.`

    const response = await this.anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') throw new Error('Réponse IA invalide')

    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0])
      } catch {
        return { raw: content.text }
      }
    }

    return { raw: content.text }
  }

  async resumerAO(aoId: string, organisationId: string): Promise<string> {
    const ao = await this.prisma.appelOffre.findFirst({
      where: { id: aoId, organisationId },
    })
    if (!ao) throw new Error('AO introuvable')

    const response = await this.anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `Résume en 3-5 phrases clés cet appel d'offres pour une décision rapide Go/No-Go:

Titre: ${ao.titre}
Entité: ${ao.entiteAdj}
Objet: ${ao.objet}
Budget: ${ao.budgetEstimeGNF ? Number(ao.budgetEstimeGNF).toLocaleString('fr-FR') + ' GNF' : 'NC'}
Date limite: ${ao.dateLimite.toLocaleDateString('fr-FR')}

Focus: enjeux principaux, opportunités, risques évidents.`,
        },
      ],
    })

    const content = response.content[0]
    return content.type === 'text' ? content.text : ''
  }

  async analyserDocument(texte: string, typeDocument: string): Promise<Record<string, any>> {
    const response = await this.anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `Analyse ce document de type "${typeDocument}" et extrais les informations clés en JSON:

${texte.substring(0, 8000)}

Extrais: titre, entite_adj, objet, budget_estime, date_publication, date_limite, duree_marche, criteres_eligibilite (liste), criteres_evaluation (liste), secteur, type_marche.
Réponds UNIQUEMENT en JSON valide.`,
        },
      ],
    })

    const content = response.content[0]
    if (content.type !== 'text') return {}

    try {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/)
      return jsonMatch ? JSON.parse(jsonMatch[0]) : {}
    } catch {
      return {}
    }
  }
}
