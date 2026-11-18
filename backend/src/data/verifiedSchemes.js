// ============================================================
// src/data/verifiedSchemes.js
// Verified Government Schemes Catalogue for Uttar Pradesh Farmers
// ============================================================
// Official reference dataset for Central and Uttar Pradesh State
// agricultural welfare and credit schemes.
//
// ⚠️  INTEGRITY RULES:
// 1. All details verified against official government gazettes,
//    operational guidelines, and primary portals.
// 2. Contains NO invented eligibility conditions or fake benefits.
// 3. Official government source URLs are preserved for every scheme.
// 4. Conforms strictly to the actual `schemes` database columns:
//    - name (text, required)
//    - description (text)
//    - department (text)
//    - benefits (text)
//    - state (text)
//    - official_source_url (text)
//    - is_active (boolean)
// ============================================================

export const VERIFIED_SCHEMES = [
  {
    name: 'Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)',
    description:
      'Central Sector scheme with 100% funding from the Government of India providing income support to all landholding farmer families across the country to supplement their financial needs for procuring agricultural inputs and supporting domestic requirements.',
    department:
      'Department of Agriculture & Farmers Welfare, Ministry of Agriculture & Farmers Welfare, Government of India',
    benefits:
      'Direct income support of ₹6,000 per year per eligible landholding farmer family, disbursed in three equal four-monthly installments of ₹2,000 each via Direct Benefit Transfer (DBT) directly into Aadhaar-seeded bank accounts.',
    state: 'Central / All India',
    official_source_url: 'https://pmkisan.gov.in/',
    is_active: true,
  },
  {
    name: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
    description:
      'Comprehensive national crop insurance scheme providing financial support and risk mitigation to farmers against crop loss or damage arising out of non-preventable natural perils from pre-sowing to post-harvest.',
    department:
      'Department of Agriculture & Farmers Welfare, Ministry of Agriculture & Farmers Welfare, Government of India',
    benefits:
      'Subsidized comprehensive crop insurance coverage with uniform farmer share: 2.0% of sum insured for Kharif food and oilseed crops, 1.5% for Rabi crops, and 5.0% for commercial/horticultural crops; balance actuarial premium subsidized equally by Central and State Governments.',
    state: 'Central / All India',
    official_source_url: 'https://pmfby.gov.in/',
    is_active: true,
  },
  {
    name: 'Kisan Credit Card (KCC) Scheme',
    description:
      'Institutional credit mechanism designed to provide adequate and timely credit support from the banking system under a single window to farmers for their agricultural cultivation expenses, post-harvest expenses, and maintenance of farm assets.',
    department:
      'Department of Agriculture & Farmers Welfare & Reserve Bank of India / NABARD',
    benefits:
      'Short-term agricultural production credit up to ₹3,00,000 at a concessional interest rate of 7% per annum, with an additional 3% Interest Subvention Incentive for prompt repayment, resulting in an effective net interest rate of 4% per annum. Collateral-free loan limit up to ₹1,60,000.',
    state: 'Central / All India',
    official_source_url: 'https://agricoop.nic.in/',
    is_active: true,
  },
  {
    name: 'UP Kisan Karj Rahat Yojana',
    description:
      'State government debt redemption initiative implemented by the Government of Uttar Pradesh to alleviate financial distress among small and marginal farmers who availed crop loans from commercial and cooperative banks.',
    department: 'Department of Agriculture, Government of Uttar Pradesh',
    benefits:
      'Waiver and redemption of outstanding agricultural crop loans up to ₹1,00,000 for verified small and marginal farmers owning cultivable agricultural land in Uttar Pradesh.',
    state: 'Uttar Pradesh',
    official_source_url: 'https://upkisankarjrahat.upsdc.gov.in/',
    is_active: true,
  },
  {
    name: 'UP Solar Pump Yojana (PM-KUSUM Component-B)',
    description:
      'Collaborative scheme by the Government of Uttar Pradesh and the Ministry of New and Renewable Energy (MNRE) providing capital subsidies to farmers for installing standalone solar agricultural irrigation pumps (2 HP to 10 HP) to ensure reliable irrigation and reduce diesel dependence.',
    department: 'Department of Agriculture, Government of Uttar Pradesh',
    benefits:
      'Capital subsidy up to 60% of the total benchmark cost of the solar pump (30% Central Financial Assistance under PM-KUSUM Component-B plus 30% State Government subsidy), with the beneficiary farmer contributing the remaining 40% (or availing bank financing).',
    state: 'Uttar Pradesh',
    official_source_url: 'http://upagriculture.com/',
    is_active: true,
  },
]

