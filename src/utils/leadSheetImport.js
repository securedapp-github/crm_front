import * as XLSX from 'xlsx'

/**
 * Clean and normalize email values extracted from Excel cells.
 * Strips mailto: protocols, extracts email from <user@domain.com> brackets, and trims whitespace.
 */
export function cleanEmail(val) {
  if (!val || typeof val !== 'string') return ''
  let cleaned = val.trim()
  if (cleaned.toLowerCase().startsWith('mailto:')) {
    cleaned = cleaned.substring(7).trim()
  }
  const bracketMatch = cleaned.match(/<([^>]+)>/)
  if (bracketMatch && bracketMatch[1]) {
    cleaned = bracketMatch[1].trim()
  }
  cleaned = cleaned.toLowerCase()
  // Basic email validation check
  if (!cleaned.includes('@') || !cleaned.includes('.')) {
    return ''
  }
  return cleaned
}

/**
 * Clean and normalize domain values extracted from Excel cells or fallback from email.
 */
export function cleanDomain(val, email = '') {
  const genericMails = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'mail.com', 'protonmail.com', 'aol.com', 'gmx.com', 'zoho.com']
  let dom = val ? String(val).trim().toLowerCase() : ''
  if (dom) {
    dom = dom.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].split('?')[0].trim()
  }
  if (!dom && email && typeof email === 'string' && email.includes('@')) {
    const parts = email.split('@')
    const extracted = parts[1] ? parts[1].trim().toLowerCase() : ''
    if (extracted && extracted.includes('.') && !genericMails.includes(extracted)) {
      dom = extracted
    }
  }
  return dom || ''
}

/**
 * Standard column headers mapping to accommodate all common spreadsheet format variations.
 */
export const STANDARD_LEAD_KEYS_MAP = {
  company: [
    'Entity Name', 'Entity name', 'Entity', 'Company', 'Company Name', 'Organization',
    'Business Name', 'Company_Name', 'Brand', 'Firm', 'Account Name', 'Account'
  ],
  email: [
    'Email', 'Email Address', 'Email ID', 'EmailId', 'Mail', 'Mail ID', 'MailId', 'E-Mail',
    'E-mail Address', 'Email_Address', 'Contact Email', 'Work Email', 'Primary Email',
    'User Email', 'Customer Email', 'Official Email', 'E-Mail Address'
  ],
  phone: [
    'Mobile number', 'Phone', 'Mobile', 'Phone Number', 'Contact Number', 'Tel',
    'Telephone', 'WhatsApp', 'Phone_Number', 'Mobile_Number', 'Cell', 'Cell Phone',
    'Contact No', 'Mobile No', 'Phone No'
  ],
  name: [
    'Name', 'Full Name', 'Lead Name', 'First Name', 'Contact Name', 'Customer Name', 'Person Name'
  ],
  accountDomain: [
    'Company domain', 'Company Domain', 'CompanyDomain', 'Company_Domain', 'Domain',
    'Website', 'Company Website', 'CompanyWebsite', 'Account Domain', 'Account domain',
    'URL', 'Web Address', 'Domain Name', 'DomainName', 'Site', 'Web Site', 'Host', 'Hostname'
  ],
  description: [
    'Description', 'Notes', 'Comment', 'Comments', 'Details', 'Remark', 'Remarks', 'Summary'
  ],
  status: [
    'Status', 'Lead Status', 'Stage', 'Lead Stage'
  ],
  source: [
    'Source', 'Lead Source', 'Channel', 'Medium', 'Origin'
  ],
  jobTitle: [
    'Job Title', 'Designation', 'Title', 'Role', 'Position', 'Job Position'
  ],
  industry: [
    'Service', 'Services', 'Service Offered', 'Product/Service', 'Industry', 'Sector', 'Category'
  ],
  region: [
    'Region', 'Location', 'City', 'Country', 'Address', 'State', 'Territory'
  ]
}

/**
 * Helper to auto-calculate optimal column widths for SheetJS worksheets.
 */
