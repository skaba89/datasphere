# GuineaTender AI
## Plateforme SaaS de Veille, Scoring et Réponse aux Appels d'Offres Publics en Guinée et en Afrique de l'Ouest

**Document Technique & Commercial — Version 1.0 — Mai 2026**

---

## 1. Résumé Exécutif

### Vision

Devenir la plateforme de référence en Afrique francophone pour les entreprises technologiques qui souhaitent répondre efficacement aux appels d'offres publics de digitalisation, en combinant intelligence artificielle, données locales et accompagnement métier.

### Mission

GuineaTender AI automatise la veille des marchés publics, qualifie intelligemment les opportunités, enrichit les relations institutionnelles et génère des dossiers de réponse complets — permettant aux PME tech guinéennes et ouest-africaines de concourir à armes égales avec les grands cabinets internationaux.

### Valeur Ajoutée

| Dimension | Impact |
|---|---|
| Gain de temps | -70 % sur la constitution des dossiers AO |
| Taux de succès | +35 % estimé grâce au scoring et à l'alignement technique |
| Couverture sources | 100 % des sources officielles guinéennes + bailleurs internationaux |
| Accessibilité | Mobile-first, offline-first, Mobile Money intégré |
| Souveraineté | Hébergement local possible, données chiffrées en Guinée |

### Impact Attendu sur l'Écosystème Numérique Guinéen

La Guinée s'est dotée d'une Stratégie Nationale TIC ambitieuse. Des plateformes comme TELEMO, SERA, les initiatives WARDIP et les projets ANDE génèrent des dizaines d'appels d'offres annuels auxquels les entreprises locales peinent à répondre faute d'outils adaptés. GuineaTender AI comble ce fossé structurel, renforce la capacité des acteurs locaux et contribue directement à l'objectif gouvernemental de 20 % de marché public attribués aux PME nationales.

---

## 2. Problème & Analyse du Marché

### 2.1 Contexte des Marchés Publics en Guinée

