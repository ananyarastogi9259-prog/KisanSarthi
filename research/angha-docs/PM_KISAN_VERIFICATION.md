# PM-KISAN Verification and Audit Document

> **Document Type**: Policy Audit, Verification Matrix, and Regulatory Gap Analysis  
> **Target Document Audited**: [`PM_KISAN_RESEARCH.md`](file:///c:/Users/angha/Projects/KisanSarthi/PM_KISAN_RESEARCH.md)  
> **Date of Audit**: November 3, 2026  
> **Auditing Platform**: KisanSarthi (Government Schemes and Eligibility Module)  
> **Official Primary Sources Examined**:  
> 1. Official PM-KISAN Portal: [https://pmkisan.gov.in/](https://pmkisan.gov.in/)  
> 2. Revised PM-KISAN Operational Guidelines (English, dated 29-03-2020): [https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines%28English%29.pdf](https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines%28English%29.pdf)  
> 3. Official Frequently Asked Questions (FAQ): [https://pmkisan.gov.in/Documents/FAQPMKISAN.PDF](https://pmkisan.gov.in/Documents/FAQPMKISAN.PDF)  

---

## 1. Verification of 21 Core PM-KISAN Topics

### 1. Scheme Overview and Objectives
* **Rule / Factual Statement**: PM-KISAN is a Central Sector Scheme with 100% funding from the Government of India, administered by the Ministry of Agriculture & Farmers Welfare (DA&FW), operational since 01.12.2018. Its objectives are to supplement the financial needs of landholding farmer families in procuring agricultural inputs and meeting domestic requirements, preventing distress indebtedness.
* **Verification Status**: **Verified**
* **Official Source URL**: [https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines%28English%29.pdf](https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines%28English%29.pdf)
* **Exact Citation**: Section 1.1 (Introduction & Scope), Section 2.1 (Objectives); [FAQPMKISAN.PDF](https://pmkisan.gov.in/Documents/FAQPMKISAN.PDF) Question 1 & 2.
* **Classification**: Scheme Overview / Statutory Objective
* **Important Limitations**: It is not a broad rural poverty alleviation scheme; financial assistance is conditioned strictly on lawful ownership of cultivable agricultural land.

---

### 2. Annual Benefit and Instalment Structure
* **Rule / Factual Statement**: The financial benefit is ₹6,000/- per annum per eligible farmer family, disbursed in three equal installments of ₹2,000/- every four months (April–July, August–November, December–March) via Direct Benefit Transfer (DBT).
* **Verification Status**: **Verified**
* **Official Source URL**: [https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines%28English%29.pdf](https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines%28English%29.pdf)
* **Exact Citation**: Section 3.1 & 3.2; [FAQPMKISAN.PDF](https://pmkisan.gov.in/Documents/FAQPMKISAN.PDF) Question 2 & 3.
* **Classification**: Payment Requirement / Benefit Structure
* **Important Limitations**: Benefit quantum does not vary by acreage. There is no pro-rata monthly payout. Historical proportionate installment provisions were restricted to the launch period (December 2018–March 2019).

---

### 3. Official Farmer-Family Definition
* **Rule / Factual Statement**: A landholder farmer family is formally defined as *"a family comprising of husband, wife and minor children who own cultivable land as per the land records of the concerned State/UT."*
* **Verification Status**: **Verified**
* **Official Source URL**: [https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines%28English%29.pdf](https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines%28English%29.pdf)
* **Exact Citation**: Section 1.2; [FAQPMKISAN.PDF](https://pmkisan.gov.in/Documents/FAQPMKISAN.PDF) Question 4.
* **Classification**: Scheme Eligibility Rule
* **Important Limitations**: 
  - Only one benefit (₹6,000/year) is admissible per family unit.
  - Minor children cannot establish separate eligibility.
  - **Adult Children Clarification**: Under scheme rules and FAQ guidance, the cut-off date for a minor to become a major for scheme entitlement is **01.02.2019**. An adult child turning 18 after 01.02.2019 does *not* automatically become an independent eligible family during the scheme's 5-year block unless they acquired distinct cultivable land title on or before 01.02.2019 or via post-cut-off death succession.

---

### 4. Landholding Size and the Historical Two-Hectare Restriction
* **Rule / Factual Statement**: While the scheme originally restricted benefits to Small and Marginal Farmers (cultivable landholding up to 2 hectares) between 01.12.2018 and 31.03.2019, the Union Cabinet abolished the 2-hectare ceiling effective **01.04.2019**. Under current rules, all landholding farmer families are eligible regardless of landholding size, subject to exclusions.
* **Verification Status**: **Verified**
* **Official Source URL**: [https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines%28English%29.pdf](https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines%28English%29.pdf)
* **Exact Citation**: Section 1.1; [FAQPMKISAN.PDF](https://pmkisan.gov.in/Documents/FAQPMKISAN.PDF) Question 1.
* **Classification**: Scheme Eligibility Rule (Historical Scope Evolution)
* **Important Limitations**: The 2-hectare restriction is completely obsolete and must not be used as an eligibility filter in software engines.

---

### 5. Land Ownership Cut-off Date of 01-02-2019
* **Rule / Factual Statement**: The statutory cut-off date for land ownership is **01 February 2019**. Only farmer families who were registered owners of cultivable land on or before 01.02.2019 are eligible. No changes in land records after this date are considered for eligibility for the 5-year block (and continued in current practice).
* **Verification Status**: **Verified**
* **Official Source URL**: [https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines%28English%29.pdf](https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines%28English%29.pdf)
* **Exact Citation**: Section 4.1 & Section 5.3; [FAQPMKISAN.PDF](https://pmkisan.gov.in/Documents/FAQPMKISAN.PDF) Question 6.
* **Classification**: Scheme Eligibility Rule
* **Important Limitations**: Enforced on the active portal via mandatory radio fields (`Before 01-02-2019` vs `After 01-02-2019`). No official amendment has advanced this date for general land acquisitions.

---

### 6. Succession and Inheritance Exceptions
* **Rule / Factual Statement**: Changes in land ownership occurring after 01.02.2019 are recognized **exclusively** when the transfer of ownership of cultivable land takes place on account of succession due to the death of the registered landowner. Heirs become eligible from the date of formal revenue mutation.
* **Verification Status**: **Verified**
* **Official Source URL**: [https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines%28English%29.pdf](https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines%28English%29.pdf)
* **Exact Citation**: Section 4.1 & 4.2; [FAQPMKISAN.PDF](https://pmkisan.gov.in/Documents/FAQPMKISAN.PDF) Question 6.
* **Classification**: Scheme Eligibility Rule (Exception to Statutory Cut-off)
* **Important Limitations**: Legal heirship must be verified through official state succession/mutation records. If the deceased landowner was subject to exclusion criteria during their lifetime, eligibility of the successor is evaluated based on the successor's own exclusion status.

---

### 7. Transfers Through Sale, Partition, and Gift
* **Rule / Factual Statement**: Land acquired or transferred after 01.02.2019 via sale deed, purchase, gift deed, or voluntary partition (other than succession upon death) does not confer scheme eligibility. Transferees in such transactions cannot enroll as fresh beneficiaries.
* **Verification Status**: **Verified**
* **Official Source URL**: [https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines%28English%29.pdf](https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines%28English%29.pdf)
* **Exact Citation**: Section 4.1 & Section 5.3; [FAQPMKISAN.PDF](https://pmkisan.gov.in/Documents/FAQPMKISAN.PDF) Question 6.
* **Classification**: Scheme Eligibility Rule / Mandatory Disqualification
* **Important Limitations**: Partition mutations executed after 01.02.2019 without death succession do not create new beneficiary entitlements.

---

### 8. Institutional Landholders
* **Rule / Factual Statement**: All institutional landholders (e.g., trusts, religious institutions, government departments, corporate bodies, societies) are strictly excluded from receiving scheme benefits.
* **Verification Status**: **Verified**
* **Official Source URL**: [https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines%28English%29.pdf](https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines%28English%29.pdf)
* **Exact Citation**: Section 2.2(a); [FAQPMKISAN.PDF](https://pmkisan.gov.in/Documents/FAQPMKISAN.PDF) Question 5.
* **Classification**: Confirmed Exclusion
* **Important Limitations**: Land must be owned by natural persons forming a family unit.

---

### 9. Constitutional Postholders and Elected Representatives
* **Rule / Factual Statement**: The following individuals (and their farmer families) are excluded:
  1. Former and present holders of constitutional posts.
  2. Former and present Ministers / Ministers of State.
  3. Former and present Members of Lok Sabha / Rajya Sabha / State Legislative Assemblies / State Legislative Councils.
  4. Former and present Mayors of Municipal Corporations.
  5. Former and present Chairpersons of District Panchayats (Zilla Panchayats).
* **Verification Status**: **Verified**
* **Official Source URL**: [https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines%28English%29.pdf](https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines%28English%29.pdf)
* **Exact Citation**: Section 2.2(b)(i) & 2.2(b)(ii); [FAQPMKISAN.PDF](https://pmkisan.gov.in/Documents/FAQPMKISAN.PDF) Question 5.
* **Classification**: Confirmed Exclusion
* **Important Limitations**: Gram Panchayat Sarpanches / Pradhans and Intermediate (Block) Panchayat members are **not** excluded under this clause unless disqualified by other provisions (e.g., income tax, government employment).

---

### 10. Government Employees and Stated Exceptions
* **Rule / Factual Statement**: All serving or retired officers and employees of Central/State Government Ministries, Offices, Departments and field units; Central or State PSEs; attached offices/autonomous institutions; and regular employees of Local Bodies are excluded.
  - **Explicit Statutory Exception**: Multi-Tasking Staff (MTS) / Class IV / Group D employees are **not excluded** and remain eligible if landholding criteria are satisfied.
* **Verification Status**: **Verified**
* **Official Source URL**: [https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines%28English%29.pdf](https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines%28English%29.pdf)
* **Exact Citation**: Section 2.2(b)(iii); [FAQPMKISAN.PDF](https://pmkisan.gov.in/Documents/FAQPMKISAN.PDF) Question 5.
* **Classification**: Confirmed Exclusion (with explicit statutory exception)
* **Important Limitations**: Honorarium-based or non-regular contractual workers (e.g., ASHA/Anganwadi workers) are not categorized as regular government servants, but require verification against state-specific administrative instructions.

---

### 11. Pension Exclusion and Threshold
* **Rule / Factual Statement**: All superannuated/retired pensioners whose monthly pension is **₹10,000/- or more** are excluded.
  - **Explicit Statutory Exception**: Multi-Tasking Staff / Class IV / Group D retired employees are **exempt** from this pension ceiling exclusion.
* **Verification Status**: **Verified**
* **Official Source URL**: [https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines%28English%29.pdf](https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines%28English%29.pdf)
* **Exact Citation**: Section 2.2(b)(iv); [FAQPMKISAN.PDF](https://pmkisan.gov.in/Documents/FAQPMKISAN.PDF) Question 5.
* **Classification**: Confirmed Exclusion (with explicit statutory exception)
* **Important Limitations**: Pensioners receiving less than ₹10,000/month are eligible provided they are not disqualified under other exclusion categories.

---

### 12. Income-Tax Exclusion
* **Rule / Factual Statement**: All persons who paid Income Tax in the last assessment year are excluded from the scheme.
* **Verification Status**: **Verified**
* **Official Source URL**: [https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines%28English%29.pdf](https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines%28English%29.pdf)
* **Exact Citation**: Section 2.2(b)(v); [FAQPMKISAN.PDF](https://pmkisan.gov.in/Documents/FAQPMKISAN.PDF) Question 5.
* **Classification**: Confirmed Exclusion
* **Important Limitations**: Under Section 2.2(b), if **one or more members** of the farmer family unit (husband, wife, minor child) paid income tax in the last assessment year, the **entire family unit** is disqualified. Verified automatically through CBDT PAN-Aadhaar data linkage.

---

### 13. Specified Practising Professionals
* **Rule / Factual Statement**: Professionals such as Doctors, Engineers, Lawyers, Chartered Accountants, and Architects who are registered with professional bodies and carry out active profession through practice are excluded.
* **Verification Status**: **Verified**
* **Official Source URL**: [https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines%28English%29.pdf](https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines%28English%29.pdf)
* **Exact Citation**: Section 2.2(b)(vi); [FAQPMKISAN.PDF](https://pmkisan.gov.in/Documents/FAQPMKISAN.PDF) Question 5.
* **Classification**: Confirmed Exclusion
* **Important Limitations**: The rule specifies dual criteria: registration with statutory professional bodies **and** actively undertaking professional practice.

---

### 14. NRI Exclusion for New Beneficiaries
* **Rule / Factual Statement**: Non-Resident Indians (NRIs) who own cultivable land in India are excluded from benefits under the scheme in accordance with the provisions of the Income Tax Act, 1961.
* **Verification Status**: **Verified**
* **Official Source URL**: [https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines%28English%29.pdf](https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines%28English%29.pdf)
* **Exact Citation**: Section 2.2 (concluding paragraph); [FAQPMKISAN.PDF](https://pmkisan.gov.in/Documents/FAQPMKISAN.PDF) Question 5.
* **Classification**: Confirmed Exclusion
* **Important Limitations**: Governed by the residential status definition under Section 6 of the Income Tax Act, 1961.

---

### 15. State/UT Land-Record Verification Responsibilities
* **Rule / Factual Statement**: The entire responsibility for identifying, verifying, and certifying eligible beneficiary farmer families and their land titles rests **exclusively with the respective State/UT Governments**. The Central Government disburses funds based on beneficiary lists authenticated and submitted by States/UTs.
* **Verification Status**: **Verified**
* **Official Source URL**: [https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines%28English%29.pdf](https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines%28English%29.pdf)
* **Exact Citation**: Section 4.1; [FAQPMKISAN.PDF](https://pmkisan.gov.in/Documents/FAQPMKISAN.PDF) Question 10.
* **Classification**: Administrative Verification Procedure
* **Important Limitations**: No self-declared land upload or third-party check can substitute for State revenue certification (Record of Rights / 7/12 / Bhulekh match by Patwari/Tehsildar).

---

### 16. Registration Attributes and Identity Requirements
* **Rule / Factual Statement**: Required registration fields include: Farmer Name, Gender, Social Category, Aadhaar Number, Bank Account Number & IFSC, Mobile Number, Father/Husband Name, Land Parcel details (Khata No., Khasra No., Area in Hectares, Land Transfer Date), and Ration Card Number.
* **Verification Status**: **Verified**
* **Official Source URL**: [https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines%28English%29.pdf](https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines%28English%29.pdf), [https://pmkisan.gov.in/](https://pmkisan.gov.in/)
* **Exact Citation**: Guidelines Annexure-I; Live Portal Self-Registration Screen.
* **Classification**: Registration Requirement (Data Processing Input)
* **Important Limitations**: 
  - These fields are **administrative and identification inputs**, NOT independent statutory eligibility criteria.
  - Uploading a land document PDF ($\le 200\text{ KB}$) during registration **does not prove legal ownership**; it serves solely as an attachment for State revenue officials to inspect.

---

### 17. eKYC Requirements and Currently Available Methods
* **Rule / Factual Statement**: eKYC is mandatory for all registered PM-KISAN beneficiaries to receive ongoing installments. Three official operational modes exist:
  1. **OTP-based eKYC**: Direct on PM-KISAN portal/app via Aadhaar-linked mobile.
  2. **Biometric-based eKYC**: At Common Service Centres (CSCs) and State Seva Kendras.
  3. **Face Authentication-based eKYC**: On PM-KISAN Mobile App using UIDAI Aadhaar FaceRD.
* **Verification Status**: **Verified**
* **Official Source URL**: [https://pmkisan.gov.in/](https://pmkisan.gov.in/)
* **Exact Citation**: PM-KISAN Portal Homepage ("Farmers Corner" -> eKYC); Official Ministry Circulars on Face Authentication App.
* **Classification**: Payment Requirement / Beneficiary Authentication Procedure
* **Important Limitations**: eKYC verifies identity and confirms that the beneficiary is alive; it **does not** verify land title or exclusion criteria.

---

### 18. DBT and Payment-Related Requirements
* **Rule / Factual Statement**: Benefits are disbursed exclusively via Direct Benefit Transfer (DBT) into bank accounts that are actively seeded with Aadhaar and mapped in the National Payments Corporation of India (NPCI) mapper via the Public Financial Management System (PFMS).
* **Verification Status**: **Verified**
* **Official Source URL**: [https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines%28English%29.pdf](https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines%28English%29.pdf), [https://pmkisan.gov.in/](https://pmkisan.gov.in/)
* **Exact Citation**: Section 3.2; [FAQPMKISAN.PDF](https://pmkisan.gov.in/Documents/FAQPMKISAN.PDF) Question 3 & 14; Portal KYS.
* **Classification**: Payment Requirement
* **Important Limitations**: Mere bank account submission without NPCI Aadhaar-bridge mapping results in DBT transfer failure, regardless of eligibility.

---

### 19. Annual Physical Verification
* **Rule / Factual Statement**: State/UT Governments must carry out physical verification of at least **5% of beneficiary farmer families every year**.
* **Verification Status**: **Verified**
* **Official Source URL**: [https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines%28English%29.pdf](https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines%28English%29.pdf)
* **Exact Citation**: Section 5.1 & 5.2.
* **Classification**: Administrative Verification Procedure
* **Important Limitations**: 
  - The central PM-KISAN portal **randomly draws** the 5% sample.
  - The portal **does not** physically conduct the audit; on-ground physical inspection is executed by District Collectors, District Level Grievance Committees, and revenue field staff.

---

### 20. Application and Registration Process
* **Rule / Factual Statement**: Farmers can apply through:
  1. Self-registration on `https://pmkisan.gov.in/` or mobile app.
  2. Assisted registration via Common Service Centres (CSCs).
  3. Offline/assisted submission through State Nodal Officers / Village Patwari / Agriculture Department.
* **Verification Status**: **Verified**
* **Official Source URL**: [https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines%28English%29.pdf](https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines%28English%29.pdf), [https://pmkisan.gov.in/](https://pmkisan.gov.in/)
* **Exact Citation**: Section 4.1 & 4.3; Portal "New Farmer Registration".
* **Classification**: Administrative Registration Process
* **Important Limitations**: Submitting an application does not confer provisional beneficiary status; all self-registered applications remain pending until approved by the State Nodal Officer / District Revenue Authority.

---

### 21. Official Portal and Status-Check Facility
* **Rule / Factual Statement**: The official web portal is `https://pmkisan.gov.in/`. Farmers can check their processing status through "Know Your Status (KYS)" and "Status of Self Registered Farmer/CSC Farmers" using their Registration Number or Aadhaar number and OTP.
* **Verification Status**: **Verified**
* **Official Source URL**: [https://pmkisan.gov.in/](https://pmkisan.gov.in/)
* **Exact Citation**: Portal Navigation ("Farmers Corner" -> KYS).
* **Classification**: Administrative System / Portal Feature
* **Important Limitations**: 
  - **No Public API**: There is **no publicly accessible REST API** provided by the Government of India for third-party platforms to programmatically pull beneficiary status or push registrations. Any integration must be structured around farmer-guided portal flows.

---

## 2. Topic Verification Summary Matrix

| # | Topic | Verification Status | Source Document & Section | Rule Classification |
|---|---|---|---|---|
| 1 | Scheme Overview & Objectives | **Verified** | Guidelines Sec 1.1, 2.1; FAQ Q1, Q2 | Overview / Objectives |
| 2 | Annual Benefit & Installments | **Verified** | Guidelines Sec 3.1, 3.2; FAQ Q2, Q3 | Payment Requirement |
| 3 | Farmer-Family Definition | **Verified** | Guidelines Sec 1.2; FAQ Q4 | Scheme Eligibility Rule |
| 4 | Landholding Size (Abolition of 2 ha) | **Verified** | Guidelines Sec 1.1; FAQ Q1 | Scheme Eligibility Rule |
| 5 | Land Cut-off Date (01-02-2019) | **Verified** | Guidelines Sec 4.1, 5.3; FAQ Q6 | Scheme Eligibility Rule |
| 6 | Succession / Inheritance Exception | **Verified** | Guidelines Sec 4.1, 4.2; FAQ Q6 | Scheme Eligibility Rule |
| 7 | Post-Cut-off Sale / Gift / Partition | **Verified** | Guidelines Sec 4.1, 5.3; FAQ Q6 | Disqualification Rule |
| 8 | Institutional Landholders | **Verified** | Guidelines Sec 2.2(a); FAQ Q5 | Confirmed Exclusion |
| 9 | Constitutional & Public Representatives | **Verified** | Guidelines Sec 2.2(b)(i-ii); FAQ Q5 | Confirmed Exclusion |
| 10 | Government Employees & MTS Exception | **Verified** | Guidelines Sec 2.2(b)(iii); FAQ Q5 | Confirmed Exclusion |
| 11 | Pensioners ($\ge ₹10,000$) & Exception | **Verified** | Guidelines Sec 2.2(b)(iv); FAQ Q5 | Confirmed Exclusion |
| 12 | Income-Tax Exclusion | **Verified** | Guidelines Sec 2.2(b)(v); FAQ Q5 | Confirmed Exclusion |
| 13 | Specified Practising Professionals | **Verified** | Guidelines Sec 2.2(b)(vi); FAQ Q5 | Confirmed Exclusion |
| 14 | NRI Exclusion | **Verified** | Guidelines Sec 2.2; FAQ Q5 | Confirmed Exclusion |
| 15 | State Land Verification Responsibility | **Verified** | Guidelines Sec 4.1; FAQ Q10 | Administrative Procedure |
| 16 | Registration Data Attributes | **Verified** | Guidelines Annexure-I; Live Portal | Registration Requirement |
| 17 | Mandatory eKYC & 3 Modes | **Verified** | Live Portal; Official Circulars | Payment / Authentication |
| 18 | DBT & NPCI Bank Seeding | **Verified** | Guidelines Sec 3.2; Portal KYS | Payment Requirement |
| 19 | Annual 5% Physical Verification | **Verified** | Guidelines Sec 5.1, 5.2 | Administrative Procedure |
| 20 | Registration Channels | **Verified** | Guidelines Sec 4.1, 4.3; Live Portal | Administrative Process |
| 21 | Official Portal & KYS (No Public API) | **Verified** | Live Portal ("Farmers Corner") | Administrative System |

---

## Section A: Consolidated Verified Eligibility-Rule List

To be classified as **`eligible`**, the farmer family must satisfy **all** of the following statutory conditions:

1. **Family Legal Entity**: Must constitute a "farmer family" (husband, wife, and minor children). Only one member of the family unit can claim or receive benefits.
2. **Cultivable Land Ownership**: Must own cultivable agricultural land as certified in the official land revenue records of the concerned State/UT.
3. **No Acreage Restriction**: The family may own any quantum of cultivable land (the previous 2-hectare ceiling is obsolete).
4. **Cut-off Date Compliance**:
   - Cultivable land ownership must have been recorded in the state land records on or before **01 February 2019**; OR
   - If land title was mutated after 01 February 2019, the acquisition must have occurred strictly via **succession/inheritance due to the death of the registered landowner**.
5. **Non-Inclusion in Exclusion Categories**: No member of the farmer family may fall into any statutory exclusion category.

---

## Section B: Consolidated Exclusion List

A farmer family is **`not_eligible`** if the applicant or any member of their family unit meets any of the following confirmed criteria:

1. **Institutional Landowner**: The land parcel is held by an institution, trust, society, or corporate entity.
2. **Constitutional Post Holder**: Any former or present holder of a constitutional post.
3. **Elected Public Representative**:
   - Former and present Ministers or Ministers of State (Central or State).
   - Former and present Members of Lok Sabha, Rajya Sabha, State Legislative Assemblies, or State Legislative Councils.
   - Former and present Mayors of Municipal Corporations.
   - Former and present Chairpersons of District Panchayats (Zilla Parishads).
4. **Government / Public Sector Employee**:
   - Serving or retired officers and employees of Central/State Government Ministries, Departments, and field units.
   - Serving or retired employees of Central or State PSEs and attached/autonomous institutions.
   - Regular employees of Local Bodies.
   - *(Exemption: Multi-Tasking Staff / Class IV / Group D employees are NOT excluded).*
5. **Pensioner Ceiling**: Superannuated or retired pensioners receiving a monthly pension of **₹10,000/- or more** *(Exemption: Multi-Tasking Staff / Class IV / Group D retirees are NOT excluded)*.
6. **Income Tax Payee**: Any family member who paid Income Tax in the last assessment year.
7. **Active Practicing Professional**: Doctors, Engineers, Lawyers, Chartered Accountants, or Architects registered with professional bodies and actively undertaking practice.
8. **Non-Resident Indian (NRI)**: Landholder families classified as NRIs under Section 6 of the Income Tax Act, 1961.
9. **Ineligible Land Transfers**: Land acquired after 01.02.2019 through purchase deed, sale, gift, or non-death partition.
10. **Non-Cultivable / Non-Landholding Agrarian Roles**:
    - Agricultural laborers without land ownership.
    - Pure tenant farmers / sharecroppers without ownership titles in revenue records.
    - Land converted to commercial, industrial, or residential usage.

---

## Section C: Registration and Document Information

### 1. Registration Data Points (Administrative Inputs)
* Full Name (must match Aadhaar verbatim).
* Gender and Social Category (General / OBC / SC / ST).
* 12-digit Aadhaar Number.
* Active Mobile Number (Aadhaar-linked preferred).
* Ration Card Number (mandatory for household deduplication).
* Land Location Details: State, District, Sub-District (Tehsil), Block, Village.
* Land Parcel Identifiers: Khata / Khatauni Number, Survey / Khasra / Dag Number, Area in Hectares.
* Land Transfer Attributes: Status (`Before 01-02-2019` / `After 01-02-2019`), Transfer Reason (Death of Father/Husband, Succession, Purchase, Gift), and Date of Mutation.
* Bank Particulars: Bank Account Number and IFSC Code (for fallback records).
* Self-Declaration Checkbox confirming non-violation of exclusion criteria.

### 2. Supporting Documents
* **Aadhaar Card**: Primary identity document.
* **Record of Rights (RoR) / 7/12 Extract / Khatauni**: Uploaded as PDF ($\le 200\text{ KB}$) during self-registration.
* **Bank Passbook**: For verification if direct NPCI mapping requires rectification.

> [!WARNING]  
> **Document Upload Status**: Uploading an RoR or 7/12 extract during registration is purely an application submission. It does **not** prove legal ownership until certified against the state's official digitized revenue database.

---

## Section D: Current Verification and eKYC Requirements

```
[Layer 1] UIDAI Demographics Match   --> Confirms Identity & Life Status
[Layer 2] State Land Revenue Match   --> Certifies Cultivable Ownership & Cut-off Date
[Layer 3] CBDT & HRMS Match         --> Verifies Non-Exclusion (Tax & Government Service)
[Layer 4] NPCI / PFMS Bridge Match   --> Validates Aadhaar-Bank Account Seeding for DBT
[Layer 5] District Physical Audit    --> 5% Annual Random Field Verification
```

1. **Mandatory eKYC**:
   - Must be completed via OTP (portal/app), Biometric (CSC), or Face Authentication (PM-KISAN App).
   - Incomplete eKYC pauses installment disbursements under the portal's "Know Your Status (KYS)".
2. **Mandatory NPCI Aadhaar-Seeding**:
   - The beneficiary's bank account must be actively linked to Aadhaar and seeded in the NPCI mapper for Direct Benefit Transfer.
3. **State Revenue Record Verification**:
   - Conducted by State Revenue Officials (Patwari/Tehsildar) against digitized land records (Bhulekh/Mahabhulekh/Dharani, etc.).
4. **Mandatory 5% Annual Physical Verification**:
   - State/District authorities execute physical verification of a randomly drawn 5% beneficiary sample to eliminate duplicate or fraudulent claims.

---

## Section E: List of Corrections Required in `PM_KISAN_RESEARCH.md`

During the policy audit against official sources, the following specific corrections and refinements were identified in `PM_KISAN_RESEARCH.md`:

1. **Section 4 — Adult Children Assumption**:
   - *Issue in Research Doc*: Claimed adult children (18+) with land automatically qualify as separate independent families.
   - *Correction*: Official FAQ and Guidelines specify that the cut-off date for a minor to become a major for scheme determination is **01.02.2019**. Turning 18 *after* 01.02.2019 does not automatically create a separate eligible family during the scheme's 5-year block unless the individual already held separate cultivable land in revenue records on or before 01.02.2019, or acquired it via post-cut-off death succession.
2. **Section 6.1 — Family-Wide Scope of Exclusion**:
   - *Issue in Research Doc*: Listed individual exclusions without explicitly stating family-wide contagion.
   - *Correction*: Under Section 2.2(b) of the Guidelines, if **any single member** of the farmer family (husband, wife, minor child) falls into an exclusion category (e.g., pays income tax or is a regular government employee), the **entire family unit** is disqualified.
3. **Section 6.2 & 11.1 — Physical Verification Agency**:
   - *Issue in Research Doc*: Text could be misinterpreted as the PM-KISAN portal automatically executing the 5% physical verification.
   - *Correction*: Clarify that the portal only executes the **random sampling selection**; the physical verification itself is carried out manually on the ground by District Collectors, Taluka committees, and revenue field staff.
4. **Section 7.2 — Registration Attributes vs. Eligibility Rules**:
   - *Issue in Research Doc*: Blended registration fields (Ration Card number, Mobile number) with eligibility criteria.
   - *Correction*: Explicitly categorize Ration Card number and mobile number as administrative deduplication and communication inputs, not statutory eligibility prerequisites.
5. **Section 10 — Absence of Public REST API**:
   - *Issue in Research Doc*: Did not explicitly clarify the API integration boundary.
   - *Correction*: State clearly that the Government of India provides **no public third-party REST API** for PM-KISAN. External systems cannot directly query beneficiary records or submit applications programmatically.

---

## Section F: Information That Must NOT Yet Be Implemented in the Eligibility Engine

When implementing the KisanSarthi `eligibilityRules` and rule engine for PM-KISAN, the development team **must not** implement the following:

1. **Do NOT implement a 2-hectare land cap**:
   - The engine must not reject farmers with $> 2\text{ hectares}$. All land sizes are eligible.
2. **Do NOT evaluate post-01.02.2019 purchase or gift transfers as eligible**:
   - Any land parcel with mutation date $> 01.02.2019$ without a verified mutation type of `succession` / `inheritance` must evaluate to `not_eligible`.
3. **Do NOT automatically evaluate adult children who turned 18 post-2019 as eligible**:
   - Without verified independent land records mutated on or before 01.02.2019 or succession orders, dependents turning 18 post-2019 must not be granted separate family eligibility.
4. **Do NOT treat unverified land document uploads as confirmed legal ownership**:
   - If land record data is self-reported or document status is `pending_verification`, the engine status must evaluate strictly to **`needs_verification`**, never `eligible`.
5. **Do NOT attempt automated external PM-KISAN portal submission or live API status polling**:
   - Because no official public API exists, the module must not implement fake API wrappers or scraping bots that could breach terms of service or fail unpredictably. Status tracking must rely on farmer-provided reference numbers and guided links to official portal tools.
6. **Do NOT treat Forest Rights Act (FRA) or community land pattas as automatically eligible**:
   - Until specific state-level revenue circulars for the farmer's state are confirmed, FRA claims must evaluate to `needs_verification`.
7. **Do NOT evaluate tenant farmers or landless laborers as eligible**:
   - The engine must immediately evaluate applicants without certified ownership titles as `not_eligible`.
