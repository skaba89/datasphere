'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { dossiersApi } from '@/lib/api'
import { formatGNF } from '@/lib/utils'
import { useEffect } from 'react'

const SECTION_LABELS: Record<string, string> = {
  memTechnique: 'Mémoire Technique',
  offreFinanciere: 'Offre Financière',
  planning: 'Planning de Réalisation',
  team: 'Équipe Projet',
  risques: 'Gestion des Risques',
  piecesAdmin: 'Pièces Administratives',
}

export default function DossierPrintPage() {
  const { id } = useParams<{ id: string }>()

  const { data: dossier, isLoading } = useQuery({
    queryKey: ['dossier', id],
    queryFn: () => dossiersApi.get(id).then(r => r.data),
  })

  useEffect(() => {
    if (dossier) {
      document.title = `Dossier — ${dossier.titre}`
    }
  }, [dossier])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!dossier) return <p className="p-8 text-gray-500">Dossier introuvable</p>

  const ao = dossier.ao
  // Construire le contenu à partir des champs structurés du dossier
  const contenu: Record<string, string> = {}
  if (dossier.memTechnique && typeof dossier.memTechnique === 'object') {
    const mt = dossier.memTechnique as Record<string, any>
    contenu.memTechnique = mt.content ?? mt.text ?? JSON.stringify(mt, null, 2)
  }
  if (dossier.offreFinanciere && typeof dossier.offreFinanciere === 'object') {
    const of2 = dossier.offreFinanciere as Record<string, any>
    contenu.offreFinanciere = of2.content ?? of2.text ?? JSON.stringify(of2, null, 2)
  }
  if (dossier.planning && typeof dossier.planning === 'object') {
    const pl = dossier.planning as Record<string, any>
    contenu.planning = pl.content ?? pl.text ?? JSON.stringify(pl, null, 2)
  }
  if (dossier.team && typeof dossier.team === 'object') {
    const tm = dossier.team as Record<string, any>
    contenu.team = tm.content ?? tm.text ?? JSON.stringify(tm, null, 2)
  }
  if (dossier.risques && typeof dossier.risques === 'object') {
    const rk = dossier.risques as Record<string, any>
    contenu.risques = rk.content ?? rk.text ?? JSON.stringify(rk, null, 2)
  }
  if (dossier.piecesAdmin && typeof dossier.piecesAdmin === 'object') {
    const pa = dossier.piecesAdmin as Record<string, any>
    contenu.piecesAdmin = pa.content ?? pa.text ?? JSON.stringify(pa, null, 2)
  }

  return (
    <div className="print-container">
      {/* Print button — hidden when printing */}
      <div className="no-print mb-6 flex gap-3">
        <button
          onClick={() => window.print()}
          className="bg-orange-500 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-orange-600"
        >
          Imprimer / Exporter PDF
        </button>
        <button
          onClick={() => window.history.back()}
          className="border border-gray-200 text-gray-600 px-5 py-2.5 rounded-xl font-medium hover:bg-gray-50"
        >
          Retour
        </button>
      </div>

      {/* Document */}
      <div className="print-doc">
        {/* Cover page */}
        <div className="cover-page">
          <div className="brand">GuineaTender AI</div>
          <div className="doc-type">DOSSIER DE RÉPONSE À UN APPEL D&apos;OFFRES</div>
          <h1 className="doc-title">{dossier.titre}</h1>
          {ao && (
            <div className="meta-block">
              <p><strong>Appel d&apos;offres :</strong> {ao.titre}</p>
              {ao.entiteAdj && <p><strong>Entité adjudicatrice :</strong> {ao.entiteAdj}</p>}
              {ao.sourceId && <p><strong>Référence :</strong> {ao.sourceId}</p>}
              {ao.budgetEstimeGNF && <p><strong>Budget estimé :</strong> {formatGNF(Number(ao.budgetEstimeGNF))}</p>}
              {ao.dateLimite && <p><strong>Date limite :</strong> {new Date(ao.dateLimite).toLocaleDateString('fr-FR')}</p>}
            </div>
          )}
          <div className="date-line">
            Généré le {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* Table of contents */}
        <div className="toc-page">
          <h2>Table des matières</h2>
          <ol>
            {Object.keys(SECTION_LABELS).map((key, i) => contenu[key] ? (
              <li key={key}>{SECTION_LABELS[key]}</li>
            ) : null)}
          </ol>
        </div>

        {/* Content sections */}
        {Object.entries(SECTION_LABELS).map(([key, label]) => {
          const text = contenu[key]
          if (!text) return null
          return (
            <div key={key} className="content-section">
              <h2 className="section-title">{label}</h2>
              <div className="section-body" style={{ whiteSpace: 'pre-wrap' }}>{text}</div>
            </div>
          )
        })}
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; }
          .print-doc { margin: 0; }
        }

        .print-doc {
          font-family: 'Times New Roman', serif;
          color: #111;
          max-width: 800px;
          margin: 0 auto;
        }

        .cover-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          page-break-after: always;
          padding: 60px 40px;
          border: 2px solid #f97316;
          margin-bottom: 40px;
        }

        .brand {
          font-size: 14px;
          font-weight: bold;
          color: #f97316;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .doc-type {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #6b7280;
          margin-bottom: 40px;
        }

        .doc-title {
          font-size: 28px;
          font-weight: bold;
          color: #111;
          margin: 0 0 40px;
          line-height: 1.3;
        }

        .meta-block {
          text-align: left;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          padding: 20px 24px;
          border-radius: 8px;
          margin-bottom: 40px;
          font-size: 13px;
          line-height: 2;
          width: 100%;
          max-width: 500px;
        }

        .date-line {
          font-size: 12px;
          color: #9ca3af;
          margin-top: auto;
        }

        .toc-page {
          page-break-after: always;
          padding: 40px;
          margin-bottom: 40px;
        }

        .toc-page h2 {
          font-size: 20px;
          border-bottom: 2px solid #f97316;
          padding-bottom: 8px;
          margin-bottom: 20px;
        }

        .toc-page ol {
          font-size: 14px;
          line-height: 2.2;
          padding-left: 20px;
        }

        .content-section {
          page-break-before: always;
          padding: 40px;
        }

        .section-title {
          font-size: 20px;
          font-weight: bold;
          color: #f97316;
          border-bottom: 2px solid #f97316;
          padding-bottom: 8px;
          margin-bottom: 24px;
        }

        .section-body {
          font-size: 13px;
          line-height: 1.8;
          color: #374151;
        }
      `}</style>
    </div>
  )
}
