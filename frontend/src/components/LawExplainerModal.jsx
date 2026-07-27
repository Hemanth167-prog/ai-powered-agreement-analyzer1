import { useEffect } from "react";

// Pre-compiled comprehensive legal database for instant, detailed law explanations
const LAW_DATABASE = {
  "companies act": {
    category: "Corporate & Commercial Legislation",
    summary: "Governs company formation, corporate governance, financial reporting, board responsibilities, and auditing mandates for commercial entities.",
    sections: [
      { num: "Section 135", title: "Corporate Social Responsibility", desc: "Mandates CSR reporting and expenditure for qualifying corporate entities." },
      { num: "Section 143", title: "Powers & Duties of Auditors", desc: "Grants statutory auditors full access to books, accounts, and financial compliance records." },
      { num: "Section 179", title: "Powers of the Board of Directors", desc: "Defines the fiduciary duties and authorized powers of board members to enter binding contracts." }
    ],
    complianceAdvice: "Ensure board resolution approval is attached for execution and audit compliance reports are filed under statutory deadlines."
  },
  "contract act": {
    category: "Contract & Commercial Law",
    summary: "Sets forth fundamental requirements for valid legal agreements, offer and acceptance, consideration, breach remedies, and indemnities.",
    sections: [
      { num: "Section 10", title: "What Agreements Are Contracts", desc: "All agreements are contracts if made by free consent of parties competent to contract for lawful consideration." },
      { num: "Section 27", title: "Agreement in Restraint of Trade Void", desc: "Restrictive covenants limiting post-employment business activities may be unenforceable unless strictly bounded." },
      { num: "Section 73", title: "Compensation for Breach of Contract", desc: "Entitles the non-breaching party to damages for losses naturally arising in the usual course of breach." }
    ],
    complianceAdvice: "Verify that indemnification clauses explicitly cap indirect damages and outline notice timelines for breach claims."
  },
  "public procurement": {
    category: "Bidding & Public Tender Regulations",
    summary: "Regulates government and public tender procedures, ensuring transparency, fair evaluation, non-discrimination, and EMD handling.",
    sections: [
      { num: "Rule 144", title: "Fundamental Principles of Public Buying", desc: "Mandates open, competitive bidding and transparent tender document distribution." },
      { num: "Rule 170", title: "Bid Security (Earnest Money Deposit)", desc: "Requires bidders to submit EMD security deposit, specifying rules for forfeiture upon bid withdrawal." }
    ],
    complianceAdvice: "Ensure EMD bank guarantees are issued by authorized institutions and submitted prior to the bid closing date."
  },
  "procurement and tender": {
    category: "Bidding & Public Tender Regulations",
    summary: "Mandates transparent bidding evaluation, pre-qualification standards, technical scoring, and anti-collusion measures.",
    sections: [
      { num: "Section 7", title: "Pre-Qualification Criteria", desc: "Requires transparent criteria for financial turnover and technical capabilities." },
      { num: "Section 12", title: "Rejection of Bids", desc: "Outlines valid statutory grounds for bid rejection including non-submission of required security deposits." }
    ],
    complianceAdvice: "Double-check technical qualification documents against tender specifications before final submission."
  },
  "labor": {
    category: "Employment & Labor Code",
    summary: "Regulates working hours, termination notice periods, severance pay, workplace safety, and non-discrimination mandates.",
    sections: [
      { num: "Notice Mandates", title: "Statutory Notice Period", desc: "Requires minimum statutory notice (or pay in lieu of notice) for contract termination." },
      { num: "Severance Provisions", title: "Gratuity & Termination Pay", desc: "Mandates statutory severance payments upon completion of continuous service thresholds." }
    ],
    complianceAdvice: "Verify that termination notice clauses match or exceed local statutory minimum notice periods."
  },
  "labour": {
    category: "Employment & Labor Code",
    summary: "Regulates employee rights, working hours, statutory benefits, and lawful termination guidelines.",
    sections: [
      { num: "Notice Mandates", title: "Statutory Notice Period", desc: "Requires minimum statutory notice for contract termination." }
    ],
    complianceAdvice: "Ensure employment agreements align with local jurisdiction labor decrees."
  },
  "gdpr": {
    category: "Data Protection & Privacy",
    summary: "European Union Regulation governing personal data collection, processing, transfer, consent, and data subject privacy rights.",
    sections: [
      { num: "Article 6", title: "Lawfulness of Processing", desc: "Personal data processing is lawful only if consent is given or processing is necessary for contract performance." },
      { num: "Article 28", title: "Data Processor Obligations", desc: "Mandates data processing agreements containing technical and organizational security requirements." }
    ],
    complianceAdvice: "Include standard contractual clauses (SCCs) and data protection addendums when cross-border data transfers occur."
  },
  "information technology": {
    category: "Cyber Law & IT Regulation",
    summary: "Governs electronic contracts, digital signatures, cybercrime liabilities, intermediary due diligence, and data protection.",
    sections: [
      { num: "Section 10A", title: "Validity of Contracts Formed Electronically", desc: "Recognizes contracts created through electronic communications and digital signatures as legally binding." },
      { num: "Section 43A", title: "Compensation for Failure to Protect Data", desc: "Imposes liability for negligence in implementing reasonable security practices for sensitive data." }
    ],
    complianceAdvice: "Ensure electronic execution utilizes accredited digital signature providers or verified e-signatures."
  }
};

