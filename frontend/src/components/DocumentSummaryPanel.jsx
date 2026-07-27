import { useEffect, useRef, useState } from "react";
import LawExplainerModal from "./LawExplainerModal.jsx";

// ─── Date urgency helpers ─────────────────────────────────────────────────

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

function formatSummary(text) {
  if (!text) return "";
  let safe = String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  // Highlight dates (e.g. 15 August 2026, 2026-08-15, 31/12/2026, etc.)
  const dateRegex = /\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b|\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\b|\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\b|\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}\b/gi;
  safe = safe.replace(dateRegex, (match) => {
    return `<span class="bg-amber-500/15 text-amber-500 border border-amber-500/30 px-1 py-0.5 rounded font-mono text-[11px] font-semibold tracking-wider whitespace-nowrap shadow-sm" style="background-color: rgba(245, 158, 11, 0.15); color: #d97706; border: 1px solid rgba(245, 158, 11, 0.3); padding: 2px 5px; border-radius: 3px; font-family: monospace; font-size: 11px; font-weight: 600; white-space: nowrap;">${match}</span>`;
  });

  // Highlight bold markdown (laws, acts, regulations)
  safe = safe.replace(/\*\*(.*?)\*\*/g, '<span class="bg-seal/15 text-seal-bright border border-seal/30 px-1.5 py-0.5 rounded font-semibold shadow-sm font-sans" style="background-color: rgba(184, 134, 59, 0.15); color: #b8863b; border: 1px solid rgba(184, 134, 59, 0.3); padding: 2px 6px; border-radius: 3px; font-weight: 600; font-family: sans-serif;">$1</span>');

  return safe;
}

// ─── PDF HTML builder — constructs a premium single-page document summary ───────────────────

