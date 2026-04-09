'use strict'

/**
 * Letter generator — PDFKit
 *
 * Generates all 14 letter templates in memory and returns a Buffer.
 * Never writes to disk (Railway filesystem resets on every deploy).
 *
 * Letters per PRD §5.5:
 *   Bureau path (§611):
 *     1  — Basic dispute letter
 *     2  — Dispute with method of verification request
 *     3  — Dispute inaccurate information
 *     4  — Remove outdated information (FCRA §605 expiry)
 *     5  — Dispute unauthorized inquiry
 *   Furnisher path (§623):
 *     6  — Direct furnisher dispute
 *     7  — Furnisher re-investigation request
 *     8  — Cease reporting inaccurate information
 *     9  — Request furnisher investigation records
 *     10 — Furnisher escalation
 *   Creditor path:
 *     11 — Goodwill adjustment request
 *     12 — Pay-for-delete offer
 *     13 — Debt settlement offer
 *   Collector path (FDCPA):
 *     14 — FDCPA §1692g debt validation request
 */

const PDFDocument = require('pdfkit')
const { format }  = require('date-fns')

// Bureau addresses for auto-fill
const BUREAU_ADDRESSES = {
  equifax:    'Equifax Information Services LLC\nP.O. Box 740256\nAtlanta, GA 30374-0256',
  experian:   'Experian\nP.O. Box 4500\nAllen, TX 75013',
  transunion: 'TransUnion LLC Consumer Dispute Center\nP.O. Box 2000\nChester, PA 19016',
}

// ─── Main entry point ─────────────────────────────────────────────────────────
function generateLetter(options) {
  return new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ margin: 72, size: 'LETTER' })
    const chunks = []

    doc.on('data',  chunk => chunks.push(chunk))
    doc.on('end',   ()    => resolve(Buffer.concat(chunks)))
    doc.on('error', err   => reject(err))

    try {
      buildLetter(doc, options)
      doc.end()
    } catch (err) {
      reject(err)
    }
  })
}

// ─── Layout helpers ───────────────────────────────────────────────────────────
function header(doc, options) {
  const today    = format(new Date(), 'MMMM d, yyyy')
  const name     = options.fullName     || options.user.name  || options.user.email
  const address  = options.address      || ''
  const cityZip  = options.cityStateZip || ''
  const phone    = options.phone        || ''

  // CreditPath branding — minimal
  doc
    .fontSize(9)
    .fillColor('#6b7280')
    .text('CreditPath — Personal Credit Repair Tool', { align: 'right' })
    .text('NOT a Credit Repair Organization per 15 U.S.C. § 1679a(3)', { align: 'right' })
    .moveDown(0.5)

  // Sender info block
  doc.fontSize(11).fillColor('#111827')
  doc.text(name)
  if (address)  doc.text(address)
  if (cityZip)  doc.text(cityZip)
  if (phone)    doc.text(phone)
  doc.text(today).moveDown(1)
}

function recipientBlock(doc, recipientAddress) {
  doc
    .fontSize(11)
    .fillColor('#111827')
    .text(recipientAddress || 'Recipient Address\n[Complete before mailing]')
    .moveDown(1)
}

function subject(doc, subjectLine) {
  doc
    .fontSize(11)
    .fillColor('#111827')
    .font('Helvetica-Bold')
    .text(`RE: ${subjectLine}`)
    .font('Helvetica')
    .moveDown(0.75)
}

function body(doc, text) {
  doc
    .fontSize(11)
    .fillColor('#111827')
    .text(text, { align: 'justify', lineGap: 3 })
    .moveDown(0.75)
}

function legalDisclaimer(doc) {
  doc
    .moveDown(1)
    .fontSize(8)
    .fillColor('#6b7280')
    .text(
      'This letter was prepared using CreditPath, a personal credit repair tool. ' +
      'CreditPath is NOT a Credit Repair Organization as defined in 15 U.S.C. § 1679a(3), ' +
      'does not provide legal advice, and does not act on behalf of third parties. ' +
      'This letter was generated for your personal use and submitted by you.',
      { align: 'left', lineGap: 2 }
    )
}