export default function LawExplainerModal({ open, onClose, lawName, lawDescription, country, onAskChat }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || !lawName) return null;

  // Search database for matching law info
  const nameLower = lawName.toLowerCase();
  let dbMatch = null;
  for (const key of Object.keys(LAW_DATABASE)) {
    if (nameLower.includes(key)) {
      dbMatch = LAW_DATABASE[key];
      break;
    }
  }

  const category = dbMatch?.category || "Statutory Legislation & Regulations";
  const summary  = lawDescription || dbMatch?.summary || `Official legal framework and statutory code governing contracts and commercial operations under ${country || "the applicable jurisdiction"}.`;
  const sections = dbMatch?.sections || [
    { num: "Statutory Reference", title: "General Statutory Provision", desc: `Governs enforceability, legal rights, and regulatory compliance requirements under ${lawName}.` }
  ];
  const advice   = dbMatch?.complianceAdvice || `Review contract provisions with legal counsel to ensure full compliance with ${lawName} and prevent statutory penalties.`;

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <div 
          className="relative w-full max-w-xl bg-ink-raised border border-ink-border rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between px-6 py-4 border-b border-ink-border bg-ink/50">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono bg-seal/15 text-seal-bright border border-seal/30 px-2 py-0.5 rounded-sm uppercase tracking-wider">
                  {category}
                </span>
                {country && (
                  <span className="text-xs font-mono text-muted/80">
                    · {country}
                  </span>
                )}
              </div>
              <h2 className="font-display text-lg text-paper font-semibold">{lawName}</h2>
            </div>
            <button 
              onClick={onClose}
              className="text-muted hover:text-paper text-xl w-7 h-7 flex items-center justify-center rounded-sm hover:bg-ink-border/50 transition-colors"
            >
              ×
            </button>
          </div>

          {/* Modal Body */}
          <div className="px-6 py-5 space-y-5 text-sm">
            {/* Overview */}
            <div>
              <div className="text-[10px] font-mono text-muted uppercase tracking-widest mb-1">Law Overview &amp; Scope</div>
              <p className="text-paper/90 leading-relaxed font-sans text-xs bg-ink/40 p-3 rounded-sm border border-ink-border/50">
                {summary}
              </p>
            </div>

            {/* Key Sections */}
            <div>
              <div className="text-[10px] font-mono text-muted uppercase tracking-widest mb-2.5">Key Statutory Provisions</div>
              <div className="space-y-2">
                {sections.map((sec, idx) => (
                  <div key={idx} className="border-l-2 border-seal pl-3 py-1 bg-ink/20 rounded-r-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-seal-bright">{sec.num}</span>
                      <span className="text-xs font-medium text-paper font-body">{sec.title}</span>
                    </div>
                    <p className="text-[11px] text-muted mt-0.5 font-sans leading-normal">{sec.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Compliance Advice */}
            <div className="bg-amber-500/10 border border-amber-500/25 p-3.5 rounded-sm">
              <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-amber-400 mb-1">
                <span>🛡️</span> Compliance &amp; Operational Impact
              </div>
              <p className="text-xs text-amber-200/90 leading-relaxed font-sans">{advice}</p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between px-6 py-3.5 border-t border-ink-border bg-ink/40">
            <button
              onClick={() => {
                onClose();
                if (onAskChat) {
                  const detailsText = `Law Name: ${lawName}
Category: ${category}
Overview: ${summary}
Key Provisions:
${sections.map(s => `- ${s.num} (${s.title}): ${s.desc}`).join("\n")}
Compliance & Operational Impact: ${advice}`;

                  onAskChat(`Explain how the following law impacts this contract in detail:\n\n${detailsText}`);
                }
              }}
              className="flex items-center gap-1.5 text-xs font-mono text-seal-bright hover:text-paper transition-colors"
            >
              <span>💬</span> Ask AI Assistant about this law →
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-mono bg-ink-border/50 hover:bg-ink-border text-paper rounded-sm transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
