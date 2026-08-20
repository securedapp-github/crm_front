import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, ArrowLeft, Mail, Globe, CheckCircle, FileText, Server } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Header Bar */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Shield className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-sm text-slate-900 tracking-tight">SecureDApp</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10">
        {/* Title Hero */}
        <div className="space-y-3 border-b border-slate-200 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold">
            <Lock className="w-3.5 h-3.5" />
            <span>Legal Documentation</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-sm text-slate-500">
            <strong>Effective Date:</strong> January 1, 2024 &nbsp;•&nbsp; <strong>Last Updated:</strong> August 19, 2026
          </p>
        </div>

        {/* Content Body */}
        <div className="prose prose-slate max-w-none space-y-8 text-sm leading-relaxed text-slate-700">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              1. Introduction & Overview
            </h2>
            <p>
              This Privacy Policy explains how <strong>Vettedcode Technologies India Private Limited</strong> (&quot;SecureDApp,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) collects, uses, processes, discloses, and protects personal information when you access or use our websites (<a href="https://securedapp.in" target="_blank" rel="noreferrer" className="text-indigo-600 font-semibold hover:underline">securedapp.in</a>, <a href="https://securedapp.io" target="_blank" rel="noreferrer" className="text-indigo-600 font-semibold hover:underline">securedapp.io</a>), our smart contract audit services, tokenization platform (SecurePAD), developer tools, and CRM solutions (collectively, the &quot;Services&quot;).
            </p>
            <p>
              By accessing or using our Services, you consent to the collection, storage, and processing of your personal information in accordance with this Privacy Policy.
            </p>
          </section>

          <section className="space-y-3 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              2. Applicable Data Protection Frameworks
            </h2>
            <p>
              We are committed to operating in full compliance with recognized privacy standards and statutory frameworks across our operating jurisdictions:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              <li><strong>General Data Protection Regulation (GDPR)</strong> &amp; <strong>UK GDPR:</strong> Applicable to data subjects residing in the European Union and the United Kingdom.</li>
              <li><strong>Digital Personal Data Protection Act, 2023 (DPDPA):</strong> Applicable to data processed within or originating from India.</li>
              <li><strong>California Consumer Privacy Act / CPRA (CCPA):</strong> Applicable to residents of the State of California, USA.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Server className="w-5 h-5 text-indigo-600" />
              3. Information We Collect
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2">
                <h3 className="font-bold text-indigo-600 text-xs uppercase tracking-wider">Direct Information</h3>
                <p className="text-xs text-slate-600">
                  Name, business email address, phone number, organization name, and smart contract source code submitted for audit evaluation or token launch.
                </p>
              </div>
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2">
                <h3 className="font-bold text-indigo-600 text-xs uppercase tracking-wider">Web3 &amp; Blockchain Data</h3>
                <p className="text-xs text-slate-600">
                  Public cryptocurrency wallet addresses and on-chain transaction hashes. <em>Note: Public ledger data is immutable and transparent by protocol design.</em>
                </p>
              </div>
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2">
                <h3 className="font-bold text-indigo-600 text-xs uppercase tracking-wider">Technical Telemetry</h3>
                <p className="text-xs text-slate-600">
                  IP address, browser type, operating system, diagnostic logs, and activity telemetry (for authenticated dashboard and extension users).
                </p>
              </div>
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2">
                <h3 className="font-bold text-indigo-600 text-xs uppercase tracking-wider">Billing &amp; Transactions</h3>
                <p className="text-xs text-slate-600">
                  Invoicing records, tax IDs, payment status, and order identifiers for commercial services and SaaS subscriptions.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">4. How We Use Personal Information</h2>
            <p>We process collected information solely for legitimate commercial and technical operations:</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li>Conducting smart contract audits, vulnerability assessments, and issuing formal security reports.</li>
              <li>Facilitating token launchpad operations and smart contract deployment on SecurePAD.</li>
              <li>Delivering customer support, ticketing responses, and inbound project inquiry routing.</li>
              <li>Preventing unauthorized access, malicious attacks, identity spoofing, and platform abuse.</li>
              <li>Complying with statutory reporting, accounting, and anti-fraud mandates.</li>
            </ul>
          </section>

          <section className="space-y-3 bg-amber-50/60 p-5 rounded-2xl border border-amber-200 text-amber-950">
            <h2 className="text-base font-bold text-amber-900">5. Blockchain Disclosures &amp; Erasure Limitations</h2>
            <p className="text-xs leading-relaxed">
              Decentralized blockchain ledgers (e.g., Ethereum, Polygon, Binance Smart Chain) are public, distributed, and cryptographically immutable. Any data, smart contract bytecode, or wallet address recorded onto a public blockchain cannot be modified, amended, or erased by SecureDApp or any third party. Your statutory right to erasure applies exclusively to centralized, off-chain databases under our direct operational control.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">6. Zero Sale of Personal Data &amp; Sharing Disclosures</h2>
            <p>
              We <strong>do not sell, rent, or monetize</strong> your personal information. We only share information with trusted third-party cloud infrastructure vendors, payment gateways, and transactional email providers under strict confidentiality agreements.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">7. Your Privacy Rights</h2>
            <p>
              Depending on your jurisdiction, you have the right to request access, rectification, portability, or erasure of your personal data, or to withdraw consent at any time. To submit a data request, please email our Data Protection team at <a href="mailto:privacy@securedapp.in" className="text-indigo-600 font-semibold hover:underline">privacy@securedapp.in</a>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">8. Children&apos;s Privacy</h2>
            <p>
              Our Services are strictly designed for individuals aged <strong>18 and older</strong>. We do not knowingly solicit or collect personal information from minors.
            </p>
          </section>

          <section className="space-y-3 border-t border-slate-200 pt-6">
            <h2 className="text-lg font-bold text-slate-900">9. Contact &amp; Grievance Redressal</h2>
            <div className="p-5 bg-white rounded-2xl border border-slate-200 space-y-2">
              <div className="font-bold text-slate-900">Vettedcode Technologies India Private Limited</div>
              <div className="text-xs text-slate-600 flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Privacy &amp; Grievance Officer: <a href="mailto:privacy@securedapp.in" className="text-indigo-600 hover:underline">privacy@securedapp.in</a></span>
              </div>
              <div className="text-xs text-slate-600 flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>General Support: <a href="mailto:support@securedapp.in" className="text-indigo-600 hover:underline">support@securedapp.in</a></span>
              </div>
              <div className="text-xs text-slate-600 flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Official Web: <a href="https://securedapp.in" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">https://securedapp.in</a></span>
              </div>
            </div>
          </section>

          <section className="p-4 bg-slate-100 rounded-xl text-xs text-slate-500 italic">
            Disclaimer: Vettedcode Technologies India Private Limited provides smart contract security auditing, developer tooling, and the SecurePAD launchpad framework for educational, technical, and informational purposes only. Security audit reports do not constitute investment advice or a financial guarantee of smart contract performance.
          </section>
        </div>
      </main>
    </div>
  );
}
