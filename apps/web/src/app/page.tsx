import Link from 'next/link'
import { ArrowRight, BarChart3, Brain, FileText, Search, Shield, Smartphone, Users } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-gray-900">GuineaTender AI</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a href="#fonctionnalites" className="text-sm text-gray-600 hover:text-gray-900">Fonctionnalités</a>
              <a href="#tarifs" className="text-sm text-gray-600 hover:text-gray-900">Tarifs</a>
              <a href="#contact" className="text-sm text-gray-600 hover:text-gray-900">Contact</a>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2">
                Connexion
              </Link>
              <Link
                href="/register"
                className="text-sm bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors"
              >
                Essai gratuit 30 jours
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 px-4 bg-gradient-to-br from-orange-50 to-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-800 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-guinea-green rounded-full animate-pulse" />
            Conçu pour les marchés publics de Guinée
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Remportez plus d'appels d'offres
            <span className="text-primary-500"> avec l'IA</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            GuineaTender AI automatise votre veille sur TELEMO, ARMP, JAO et la Banque Mondiale,
            score vos opportunités et génère vos dossiers complets en quelques clics.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-primary-500 text-white px-8 py-3 rounded-xl font-semibold hover:bg-primary-600 transition-colors"
            >
              Commencer gratuitement <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-8 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              Voir la démo
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            30 jours gratuits · Pas de carte bancaire · Paiement Orange Money accepté
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-gray-50 border-y">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { stat: '12+', label: 'Sources surveillées' },
            { stat: '-70%', label: 'Temps de rédaction dossier' },
            { stat: '+35%', label: 'Taux de succès estimé' },
            { stat: '100%', label: 'Sources guinéennes couvertes' },
          ].map((item) => (
            <div key={item.label}>
              <div className="text-3xl font-bold text-primary-500">{item.stat}</div>
              <div className="text-sm text-gray-600 mt-1">{item.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Fonctionnalités */}
      <section id="fonctionnalites" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            Tout ce dont vous avez besoin
          </h2>
          <p className="text-center text-gray-600 mb-12">
            De la veille à la soumission — un seul outil pour tout le cycle AO
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Search,
                titre: 'Veille Automatique',
                desc: 'Collecte en temps réel depuis TELEMO, ARMP, JAO, Banque Mondiale et 8 autres sources. Plus jamais d\'opportunité manquée.',
              },
              {
                icon: BarChart3,
                titre: 'Scoring Intelligent',
                desc: 'Score 0-100 calculé sur 6 dimensions : alignement, capacité financière, concurrence, relation institutionnelle, délai.',
              },
              {
                icon: Users,
                titre: 'CRM Institutionnel',
                desc: 'Gérez vos contacts dans les ministères et agences. Historique des interactions, score de proximité, cartographie.',
              },
              {
                icon: FileText,
                titre: 'Générateur IA de Dossiers',
                desc: 'Mémoire technique, offre financière, planning Gantt et check-list administrative générés automatiquement par Claude AI.',
              },
              {
                icon: Brain,
                titre: 'Solutions Pré-architecturées',
                desc: '10 templates SaaS prêts à proposer : e-Services, archives IA, SERA, télémédecine, gestion scolaire...',
              },
              {
                icon: Smartphone,
                titre: 'App Mobile Offline-First',
                desc: 'Accédez aux AOs et contacts sans connexion. Synchronisation automatique dès retour en ligne. Android & iOS.',
              },
            ].map((feature) => (
              <div key={feature.titre} className="bg-white border rounded-xl p-6 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-primary-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{feature.titre}</h3>
                <p className="text-sm text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tarifs */}
      <section id="tarifs" className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">Tarifs transparents</h2>
          <p className="text-center text-gray-600 mb-12">Paiement Mobile Money (Orange Money, MTN MoMo)</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                plan: 'Starter',
                prix: '150 000 GNF/mois',
                usd: '~17 USD',
                desc: 'Idéal pour démarrer',
                features: ['50 AOs/mois', '5 sources', '2 utilisateurs', 'CRM 200 contacts', '3 dossiers IA/mois', 'Support email'],
                cta: 'Commencer',
                highlight: false,
              },
              {
                plan: 'Pro',
                prix: '450 000 GNF/mois',
                usd: '~50 USD',
                desc: 'Pour les équipes actives',
                features: ['AOs illimités', 'Toutes sources', '10 utilisateurs', 'CRM illimité', '20 dossiers IA/mois', 'App mobile complète', 'Chat 24h'],
                cta: 'Essai gratuit 30j',
                highlight: true,
              },
              {
                plan: 'Enterprise',
                prix: 'Sur devis',
                usd: '~200+ USD/mois',
                desc: 'Pour les grandes structures',
                features: ['Tout illimité', 'Hébergement dédié', 'SLA 4h garanti', 'Intégration TELEMO', 'Formation équipe', 'API accès'],
                cta: 'Nous contacter',
                highlight: false,
              },
            ].map((tier) => (
              <div
                key={tier.plan}
                className={`rounded-xl p-6 ${tier.highlight ? 'bg-primary-500 text-white ring-4 ring-primary-200' : 'bg-white border'}`}
              >
                <div className="font-bold text-lg mb-1">{tier.plan}</div>
                <div className={`text-2xl font-bold mb-1 ${tier.highlight ? 'text-white' : 'text-gray-900'}`}>
                  {tier.prix}
                </div>
                <div className={`text-sm mb-4 ${tier.highlight ? 'text-orange-100' : 'text-gray-500'}`}>
                  {tier.usd} · {tier.desc}
                </div>
                <ul className="space-y-2 mb-6">
                  {tier.features.map((f) => (
                    <li key={f} className={`text-sm flex items-center gap-2 ${tier.highlight ? 'text-orange-50' : 'text-gray-600'}`}>
                      <Shield className="w-3 h-3 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`block text-center py-2.5 rounded-lg font-semibold transition-colors ${
                    tier.highlight
                      ? 'bg-white text-primary-600 hover:bg-orange-50'
                      : 'bg-primary-500 text-white hover:bg-primary-600'
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-6 h-6 text-primary-400" />
              <span className="font-bold">GuineaTender AI</span>
            </div>
            <p className="text-sm text-gray-400">
              La plateforme de référence pour les appels d'offres de digitalisation en Guinée et en Afrique de l'Ouest.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Produit</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#fonctionnalites">Fonctionnalités</a></li>
              <li><a href="#tarifs">Tarifs</a></li>
              <li><a href="/register">Essai gratuit</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Conformité</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>Conforme ARMP Guinée</li>
              <li>Compatible TELEMO</li>
              <li>Données sécurisées AES-256</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Contact</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>contact@guineatender.ai</li>
              <li>+224 620 000 000</li>
              <li>Kaloum, Conakry, Guinée</li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-500">
          © 2026 GuineaTender AI. Tous droits réservés. Made with ♥ in Conakry.
        </div>
      </footer>
    </div>
  )
}