La Guinée dispose d'un cadre réglementaire structuré autour de :
- **ARMP** (Autorité de Régulation des Marchés Publics) — organe de contrôle et de publication
- **TELEMO** — plateforme nationale de dématérialisation des marchés publics
- **ANDE** (Agence Nationale de Développement de l'Économie Numérique)
- **JAO Guinée** — Journal des Appels d'Offres
- **Banque Mondiale, BAD, PNUD** — bailleurs finançant des projets de digitalisation

En 2025, le volume des marchés publics de digitalisation en Guinée dépasse **200 milliards GNF** sur une période de 12 mois, avec une tendance haussière liée aux grands projets : SERA (Services en ligne de l'État), digitalisation des archives nationales, plateforme de gestion des subventions, etc.

### 2.2 Défis Rencontrés par les Entreprises Tech

**Veille fragmentée et chronophage**
- Les AO sont publiés sur 8 à 12 sources distinctes, souvent sans cohérence de format
- Aucune agrégation automatique : les équipes consultent manuellement les sites chaque semaine
- Délais serrés (10 à 21 jours) : une opportunité manquée le jour J est une opportunité perdue

**Qualification des opportunités artisanale**
- Absence de critères objectifs pour décider de répondre ou non
- Sous-estimation systématique du coût de réponse (30 à 150 heures/dossier)
- Taux de réponse non qualifiée : les entreprises répondent à des AO où elles n'ont aucune chance

**Capital relationnel non structuré**
- Les contacts dans les ministères, les régies et les agences sont dans des carnets d'adresses personnels
- Aucune traçabilité des interactions : qui a rencontré qui, quand, sur quel projet ?
- Pas d'historique partagé au niveau de l'équipe

**Constitution des dossiers laborieuse**
- Chaque dossier repart de zéro : mémoire technique, présentation de l'entreprise, méthodologie
- Les modèles de SaaS proposés aux clients sont recréés à chaque fois
- La cohérence entre l'offre technique et l'offre financière est rarement vérifiée

**Manque d'analytics**
- Aucun tableau de bord consolidé : combien d'AO suivis ? Quel taux de conversion ?
- Pas de retour sur investissement des dossiers produits

### 2.3 Analyse Concurrentielle

| Concurrent | Périmètre | Limites |
|---|---|---|
| Tengo (Sénégal) | Veille AO Afrique | Pas de génération IA, pas de CRM |
| DG Market | Bailleurs internationaux | Pas adapté au marché local guinéen |
| Africa Tenders | Pan-africain | Pas de scoring, pas de module dossier |
| Solutions manuelles | Excel, email | Aucune automatisation |

**GuineaTender AI est le seul outil conçu spécifiquement pour le marché guinéen, intégrant IA, CRM sectoriel et générateur de dossiers.**

---

## 3. Solution : GuineaTender AI

### 3.1 Description du Produit

GuineaTender AI est une plateforme SaaS modulaire accessible via navigateur web et application mobile (Android/iOS), conçue pour couvrir l'intégralité du cycle de vie d'une réponse à appel d'offres :

```
Veille → Scoring → Qualification → Relation → Rédaction → Soumission → Suivi → Analytics
```

La plateforme exploite des modèles d'IA générative et de traitement du langage naturel (NLP) pour automatiser les tâches à faible valeur ajoutée et amplifier l'expertise métier des utilisateurs.

### 3.2 Positionnement

- **Pour qui :** PME et startups tech en Guinée et Afrique de l'Ouest (5 à 200 employés)
- **Pour quoi :** Remporter plus d'AO publics de digitalisation avec moins d'effort
- **Différenciation :** IA locale, données guinéennes, offline-first, Mobile Money, conformité ARMP

### 3.3 Principes de Conception

- **Offline-first** : fonctionnement sans connexion, synchronisation automatique dès retour en ligne
- **Mobile-first** : interface optimisée pour smartphones Android avec 4G limitée
- **IA explicable** : chaque score, chaque recommandation est justifié et compréhensible
- **Souveraineté des données** : option d'hébergement en Guinée, chiffrement de bout en bout
- **Multilangue** : français + pular, soussou, malinké (interface et résumés)

---

## 4. Fonctionnalités Complètes par Module

### Module 1 : Collecte Automatique des Appels d'Offres

**Objectif** : Centraliser en temps réel toutes les opportunités publiées sur les sources officielles et internationales.

#### Sources Intégrées

| Source | Type d'intégration | Fréquence |
|---|---|---|
| TELEMO | API officielle + scraping | Temps réel |
| ARMP (armp.gov.gn) | Scraping structuré | Toutes les 2h |
| JAO Guinée | Scraping + parsing PDF | Quotidien |
| ANDE | RSS + scraping | Quotidien |
| Ministère du Budget | Scraping | Quotidien |
| Ministère de l'Économie Numérique | Scraping | Quotidien |
| Banque Mondiale (STEP) | API officielle | Quotidien |
| BAD (African Development Bank) | API + scraping | Quotidien |
| PNUD Guinée | Scraping | Quotidien |
| UNICEF, OMS, FAO | APIs publiques | Quotidien |
| Marchés régionaux CEDEAO | Agrégateur | Hebdomadaire |

#### Fonctionnalités Clés

- **Parsing intelligent des PDFs** : extraction automatique des champs clés (objet, budget estimé, date limite, critères d'éligibilité) depuis des documents mal structurés
- **Déduplication automatique** : détection des AO publiés sur plusieurs sources
- **Normalisation des données** : uniformisation des formats de date, montants, entités
- **Alertes personnalisées** : notifications push/email selon des mots-clés, secteurs ou montants configurés
- **Historique complet** : archivage de tous les AO collectés depuis le lancement (searchable)
- **Veille concurrentielle** : identification des entreprises fréquemment attributaires sur des marchés similaires

---

### Module 2 : Scoring Intelligent

**Objectif** : Fournir un score objectif (0-100) pour chaque AO, guidant la décision de répondre ou non.

#### Algorithme de Scoring

Le score est calculé selon 6 dimensions pondérées :

| Dimension | Poids | Critères évalués |
|---|---|---|
| **Alignement sectoriel** | 25 % | Correspondance entre l'AO et les domaines d'expertise de l'entreprise |
| **Capacité financière** | 20 % | Budget de l'AO vs. chiffre d'affaires et caution exigée |
| **Critères d'éligibilité** | 20 % | Années d'expérience, certifications, références exigées |
| **Concurrence estimée** | 15 % | Nombre d'acteurs potentiels détectés, complexité du marché |
| **Relation institutionnelle** | 10 % | Score de proximité avec l'entité adjudicatrice (via CRM) |
| **Délai de réponse** | 10 % | Faisabilité en fonction du temps disponible |

#### Fonctionnalités Clés

- **Score dynamique** : recalcul automatique lorsque le profil entreprise est mis à jour
- **Explication du score** : chaque dimension est détaillée avec les raisons du score attribué
- **Seuil de recommandation** : configurable par l'entreprise (ex. : ne soumettre que si score > 65)
- **Simulation** : l'utilisateur peut modifier ses paramètres et voir l'impact sur le score
- **Apprentissage par le feedback** : le système améliore ses prédictions en fonction des succès/échecs passés
- **Scoring comparatif** : classement des AO du mois par score pour prioriser les efforts

---

### Module 3 : CRM Contacts & Relations Institutionnelles

**Objectif** : Transformer le capital relationnel informel en actif stratégique structuré et partagé.

#### Fonctionnalités Clés

- **Base de contacts enrichie** : fiche par contact (nom, poste, ministère/agence, téléphone, email, LinkedIn, photo)
- **Import multi-sources** : depuis Google Contacts, CSV, cartes de visite scannées (OCR), LinkedIn
- **Enrichissement automatique** : vérification et complétion via des sources publiques (sites officiels, LinkedIn scraping éthique)
- **Historique des interactions** : chaque réunion, email, appel est tracé avec date, contexte et résultat
- **Lien AO-Contact** : association des contacts aux AO auxquels ils sont liés (comité d'évaluation, maître d'ouvrage, etc.)
- **Score de proximité** : indicateur de chaleur de la relation (froid/tiède/chaud) basé sur la fréquence des interactions
- **Rappels automatiques** : "Vous n'avez pas contacté M. Bah du MDEN depuis 45 jours"
- **Cartographie relationnelle** : visualisation graphique des connexions entre contacts et entités
- **Notes privées/partagées** : notes internes confidentielles vs. notes visibles à l'équipe
- **Conformité RGPD/locale** : consentement tracé, droit à l'oubli, export des données

---

### Module 4 : Créateur de Solutions Digitales

**Objectif** : Mettre à disposition une bibliothèque de templates de solutions SaaS pré-architecturés, prêts à être proposés dans les réponses aux AO de digitalisation.

#### Bibliothèque de Solutions (Templates)

| Template | Description | AO Cibles |
|---|---|---|
| **e-Services Citoyens** | Portail de demandes administratives en ligne avec paiement Mobile Money | Ministères, collectivités |
| **Digitalisation Archives IA** | OCR, indexation intelligente, GED avec recherche sémantique | Archives nationales, ministères |
| **Plateforme SERA** | Gestion des services en ligne de l'État, authentification nationale | ANDE, présidence |
| **Gestion Subventions** | Cycle complet : appel, sélection, suivi, reporting | Ministères, bailleurs |
| **Entrepreneuriat Numérique** | LMS + incubateur virtuel + marketplace de mentors | ANDE, WARDIP |
| **Plateforme d'Emploi Public** | Recrutement, concours, gestion des candidatures | Fonction publique |
| **Système de Paiement Fiscal** | Déclaration et paiement en ligne des impôts | Direction nationale des impôts |
| **Télémédecine Rurale** | Consultation à distance, dossier patient simplifié | Ministère de la Santé |
| **Gestion Scolaire** | Inscriptions, notes, bulletins, paiement scolarité | Ministère de l'Éducation |
| **Identité Numérique** | KYC, authentification biométrique légère | CENI, administration |

#### Fonctionnalités Clés

- **Configurateur de solution** : sélection du template + personnalisation (modules actifs, technologie, hébergement)
- **Estimation automatique** : calcul du coût de développement, délai, équipe nécessaire
- **Générateur de maquettes** : wireframes et écrans clés générés automatiquement (via IA)
- **Export vers dossier AO** : injection directe du descriptif technique dans le mémoire technique
- **Versioning** : chaque template est versionné et mis à jour selon les évolutions réglementaires
- **Contributions communautaires** : les utilisateurs peuvent proposer de nouveaux templates

---

### Module 5 : Générateur IA de Dossiers de Réponse

**Objectif** : Produire automatiquement les composantes d'un dossier de réponse à AO en 80 % moins de temps.

#### Composantes Générées

**Mémoire Technique**
- Compréhension du besoin (paraphrase intelligente du cahier des charges)
- Méthodologie proposée (phases, jalons, livrables)
- Architecture technique de la solution
- Gestion des risques et mesures d'atténuation
- Plan de formation et transfert de compétences
- Plan de maintenance et support

**Offre Financière**
- Décomposition du prix par lot/poste
- Analyse comparative avec les prix du marché local
- Justification des coûts (taux journaliers, licences, infrastructure)
- TVA, taxes, retenues à la source selon la fiscalité guinéenne

**Dossier Administratif**
- Check-list des pièces requises avec statut (fournie/manquante/à renouveler)
- Alertes sur les documents expirés (RCCM, attestation fiscale, IFU)
- Modèles de lettres types (lettre de soumission, déclaration sur l'honneur)

**Planning**
- Diagramme de Gantt automatique basé sur la durée du marché
- Allocation automatique des ressources humaines
- Identification des jalons critiques

#### Fonctionnalités Clés

- **Mémoire d'entreprise** : base de connaissances alimentée par les dossiers précédents
- **Style d'écriture cohérent** : le générateur respecte la charte rédactionnelle de l'entreprise
- **Mode collaboration** : plusieurs rédacteurs sur le même dossier en temps réel
- **Versionning avec diff** : comparaison visuelle entre versions du dossier
- **Export multi-formats** : PDF haute qualité, DOCX éditable, ZIP complet
- **Signature électronique** : intégration pour les soumissions numériques TELEMO

---

### Module 6 : Dashboard Analytics & Suivi des Opportunités

**Objectif** : Offrir une vision 360° de l'activité commerciale et de la performance sur les marchés publics.

#### Tableaux de Bord

**Vue Opportunités**
- Pipeline visuel : Identifié → Qualifié → En cours → Soumis → Attribué/Perdu
- Valeur totale du pipeline par étape
- Délais restants par AO actif

**Vue Performance**
- Taux de conversion par étape du pipeline
- Score moyen des AO remportés vs. perdus
- Évolution du taux de succès dans le temps
- Montant total des marchés remportés

**Vue Sources**
- Répartition des AO par source (TELEMO, Banque Mondiale, etc.)
- AOs les plus lucratifs par entité adjudicatrice
- Tendances saisonnières des publications

**Vue Équipe**
- Charge de travail par collaborateur
- Dossiers en cours et délais

#### Fonctionnalités Clés

- **Rapports automatiques** : envoi hebdomadaire par email du résumé des opportunités
- **Export Excel/PDF** : pour reporting interne ou partenaires
- **Alertes intelligentes** : "3 AO en cours ont une date limite dans 48h"
- **Prévisions** : estimation du CA potentiel basée sur le pipeline actuel

---

### Module 7 : Application Mobile (Offline-First)

**Objectif** : Permettre l'accès complet à la plateforme depuis un smartphone Android, même sans connexion stable.

#### Fonctionnalités Mobiles

- **Feed des AO** : consultation de tous les appels d'offres avec filtres avancés
- **Notifications push** : alertes instantanées pour les nouveaux AO correspondant au profil
- **CRM mobile** : ajout/modification de contacts, log d'interaction vocale (transcription automatique)
- **Scanner de documents** : photo d'un AO papier → extraction automatique des informations clés
- **Dashboard simplifié** : vue synthétique du pipeline et des alertes
- **Mode hors-ligne** : toutes les fonctionnalités principales disponibles sans internet
- **Synchronisation intelligente** : synchronisation différentielle dès retour en ligne
- **Paiement Mobile Money** : Orange Money, MTN MoMo, Cellcom pour les abonnements

---

## 5. Architecture Technique Complète

### 5.1 Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENTS                                    │
│   Web App (React)    │    Mobile App (Flutter)               │
└──────────┬───────────┴──────────┬────────────────────────────┘
           │                      │
           ▼                      ▼
┌─────────────────────────────────────────────────────────────┐
│              API Gateway (Kong / Nginx)                      │
│         Auth JWT │ Rate Limiting │ Load Balancing            │
└──────────────────┬──────────────────────────────────────────┘
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
   ┌────────┐ ┌────────┐ ┌────────┐
   │ Core   │ │ AI     │ │ Jobs   │
   │ API    │ │ Service│ │ Worker │
   │(NestJS)│ │(Python)│ │(Bull)  │
   └────────┘ └────────┘ └────────┘
        │          │          │
        ▼          ▼          ▼
   ┌─────────────────────────────┐
   │         Data Layer          │
   │  PostgreSQL │ Redis │ MinIO  │
   │  Qdrant (Vector DB)         │
   └─────────────────────────────┘
```

### 5.2 Frontend Web

**Framework** : **Next.js 15** (React 19, App Router, Server Components)

**Justification** : Rendu côté serveur pour le SEO et les performances, TypeScript natif, écosystème mature, déployable sur VPS ou CDN.

**UI Library** : **shadcn/ui** + **Tailwind CSS v4**

- Composants accessibles et personnalisables
- Design system cohérent sans surcharge de dépendances

**État global** : **Zustand** (léger, simple) + **TanStack Query v5** (cache serveur, invalidation intelligente)

**Graphiques** : **Recharts** (open source, responsive)

**Éditeur de documents** : **TipTap** (éditeur WYSIWYG collaboratif, extensible)

**Internationalisation** : **next-intl** (français par défaut + pular, soussou, malinké)

---

### 5.3 Application Mobile

**Technologie** : **Flutter 3.x** (Dart)

**Justification** :
- Une seule base de code → Android + iOS
- Performances natives, excellentes sur appareils Android mid-range courants en Guinée
- Support offline-first natif avec Hive/Isar
- Forte communauté et maintenabilité pour une équipe africaine

**Gestion offline** : **Isar Database** (base locale) + **Connectivity Plus** + synchronisation via **Drift** (ORM SQLite)

**Gestion d'état** : **Riverpod** (réactif, testable)

**Notifications** : **Firebase Cloud Messaging** (FCM) avec fallback SMS (via Orange API)

---

### 5.4 Backend & API

**Framework principal** : **NestJS** (Node.js + TypeScript)

**Justification** :
- Architecture modulaire et maintenable
- Injection de dépendances native
- Support natif des microservices et WebSockets
- Forte adoption en Afrique francophone

**Architecture** : Monolithe modulaire (pas de microservices complexes pour la v1 — maintenabilité prioritaire)

**API** : REST + GraphQL (Apollo) pour les requêtes complexes du dashboard

**Service IA** : **FastAPI** (Python 3.12) — service séparé pour les modèles ML/LLM

**File d'attente** : **BullMQ** + **Redis** pour les tâches asynchrones (scraping, génération IA, notifications)

**WebSockets** : Collaboration temps réel sur les dossiers, notifications live

---

### 5.5 Base de Données

| Rôle | Technologie | Justification |
|---|---|---|
| Base principale | **PostgreSQL 16** | Fiabilité, JSONB, full-text search, transactions ACID |
| Cache & sessions | **Redis 7** | Performance, pub/sub pour notifications |
| Fichiers & documents | **MinIO** (S3-compatible) | Auto-hébergeable, compatible S3, gratuit |
| Vecteurs (RAG) | **Qdrant** | Recherche sémantique sur les AOs et documents |
| Analytics (OLAP) | **ClickHouse** (v2+) | Requêtes analytiques ultra-rapides |

**ORM** : **Prisma** (type-safe, migrations automatiques, support PostgreSQL natif)

---

### 5.6 Couche IA / LLM

**Architecture RAG (Retrieval-Augmented Generation)**

```
Document AO (PDF/HTML)
    → Parsing & chunking (LangChain)
    → Embeddings (OpenAI text-embedding-3-small ou Mistral)
    → Stockage Qdrant
    → Requête utilisateur → Retrieval → Contexte enrichi → LLM
    → Réponse contextuelle et précise
```

**LLMs Utilisés**

| Usage | Modèle | Mode |
|---|---|---|
| Génération mémoire technique | Claude Sonnet 4.6 (Anthropic) | API |
| Scoring et analyse AO | Claude Haiku 4.5 (rapide, économique) | API |
| Embeddings | Mistral Embed (option souveraine) | API ou local |
| Résumés courts (mobile) | Llama 3.1 8B (on-premise optionnel) | Local/GPU |
| OCR et extraction PDF | Tesseract + LayoutParser | On-premise |

**Justification du choix Claude** : Qualité supérieure en français, respect des nuances administratives, API stable avec prompt caching pour réduire les coûts.

**Option souveraineté** : Déploiement de Mistral 7B/Mixtral sur un serveur GPU local pour les clients sensibles (administrations).

---

### 5.7 Infrastructure & Hébergement

**Environnement Cloud Principal**

| Composant | Solution |
|---|---|
| Hébergeur principal | **Hetzner Cloud** (EU) ou **OVHcloud** (Paris) — coût/performance optimal |
| CDN | **Cloudflare** (gratuit, DDoS protection, cache global) |
| CI/CD | **GitHub Actions** + **Docker** + **Kubernetes K3s** |
| Monitoring | **Grafana** + **Prometheus** + **Loki** (logs) |
| Alertes | **PagerDuty** ou **Uptime Kuma** (open source) |

**Option Hébergement Local Guinée (Souveraineté)**

Pour les marchés publics exigeant la localisation des données :
- Serveurs déployés dans un datacenter local (ex. : Syfed, infrastructure SOTELGUI)
- Stack identique via K3s (Kubernetes léger)
- Réplication asynchrone vers le cloud pour la résilience

**Stratégie Offline (Mobile)**

- Synchronisation delta : seules les modifications sont transmises
- Compression des données (gzip + Protocol Buffers)
- File d'attente locale des actions offline, rejouées à la reconnexion

---

### 5.8 Sécurité

- **Authentification** : JWT + OAuth 2.0 (Google, Microsoft) + 2FA (TOTP)
- **Autorisation** : RBAC (Role-Based Access Control) — Admin, Manager, Rédacteur, Lecteur
- **Chiffrement** : TLS 1.3 en transit, AES-256 au repos (MinIO, PostgreSQL pgcrypto)
- **Audit trail** : Toutes les actions sont loguées (qui, quoi, quand)
- **Rate limiting** : Protection API contre les abus
- **Backup** : Sauvegardes quotidiennes chiffrées avec rétention 30 jours
- **Conformité** : Aligné sur les principes RGPD adaptés au contexte guinéen

---

### 5.9 Stack Technique Complète — Récapitulatif

```
Frontend Web    : Next.js 15 + React 19 + Tailwind CSS + shadcn/ui
Mobile          : Flutter 3.x (Android/iOS)
Backend API     : NestJS (Node.js 22 + TypeScript)
Service IA      : FastAPI (Python 3.12) + LangChain
Base de données : PostgreSQL 16 + Redis 7 + Qdrant + ClickHouse
Fichiers        : MinIO (S3-compatible)
File de tâches  : BullMQ + Redis
LLMs            : Claude Sonnet/Haiku (Anthropic) + Mistral (option locale)
Infrastructure  : Docker + K3s + GitHub Actions + Cloudflare
Monitoring      : Grafana + Prometheus + Loki
Paiements       : Orange Money API + MTN MoMo + Stripe (international)
```

---

## 6. User Stories & Workflows Principaux

### US-001 — Veille quotidienne automatique
> En tant que **Responsable commercial**, je veux recevoir chaque matin un résumé des nouveaux AO correspondant à nos domaines d'expertise, afin de ne jamais manquer une opportunité pertinente.

**Critères d'acceptation** : Email/push avant 8h, filtres par secteur et montant minimum configurables, lien direct vers la fiche AO.

---

### US-002 — Qualification rapide d'un AO
> En tant que **Directeur général**, je veux voir en un coup d'œil le score de pertinence d'un AO (0-100) avec l'explication détaillée, afin de décider en moins de 2 minutes si nous répondons.

**Critères d'acceptation** : Score affiché avec jauge visuelle, 5 dimensions expliquées, bouton "Go/No Go" qui déclenche le workflow de réponse.

---

### US-003 — Création d'un contact institutionnel
> En tant que **Business Developer**, je veux ajouter un contact rencontré à une conférence ANDE en scannant sa carte de visite, afin d'enrichir notre CRM sans ressaisie manuelle.

**Critères d'acceptation** : OCR de la carte en moins de 5 secondes, suggestion automatique d'entité et de poste, enrichissement LinkedIn optionnel.

---

### US-004 — Génération du mémoire technique
> En tant que **Responsable technique**, je veux générer une première version du mémoire technique en sélectionnant le template de solution et en collant le cahier des charges, afin d'avoir une base rédigée en moins de 30 minutes.

**Critères d'acceptation** : Mémoire de 15-25 pages structuré, terminologie conforme au secteur, sections personnalisables, export DOCX.

---

### US-005 — Collaboration sur un dossier
> En tant que **Rédacteur**, je veux travailler en simultané avec un collègue sur le même dossier AO, afin d'éviter les conflits de versions et les envois d'emails de fichiers.

**Critères d'acceptation** : Édition temps réel avec curseurs de présence, commentaires inline, historique des versions avec diff.

---

### US-006 — Check-list administrative
> En tant que **Assistante administrative**, je veux voir la liste de toutes les pièces administratives requises pour un AO avec leur statut (fournie/manquante/expirée), afin de préparer le dossier complet à temps.

**Critères d'acceptation** : Check-list auto-générée depuis le cahier des charges, alertes sur les documents expirant dans les 30 jours, upload des documents validé.

---

### US-007 — Estimation financière automatique
> En tant que **Directeur financier**, je veux obtenir une estimation détaillée du coût de la solution proposée avec les taux du marché local, afin de construire une offre financière compétitive et rentable.

**Critères d'acceptation** : Décomposition par poste (développement, infrastructure, formation, maintenance), comparaison avec prix du marché guinéen, marge configurée.

---

### US-008 — Suivi du pipeline commercial
> En tant que **Directeur général**, je veux voir en temps réel l'état de toutes les opportunités en cours (pipeline Kanban), leur valeur totale et les deadlines critiques, afin de piloter mon équipe commerciale efficacement.

**Critères d'acceptation** : Vue Kanban et tableau, valeur agrégée par étape, alertes deadline < 48h, filtres par responsable.

---

### US-009 — Utilisation hors-ligne sur mobile
> En tant que **Commercial en déplacement en province**, je veux accéder à la liste des AO actifs et aux fiches contacts même sans connexion internet 4G, afin de préparer mes réunions.

**Critères d'acceptation** : Accès hors-ligne aux 50 derniers AO et tous les contacts, synchronisation automatique à la reconnexion, indicateur de mode offline visible.

---

### US-010 — Paiement de l'abonnement par Mobile Money
> En tant que **Gérant de PME**, je veux payer mon abonnement mensuel par Orange Money sans avoir à fournir une carte bancaire internationale, afin d'accéder au service facilement.

**Critères d'acceptation** : Confirmation USSD Orange Money, reçu par SMS et email, accès activé en moins de 5 minutes.

---

### US-011 — Analyse post-mortem d'un AO perdu
> En tant que **Directeur général**, je veux comprendre pourquoi nous avons perdu un marché (score de notre dossier vs. critères d'attribution), afin d'améliorer nos prochaines soumissions.

**Critères d'acceptation** : Formulaire de saisie du résultat avec motif, mise à jour automatique du modèle de scoring, recommandations d'amélioration.

---

### US-012 — Sélection et configuration d'un template solution
> En tant que **Architecte technique**, je veux sélectionner le template "Digitalisation Archives IA" et le configurer pour un client ministère, afin d'obtenir une description technique précise et une estimation de coût fiable.

**Critères d'acceptation** : Questionnaire de configuration (volume documents, langues, intégrations), architecture générée automatiquement, export vers mémoire technique.

---

### US-013 — Cartographie relationnelle d'une entité
> En tant que **Business Developer**, je veux voir le graphe des connexions entre les contacts du Ministère des Finances (décideurs, influenceurs, évaluateurs), afin de préparer une stratégie d'approche ciblée.

**Critères d'acceptation** : Graphe interactif, couleurs selon la chaleur de la relation, clic sur un nœud → fiche contact complète.

---

### US-014 — Rapport mensuel automatique
> En tant que **Directeur général**, je veux recevoir automatiquement le 1er de chaque mois un rapport PDF de l'activité commerciale (AOs suivis, soumis, remportés, CA potentiel), afin de partager les résultats avec mon équipe direction.

**Critères d'acceptation** : Rapport PDF brandé, envoyé automatiquement, accessible dans l'historique de la plateforme.

---

### US-015 — Alerte concurrentielle
> En tant que **Directeur commercial**, je veux être alerté lorsqu'une entreprise concurrente identifiée remporte un marché sur lequel nous n'avons pas répondu, afin d'ajuster notre stratégie de veille.

**Critères d'acceptation** : Détection des attributions publiées sur ARMP/TELEMO, matching avec la liste des concurrents configurée, notification email/push avec détails du marché.

---

## 7. Modèle de Données

### Entité : AppelOffre

```
AppelOffre {
  id              UUID (PK)
  source          ENUM (TELEMO, ARMP, JAO, BANQUE_MONDIALE, ...)
  sourceId        String (identifiant original)
  titre           String
  objet           Text
  entiteAdj       String (nom de l'entité adjudicatrice)
  secteur         ENUM (NUMERIQUE, SANTE, EDUCATION, TRANSPORT, ...)
  typeMarche      ENUM (FOURNITURE, SERVICE, TRAVAUX, CONSULTANT)
  budgetEstime    BigInt (en GNF)
  deviseOrigine   String
  datePublication DateTime
  dateLimite      DateTime
  dureeMarche     Int (en mois)
  criteres        JSONB (critères d'éligibilité et d'évaluation)
  documentUrl     String[]
  documentParsed  JSONB (contenu extrait)
  score           Int (calculé, 0-100)
  scoreDetails    JSONB (détail par dimension)
  status          ENUM (NOUVEAU, QUALIFIE, EN_COURS, SOUMIS, REMPORTE, PERDU, ARCHIVE)
  assigneA        UUID[] (FK User)
  createdAt       DateTime
  updatedAt       DateTime
}
```

### Entité : Contact

```
Contact {
  id              UUID (PK)
  prenom          String
  nom             String
  titre           String (Directeur, Chef de Division, ...)
  entite          UUID (FK Organisation)
  poste           String
  email           String[]
  telephone       String[]
  linkedin        String
  photo           String (URL MinIO)
  scoreProximite  Int (0-100, calculé)
  tags            String[]
  notes           Text
  createdBy       UUID (FK User)
  createdAt       DateTime
  updatedAt       DateTime
}
```

### Entité : Interaction

```
Interaction {
  id          UUID (PK)
  contactId   UUID (FK Contact)
  type        ENUM (REUNION, EMAIL, APPEL, EVENEMENT, NOTE)
  date        DateTime
  objet       String
  resume      Text
  aoId        UUID (FK AppelOffre, nullable)
  createdBy   UUID (FK User)
  createdAt   DateTime
}
```

### Entité : Dossier

```
Dossier {
  id                UUID (PK)
  aoId              UUID (FK AppelOffre)
  titre             String
  version           Int (auto-increment)
  status            ENUM (BROUILLON, EN_COURS, SOUMIS, ARCHIVE)
  memTechnique      JSONB (contenu structuré TipTap JSON)
  offreFinanciere   JSONB (décomposition par poste)
  planning          JSONB (Gantt data)
  piecesAdmin       JSONB (check-list avec statuts)
  templateUsed      UUID (FK Template, nullable)
  generatedByAI     Boolean
  collaborateurs    UUID[] (FK User)
  exportUrl         String (URL du PDF/ZIP généré)
  createdBy         UUID (FK User)
  createdAt         DateTime
  updatedAt         DateTime
}
```

### Entité : Solution (Template)

```
Solution {
  id              UUID (PK)
  nom             String
  categorie       ENUM (E_SERVICES, ARCHIVES, PAIEMENT, SANTE, ...)
  description     Text
  configSchema    JSONB (schéma JSON du configurateur)
  archType        Text (description architecture)
  estimCout       JSONB (fourchettes par configuration)
  techStack       String[]
  tags            String[]
  version         String
  isPublic        Boolean
  createdBy       UUID (FK Organisation)
  updatedAt       DateTime
}
```

### Entité : Organisation (Entreprise cliente)

```
Organisation {
  id              UUID (PK)
  nom             String
  rccm            String
  ifu             String
  secteurs        String[] (domaines d'expertise)
  ca              BigInt (chiffre d'affaires annuel)
  effectif        Int
  references      JSONB[] (projets réalisés)
  certifications  String[]
  abonnement      ENUM (STARTER, PRO, ENTERPRISE)
  abonnementExp   DateTime
  settings        JSONB (configuration scoring, alertes)
  createdAt       DateTime
}
```

---

## 8. Modèle de Tarification SaaS

### Abonnements

| Fonctionnalité | Starter | Pro | Enterprise |
|---|---|---|---|
| **Prix mensuel** | 150 000 GNF (~17 USD) | 450 000 GNF (~50 USD) | Sur devis (~200+ USD) |
| **Prix annuel (-20%)** | 1 440 000 GNF | 4 320 000 GNF | Sur devis |
| AOs collectés/mois | 50 | Illimité | Illimité |
| Sources couvertes | 5 sources | Toutes sources | Toutes + sources custom |
| Utilisateurs | 2 | 10 | Illimité |
| Scoring intelligent | Basique | Avancé + simulation | Avancé + ML personnalisé |
| CRM Contacts | 200 contacts | Illimité | Illimité |
| Génération IA dossiers | 3/mois | 20/mois | Illimité |
| Templates Solutions | 3 templates | Bibliothèque complète | Bibliothèque + templates custom |
| Application mobile | Lecture seule | Complète | Complète + MDM |
| Analytics | Basique | Avancé | Avancé + BI custom |
| Export formats | PDF | PDF + DOCX + ZIP | Tous formats + API |
| Support | Email 48h | Chat 24h | Dédié + SLA 4h |
| Hébergement données | Cloud partagé | Cloud partagé | Cloud dédié ou on-premise |
| Paiement accepté | Orange Money, MTN | Orange Money, MTN, Virement | Tous modes |
| Signature électronique | - | - | Intégrée TELEMO |

### Options Add-on

| Option | Prix/mois |
|---|---|
| Utilisateur supplémentaire (Pro) | 30 000 GNF |
| Dossier IA supplémentaire | 50 000 GNF/dossier |
| Hébergement on-premise (setup) | 2 000 USD one-time |
| Formation équipe (2 jours) | 500 000 GNF |
| Intégration TELEMO avancée | Sur devis |

### Politique Tarifaire Spéciale

- **ONG et associations** : -30 % sur tous les abonnements
- **Startups < 2 ans** : 3 mois offerts sur abonnement Pro
- **Groupements d'entreprises** : tarif consortium sur devis

---

## 9. Feuille de Route & Planning de Développement

### Phase 1 — MVP (Mois 1 à 3)

**Objectif** : Valider le product-market fit avec 10 entreprises beta

| Semaine | Livrables |
|---|---|
| S1-S2 | Infrastructure de base, authentification, onboarding |
| S3-S4 | Collecte AO (TELEMO + ARMP + JAO) — scraping basique |
| S5-S6 | Fiche AO, scoring basique (3 critères), alertes email |
| S7-S8 | Module CRM — contacts + interactions |
| S9-S10 | Générateur mémoire technique (Claude API, 3 templates) |
| S11-S12 | Dashboard basique, tests beta, corrections, déploiement |

**KPIs MVP** : 10 entreprises inscrites, 3 dossiers générés, NPS > 40

---

### Phase 2 — Version 1.0 (Mois 4 à 6)

**Objectif** : Lancement commercial, 50 clients payants

| Mois | Livrables |
|---|---|
| M4 | Scoring avancé (6 dimensions), simulation, feedback loop |
| M4 | Application mobile Flutter (Android) — fonctionnalités core |
| M5 | Module Solutions — 10 templates, configurateur, estimation |
| M5 | Offre financière automatique, check-list administrative |
| M6 | Analytics avancés, rapports automatiques, collaboration temps réel |
| M6 | Paiement Orange Money + MTN MoMo, plans tarifaires |
| M6 | Documentation, formation, lancement commercial |

**KPIs V1.0** : 50 clients payants, 500 AOs traités, 100 dossiers générés

---

### Phase 3 — Version 2.0 (Mois 7 à 12)

**Objectif** : Expansion régionale (Sénégal, Côte d'Ivoire, Mali), 200 clients

| Mois | Livrables |
|---|---|
| M7-M8 | Intégration sources régionales (DCMP Sénégal, DMP Côte d'Ivoire) |
| M7-M8 | RAG complet sur la base de données des AOs |
| M8-M9 | App iOS, langues nationales (pular, soussou) |
| M9-M10 | Modèle ML de scoring personnalisé par client |
| M10-M11 | Intégration TELEMO API officielle, signature électronique |
| M11-M12 | Marketplace de templates, contributions communautaires |
| M12 | Option hébergement on-premise, certifications sécurité |

**KPIs V2.0** : 200 clients, présence dans 4 pays, 50M GNF MRR

---

## 10. Cas d'Usage & Exemples Concrets

### Cas 1 : AO de Digitalisation des Archives Nationales (ANDE)

**Contexte** : L'ANDE lance un AO pour la numérisation et l'indexation de 2 millions de documents administratifs.

**Comment GuineaTender AI aide** :
1. L'AO est capté automatiquement depuis TELEMO dès sa publication
2. Score calculé : 78/100 (expertise IA documentaire forte, budget compatible, relation avec directeur ANDE tracée dans le CRM)
3. L'équipe sélectionne le template "Digitalisation Archives IA" : architecture générée (OCR + GED + recherche sémantique)
4. Le générateur produit un mémoire technique de 22 pages en 45 minutes
5. L'estimation financière est calculée automatiquement : 850M GNF sur 18 mois
6. Le dossier est exporté en ZIP complet et soumis dans TELEMO via l'intégration native

**Résultat** : Réponse complète en 3 jours vs. 3 semaines auparavant

---

### Cas 2 : Appel d'Offres TELEMO — Maintenance et Évolution

**Contexte** : Le GIS-TCI (Groupement Interprofessionnel des TIC) publie un AO pour la maintenance évolutive de TELEMO.

**Comment GuineaTender AI aide** :
1. Alerte push envoyée à 7h15 le jour de la publication
2. Score : 65/100 (marché complexe, concurrence internationale probable)
3. La cartographie relationnelle montre 3 contacts au Ministère du Budget avec score de proximité "chaud"
4. L'assistant suggère de prendre contact avec M. Camara (Chef de Division DSI) avant soumission
5. Le workflow de réponse est lancé, le dossier collaboratif créé, 4 membres de l'équipe invités
6. Rappel automatique J-7 et J-2 avant la date limite

---

### Cas 3 : Projet WARDIP — Plateforme Entrepreneuriat Numérique Féminin

**Contexte** : La Banque Mondiale (projet WARDIP) recherche un prestataire pour développer une plateforme d'accompagnement des femmes entrepreneures numériques.

**Comment GuineaTender AI aide** :
1. Capté via l'API Banque Mondiale (STEP) — traduit automatiquement en français
2. Score : 82/100 — correspondance parfaite avec les capacités déclarées
3. Template "Entrepreneuriat Numérique" sélectionné avec personnalisation genre
4. Mémoire technique généré avec accent sur l'inclusion numérique et la mobilité
5. L'offre financière respecte les plafonds WARDIP (grille de rémunération Banque Mondiale)

---

### Cas 4 : Veille Concurrentielle — Attribution d'un Marché

**Contexte** : Un marché de digitalisation d'état civil est attribué à une entreprise concurrente.

**Comment GuineaTender AI aide** :
1. L'attribution publiée sur ARMP est automatiquement détectée
2. Analyse : marché sur lequel notre score était de 45/100 (budget insuffisant)
3. Fiche concurrente enrichie avec les marchés remportés
4. Recommandation : "Renforcer les références en état civil civil pour les prochains AO similaires"

---

## 11. Avantages Concurrentiels & Risques

### Avantages Concurrentiels

| Avantage | Description |
|---|---|
| **Spécificité Guinée** | Seul outil conçu pour le marché local (TELEMO, ARMP, fiscalité GNF, RCCM) |
| **IA contextuelle** | Modèles affinés sur les textes juridiques et techniques guinéens |
| **Offline-first** | Fonctionnement sans connexion — critique pour la Guinée provinciale |
| **Mobile Money natif** | Aucune barrière à l'entrée pour les PME sans compte bancaire international |
| **Pipeline complet** | Veille + Score + CRM + Dossier + Analytics en un seul outil |
| **Données propriétaires** | Base d'AOs historiques unique, impossible à reproduire rapidement |
| **Conformité ARMP** | Dossiers générés respectant les standards de l'ARMP |
| **Time-to-market** | 3 mois de MVP vs. 12-18 mois pour un concurrent étranger s'adaptant |

### Risques & Mitigations

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Sources TELEMO/ARMP non accessibles programmatiquement | Moyen | Élevé | Scraping de secours + partenariat institutionnel |
| Coûts API LLM élevés | Élevé | Moyen | Prompt caching Anthropic, modèles locaux pour tâches simples |
| Connectivité internet faible des utilisateurs | Élevé | Élevé | Offline-first natif, compression maximale |
| Réticence au paiement SaaS | Moyen | Élevé | Essai gratuit 30 jours, paiement mensuel, démonstration ROI |
| Copies locales (piratage) | Moyen | Moyen | Licences SaaS cloud, valeur via données et IA |
| Évolutions réglementaires ARMP | Faible | Élevé | Veille réglementaire intégrée, mises à jour rapides |
| Dépendance aux APIs Anthropic | Moyen | Moyen | Multi-providers LLM, fallback Mistral/Llama |

---

## 12. Conclusion & Impact Stratégique

### Impact sur l'Écosystème Numérique Guinéen

GuineaTender AI s'inscrit directement dans les priorités nationales définies par la Stratégie Nationale TIC de la Guinée et les engagements pris dans le cadre du Programme WARDIP de la Banque Mondiale. En outillant les entreprises locales pour répondre efficacement aux marchés publics de digitalisation, la plateforme produit un effet de levier systémique :

- **Renforcement des capacités locales** : les PME guinéennes accèdent aux mêmes outils que les grands cabinets internationaux
- **Réduction de la fuite de marchés** : davantage de marchés attribués à des acteurs nationaux = davantage de valeur restant dans l'économie guinéenne
- **Amélioration de la qualité des dossiers** : des dossiers mieux structurés facilitent le travail des commissions d'évaluation de l'ARMP
- **Création d'emplois directs** : chaque marché remporté génère des emplois tech qualifiés en Guinée

### Alignement Stratégique

| Initiative nationale | Contribution de GuineaTender AI |
|---|---|
| Stratégie Nationale TIC | Outil direct d'accélération de l'économie numérique |
| Agenda TELEMO | Interopérabilité native, adoption de la plateforme officielle |
| Objectif PME (20% marchés) | Équilibre les chances face aux grands acteurs |
| WARDIP (inclusion numérique) | Accessible aux femmes entrepreneures tech |
| ANDE — Innovation | Template solutions favorisant la réutilisabilité |

### Appel à l'Action

GuineaTender AI est prêt à être déployé dans un délai de **3 mois** pour son MVP, avec un investissement initial estimé entre **150 000 USD et 250 000 USD** couvrant le développement, l'infrastructure sur 12 mois et les premiers investissements commerciaux.

La plateforme est conçue pour être **rentable dès le 8ème mois** avec 100 clients payants, et pour atteindre un **MRR de 50M GNF** à 18 mois avec une expansion régionale en Sénégal et Côte d'Ivoire.

**GuineaTender AI n'est pas seulement un outil. C'est l'infrastructure de compétitivité des entreprises tech guinéennes pour la décennie numérique qui vient.**

---

*Document préparé dans le cadre de la conception de la plateforme GuineaTender AI.*
*Toute reproduction ou diffusion partielle nécessite l'autorisation des auteurs.*
*Version 1.0 — Mai 2026*
