// ============================================================
// src/data/verifiedRules.js
// Verified Statutory Eligibility Rules for Government Schemes
// ============================================================
// Contains official, authoritative eligibility rule definitions
// based on published operational guidelines and circulars.
//
// INTEGRITY CONSTRAINTS:
//   - Conforms strictly to existing `eligibility_rules` schema:
//     - scheme_id (uuid, FK -> schemes.id)
//     - rule_name (text)
//     - conditions (jsonb)
//     - required_documents (jsonb)
//     - source_url (text)
//     - last_verified_at (timestamptz)
//   - PM-KISAN is verified against Revised PM-KISAN Operational Guidelines
//     (English, updated March 2020) and official FAQ guidance.
//   - Conditions that cannot be reliably automated are represented as
//     statutory verification checkpoints to trigger `needs_verification`.
// ============================================================

export const VERIFIED_RULES = [
  {
    scheme_id: '9b46b004-8c63-4d94-9bc7-4e5f8e0c02e6', // PM-KISAN
    rule_name: 'PM-KISAN Statutory Eligibility Criteria (Operational Guidelines 2020)',
    source_url:
      'https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines(English).pdf',
    last_verified_at: '2026-11-13T00:00:00.000Z',
    conditions: {
      version: 1,
      scheme_slug: 'pm-kisan',
      scheme_name: 'Pradhan Mantri Kisan Samman Nidhi',
      guidelines_reference: 'Revised PM-KISAN Operational Guidelines Sec 1, 2, 3, 4',
      criteria: {
        location: {
          jurisdiction: 'All India',
          allowed_states: ['Central / All India', 'Uttar Pradesh', 'all'],
        },
        land: {
          requires_land_ownership: true,
          allowed_ownership_types: ['individual', 'joint', 'owner'],
          disallowed_ownership_types: ['tenant', 'sharecropper', 'encroached', 'leased'],
          allowed_land_types: [
            'agricultural_cultivable',
            'agricultural_irrigated',
            'agricultural_unirrigated',
            'agricultural',
            'cultivable',
          ],
          disallowed_land_types: ['commercial', 'residential', 'industrial', 'institutional'],
          min_land_area_acres: 0.01,
          max_land_area_acres: null, // Abolition of 2-ha ceiling effective 01.04.2019
        },
        farmer: {
          min_age: 18,
          max_age: null,
          allowed_categories: ['marginal', 'small', 'medium', 'large', 'all'],
          institutional_landholder_disqualified: true,
        },
        statutory_verification_checkpoints: {
          land_ownership_cutoff_date: '2019-02-01',
          cutoff_exception: 'succession_due_to_death_of_landowner',
          household_single_benefit: true,
          income_tax_exclusion: true,
          constitutional_post_exclusion: true,
          govt_employee_pensioner_exclusion: true,
          professional_exclusion: true,
          dbt_bank_aadhaar_seeding: true,
        },
      },
    },
    required_documents: [
      {
        doc_type: 'aadhaar',
        name: 'Aadhaar Card',
        mandatory: true,
        purpose: 'Biometric identity verification and NPCI DBT mapper seeding',
      },
      {
        doc_type: 'land_record',
        name: 'Record of Rights (RoR) / Khatiyan / 7/12 Extract / Khatauni',
        mandatory: true,
        purpose: 'Proof of cultivable agricultural land title mutation in state revenue records',
      },
      {
        doc_type: 'bank_passbook',
        name: 'Bank Passbook / Account Particulars',
        mandatory: true,
        purpose: 'Direct Benefit Transfer into Aadhaar-seeded bank account via PFMS',
      },
      {
        doc_type: 'statutory_self_declaration',
        name: 'PM-KISAN Exclusion Self-Declaration',
        mandatory: true,
        purpose:
          'Declaration of non-inclusion in income tax payee, government service, or constitutional post exclusion categories',
      },
    ],
  },
]