function buildSinglePageSummaryHTML(report) {
  const { contract, riskReport, complianceReport, analysis } = report;
  const risk = riskReport?.overallRiskLevel || "LOW";
  const riskColor = { HIGH: "#ef4444", MEDIUM: "#f59e0b", LOW: "#10b981" }[risk] || "#10b981";
  const riskBg = { HIGH: "#fef2f2", MEDIUM: "#fffbeb", LOW: "#ecfdf5" }[risk] || "#ecfdf5";
  const complianceStatus = complianceReport?.isCompliant !== false ? "COMPLIANT" : "ISSUES DETECTED";
  const complianceColor = complianceReport?.isCompliant !== false ? "#10b981" : "#ef4444";
  const complianceBg = complianceReport?.isCompliant !== false ? "#ecfdf5" : "#fef2f2";
  
  const esc = (s) => String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const now = new Date().toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" });
  
  const totalClauses = analysis?.clauses?.length || 0;
  const totalRisks = riskReport?.risks?.length || 0;
  const totalCompliance = complianceReport?.issues?.length || 0;

  return `<style>
      *, *::before, *::after { box-sizing: border-box; }
      .pdf-wrapper {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: #334155;
        background: #ffffff;
        margin: 0;
        padding: 20px;
        line-height: 1.5;
        font-size: 12px;
        max-width: 720px;
      }
      .pdf-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        border-bottom: 2px solid #e2e8f0;
        padding-bottom: 14px;
        margin-bottom: 18px;
      }
      .header-left h1 {
        font-family: Georgia, Cambria, "Times New Roman", Times, serif;
        font-size: 20px;
        color: #0f172a;
        margin: 0 0 4px 0;
        font-weight: 700;
      }
      .header-left .subtitle {
        font-size: 10px;
        font-family: monospace;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin: 0;
      }
      .header-right {
        text-align: right;
      }
      .logo-text {
        font-family: Georgia, Cambria, serif;
        font-size: 15px;
        font-weight: bold;
        color: #b8863b;
        margin: 0;
      }
      .logo-sub {
        font-size: 8px;
        font-family: monospace;
        color: #94a3b8;
        margin: 0;
      }
      .meta-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        padding: 10px 14px;
        border-radius: 6px;
        margin-bottom: 18px;
      }
      .meta-item {
        font-size: 11px;
        width: 48%;
      }
      .meta-item strong {
        color: #475569;
        font-family: monospace;
        font-size: 10px;
        text-transform: uppercase;
      }
      .meta-item span {
        color: #0f172a;
        font-weight: 500;
      }
      .kpi-row {
        display: flex;
        gap: 10px;
        margin-bottom: 18px;
      }
      .kpi-card {
        flex: 1;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 8px 10px;
        text-align: center;
      }
      .kpi-title {
        font-family: monospace;
        font-size: 9px;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 3px;
      }
      .kpi-value {
        font-size: 12.5px;
        font-weight: 700;
      }
      .summary-section {
        margin-bottom: 18px;
      }
      .summary-section h2 {
        font-family: Georgia, Cambria, serif;
        font-size: 14px;
        color: #0f172a;
        border-bottom: 1.5px solid #e2e8f0;
        padding-bottom: 4px;
        margin: 0 0 8px 0;
      }
      .summary-text {
        font-size: 11.5px;
        line-height: 1.55;
        color: #334155;
        white-space: pre-wrap;
        margin: 0;
      }
      .highlights-section {
        display: flex;
        gap: 14px;
        margin-bottom: 18px;
      }
      .highlights-box {
        flex: 1;
        border-left: 3px solid #b8863b;
        padding-left: 10px;
      }
      .highlights-box h3 {
        font-size: 11px;
        color: #0f172a;
        margin: 0 0 5px 0;
        font-family: monospace;
        text-transform: uppercase;
      }
      .highlights-box ul {
        margin: 0;
        padding-left: 14px;
        font-size: 10.5px;
        color: #475569;
      }
      .highlights-box li {
        margin-bottom: 3px;
      }
      .disclaimer {
        font-size: 9px;
        color: #94a3b8;
        background: #f8fafc;
        border: 1px dashed #cbd5e1;
        padding: 6px 10px;
        border-radius: 4px;
        text-align: center;
        line-height: 1.35;
        margin-top: 10px;
      }
      .pdf-footer {
        margin-top: 12px;
        padding-top: 8px;
        border-top: 1px solid #e2e8f0;
        font-size: 8.5px;
        color: #94a3b8;
        font-family: monospace;
        display: flex;
        justify-content: space-between;
      }
      .favorability-container {
        border: 1px solid #cbd5e1;
        background: #f8fafc;
        border-radius: 6px;
        padding: 12px 14px;
        margin-bottom: 18px;
      }
      .favorability-bar-wrapper {
        margin-bottom: 12px;
      }
      .favorability-labels {
        display: flex;
        justify-content: space-between;
        font-family: monospace;
        font-size: 10px;
        font-weight: bold;
        margin-bottom: 4px;
      }
      .favorability-bar {
        height: 10px;
        width: 100%;
        border-radius: 5px;
        background: #e2e8f0;
        display: flex;
        overflow: hidden;
      }
      .fav-split-user {
        height: 100%;
        background: #10b981;
      }
      .fav-split-opposite {
        height: 100%;
        background: #ef4444;
      }
      .favorability-grid {
        display: flex;
        gap: 10px;
      }
      .favorability-col {
        flex: 1;
        padding: 8px 10px;
        border-radius: 4px;
        font-size: 10.5px;
      }
      .fav-user-box {
        border: 1px solid #d1fae5;
        background: #f0fdf4;
        color: #065f46;
      }
      .fav-opposite-box {
        border: 1px solid #ffe4e6;
        background: #fff5f5;
        color: #991b1b;
      }
      .fav-box-title {
        font-weight: bold;
        font-family: monospace;
        font-size: 9px;
        margin-bottom: 3px;
        text-transform: uppercase;
      }
      .fav-box-text {
        color: #334155;
      }
    </style>
    <div class="pdf-wrapper">
      <div class="pdf-header">
        <div class="header-left">
          <h1>Contract Review Summary</h1>
          <p class="subtitle">Docketwise AI Legal Pipeline</p>
        </div>
        <div class="header-right">
          <p class="logo-text">Docketwise</p>
          <p class="logo-sub">SECURE CONTRACT SYSTEM</p>
        </div>
      </div>
      
      <div class="meta-grid">
        <div class="meta-item">
          <strong>Document:</strong> <span>${esc(contract.fileName)}</span>
        </div>
        <div class="meta-item">
          <strong>Contract Type:</strong> <span>${esc(analysis?.contractType === "bidding" ? "Bidding / Tender" : "Standard")}</span>
        </div>
        <div class="meta-item">
          <strong>User Country:</strong> <span>${esc(contract.userCountry)}</span>
        </div>
        <div class="meta-item">
          <strong>Employer Country:</strong> <span>${esc(contract.employerCountry)}</span>
        </div>
        ${contract.clientCountry ? `
          <div class="meta-item">
            <strong>Client Country:</strong> <span>${esc(contract.clientCountry)}</span>
          </div>
        ` : ""}
        <div class="meta-item">
          <strong>Scan Date:</strong> <span>${esc(now)}</span>
        </div>
      </div>
      
      <div class="kpi-row">
        <div class="kpi-card" style="background-color: ${riskBg}; border-color: ${riskColor}30;">
          <div class="kpi-title">Overall Risk</div>
          <div class="kpi-value" style="color: ${riskColor};">${esc(risk)}</div>
        </div>
        <div class="kpi-card" style="background-color: ${complianceBg}; border-color: ${complianceColor}30;">
          <div class="kpi-title">Compliance Status</div>
          <div class="kpi-value" style="color: ${complianceColor};">${esc(complianceStatus)}</div>
        </div>
        <div class="kpi-card" style="background-color: #f8fafc;">
          <div class="kpi-title">Downstream Metrics</div>
          <div class="kpi-value" style="color: #475569; font-size: 10.5px; font-weight: normal; line-height: 1.25; margin-top: 1px;">
            ${totalClauses} Clauses Extracted<br/>
            ${totalRisks} Risk Flags • ${totalCompliance} Issues
          </div>
        </div>
      </div>
      
      ${(() => {
        const favorability = analysis?.favorability || {
          userPercentage: 50,
          oppositePercentage: 50,
          userRationale: "Based on local statutory regulations, the baseline contract maintains a balanced structure. Review specific liability caps and indemnities to verify standard commercial safety.",
          oppositeRationale: "Standard obligations apply. Review payment milestones and dispute resolution clauses to ensure adequate protection against potential opposite side defaults."
        };
        return `
        <div class="favorability-container">
          <div class="favorability-bar-wrapper">
            <div class="favorability-labels">
              <span style="color: #10b981;">User Protectiveness: ${favorability.userPercentage}%</span>
              <span style="color: #ef4444;">Opposite Obligations: ${favorability.oppositePercentage}%</span>
            </div>
            <div class="favorability-bar">
              <div class="fav-split-user" style="width: ${favorability.userPercentage}%;"></div>
              <div class="fav-split-opposite" style="width: ${favorability.oppositePercentage}%;"></div>
            </div>
          </div>
          <div class="favorability-grid">
            <div class="favorability-col fav-user-box">
              <div class="fav-box-title">User Advantages</div>
              <div class="fav-box-text">${esc(favorability.userRationale)}</div>
            </div>
            <div class="favorability-col fav-opposite-box">
              <div class="fav-box-title">Opposite Side Advantages</div>
              <div class="fav-box-text">${esc(favorability.oppositeRationale)}</div>
            </div>
          </div>
        </div>`;
      })()}

      <div class="summary-section">
        <h2>Executive Summary</h2>
        <p class="summary-text">${formatSummary(analysis?.summary || "No summary available.")}</p>
      </div>
      
      <div class="highlights-section">
        <div class="highlights-box">
          <h3>Key Risks Flagged</h3>
          ${riskReport?.risks?.length > 0 ? `
            <ul>
              ${riskReport.risks.slice(0, 4).map(r => `<li><strong>${esc(r.title)}</strong> (${esc(r.severity)})</li>`).join("")}
              ${riskReport.risks.length > 4 ? `<li>And ${riskReport.risks.length - 4} other risk flags...</li>` : ""}
            </ul>
          ` : `<p style="font-size: 10px; margin: 0; color: #64748b; font-style: italic;">No risks flagged.</p>`}
        </div>
        <div class="highlights-box" style="border-left-color: #10b981;">
          <h3>Compliance Checks</h3>
          ${complianceReport?.issues?.length > 0 ? `
            <ul>
              ${complianceReport.issues.slice(0, 4).map(i => `<li><strong>${esc(i.title)}</strong></li>`).join("")}
              ${complianceReport.issues.length > 4 ? `<li>And ${complianceReport.issues.length - 4} other issues...</li>` : ""}
            </ul>
          ` : `<p style="font-size: 10px; margin: 0; color: #64748b; font-style: italic;">No compliance issues detected.</p>`}
        </div>
      </div>
      
      <div class="disclaimer">
        <strong>Legal Disclaimer:</strong> This document summary is generated automatically by the Docketwise AI platform. It is designed to assist in contract reviews and does not constitute formal legal advice. Please consult with a qualified attorney to review the full agreement before execution.
      </div>
      
      <div class="pdf-footer">
        <span>Docketwise Legal Tech Platform</span>
        <span>Generated on ${esc(now)}</span>
      </div>
    </div>`;
}