function signature(doc, options) {
  const name    = options.fullName     || options.user.name  || options.user.email
  const address = options.address      || ''
  const cityZip = options.cityStateZip || ''
  const phone   = options.phone        || ''

  doc
    .moveDown(2)
    .fontSize(11)
    .fillColor('#111827')
    .text('Sincerely,')
    .moveDown(2)
    .text('_________________________')
    .moveDown(0.5)
    .text(name)

  if (address) doc.moveDown(0.25).text(address)
  if (cityZip) doc.moveDown(0.25).text(cityZip)
  if (phone)   doc.moveDown(0.25).text(phone)

  legalDisclaimer(doc)
}

// ─── Letter templates ─────────────────────────────────────────────────────────
function buildLetter(doc, options) {
  const {
    letterNumber, user, bureau, creditor,
    accountNumber, itemDescription, amount,
    bureauAddress, creditorAddress,
  } = options

  const bureauAddr   = bureauAddress   || BUREAU_ADDRESSES[bureau?.toLowerCase()] || `${bureau || '[Bureau Name]'}\n[Bureau Address]`
  const creditorAddr = creditorAddress || `${creditor || '[Creditor/Collector Name]'}\n[Address]`
  const bureauName   = bureau   ? bureau.charAt(0).toUpperCase() + bureau.slice(1)   : '[Bureau Name]'
  const creditorName = creditor || '[Creditor Name]'
  const acctNum      = accountNumber   || '[Account Number]'
  const itemDesc     = itemDescription || '[Description of item being disputed]'
  const dollarAmt    = amount ? `$${amount.toLocaleString()}` : '[Amount]'

  header(doc, options)

  switch (letterNumber) {

    // ── Letter 1: Basic bureau dispute (§611) ─────────────────────────────────
    case 1:
      recipientBlock(doc, bureauAddr)
      subject(doc, `Formal Dispute of Inaccurate Information — FCRA § 611`)
      body(doc,
        `To Whom It May Concern:\n\n` +
        `Pursuant to my rights under the Fair Credit Reporting Act (FCRA), 15 U.S.C. § 1681 et seq., ` +
        `I am formally disputing the following item(s) on my credit report maintained by ${bureauName}:\n\n` +
        `Account/Item: ${itemDesc}\nAccount Number: ${acctNum}\n\n` +
        `This information is inaccurate, incomplete, or cannot be verified. Under FCRA § 611(a)(1)(A), ` +
        `you are required to conduct a reasonable reinvestigation within 30 days of receiving this dispute.\n\n` +
        `Please delete or correct this item and provide me with a corrected copy of my credit report ` +
        `as required by FCRA § 611(a)(6)(B)(iii).`
      )
      signature(doc, options)
      break

    // ── Letter 2: Dispute + method of verification request ───────────────────
    case 2:
      recipientBlock(doc, bureauAddr)
      subject(doc, `Dispute and Request for Method of Verification — FCRA § 611(a)(7)`)
      body(doc,
        `To Whom It May Concern:\n\n` +
        `Pursuant to FCRA § 611, I am disputing the following item:\n\n` +
        `Account/Item: ${itemDesc}\nAccount Number: ${acctNum}\n\n` +
        `Additionally, pursuant to FCRA § 611(a)(7), if you have previously conducted a reinvestigation ` +
        `of this item, I hereby request a description of the procedure used to determine the accuracy ` +
        `and completeness of the information, including the business name and address of any furnisher ` +
        `contacted, and the telephone number if reasonably available.\n\n` +
        `Please provide this description within 15 days of completing the reinvestigation.`
      )
      signature(doc, options)
      break

    // ── Letter 3: Dispute inaccurate information ─────────────────────────────
    case 3:
      recipientBlock(doc, bureauAddr)
      subject(doc, `Dispute of Inaccurate Information — FCRA § 611`)
      body(doc,
        `To Whom It May Concern:\n\n` +
        `I am writing to dispute the following inaccurate information in my credit file:\n\n` +
        `Account/Item: ${itemDesc}\nAccount Number: ${acctNum}\n\n` +
        `The specific inaccuracy is: ${itemDesc}\n\n` +
        `I am requesting that this item be corrected to reflect accurate information or deleted if ` +
        `it cannot be verified. I have enclosed [list any documentation] supporting this dispute.\n\n` +
        `Under FCRA § 611(a)(1)(A), please complete your reinvestigation within 30 days and notify ` +
        `me of the results.`
      )
      signature(doc, options)
      break

    // ── Letter 4: Remove outdated information (§605 expiry) ─────────────────
    case 4:
      recipientBlock(doc, bureauAddr)
      subject(doc, `Request for Removal of Outdated Information — FCRA § 605`)
      body(doc,
        `To Whom It May Concern:\n\n` +
        `I am writing to request the removal of the following item from my credit report, ` +
        `as it has exceeded the maximum reporting period established by FCRA § 605:\n\n` +
        `Account/Item: ${itemDesc}\nAccount Number: ${acctNum}\n\n` +
        `Under FCRA § 605(a), most adverse information may not be reported after 7 years from the ` +
        `date of the first delinquency. Under § 605(c), for collection accounts, the 7-year period ` +
        `begins 180 days after the delinquency date that preceded the collection activity.\n\n` +
        `This item has exceeded the applicable reporting period and must be removed immediately. ` +
        `Please confirm removal in writing and provide a corrected credit report.`
      )
      signature(doc, options)
      break

    // ── Letter 5: Dispute unauthorized inquiry ────────────────────────────────
    case 5:
      recipientBlock(doc, bureauAddr)
      subject(doc, `Dispute of Unauthorized Hard Inquiry — FCRA § 604`)
      body(doc,
        `To Whom It May Concern:\n\n` +
        `I am writing to dispute an inquiry that appears on my credit report that I did not authorize. ` +
        `Under FCRA § 604(a), a consumer reporting agency may only furnish a consumer report under ` +
        `specific permissible purposes.\n\n` +
        `Unauthorized inquiry:\nCreditor/Company: ${creditorName}\nDate of Inquiry: [Date of inquiry]\n\n` +
        `I did not apply for credit with this company and did not provide written authorization for ` +
        `this inquiry. Please remove this unauthorized inquiry immediately and confirm removal in writing.`
      )
      signature(doc, options)
      break

    // ── Letter 6: Direct furnisher dispute (§623) ─────────────────────────────
    case 6:
      recipientBlock(doc, creditorAddr)
      subject(doc, `Direct Dispute of Inaccurate Information — FCRA § 623(a)(8)`)
      body(doc,
        `To Whom It May Concern:\n\n` +
        `Pursuant to my rights under FCRA § 623(a)(8), I am submitting a direct dispute to you ` +
        `as a furnisher of information to consumer reporting agencies regarding the following:\n\n` +
        `Account: ${creditorName}, Account Number: ${acctNum}\n` +
        `Item in dispute: ${itemDesc}\n\n` +
        `The information you are reporting to one or more consumer reporting agencies is inaccurate. ` +
        `Under FCRA § 623(a)(8)(E), you must conduct a reasonable investigation within 30 days, ` +
        `correct any inaccuracies, and notify all consumer reporting agencies to which you furnished ` +
        `the information of the correction.\n\n` +
        `Please provide written confirmation of your investigation results and any corrections made.`
      )
      signature(doc, options)
      break

    // ── Letter 7: Furnisher re-investigation request ──────────────────────────
    case 7:
      recipientBlock(doc, creditorAddr)
      subject(doc, `Request for Reinvestigation — FCRA § 623(b)`)
      body(doc,
        `To Whom It May Concern:\n\n` +
        `I previously disputed the following information with a consumer reporting agency, ` +
        `and I am now requesting that you, as the original furnisher, conduct a reinvestigation:\n\n` +
        `Account: ${creditorName}, Account Number: ${acctNum}\n` +
        `Item: ${itemDesc}\n\n` +
        `Under FCRA § 623(b), when a consumer reporting agency notifies a furnisher of a dispute, ` +
        `the furnisher must investigate, review all relevant information, and report the results. ` +
        `I am requesting that you conduct a thorough reinvestigation and correct or delete any ` +
        `inaccurate information.`
      )
      signature(doc, options)
      break

    // ── Letter 8: Cease reporting inaccurate information ─────────────────────
    case 8:
      recipientBlock(doc, creditorAddr)
      subject(doc, `Demand to Cease Reporting Inaccurate Information — FCRA § 623(a)(2)`)
      body(doc,
        `To Whom It May Concern:\n\n` +
        `You are currently reporting inaccurate information about me to consumer reporting agencies. ` +
        `Under FCRA § 623(a)(2), if a furnisher is notified that specific information is inaccurate, ` +
        `it must not continue furnishing that information.\n\n` +
        `Account: ${creditorName}, Account Number: ${acctNum}\n` +
        `Inaccurate information: ${itemDesc}\n\n` +
        `I am hereby formally notifying you that the above information is inaccurate. You are required ` +
        `to immediately stop furnishing this inaccurate information to all consumer reporting agencies ` +
        `and correct your records. Failure to do so may violate FCRA § 623 and expose you to civil ` +
        `liability under FCRA § 616.`
      )
      signature(doc, options)
      break

    // ── Letter 9: Request furnisher investigation records ────────────────────
    case 9:
      recipientBlock(doc, creditorAddr)
      subject(doc, `Request for Records of Investigation — FCRA § 623(a)(8)(F)`)
      body(doc,
        `To Whom It May Concern:\n\n` +
        `Pursuant to FCRA § 623(a)(8)(F), I am requesting copies of all business records ` +
        `relating to your investigation of my dispute regarding the following account:\n\n` +
        `Account: ${creditorName}, Account Number: ${acctNum}\n\n` +
        `Specifically, I am requesting:\n` +
        `1. All records reviewed during your investigation\n` +
        `2. The name and contact information of each person consulted\n` +
        `3. A description of the investigation procedures used\n` +
        `4. The results of the investigation and any corrections made\n\n` +
        `Please provide this information within 30 days.`
      )
      signature(doc, options)
      break

    // ── Letter 10: Furnisher escalation ──────────────────────────────────────
    case 10:
      recipientBlock(doc, creditorAddr)
      subject(doc, `Escalation Notice — Continued Inaccurate Reporting — FCRA § 616, § 617`)
      body(doc,
        `To Whom It May Concern:\n\n` +
        `This letter is an escalation of my prior dispute(s) regarding the following account:\n\n` +
        `Account: ${creditorName}, Account Number: ${acctNum}\n` +
        `Item: ${itemDesc}\n\n` +
        `Despite my previous correspondence, you continue to report inaccurate information. ` +
        `I am placing you on formal notice that continued willful or negligent violation of the FCRA ` +
        `exposes your company to civil liability under FCRA § 616 (willful noncompliance — actual ` +
        `damages, punitive damages, and attorney fees) and § 617 (negligent noncompliance).\n\n` +
        `I demand immediate correction of the inaccurate information and written confirmation ` +
        `within 15 days. I reserve all rights under applicable federal and state law.`
      )
      signature(doc, options)
      break

    // ── Letter 11: Goodwill adjustment ────────────────────────────────────────
    case 11:
      recipientBlock(doc, creditorAddr)
      subject(doc, `Goodwill Adjustment Request`)
      body(doc,
        `To Whom It May Concern:\n\n` +
        `I am writing to respectfully request a goodwill adjustment to my account with ${creditorName}.\n\n` +
        `Account Number: ${acctNum}\n` +
        `Item: ${itemDesc}\n\n` +
        `I have been a customer of ${creditorName} and value my relationship with your company. ` +
        `The late payment(s) noted on my account occurred due to [brief explanation of circumstances — ` +
        `job loss, medical emergency, etc.]. This is not reflective of my typical payment behavior, ` +
        `as evidenced by my otherwise positive payment history.\n\n` +
        `I have since resolved the issue and have maintained a positive payment record. I am humbly ` +
        `requesting that you consider removing the negative mark(s) as a goodwill gesture. ` +
        `This would have a meaningful impact on my ability to [purchase a home / qualify for better rates / etc.].\n\n` +
        `I understand this is not required by law, and I sincerely appreciate your consideration.`
      )
      signature(doc, options)
      break

    // ── Letter 12: Pay-for-delete offer ───────────────────────────────────────
    case 12:
      recipientBlock(doc, creditorAddr)
      subject(doc, `Settlement Offer — Pay-for-Delete Agreement`)
      body(doc,
        `To Whom It May Concern:\n\n` +
        `I am writing regarding the following account:\n\n` +
        `Creditor/Collection Agency: ${creditorName}\n` +
        `Account Number: ${acctNum}\n` +
        `Current Balance: ${dollarAmt}\n\n` +
        `I am prepared to resolve this account. In exchange for payment of [Offer Amount], ` +
        `I request that you permanently delete all references to this account from all consumer ` +
        `reporting agencies to which you have reported this information.\n\n` +
        `This is a conditional offer contingent on your written agreement to delete the tradeline. ` +
        `Please do not accept this as payment without first providing written confirmation that you ` +
        `agree to delete the account from my credit file upon receipt of payment.\n\n` +
        `This offer expires 30 days from the date of this letter. Please respond in writing.`
      )
      signature(doc, options)
      break

    // ── Letter 13: Settlement offer ───────────────────────────────────────────
    case 13:
      recipientBlock(doc, creditorAddr)
      subject(doc, `Debt Settlement Offer`)
      body(doc,
        `To Whom It May Concern:\n\n` +
        `I am writing regarding the following account:\n\n` +
        `Creditor: ${creditorName}\n` +
        `Account Number: ${acctNum}\n` +
        `Outstanding Balance: ${dollarAmt}\n\n` +
        `I am currently experiencing financial hardship and am unable to pay the full balance. ` +
        `However, I am prepared to offer a lump-sum payment of [Settlement Amount] as full and ` +
        `final settlement of this debt.\n\n` +
        `In exchange, I request that you: (1) accept this payment as settlement in full; ` +
        `(2) update the account status to "settled" or "paid" on all credit reports; ` +
        `and (3) provide written confirmation that the remaining balance is forgiven.\n\n` +
        `Please respond with your decision within 30 days. This offer is contingent upon ` +
        `written agreement prior to any payment.`
      )
      signature(doc, options)
      break

    // ── Letter 14: FDCPA §1692g debt validation ───────────────────────────────
    case 14:
      recipientBlock(doc, creditorAddr)
      subject(doc, `Debt Validation Request — FDCPA § 1692g`)
      body(doc,
        `To Whom It May Concern:\n\n` +
        `I am writing in response to your collection attempt regarding the following debt:\n\n` +
        `Collection Agency: ${creditorName}\n` +
        `Alleged Balance: ${dollarAmt}\n` +
        `Reference/Account Number: ${acctNum}\n\n` +
        `Pursuant to my rights under the Fair Debt Collection Practices Act (FDCPA), ` +
        `15 U.S.C. § 1692g, I hereby request validation of this debt within 30 days.\n\n` +
        `Specifically, please provide:\n` +
        `1. The amount of the debt and how it was calculated\n` +
        `2. The name and address of the original creditor\n` +
        `3. A copy of the original signed contract or agreement\n` +
        `4. Proof that your company is licensed to collect debts in my state\n` +
        `5. Proof that you have the legal right to collect this debt\n\n` +
        `Until you provide this validation, you must cease all collection activity, ` +
        `including any credit reporting. Failure to comply may result in a complaint to ` +
        `the CFPB and the FTC, and may expose your company to liability under FDCPA § 1692k.`
      )
      signature(doc, options)
      break

    default:
      body(doc, `Letter template ${letterNumber} not found.`)
      signature(doc, options)
  }
}

module.exports = { generateLetter }
