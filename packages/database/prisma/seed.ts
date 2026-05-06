import { PrismaClient, UserRole, SubscriptionPlan, SolutionCategory, AOSector } from '../generated'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding GuineaTender AI database...')

  // Organisation de démo
  const org = await prisma.organisation.upsert({
    where: { slug: 'tech-guinee-demo' },
    update: {},
    create: {
      nom: 'Tech Guinée SARL',
      slug: 'tech-guinee-demo',
      rccm: 'RCCM/2023/B/001234',
      ifu: '123456789',
      adresse: 'Kaloum, Conakry',
      ville: 'Conakry',
      pays: 'GN',
      telephone: '+224 620 000 000',
      email: 'contact@techguinee.gn',
      secteurs: ['NUMERIQUE', 'IA', 'SAAS'],
      caAnnuelGNF: BigInt(500_000_000),
      effectif: 25,
      anneeFondation: 2019,
      plan: SubscriptionPlan.PRO,
    },
  })

  // Utilisateur admin
  const adminPassword = await hash('Admin@2026!', 12)
  await prisma.user.upsert({
    where: { email: 'admin@techguinee.gn' },
    update: {},
    create: {
      email: 'admin@techguinee.gn',
      passwordHash: adminPassword,
      prenom: 'Mamadou',
      nom: 'Diallo',
      role: UserRole.ADMIN,
      organisationId: org.id,
    },
  })

  // Solutions templates
  const templates = [
    {
      nom: 'e-Services Citoyens',
      slug: 'e-services-citoyens',
      categorie: SolutionCategory.E_SERVICES_CITOYENS,
      description: 'Portail complet de demandes administratives en ligne avec paiement Mobile Money, suivi temps réel et notifications SMS. Inclut authentification nationale, gestion des files d\'attente virtuelles et tableau de bord administrations.',
      techStack: ['Next.js', 'NestJS', 'PostgreSQL', 'Redis', 'Orange Money API'],
      estimCoutMin: BigInt(200_000_000),
      estimCoutMax: BigInt(500_000_000),
      estimDelaiMois: 6,
      tags: ['portail', 'citoyens', 'digitalisation', 'Mobile Money'],
      isPublic: true,
    },
    {
      nom: 'Digitalisation Archives IA',
      slug: 'digitalisation-archives-ia',
      categorie: SolutionCategory.DIGITALISATION_ARCHIVES,
      description: 'Solution complète de numérisation, OCR intelligent et indexation sémantique des archives administratives. Recherche plein texte, gestion documentaire, workflow de validation et intégration avec les systèmes existants.',
      techStack: ['Python', 'Tesseract OCR', 'Elasticsearch', 'FastAPI', 'React', 'MinIO'],
      estimCoutMin: BigInt(400_000_000),
      estimCoutMax: BigInt(1_200_000_000),
      estimDelaiMois: 9,
      tags: ['archives', 'OCR', 'GED', 'IA', 'numérisation'],
      isPublic: true,
    },
    {
      nom: 'Plateforme SERA',
      slug: 'plateforme-sera',
      categorie: SolutionCategory.PLATEFORME_SERA,
      description: 'Infrastructure de services en ligne de l\'État guinéen. Authentification unique (SSO), catalogue de services, paiement en ligne, notifications multicanal et tableau de bord de pilotage pour les administrations.',
      techStack: ['Next.js', 'NestJS', 'Keycloak', 'PostgreSQL', 'Redis', 'RabbitMQ'],
      estimCoutMin: BigInt(800_000_000),
      estimCoutMax: BigInt(2_500_000_000),
      estimDelaiMois: 12,
      tags: ['SERA', 'SSO', 'e-gouvernement', 'services en ligne'],
      isPublic: true,
    },
    {
      nom: 'Gestion Subventions & Bourses',
      slug: 'gestion-subventions',
      categorie: SolutionCategory.GESTION_SUBVENTIONS,
      description: 'Cycle complet de gestion des subventions publiques : appel à candidatures, soumission en ligne, évaluation, sélection, contractualisation, décaissement et suivi-évaluation avec reporting automatique.',
      techStack: ['React', 'Node.js', 'PostgreSQL', 'PDF Generator', 'Mobile Money'],
      estimCoutMin: BigInt(150_000_000),
      estimCoutMax: BigInt(400_000_000),
      estimDelaiMois: 5,
      tags: ['subventions', 'bourses', 'suivi-évaluation', 'reporting'],
      isPublic: true,
    },
    {
      nom: 'Hub Entrepreneuriat Numérique',
      slug: 'hub-entrepreneuriat-numerique',
      categorie: SolutionCategory.ENTREPRENEURIAT_NUMERIQUE,
      description: 'Plateforme intégrée LMS + incubateur virtuel + marketplace de mentors pour soutenir les entrepreneurs numériques. Modules : formation, mentorat, pitching, financement, communauté.',
      techStack: ['Next.js', 'NestJS', 'PostgreSQL', 'WebRTC', 'Stripe/Mobile Money'],
      estimCoutMin: BigInt(300_000_000),
      estimCoutMax: BigInt(800_000_000),
      estimDelaiMois: 8,
      tags: ['LMS', 'incubateur', 'mentorat', 'WARDIP', 'startup'],
      isPublic: true,
    },
    {
      nom: 'Télémédecine Rurale',
      slug: 'telemedecine-rurale',
      categorie: SolutionCategory.SYSTEME_SANTE,
      description: 'Solution de téléconsultation adaptée aux zones à faible connectivité. Dossier patient simplifié, consultation vidéo ou audio, ordonnance numérique, réseau de médecins et pharmacies partenaires.',
      techStack: ['Flutter', 'FastAPI', 'PostgreSQL', 'WebRTC', 'Firebase'],
      estimCoutMin: BigInt(250_000_000),
      estimCoutMax: BigInt(700_000_000),
      estimDelaiMois: 7,
      tags: ['santé', 'télémédecine', 'rural', 'offline-first'],
      isPublic: true,
    },
    {
      nom: 'Système Gestion Scolaire',
      slug: 'gestion-scolaire',
      categorie: SolutionCategory.GESTION_SCOLAIRE,
      description: 'ERP scolaire complet : inscriptions en ligne, gestion des notes et bulletins, paiement des frais par Mobile Money, communication parents-enseignants, tableau de bord direction.',
      techStack: ['React', 'NestJS', 'PostgreSQL', 'Orange Money', 'SMS Gateway'],
      estimCoutMin: BigInt(120_000_000),
      estimCoutMax: BigInt(350_000_000),
      estimDelaiMois: 4,
      tags: ['éducation', 'scolaire', 'bulletins', 'inscriptions'],
      isPublic: true,
    },
    {
      nom: 'Gestion Impôts & Taxes',
      slug: 'gestion-impots-taxes',
      categorie: SolutionCategory.GESTION_IMPOTS,
      description: 'Plateforme de déclaration et paiement en ligne des impôts et taxes. Calcul automatique, paiement Mobile Money ou virement, reçu électronique, suivi du dossier fiscal et alertes échéances.',
      techStack: ['Next.js', 'NestJS', 'PostgreSQL', 'Mobile Money APIs', 'PDF'],
      estimCoutMin: BigInt(500_000_000),
      estimCoutMax: BigInt(1_500_000_000),
      estimDelaiMois: 10,
      tags: ['impôts', 'fiscalité', 'paiement en ligne', 'DNI'],
      isPublic: true,
    },
  ]

  for (const template of templates) {
    await prisma.solution.upsert({
      where: { slug: template.slug },
      update: {},
      create: template,
    })
  }

  // Entités publiques
  const entites = [
    { nom: 'ANDE', type: 'AGENCE', pays: 'GN', secteur: 'NUMERIQUE' },
    { nom: 'ARMP', type: 'AUTORITE_REGULATION', pays: 'GN', secteur: 'MARCHES_PUBLICS' },
    { nom: 'Ministère de l\'Économie Numérique', type: 'MINISTERE', pays: 'GN', secteur: 'NUMERIQUE' },
    { nom: 'Ministère du Budget', type: 'MINISTERE', pays: 'GN', secteur: 'FINANCE' },
    { nom: 'Banque Mondiale - Guinée', type: 'BAILLEUR', pays: 'GN', secteur: 'DEVELOPPEMENT' },
    { nom: 'BAD - Bureau Conakry', type: 'BAILLEUR', pays: 'GN', secteur: 'DEVELOPPEMENT' },
  ]

  for (const entite of entites) {
    await prisma.entite.upsert({
      where: { id: entite.nom.toLowerCase().replace(/\s/g, '-') + '-gn' } as any,
      update: {},
      create: entite,
    })
  }

  console.log('✅ Seeding terminé avec succès!')
  console.log('📧 Admin: admin@techguinee.gn / Admin@2026!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
