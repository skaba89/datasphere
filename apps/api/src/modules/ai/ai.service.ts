import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { AiProviderFactory } from './ai-provider.factory'

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name)

  constructor(
    private prisma: PrismaService,
    private providerFactory: AiProviderFactory,
  ) {}

  private async getProviders(organisationId: string) {
    const org = await this.prisma.organisation.findUnique({
      where: { id: organisationId },
      select: { aiConfig: true },
    })
    const config = this.providerFactory.resolveConfig((org?.aiConfig as any) ?? {})
    return {
      heavy: this.providerFactory.getProvider(config, 'heavy'),
      light: this.providerFactory.getProvider(config, 'light'),
      config,
    }
  }

  async genererMemTechnique(aoId: string, organisationId: string, options?: { solutionId?: string }): Promise<string> {
    const [ao, org, providers] = await Promise.all([
      this.prisma.appelOffre.findFirst({ where: { id: aoId, organisationId } }),
      this.prisma.organisation.findUnique({
        where: { id: organisationId },
        include: { references: { take: 5 }, experts: { take: 10 } },
      }),
      this.getProviders(organisationId),
    ])

    if (!ao || !org) throw new Error('AO ou organisation introuvable')

    let solutionContext = ''
    if (options?.solutionId) {
      const solution = await this.prisma.solution.findUnique({ where: { id: options.solutionId } })
      if (solution) {
        solutionContext = `\n\nSOLUTION TECHNIQUE PROPOSÉE:\n${solution.description}\n\nARCHITECTURE: ${solution.archDescription}\nSTACK: ${solution.techStack.join(', ')}`
      }
    }

    const referencesContext = org.references.map(r =>
      `- ${r.titre} (${r.client}, ${r.secteur}, ${new Date(r.dateDebut).getFullYear()})`
    ).join('\n')

    const expertsContext = org.experts.map(e =>
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

MISSION: Rédige un mémoire technique professionnel et structuré en français pour répondre à cet appel d'offres. Le document doit couvrir: compréhension du besoin, méthodologie, solution technique (offline-first, Mobile Money, contexte guinéen), équipe projet, références pertinentes, plan de formation, gestion des risques, garanties et maintenance. Environ 3000-4000 mots.`

    const result = await providers.heavy.generate(prompt, {
      maxTokens: 8000,
      model: providers.heavy.model,
    } as any)

    this.logger.log(`Mémoire technique générée — provider: ${providers.config.provider}, modèle: ${providers.heavy.model}, ${result.length} chars`)
    return result
  }

  async genererOffreFinanciere(
    aoId: string,
    organisationId: string,
    params: { margePercent?: number; dureeM?: number },
  ) {
    const [ao, providers] = await Promise.all([
      this.prisma.appelOffre.findFirst({
        where: { id: aoId, organisationId },
        include: { dossiers: { include: { solution: true }, take: 1 } },
      }),
      this.getProviders(organisationId),
    ])

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
    { "numero": "1", "designation": "...", "unite": "forfait|mois|jour", "quantite": number, "prixUnitaireGNF": number, "montantGNF": number, "detail": "..." }
  ],
  "sousTotal": number,
  "tvaPercent": 18,
  "tva": number,
  "total": number,
  "notes": "..."
}

Inclure: développement logiciel, infrastructure/hébergement, formation, maintenance (12 mois), management de projet, documentation. Prix réalistes du marché guinéen. Réponds UNIQUEMENT en JSON valide.`

    const raw = await providers.light.generate(prompt, {
      maxTokens: 3000,
      model: providers.light.model,
    } as any)

    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try { return JSON.parse(jsonMatch[0]) } catch {}
    }
    return { raw }
  }

  async resumerAO(aoId: string, organisationId: string): Promise<string> {
    const [ao, providers] = await Promise.all([
      this.prisma.appelOffre.findFirst({ where: { id: aoId, organisationId } }),
      this.getProviders(organisationId),
    ])
    if (!ao) throw new Error('AO introuvable')

    return providers.light.generate(
      `Résume en 3-5 phrases clés cet appel d'offres pour une décision rapide Go/No-Go:

Titre: ${ao.titre}
Entité: ${ao.entiteAdj}
Objet: ${ao.objet}
Budget: ${ao.budgetEstimeGNF ? Number(ao.budgetEstimeGNF).toLocaleString('fr-FR') + ' GNF' : 'NC'}
Date limite: ${ao.dateLimite.toLocaleDateString('fr-FR')}

Focus: enjeux principaux, opportunités, risques évidents.`,
      { maxTokens: 500, model: providers.light.model } as any,
    )
  }

  async analyserDocument(texte: string, typeDocument: string): Promise<Record<string, any>> {
    // Utiliser le provider par défaut (Anthropic) pour l'analyse de documents
    const defaultConfig = this.providerFactory.resolveConfig({})
    const provider = this.providerFactory.getProvider(defaultConfig, 'light')

    const raw = await provider.generate(
      `Analyse ce document de type "${typeDocument}" et extrais les informations clés en JSON:

${texte.substring(0, 8000)}

Extrais: titre, entite_adj, objet, budget_estime, date_publication, date_limite, duree_marche, criteres_eligibilite (liste), criteres_evaluation (liste), secteur, type_marche.
Réponds UNIQUEMENT en JSON valide.`,
      { maxTokens: 2000, model: provider.model } as any,
    )

    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      return jsonMatch ? JSON.parse(jsonMatch[0]) : {}
    } catch {
      return {}
    }
  }

  /** Retourne les providers disponibles et configurés pour une organisation */
  async getConfiguredProviders(organisationId: string) {
    const org = await this.prisma.organisation.findUnique({
      where: { id: organisationId },
      select: { aiConfig: true },
    })
    return this.providerFactory.resolveConfig((org?.aiConfig as any) ?? {})
  }
}