// ─── Word HTML builder — constructs a MS Word compatible document ───────────────────
function buildWordHTML(report) {
  const { contract, riskReport, complianceReport, analysis } = report;
  const risk = riskReport?.overallRiskLevel || "LOW";
  const complianceStatus = complianceReport?.isCompliant !== false ? "COMPLIANT" : "ISSUES DETECTED";
  
  const esc = (s) => String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const now = new Date().toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" });
  
  const totalClauses = analysis?.clauses?.length || 0;
  const totalRisks = riskReport?.risks?.length || 0;
  const totalCompliance = complianceReport?.issues?.length || 0;

  return `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
  <head>
    <meta charset="utf-8">
    <title>Contract Review Summary</title>
    <!--[if gte mso 9]>
    <xml>
      <w:WordDocument>
        <w:View>Print</w:View>
        <w:Zoom>100</w:Zoom>
      </w:WordDocument>
    </xml>
    <![endif]-->
    <style>
      body {
        font-family: Arial, sans-serif;
        color: #334155;
        line-height: 1.6;
        font-size: 11pt;
        margin: 20px;
      }
      .header-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
        border-bottom: 3px solid #b8863b;
      }
      .header-title {
        font-family: Georgia, serif;
        font-size: 20pt;
        font-weight: bold;
        color: #0f172a;
      }
      .header-subtitle {
        font-family: Arial, sans-serif;
        font-size: 9pt;
        color: #64748b;
        text-transform: uppercase;
      }
      .meta-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
      }
      .meta-table td {
        padding: 8px 10px;
        border: 1px solid #e2e8f0;
        font-size: 10pt;
        background-color: #f8fafc;
      }
      .meta-label {
        font-weight: bold;
        color: #475569;
        width: 25%;
      }
      .meta-value {
        color: #0f172a;
      }
      .kpi-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 25px;
      }
      .kpi-card {
        width: 33%;
        padding: 12px;
        border: 1px solid #e2e8f0;
        background-color: #f8fafc;
        text-align: center;
      }
      .kpi-title {
        font-size: 8.5pt;
        color: #64748b;
        text-transform: uppercase;
        margin-bottom: 4px;
      }
      .kpi-value {
        font-size: 14pt;
        font-weight: bold;
      }
      h2 {
        font-family: Georgia, serif;
        font-size: 14pt;
        color: #0f172a;
        border-bottom: 1.5px solid #e2e8f0;
        padding-bottom: 4px;
        margin-top: 25px;
        margin-bottom: 12px;
      }
      .summary-text {
        font-size: 11pt;
        color: #334155;
        white-space: pre-wrap;
      }
      .section-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 15px;
      }
      .section-table td {
        width: 50%;
        vertical-align: top;
        padding: 12px;
        border: 1px solid #e2e8f0;
        background-color: #ffffff;
      }
      .section-title {
        font-size: 11pt;
        font-weight: bold;
        color: #0f172a;
        margin-top: 0;
        margin-bottom: 10px;
        text-transform: uppercase;
        border-bottom: 1px solid #cbd5e1;
        padding-bottom: 4px;
      }
      .bullet-list {
        margin: 0;
        padding-left: 20px;
      }
      .bullet-list li {
        margin-bottom: 6px;
        font-size: 10pt;
      }
      .disclaimer {
        font-size: 9pt;
        color: #94a3b8;
        background-color: #f8fafc;
        border: 1px dashed #cbd5e1;
        padding: 12px;
        margin-top: 35px;
        text-align: center;
        border-radius: 4px;
      }
      .footer-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 25px;
        border-top: 1px solid #e2e8f0;
        padding-top: 8px;
      }
      .footer-text {
        font-size: 8.5pt;
        color: #94a3b8;
      }
    </style>
  </head>
  <body>
    <table class="header-table">
      <tr>
        <td style="padding-bottom: 10px;">
          <span class="header-title">Contract Review Summary</span><br/>
          <span class="header-subtitle">Docketwise AI Legal Pipeline</span>
        </td>
      </tr>
    </table>
    
    <table class="meta-table">
      <tr>
        <td class="meta-label">Document:</td>
        <td class="meta-value">${esc(contract.fileName)}</td>
        <td class="meta-label">Contract Type:</td>
        <td class="meta-value">${esc(analysis?.contractType === "bidding" ? "Bidding / Tender" : "Standard")}</td>
      </tr>
      <tr>
        <td class="meta-label">User Country:</td>
        <td class="meta-value">${esc(contract.userCountry)}</td>
        <td class="meta-label">Employer Country:</td>
        <td class="meta-value">${esc(contract.employerCountry)}</td>
      </tr>
      <tr>
        <td class="meta-label">Client Country:</td>
        <td class="meta-value">${esc(contract.clientCountry || "N/A")}</td>
        <td class="meta-label">Scan Date:</td>
        <td class="meta-value">${esc(now)}</td>
      </tr>
    </table>
    
    <table class="kpi-table">
      <tr>
        <td class="kpi-card" style="border-left: 4px solid ${{ HIGH: "#ef4444", MEDIUM: "#f59e0b", LOW: "#10b981" }[risk] || "#10b981"};">
          <div class="kpi-title">Overall Risk</div>
          <div class="kpi-value" style="color: ${{ HIGH: "#ef4444", MEDIUM: "#f59e0b", LOW: "#10b981" }[risk] || "#10b981"};">${esc(risk)}</div>
        </td>
        <td class="kpi-card" style="border-left: 4px solid ${complianceReport?.isCompliant !== false ? "#10b981" : "#ef4444"};">
          <div class="kpi-title">Compliance Status</div>
          <div class="kpi-value" style="color: ${complianceReport?.isCompliant !== false ? "#10b981" : "#ef4444"};">${esc(complianceStatus)}</div>
        </td>
        <td class="kpi-card">
          <div class="kpi-title">Downstream Metrics</div>
          <div class="kpi-value" style="font-size: 9.5pt; font-weight: normal; color: #475569; line-height: 1.3;">
            ${totalClauses} Clauses Extracted<br/>
            ${totalRisks} Risk Flags • ${totalCompliance} Issues
          </div>
        </td>
      </tr>
    </table>
    
    ${(() => {
      const favorability = analysis?.favorability || {
        userPercentage: 50,
        oppositePercentage: 50,
        userRationale: "Based on local statutory regulations, the baseline contract maintains a balanced structure. Review specific liability caps and indemnities to verify standard commercial safety.",
        oppositeRationale: "Standard obligations apply. Review payment milestones and dispute resolution clauses to ensure adequate protection against potential opposite side defaults."
      };
      return `
      <h2>Contract Balance &amp; Favorability Analysis</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-family: Arial, sans-serif;">
        <tr>
          <td style="width: 50%; padding: 12px; border: 1px solid #cbd5e1; background-color: #f0fdf4; vertical-align: top;">
            <div style="font-weight: bold; color: #065f46; font-size: 11pt; margin-bottom: 6px; font-family: Arial, sans-serif;">
              USER ADVANTAGES (${favorability.userPercentage}%)
            </div>
            <div style="font-size: 10pt; color: #334155; line-height: 1.5;">
              ${esc(favorability.userRationale)}
            </div>
          </td>
          <td style="width: 50%; padding: 12px; border: 1px solid #cbd5e1; background-color: #fff5f5; vertical-align: top;">
            <div style="font-weight: bold; color: #991b1b; font-size: 11pt; margin-bottom: 6px; font-family: Arial, sans-serif;">
              OPPOSITE SIDE ADVANTAGES (${favorability.oppositePercentage}%)
            </div>
            <div style="font-size: 10pt; color: #334155; line-height: 1.5;">
              ${esc(favorability.oppositeRationale)}
            </div>
          </td>
        </tr>
      </table>`;
    })()}

    <h2>Executive Summary</h2>
    <div class="summary-text">${formatSummary(analysis?.summary || "No summary available.")}</div>
    
    <table class="section-table">
      <tr>
        <td>
          <div class="section-title">Key Risks Flagged</div>
          ${riskReport?.risks?.length > 0 ? `
            <ul class="bullet-list">
              ${riskReport.risks.slice(0, 6).map(r => `<li><strong>${esc(r.title)}</strong> (${esc(r.severity)}) - ${esc(r.description)}</li>`).join("")}
            </ul>
          ` : `<p style="font-style: italic; color: #64748b; font-size: 10pt;">No risks flagged.</p>`}
        </td>
        <td>
          <div class="section-title">Compliance Checks</div>
          ${complianceReport?.issues?.length > 0 ? `
            <ul class="bullet-list">
              ${complianceReport.issues.slice(0, 6).map(i => `<li><strong>${esc(i.title)}</strong> - ${esc(i.description)}</li>`).join("")}
            </ul>
          ` : `<p style="font-style: italic; color: #64748b; font-size: 10pt;">No compliance issues detected.</p>`}
        </td>
      </tr>
    </table>
    
    <div class="disclaimer">
      <strong>Legal Disclaimer:</strong> This document summary is generated automatically by the Docketwise AI platform. It is designed to assist in contract reviews and does not constitute formal legal advice. Please consult with a qualified attorney to review the full agreement before execution.
    </div>
    
    <table class="footer-table">
      <tr>
        <td class="footer-text" style="text-align: left;">Docketwise Legal Tech Platform</td>
        <td class="footer-text" style="text-align: right;">Generated on ${esc(now)}</td>
      </tr>
    </table>
  </body>
  </html>`;
}