function getColumnWidths(data, defaultMin = 14) {
  if (!data || data.length === 0) return []
  const keys = Object.keys(data[0])
  return keys.map((key) => {
    let maxLen = String(key).length
    data.forEach((row) => {
      const val = row[key]
      if (val !== undefined && val !== null) {
        const strLen = String(val).length
        if (strLen > maxLen) maxLen = strLen
      }
    })
    return { wch: Math.max(maxLen + 4, defaultMin) }
  })
}

/**
 * Generates and triggers browser download for a formatted sample Lead Upload Excel (.xlsx) Template.
 */
export function generateLeadTemplate() {
  const template = [
    {
      'Entity Name': 'Acme Corporation',
      'Name': 'John Doe',
      'Mobile number': '+1 555-0192',
      'Email ID': 'john.doe@acme.com',
      'Company domain': 'acme.com',
      'Service': 'Smart Contract Audit',
      'Job Title': 'Chief Technology Officer',
      'Status': 'New',
      'Region': 'North America',
      'Description': 'Interested in enterprise security audit'
    },
    {
      'Entity Name': 'Starlight Media',
      'Name': 'Sarah Connor',
      'Mobile number': '+1 555-0148',
      'Email ID': 'sarah@starlight.io',
      'Company domain': 'starlight.io',
      'Service': 'Dapp Development',
      'Job Title': 'Marketing Director',
      'Status': 'Contacted',
      'Region': 'Europe',
      'Description': 'Requested full product demo'
    },
    {
      'Entity Name': 'Apex Logistics',
      'Name': 'Michael Johnson',
      'Mobile number': '+1 555-0173',
      'Email ID': 'm.johnson@apexlogistics.com',
      'Company domain': 'apexlogistics.com',
      'Service': 'Crypto Compliance & AMI',
      'Job Title': 'Operations Lead',
      'Status': 'Qualified',
      'Region': 'Asia Pacific',
      'Description': 'Follow-up regarding Q3 compliance audit'
    }
  ]

  const ws = XLSX.utils.json_to_sheet(template)
  ws['!cols'] = getColumnWidths(template)

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Lead_Upload_Template')
  XLSX.writeFile(wb, 'Lead_Upload_Template.xlsx')
}

/**
 * Parses an Excel (.xlsx, .xls, .csv, .ods) file and returns structured lead objects,
 * sheet breakdowns, and custom unmapped fields.
 *
 * @param {File} file - The file object from file input
 * @param {boolean} isMarketingLead - Whether these leads belong to marketing filter
 * @returns {Promise<{ leadsToCreate: Array, totalRowsParsed: number, sheetNames: Array, sheetBreakdown: Object }>}
 */
