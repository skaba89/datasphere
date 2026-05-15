import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common'
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

  private buildTypeSpecificSection(typeSolution?: string): string {
    switch (typeSolution) {
      case 'SAAS':
        return `
TYPE DE SOLUTION: SaaS (Software as a Service)
DIRECTIVES TECHNIQUES SPÉCIFIQUES:
- Architecture cloud-native multi-tenant avec isolation stricte des données par organisation (row-level security)
- Modèle d'abonnement (Starter / Pro / Enterprise) avec portail self-service de gestion des licences
- API-first : REST + WebSocket, documentation OpenAPI/Swagger, versioning sémantique
- CI/CD automatisé (GitHub Actions / GitLab CI), déploiement continu avec rollback automatique
- Scalabilité horizontale (auto-scaling), haute disponibilité (SLA 99,9%), load balancing, CDN
- Sécurité : chiffrement AES-256 données au repos, TLS 1.3 en transit, RBAC granulaire, audit logs immuables
- Intégration Mobile Money (Orange Money GN, MTN MoMo, Wave) pour paiements et renouvellements d'abonnement
- Mode offline-first avec synchronisation différée (Service Worker + sync API) pour zones à faible connectivité
- Tableaux de bord analytics en temps réel, rapports automatisés, API d'export CSV/Excel/PDF
- Support multi-langues (français, pular, malinké, soussou) et multi-devises (GNF, USD, EUR)`

      case 'WEB':
        return `
TYPE DE SOLUTION: Application Web (Frontend + Backend)
DIRECTIVES TECHNIQUES SPÉCIFIQUES:
- Progressive Web App (PWA) responsive mobile-first, installable, fonctionnement offline avec cache stratégique
- Architecture découplée : frontend React/Next.js + backend REST NestJS/Express ou Django REST
- Base de données relationnelle PostgreSQL avec ORM (Prisma/Sequelize), migrations versionnées, index optimisés
- Authentification sécurisée : JWT refresh token, OAuth2/OIDC, SSO SAML2 si intégration existante
- Intégration systèmes existants via API REST ou web services SOAP avec couche d'adaptation
- Design system cohérent, accessibilité WCAG 2.1 AA, optimisation assets pour faibles débits (WebP, lazy loading)
- Gestion des rôles et permissions granulaire (RBAC), logs d'audit, conformité RGPD/lois guinéennes
- Notifications push web et email automatisées (templates, file d'attente avec retry)
- Hébergement flexible : cloud privé, on-premise ou hybride selon contraintes de souveraineté des données
- Documentation utilisateur contextuelle, assistant in-app, module de formation e-learning intégré`

      case 'SYSTEME_INFO':
        return `
TYPE DE SOLUTION: Système d'Information (ERP / SI Métier)
DIRECTIVES TECHNIQUES SPÉCIFIQUES:
- Architecture n-tiers modulaire : couche présentation, couche métier (services), couche données — déploiement on-premise
- Référentiels centralisés et unifiés : tiers, produits/services, structures organisationnelles, nomenclatures
- Workflows de validation configurables : approbations multi-niveaux, délégations, escalades automatiques, notifications
- Reporting intégré : tableaux de bord exécutifs, états de synthèse, rapports planifiés, exports Excel/PDF/ODS
- Interopérabilité : connecteurs REST/SOAP pour intégration SIGFIP, SYDONIA, bases de données nationales
- Archivage et traçabilité complète : historique des opérations, audit trail inaltérable, conformité réglementaire
- Gestion documentaire (GED) : versionnement, archivage légal, recherche full-text, accès par droits
- Import/Export de données : CSV, Excel, XML pour migration historique et échanges inter-systèmes
- Plan de reprise d'activité (PRA) avec sauvegardes automatiques chiffrées, restauration testée mensuellement
- Administration déléguée : paramétrage métier sans code, formation administrateurs fonctionnels incluse`

      case 'IT_INFRA':
        return `
TYPE DE SOLUTION: Infrastructure IT / Réseau / Systèmes
DIRECTIVES TECHNIQUES SPÉCIFIQUES:
- Conception réseau LAN/WAN structuré : plan d'adressage IP, VLAN segmentés (prod/admin/utilisateurs/DMZ)
- Sécurité périmétrique : firewall NGFW (Fortinet/Palo Alto), IDS/IPS, proxy filtrant, VPN site-à-site et SSL
- Virtualisation serveurs : VMware vSphere / Proxmox avec haute disponibilité (HA), migration à chaud (vMotion)
- Stockage SAN/NAS avec RAID 6/10, snapshots horaires, réplication synchrone vers site de secours
- Plan de continuité d'activité (PCA/PRA) : RTO < 4h, RPO < 1h, tests de bascule semestriels documentés
- Supervision centralisée : Zabbix/Nagios, alertes SMS/email, tableau de bord NOC, historique métriques 1 an
- Administration centralisée : Active Directory/FreeIPA, GPO, MDM pour postes de travail, patch management
- Infrastructure physique : câblage Cat6A/fibre, baies normalisées, alimentation ondulée (UPS + groupe électrogène)
- Formation équipe IT locale (administrateurs, niveau 1/2/3), documentation technique exhaustive (Confluence/Wiki)
- Contrat de maintenance préventive annuelle, garantie matérielle NBD (Next Business Day), astreinte 24/7`

      default:
        return `
ADAPTATION CONTEXTE GUINÉEN: Adapte la solution aux spécificités locales — offline-first pour zones à faible connectivité, intégration Mobile Money (Orange/MTN/Wave), interface francophone, contraintes d'infrastructure (électricité, bande passante), formation utilisateurs non techniques, maintenance locale assurée.`
    }
  }

  async genererMemTechnique(aoId: string, organisationId: string, options?: { solutionId?: string; typeSolution?: string }): Promise<string> {
    const [ao, org, providers] = await Promise.all([
      this.prisma.appelOffre.findFirst({ where: { id: aoId, organisationId } }),
      this.prisma.organisation.findUnique({
        where: { id: organisationId },
        include: { references: { take: 5 }, experts: { take: 10 } },
      }),
      this.getProviders(organisationId),
    ])

    if (!ao || !org) throw new NotFoundException('AO ou organisation introuvable')

    let solutionContext = ''
    if (options?.solutionId) {
      const solution = await this.prisma.solution.findUnique({ where: { id: options.solutionId } })
      if (solution) {
        solutionContext = `\n\nSOLUTION TECHNIQUE PROPOSÉE:\n${solution.description}\n\nARCHITECTURE: ${solution.archDescription}\nSTACK: ${solution.techStack.join(', ')}`
      }
    }

    const typeSpecificSection = this.buildTypeSpecificSection(options?.typeSolution)

    const referencesContext = (org.references ?? []).map(r =>
      `- ${r.titre} (${r.client}, ${r.secteur}, ${new Date(r.dateDebut).getFullYear()})`
    ).join('\n')

    const expertsContext = (org.experts ?? []).map(e =>
      `- ${e.prenom} ${e.nom} — ${e.titre} — ${(e.specialites ?? []).join(', ')} (${e.anneesExp} ans d'exp.)`
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
- Secteurs d'expertise: ${(org.secteurs ?? []).join(', ') || 'NC'}
- Effectif: ${org.effectif || 'NC'} collaborateurs
- Certifications: ${(org.certifications ?? []).join(', ') || 'NC'}

RÉFÉRENCES TECHNIQUES:
${referencesContext || 'Aucune référence disponible'}

EXPERTS DISPONIBLES:
${expertsContext || 'Aucun expert renseigné'}

ADAPTATION SOLUTION:${typeSpecificSection}

MISSION: Rédige un mémoire technique professionnel et structuré en français pour répondre à cet appel d'offres. Le document doit impérativement couvrir: compréhension approfondie du besoin, méthodologie de mise en œuvre, solution technique détaillée (en tenant compte des directives ci-dessus), équipe projet avec rôles et responsabilités, références techniques pertinentes, plan de formation et transfert de compétences, gestion des risques et mesures d'atténuation, garanties et maintenance post-déploiement. Environ 3500-4500 mots.`

    try {
      const result = await providers.heavy.generate(prompt, {
        maxTokens: 8000,
        model: providers.heavy.model,
      })

      this.logger.log(`Mémoire technique générée — provider: ${providers.config.provider}, modèle: ${providers.heavy.model}, ${result.length} chars`)
      return result
    } catch (error: any) {
      this.logger.error(`Erreur mémoire technique IA pour AO ${aoId}: ${error?.message}`)
      throw new ServiceUnavailableException('Service IA temporairement indisponible. Veuillez réessayer.')
    }
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

    if (!ao) throw new NotFoundException('AO introuvable')

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

    try {
      const raw = await providers.light.generate(prompt, {
        maxTokens: 3000,
        model: providers.light.model,
      })

      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try { return JSON.parse(jsonMatch[0]) } catch {}
      }
      return { raw }
    } catch (error: any) {
      this.logger.error(`Erreur offre financière IA pour AO ${aoId}: ${error?.message}`)
      throw new ServiceUnavailableException('Service IA temporairement indisponible. Veuillez réessayer.')
    }
  }

  async resumerAO(aoId: string, organisationId: string): Promise<{ resume: string }> {
    const [ao, providers] = await Promise.all([
      this.prisma.appelOffre.findFirst({ where: { id: aoId, organisationId } }),
      this.getProviders(organisationId),
    ])
    if (!ao) throw new NotFoundException('AO introuvable')

    try {
      const resume = await providers.light.generate(
        `Résume en 3-5 phrases clés cet appel d'offres pour une décision rapide Go/No-Go:

Titre: ${ao.titre}
Entité: ${ao.entiteAdj}
Objet: ${ao.objet}
Budget: ${ao.budgetEstimeGNF ? Number(ao.budgetEstimeGNF).toLocaleString('fr-FR') + ' GNF' : 'NC'}
Date limite: ${ao.dateLimite ? new Date(ao.dateLimite).toLocaleDateString('fr-FR') : 'Non précisée'}

Focus: enjeux principaux, opportunités, risques évidents.`,
        { maxTokens: 500, model: providers.light.model },
      )

      // Sauvegarder le résumé dans l'AO
      await this.prisma.appelOffre.update({
        where: { id: aoId },
        data: { resumeIA: resume },
      })

      return { resume }
    } catch (error: any) {
      this.logger.error(`Erreur résumé IA pour AO ${aoId}: ${error?.message}`)
      throw new ServiceUnavailableException('Service IA temporairement indisponible. Veuillez réessayer.')
    }
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
      { maxTokens: 2000, model: provider.model },
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