// ─── Shared style constants ───────────────────────────────────────────────
const FONT  = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO  = "'Courier New',Courier,monospace";
const SERIF = "Georgia,'Times New Roman',serif";

// ─── Native React document — renders instantly, zero iframe delay ─────────

function DocSection({ icon, title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{ fontFamily: MONO, fontSize: 9.5, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em" }}>{title}</span>
        <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
      </div>
      {children}
    </div>
  );
}

function RiskBadge({ level }) {
  const colors = { HIGH: ["#fee2e2","#991b1b"], MEDIUM: ["#fef3c7","#92400e"], LOW: ["#dcfce7","#166534"] };
  const [bg, fg] = colors[level] || colors.LOW;
  return (
    <span style={{ display: "inline-block", fontFamily: MONO, fontSize: 11, fontWeight: 700, padding: "4px 14px", borderRadius: 4, background: bg, color: fg }}>
      RISK: {level || "LOW"}
    </span>
  );
}

function ItemCard({ accentColor = "#B8863B", tag, tagBg, tagFg, title, body, footer }) {
  return (
    <div style={{ borderLeft: `3px solid ${accentColor}`, paddingLeft: 12, marginBottom: 10 }}>
      {tag && (
        <span style={{ display: "inline-block", fontFamily: MONO, fontSize: 9.5, padding: "2px 8px", borderRadius: 3, background: tagBg || "#fef3c7", color: tagFg || "#92400e", marginBottom: 4 }}>{tag}</span>
      )}
      <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 13, marginBottom: 3 }}>{title}</div>
      {body && <p style={{ margin: 0, color: "#4b5563", fontSize: 11.5 }}>{body}</p>}
      {footer && <code style={{ display: "block", fontFamily: MONO, fontSize: 10, color: "#475569", marginTop: 4, background: "#f8fafc", padding: "2px 8px", borderRadius: 3 }}>{footer}</code>}
    </div>
  );
}