export function parseLeadExcelSheet(file, isMarketingLead = false) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, {
          type: 'array',
          cellDates: true,
          cellComments: true,
          cellFormulas: true,
          cellStyles: true,
          sheetStubs: true,
          raw: false,
          dateNF: 'yyyy-mm-dd'
        })

        if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('Excel file is empty or contains no valid worksheets.')
        }

        const leadsToCreate = []
        let totalRowsParsed = 0
        const sheetBreakdown = {}

        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName]
          if (!worksheet) return

          // Expand merged cell regions so lower/right merged cells retain parent values
          if (worksheet['!merges']) {
            worksheet['!merges'].forEach((range) => {
              const startCellRef = XLSX.utils.encode_cell(range.s)
              const startCell = worksheet[startCellRef]
              if (startCell) {
                for (let R = range.s.r; R <= range.e.r; ++R) {
                  for (let C = range.s.c; C <= range.e.c; ++C) {
                    const cellRef = XLSX.utils.encode_cell({ r: R, c: C })
                    if (!worksheet[cellRef] || worksheet[cellRef].v === undefined) {
                      worksheet[cellRef] = { ...startCell }
                    }
                  }
                }
              }
            })
          }

          const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
          if (!rows || rows.length === 0) return

          let sheetLeadCount = 0

          rows.forEach((row, idx) => {
            totalRowsParsed++
            const usedKeys = new Set()

            const getRowVal = (keys, isEmailField = false) => {
              const rowKeys = Object.keys(row)
              for (const key of keys) {
                const match = rowKeys.find(k => k.trim().toLowerCase() === key.trim().toLowerCase())
                if (match && row[match] !== undefined && row[match] !== null && String(row[match]).trim() !== '') {
                  usedKeys.add(match)
                  let val = row[match]
                  if (val instanceof Date) {
                    return val.toISOString().split('T')[0]
                  }
                  const strVal = String(val).trim()
                  return isEmailField ? cleanEmail(strVal) : strVal
                }
              }
              return ''
            }

            const company = getRowVal(STANDARD_LEAD_KEYS_MAP.company)
            const rawEmail = getRowVal(STANDARD_LEAD_KEYS_MAP.email, true)
            const email = cleanEmail(rawEmail)
            const phone = getRowVal(STANDARD_LEAD_KEYS_MAP.phone)
            const name = getRowVal(STANDARD_LEAD_KEYS_MAP.name) || company || (email ? email.split('@')[0] : '') || phone || `${sheetName} Row #${idx + 1}`
            const rawDomain = getRowVal(STANDARD_LEAD_KEYS_MAP.accountDomain)
            const accountDomain = cleanDomain(rawDomain, email)
            const description = getRowVal(STANDARD_LEAD_KEYS_MAP.description)
            const status = getRowVal(STANDARD_LEAD_KEYS_MAP.status) || 'New'
            const source = 'Manual'
            const jobTitle = getRowVal(STANDARD_LEAD_KEYS_MAP.jobTitle)
            const industry = getRowVal(STANDARD_LEAD_KEYS_MAP.industry)
            const region = getRowVal(STANDARD_LEAD_KEYS_MAP.region)

            // Collect ALL unmapped column keys into customFields object
            const customFields = {}
            Object.keys(row).forEach(k => {
              if (!usedKeys.has(k) && row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
                let val = row[k]
                if (val instanceof Date) {
                  val = val.toISOString().split('T')[0]
                } else {
                  val = String(val).trim()
                }
                const cleanedKey = k.startsWith('__EMPTY')
                  ? `Extra Column ${k.replace('__EMPTY', '') || '1'}`
                  : k.trim()
                customFields[cleanedKey] = val
              }
            })

            leadsToCreate.push({
              name,
              company,
              accountDomain,
              phone,
              email: email || null,
              description,
              status,
              source,
              jobTitle,
              industry,
              region,
              isMarketingLead: Boolean(isMarketingLead),
              customFields: Object.keys(customFields).length > 0 ? customFields : null,
              sheetSource: sheetName
            })
            sheetLeadCount++
          })

          sheetBreakdown[sheetName] = sheetLeadCount
        })

        resolve({
          leadsToCreate,
          totalRowsParsed,
          sheetNames: workbook.SheetNames,
          sheetBreakdown
        })
      } catch (err) {
        reject(err)
      }
    }

    reader.onerror = () => reject(new Error('Failed to read file from disk.'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Generates and downloads an Excel spreadsheet report of skipped duplicate leads.
 *
 * @param {Array} duplicateList - List of duplicate items returned from backend import API
 * @param {string} filename - Optional filename for download
 */
export function exportDuplicateLeadsReport(duplicateList, filename = 'Skipped_Duplicate_Leads.xlsx') {
  if (!duplicateList || duplicateList.length === 0) return

  const formattedRows = duplicateList.map((item, index) => ({
    '#': index + 1,
    'Lead Name': item.name || 'N/A',
    'Email Address': item.email || 'N/A',
    'Phone Number': item.phone || 'N/A',
    'Worksheet Source': item.sheetSource || 'Sheet1',
    'Skip Reason': 'Duplicate Email or Phone already exists in CRM'
  }))

  const ws = XLSX.utils.json_to_sheet(formattedRows)
  ws['!cols'] = getColumnWidths(formattedRows)

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Skipped_Duplicates')
  XLSX.writeFile(wb, filename)
}