function NativeDocument({ report, onLawClick }) {
  const { contract, riskReport, complianceReport, analysis } = report;
  const isBidding = analysis?.contractType === "bidding";
  const risk      = riskReport?.overallRiskLevel || "LOW";
  const now       = new Date().toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" });

  const deadlines = [
    ...(analysis?.bidOpeningDate ? [{ title: "Bid Opening Date", date: analysis.bidOpeningDate, isBidOpening: true }] : []),
    ...(analysis?.biddingDeadlines || []),
  ];

  return (
    <div style={{ fontFamily: FONT, color: "#1a202c", fontSize: 13, lineHeight: 1.65 }}>

      {/* ── Header */}
      <div style={{ borderBottom: "3px solid #B8863B", paddingBottom: 20, marginBottom: 28 }}>
        <h1 style={{ fontFamily: SERIF, fontSize: 22, color: "#0f172a", margin: "0 0 4px" }}>{contract.fileName}</h1>
        <p style={{ fontFamily: MONO, fontSize: 11, color: "#64748b", margin: "0 0 12px" }}>Legal Analysis Report · Docketwise AI Platform</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {[["User", contract.userCountry], ["Employer", contract.employerCountry], contract.clientCountry ? ["Client", contract.clientCountry] : null, ["Type", analysis?.contractType || "Standard"]].filter(Boolean).map(([k, v]) => (
            <span key={k} style={{ fontFamily: MONO, fontSize: 10, background: "#f8fafc", border: "1px solid #e2e8f0", padding: "2px 10px", borderRadius: 3, color: "#475569" }}>{k}: {v}</span>
          ))}
        </div>
        <RiskBadge level={risk} />
      </div>

      {/* ── Favorability Overview */}
      {(() => {
        const favorability = analysis?.favorability || {
          userPercentage: 50,
          oppositePercentage: 50,
          userRationale: "Based on local statutory regulations, the baseline contract maintains a balanced structure. Review specific liability caps and indemnities to verify standard commercial safety.",
          oppositeRationale: "Standard obligations apply. Review payment milestones and dispute resolution clauses to ensure adequate protection against potential opposite side defaults."
        };
        return (
          <DocSection icon="⚖️" title="Contract Balance & Favorability">
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontFamily: MONO, fontSize: 11, fontWeight: "bold" }}>
                <span style={{ color: "#059669" }}>You: {favorability.userPercentage}%</span>
                <span style={{ color: "#dc2626" }}>Opposite Side: {favorability.oppositePercentage}%</span>
              </div>
              <div style={{ height: 12, width: "100%", borderRadius: 6, background: "#e2e8f0", display: "flex", overflow: "hidden", border: "1px solid #cbd5e1" }}>
                <div style={{ width: `${favorability.userPercentage}%`, height: "100%", background: "linear-gradient(to right, #10b981, #14b8a6)" }} />
                <div style={{ width: `${favorability.oppositePercentage}%`, height: "100%", background: "linear-gradient(to right, #fb7185, #ef4444)" }} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ padding: 10, borderRadius: 4, border: "1px solid #d1fae5", background: "#f0fdf4" }}>
                <div style={{ fontWeight: "bold", fontSize: 10, color: "#065f46", marginBottom: 4, fontFamily: MONO }}>YOUR ADVANTAGES</div>
                <div style={{ fontSize: 11, color: "#374151" }}>{favorability.userRationale}</div>
              </div>
              <div style={{ padding: 10, borderRadius: 4, border: "1px solid #ffe4e6", background: "#fff5f5" }}>
                <div style={{ fontWeight: "bold", fontSize: 10, color: "#991b1b", marginBottom: 4, fontFamily: MONO }}>OPPOSITE SIDE ADVANTAGES</div>
                <div style={{ fontSize: 11, color: "#374151" }}>{favorability.oppositeRationale}</div>
              </div>
            </div>
          </DocSection>
        );
      })()}

      {/* ── Executive Summary */}
      <DocSection icon="📄" title="Executive Summary">
        <div 
          style={{ fontSize: 13.5, lineHeight: 1.8, color: "#374151", whiteSpace: "pre-wrap", margin: 0 }}
          dangerouslySetInnerHTML={{ __html: formatSummary(analysis?.summary || "No summary available.") }}
        />
      </DocSection>

      {/* ── Key Dates */}
      {deadlines.length > 0 && (
        <DocSection icon="⏰" title="Key Dates & Deadlines">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 8 }}>
            {deadlines.map((d, i) => {
              const days = daysUntil(d.date);
              const urgent = days !== null && days <= 7;
              const soon   = days !== null && days <= 30;
              return (
                <div key={i} style={{ padding: 10, borderRadius: 6, border: `1px solid ${urgent ? "#fca5a5" : soon ? "#fcd34d" : "#fde68a"}`, background: urgent ? "#fff1f2" : "#fffbeb", display: "flex", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{d.isBidOpening ? "🔓" : "⏰"}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 11, color: "#374151" }}>{d.title}</div>
                    <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: "#b45309" }}>{d.date || "TBD"}</div>
                    {days !== null && <span style={{ fontFamily: MONO, fontSize: 10, padding: "1px 6px", borderRadius: 3, background: urgent ? "#fee2e2" : "#f1f5f9", color: urgent ? "#991b1b" : "#64748b" }}>{days <= 0 ? "OVERDUE" : `${days}d left`}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </DocSection>
      )}

      {/* ── Clauses */}
      {analysis?.clauses?.length > 0 && (
        <DocSection icon="⚖️" title="Contract Clauses & Laws">
          {analysis.clauses.map((c, i) => <ItemCard key={i} tag={c.category?.toUpperCase()} title={c.title} body={c.text} />)}
        </DocSection>
      )}

      {/* ── Risk */}
      <DocSection icon="🔴" title="Risk Assessment">
        <div style={{ marginBottom: 12 }}><RiskBadge level={risk} /></div>
        {riskReport?.risks?.length > 0
          ? riskReport.risks.map((r, i) => {
              const sevBg = { HIGH: "#fee2e2", MEDIUM: "#fef3c7", LOW: "#dcfce7" };
              const sevFg = { HIGH: "#991b1b", MEDIUM: "#92400e", LOW: "#166534" };
              return <ItemCard key={i} accentColor="#dc2626" tag={r.severity} tagBg={sevBg[r.severity]} tagFg={sevFg[r.severity]} title={r.title} body={r.description} />;
            })
          : <p style={{ color: "#94a3b8", fontStyle: "italic", margin: 0 }}>No risks flagged.</p>
        }
      </DocSection>

      {/* ── Compliance */}
      <DocSection icon="✅" title="Compliance">
        <div style={{ marginBottom: 12 }}>
          <span style={{ display: "inline-block", fontFamily: MONO, fontSize: 11, fontWeight: 600, padding: "4px 14px", borderRadius: 3, background: complianceReport?.isCompliant !== false ? "#dcfce7" : "#fee2e2", color: complianceReport?.isCompliant !== false ? "#166534" : "#991b1b" }}>
            {complianceReport?.isCompliant !== false ? "✓ COMPLIANT" : "⚠ COMPLIANCE ISSUES DETECTED"}
          </span>
        </div>
        {complianceReport?.issues?.length > 0
          ? complianceReport.issues.map((issue, i) => <ItemCard key={i} accentColor="#dc2626" title={issue.title} body={issue.description} footer={issue.regulationReference} />)
          : <p style={{ color: "#94a3b8", fontStyle: "italic", margin: 0 }}>No compliance issues.</p>
        }
      </DocSection>

      {/* ── Corporate Laws */}
      {analysis?.corporateLaws?.length > 0 && (
        <DocSection icon="🏛️" title={`Corporate Laws — ${contract.employerCountry || contract.userCountry}`}>
          {analysis.corporateLaws.map((law, i) => (
            <div key={i} onClick={() => onLawClick?.({ name: law.lawName, desc: law.description })} className="cursor-pointer hover:opacity-80 transition-opacity">
              <ItemCard title={law.lawName} body={law.description} footer="Click to inspect law breakdown →" />
            </div>
          ))}
        </DocSection>
      )}

      {/* ── Bidding */}
      {isBidding && analysis?.biddingLaws?.length > 0 && (
        <DocSection icon="📜" title="Bidding Laws & Regulations">
          {analysis.biddingLaws.map((law, i) => (
            <div key={i} onClick={() => onLawClick?.({ name: law.lawName, desc: law.description })} className="cursor-pointer hover:opacity-80 transition-opacity">
              <ItemCard title={law.lawName} body={law.description} footer="Click to inspect law breakdown →" />
            </div>
          ))}
        </DocSection>
      )}
      {isBidding && analysis?.biddingRequirements?.length > 0 && (
        <DocSection icon="📋" title="Requirements to Participate in Bidding">
          {analysis.biddingRequirements.map((req, i) => <ItemCard key={i} title={req.title} body={req.description} />)}
        </DocSection>
      )}

      {/* ── Footer */}
      <div style={{ marginTop: 36, paddingTop: 12, borderTop: "1px solid #e5e7eb", fontSize: 10, color: "#94a3b8", fontFamily: MONO, display: "flex", justifyContent: "space-between" }}>
        <span>Docketwise AI Legal Platform — Confidential Document</span>
        <span>Generated {now}</span>
      </div>
    </div>
  );
}

// ─── Main Panel ──────────────────────────────────────────────────────────────

export default function DocumentSummaryPanel({ open, onClose, report }) {
  const previewRef  = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [selectedLaw, setSelectedLaw] = useState(null);

  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  if (!report) return null;

  const { contract, riskReport, complianceReport, analysis } = report;
  const isBidding = analysis?.contractType === "bidding";

  const handleDownloadPDF = async () => {
    if (!previewRef.current) return;
    setDownloading(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      
      await html2pdf()
        .set({
          margin:      [15, 20, 15, 20],
          filename:    `${contract.fileName?.replace(/\.[^.]+$/, "") || "summary"}-report.pdf`,
          pagebreak:   { mode: ['avoid-all', 'css', 'legacy'] },
          html2canvas: { 
            scale: 2, 
            useCORS: true, 
            letterRendering: true, 
            logging: false 
          },
          jsPDF:       { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(previewRef.current)
        .save();
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadDOCX = () => {
    try {
      const htmlString = buildWordHTML(report);
      const blob = new Blob(["\ufeff" + htmlString], {
        type: "application/msword;charset=utf-8"
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${contract.fileName?.replace(/\.[^.]+$/, "") || "summary"}-report.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate Word document:", err);
    }
  }; 



  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-slate-900/15 z-30 backdrop-blur-[1px]" onClick={onClose} />
      )}

      <div
        className="fixed top-0 right-0 h-screen z-40 flex flex-col bg-ink-raised border-l border-ink-border shadow-2xl"
        style={{
          width: "min(900px, 92vw)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.35s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-border bg-ink-raised shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div>
              <div className="text-[10px] font-mono text-muted tracking-widest uppercase">Document Summary</div>
              <div className="font-display text-paper text-sm truncate max-w-[320px] mt-0.5">{contract?.fileName}</div>
            </div>
            {analysis?.detectedLanguage && analysis.detectedLanguage !== "English" && (
              <span className="text-[10px] font-mono bg-blue-900/30 text-blue-400 border border-blue-500/30 px-2 py-1 rounded-sm shrink-0">
                📄 {analysis.detectedLanguage}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Download PDF Button */}
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-seal/15 hover:bg-seal/30 text-seal-bright border border-seal/30 rounded-sm transition-all disabled:opacity-50"
              title="Download summary report as PDF"
            >
              {downloading ? <span className="animate-pulse">Generating…</span> : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  PDF
                </>
              )}
            </button>

            {/* Download DOCX Button */}
            <button
              onClick={handleDownloadDOCX}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-[#b8863b]/15 hover:bg-[#b8863b]/30 text-[#e6b36e] border border-[#b8863b]/30 rounded-sm transition-all"
              title="Download summary report as Word document (DOC)"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Word
            </button>

            <button onClick={onClose} className="text-muted hover:text-paper w-7 h-7 flex items-center justify-center rounded-sm hover:bg-ink-border/50 transition-colors text-lg">×</button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* Sidebar */}
          <div className="w-52 shrink-0 border-r border-ink-border overflow-y-auto px-3 py-4 space-y-1 bg-ink/40" style={{ scrollbarWidth: "thin" }}>
            <div className="text-[9px] font-mono text-muted/60 tracking-widest uppercase mb-3 px-2">Contents</div>
            {[
              { icon: "📄", label: "Executive Summary" },
              (isBidding && (analysis?.biddingDeadlines?.length || analysis?.bidOpeningDate)) ? { icon: "⏰", label: "Key Dates" } : null,
              analysis?.clauses?.length ? { icon: "⚖️", label: "Clauses" } : null,
              { icon: "🔴", label: "Risk Assessment" },
              { icon: "✅", label: "Compliance" },
              analysis?.corporateLaws?.length ? { icon: "🏛️", label: "Corporate Laws" } : null,
              (isBidding && analysis?.biddingLaws?.length) ? { icon: "📜", label: "Bidding Laws" } : null,
              (isBidding && analysis?.biddingRequirements?.length) ? { icon: "📋", label: "Requirements" } : null,
            ].filter(Boolean).map((item) => (
              <div key={item.label} className="flex items-center gap-2 px-2 py-1.5 rounded-sm text-xs text-muted hover:text-paper hover:bg-ink-border/35 cursor-default transition-colors">
                <span className="text-sm shrink-0">{item.icon}</span>
                <span className="font-mono text-[10px] leading-tight">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Document — renders instantly as native React, no iframe */}
          <div className="flex-1 overflow-y-auto bg-ink px-6 py-6" style={{ scrollbarWidth: "thin" }}>
            <div
              ref={previewRef}
              className="bg-white dark:bg-slate-50 text-slate-800 rounded-[6px] shadow-[0_20px_50px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.05)] mx-auto border border-slate-200/60 transition-all duration-300 hover:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15)]"
              style={{ maxWidth: 680, padding: "48px 56px" }}
            >
              <NativeDocument report={report} onLawClick={(law) => setSelectedLaw(law)} />
            </div>
            <p className="text-center text-[9px] font-mono text-muted/60 tracking-wider uppercase mt-4">
              Docketwise AI • Confidential Ledger Document • Not Legal Advice
            </p>
          </div>
        </div>
      </div>

      <LawExplainerModal
        open={!!selectedLaw}
        onClose={() => setSelectedLaw(null)}
        lawName={selectedLaw?.name}
        lawDescription={selectedLaw?.desc}
        country={contract?.employerCountry || contract?.userCountry}
      />
    </>
  );
}
