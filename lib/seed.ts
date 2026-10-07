/**
 * ImpactOS — seed data.
 *
 * This is the demo workspace the product opens on: HopeBridge Foundation,
 * three programmes, 18 documents (5 already analyzed), 127 beneficiaries and
 * four findings.
 *
 * The important one is `finding_beneficiary_mismatch`: a genuine
 * CROSS-DOCUMENT INCONSISTENCY. The Q2 Project Report says 120 beneficiaries
 * were reached; the Beneficiary Register contains 127 enrolled records. The
 * two figures come from two different documents, and the evidence drawer
 * quotes both. Everything else in the seed is arranged so the numbers add up
 * (47 + 52 + 28 = 127, 11 of 14 activities completed, 5 of 18 documents
 * analyzed) — the mismatch is the only thing that does not.
 */

import type {
  Activity,
  Beneficiary,
  DocumentCore,
  EvidenceRecord,
  ExtractedFact,
  FindingRecord,
  Organization,
  ProjectCore,
  Report,
  SeedData,
} from "./types";

/* ------------------------------------------------------------------ */
/* Organization                                                        */
/* ------------------------------------------------------------------ */

const organization: Organization = {
  id: "org_hopebridge",
  name: "HopeBridge Foundation",
  sector: "Community development & youth empowerment",
  country: "Kenya",
  reportingPeriod: "Q2 2026 (April – June)",
  greeting: "Good morning, HopeBridge",
};

/* ------------------------------------------------------------------ */
/* Projects                                                            */
/* ------------------------------------------------------------------ */

const projects: ProjectCore[] = [
  {
    id: "prj_youth",
    code: "YSD",
    name: "Youth Skills Development",
    status: "needs_attention",
    progress: 80,
    description:
      "Vocational training, digital literacy and mentorship for out-of-school youth in Kisumu County.",
    location: "Kisumu County, Kenya",
    startDate: "2026-01-06",
    endDate: "2026-12-18",
    lead: "Achieng Odhiambo",
    budgetKes: 4_200_000,
    spentKes: 3_150_000,
    summary:
      "Reported 80% complete, but two activities were postponed to Q3 and the beneficiary count differs between the project report and the register.",
  },
  {
    id: "prj_wash",
    code: "WASH",
    name: "Water & Sanitation Access",
    status: "on_track",
    progress: 65,
    description:
      "Borehole rehabilitation, latrine construction and hygiene promotion across four villages.",
    location: "Nyando Sub-County, Kenya",
    startDate: "2026-01-20",
    endDate: "2026-11-30",
    lead: "Brian Wekesa",
    budgetKes: 6_800_000,
    spentKes: 4_120_000,
    summary:
      "On track. Four of five activities delivered; the water committee formation is still in progress.",
  },
  {
    id: "prj_health",
    code: "CHW",
    name: "Community Health Outreach",
    status: "completed",
    progress: 100,
    description:
      "Community health worker training, mobile clinic days and maternal health awareness.",
    location: "Seme Sub-County, Kenya",
    startDate: "2026-01-12",
    endDate: "2026-06-30",
    lead: "Dr. Mercy Kilonzo",
    budgetKes: 3_400_000,
    spentKes: 3_365_000,
    summary: "All four activities completed and closed out at the end of Q2.",
  },
];

/* ------------------------------------------------------------------ */
/* Activities — 14 total, 11 completed                                 */
/* ------------------------------------------------------------------ */

const activities: Activity[] = [
  // Youth Skills Development — 3 completed, 2 postponed
  {
    id: "act_y1",
    projectId: "prj_youth",
    name: "Learner enrolment & intake",
    status: "completed",
    plannedDate: "2026-01-20",
    completedDate: "2026-01-24",
    description: "Community mobilisation, screening and enrolment of out-of-school youth.",
    participants: 47,
    outcome: "47 learners enrolled across two cohorts.",
    location: "Ahero Youth Centre",
    note: null,
  },
  {
    id: "act_y2",
    projectId: "prj_youth",
    name: "Tailoring & textile skills module",
    status: "completed",
    plannedDate: "2026-03-16",
    completedDate: "2026-03-20",
    description: "Twelve-week practical tailoring module with a competency assessment.",
    participants: 42,
    outcome: null,
    location: "Ahero Youth Centre",
    note: "Delivered in full; no completion or assessment record was filed.",
  },
  {
    id: "act_y3",
    projectId: "prj_youth",
    name: "Digital literacy module",
    status: "completed",
    plannedDate: "2026-05-08",
    completedDate: "2026-05-11",
    description: "Basic computing, internet safety and online job-search skills.",
    participants: 39,
    outcome: null,
    location: "Maseno ICT Lab",
    note: "Delivered in full; no completion or assessment record was filed.",
  },
  {
    id: "act_y4",
    projectId: "prj_youth",
    name: "Business & financial literacy module",
    status: "postponed",
    plannedDate: "2026-05-12",
    completedDate: null,
    description: "Enterprise skills, bookkeeping and savings-group formation.",
    participants: 0,
    outcome: null,
    location: "Ahero Youth Centre",
    note: "Postponed to Q3 2026 — facilitator unavailable (staff meeting minutes, 6 June 2026).",
  },
  {
    id: "act_y5",
    projectId: "prj_youth",
    name: "Mentorship & job-placement clinic",
    status: "postponed",
    plannedDate: "2026-06-02",
    completedDate: null,
    description: "One-to-one mentorship and employer matching for graduating learners.",
    participants: 0,
    outcome: null,
    location: "Kisumu Town Hall",
    note: "Postponed to Q3 2026 — venue double-booked (staff meeting minutes, 6 June 2026).",
  },

  // Water & Sanitation — 4 completed, 1 in progress
  {
    id: "act_w1",
    projectId: "prj_wash",
    name: "Community needs assessment",
    status: "completed",
    plannedDate: "2026-02-05",
    completedDate: "2026-02-10",
    description: "Household survey and water-point mapping across four villages.",
    participants: 210,
    outcome: "Four villages prioritised; 3 non-functional water points identified.",
    location: "Nyando Sub-County",
    note: null,
  },
  {
    id: "act_w2",
    projectId: "prj_wash",
    name: "Borehole rehabilitation — Site A",
    status: "completed",
    plannedDate: "2026-03-22",
    completedDate: "2026-03-30",
    description: "Replacement of pump, casing and apron at the Kawino borehole.",
    participants: 180,
    outcome: "Borehole restored; 180 people regained access to safe water.",
    location: "Kawino Village",
    note: null,
  },
  {
    id: "act_w3",
    projectId: "prj_wash",
    name: "Handwashing & hygiene training",
    status: "completed",
    plannedDate: "2026-04-18",
    completedDate: "2026-04-20",
    description: "Household hygiene promotion with tippy-tap demonstrations.",
    participants: 240,
    outcome: "240 participants trained; 96 tippy-taps installed.",
    location: "Kawino & Ogenya",
    note: null,
  },
  {
    id: "act_w4",
    projectId: "prj_wash",
    name: "Latrine construction — 12 units",
    status: "completed",
    plannedDate: "2026-05-25",
    completedDate: "2026-05-29",
    description: "Construction of 12 household latrines with local artisans.",
    participants: 96,
    outcome: "12 latrines completed and handed over.",
    location: "Ogenya Village",
    note: null,
  },
  {
    id: "act_w5",
    projectId: "prj_wash",
    name: "Water committee formation",
    status: "in_progress",
    plannedDate: "2026-06-20",
    completedDate: null,
    description: "Establishing a community water committee with a maintenance fund.",
    participants: 24,
    outcome: null,
    location: "Nyando Sub-County",
    note: "Committee elected; constitution and maintenance fund still outstanding.",
  },

  // Community Health Outreach — 4 completed
  {
    id: "act_h1",
    projectId: "prj_health",
    name: "Community health worker training",
    status: "completed",
    plannedDate: "2026-02-14",
    completedDate: "2026-02-18",
    description: "Five-day training for 30 community health promoters.",
    participants: 30,
    outcome: "30 community health promoters certified.",
    location: "Seme Health Centre",
    note: null,
  },
  {
    id: "act_h2",
    projectId: "prj_health",
    name: "Mobile clinic outreach days (6)",
    status: "completed",
    plannedDate: "2026-03-28",
    completedDate: "2026-03-30",
    description: "Six mobile clinic days offering screening and treatment.",
    participants: 640,
    outcome: "640 patient consultations across six outreach days.",
    location: "Seme Sub-County",
    note: null,
  },
  {
    id: "act_h3",
    projectId: "prj_health",
    name: "Maternal health awareness campaign",
    status: "completed",
    plannedDate: "2026-04-30",
    completedDate: "2026-05-04",
    description: "Antenatal care and safe-delivery messaging through community radio and barazas.",
    participants: 320,
    outcome: "320 women reached; antenatal bookings rose 22% in the sub-county.",
    location: "Seme Sub-County",
    note: null,
  },
  {
    id: "act_h4",
    projectId: "prj_health",
    name: "Nutrition screening & referrals",
    status: "completed",
    plannedDate: "2026-06-05",
    completedDate: "2026-06-08",
    description: "MUAC screening for under-fives with referral of acute cases.",
    participants: 415,
    outcome: "415 children screened; 18 acute cases referred.",
    location: "Seme Sub-County",
    note: null,
  },
];

/* ------------------------------------------------------------------ */
/* Documents — 18 total, 5 analyzed                                    */
/* ------------------------------------------------------------------ */

const documents: DocumentCore[] = [
  {
    id: "doc_q2_report",
    fileName: "Q2 Project Report.pdf",
    displayName: "Q2 Project Report",
    type: "pdf",
    status: "analyzed",
    sizeBytes: 842_113,
    uploadedAt: "2026-06-15T09:12:00.000Z",
    analyzedAt: "2026-06-15T09:13:40.000Z",
    pageCount: 14,
    summary:
      "Narrative Q2 report covering all three programmes. States that 120 beneficiaries were reached and reports Youth Skills Development as 80% complete.",
    projectId: "prj_youth",
    error: null,
  },
  {
    id: "doc_beneficiary_register",
    fileName: "Beneficiary Register.xlsx",
    displayName: "Beneficiary Register",
    type: "xlsx",
    status: "analyzed",
    sizeBytes: 118_420,
    uploadedAt: "2026-06-14T16:40:00.000Z",
    analyzedAt: "2026-06-14T16:41:12.000Z",
    pageCount: null,
    summary:
      "Master register of all enrolled beneficiaries across the three projects, last updated 30 June 2026. Contains 127 rows.",
    projectId: null,
    error: null,
  },
  {
    id: "doc_financial_report",
    fileName: "Financial Report.pdf",
    displayName: "Financial Report",
    type: "pdf",
    status: "analyzed",
    sizeBytes: 512_980,
    uploadedAt: "2026-06-13T11:05:00.000Z",
    analyzedAt: "2026-06-13T11:07:02.000Z",
    pageCount: 9,
    summary:
      "Q2 expenditure statement. Flags KES 25,000 of activity spend that is not mapped to an approved activity line.",
    projectId: "prj_youth",
    error: null,
  },
  {
    id: "doc_meeting_minutes",
    fileName: "Staff Meeting Minutes.docx",
    displayName: "Staff Meeting Minutes",
    type: "docx",
    status: "analyzed",
    sizeBytes: 48_220,
    uploadedAt: "2026-06-11T15:20:00.000Z",
    analyzedAt: "2026-06-11T15:21:30.000Z",
    pageCount: 4,
    summary:
      "Minutes of the 6 June programme review. Records that two Youth Skills Development activities were postponed to Q3 2026.",
    projectId: "prj_youth",
    error: null,
  },
  {
    id: "doc_attendance",
    fileName: "Youth Training Attendance.csv",
    displayName: "Youth Training Attendance",
    type: "csv",
    status: "analyzed",
    sizeBytes: 21_960,
    uploadedAt: "2026-06-10T08:30:00.000Z",
    analyzedAt: "2026-06-10T08:31:05.000Z",
    pageCount: null,
    summary:
      "Session-level attendance for the tailoring and digital literacy modules. 47 unique learners attended at least one session.",
    projectId: "prj_youth",
    error: null,
  },

  // Still in the pipeline
  {
    id: "doc_health_register",
    fileName: "Community Health Register.xlsx",
    displayName: "Community Health Register",
    type: "xlsx",
    status: "processing",
    sizeBytes: 96_540,
    uploadedAt: "2026-06-16T07:45:00.000Z",
    analyzedAt: null,
    pageCount: null,
    summary: null,
    projectId: "prj_health",
    error: null,
  },
  {
    id: "doc_procurement",
    fileName: "Procurement Invoices May.pdf",
    displayName: "Procurement Invoices May",
    type: "pdf",
    status: "processing",
    sizeBytes: 1_204_880,
    uploadedAt: "2026-06-16T07:40:00.000Z",
    analyzedAt: null,
    pageCount: 22,
    summary: null,
    projectId: "prj_wash",
    error: null,
  },
  {
    id: "doc_q1_report",
    fileName: "Q1 Project Report.pdf",
    displayName: "Q1 Project Report",
    type: "pdf",
    status: "uploaded",
    sizeBytes: 764_310,
    uploadedAt: "2026-06-09T10:15:00.000Z",
    analyzedAt: null,
    pageCount: 12,
    summary: null,
    projectId: null,
    error: null,
  },
  {
    id: "doc_grant_agreement",
    fileName: "Donor Grant Agreement 2026.pdf",
    displayName: "Donor Grant Agreement 2026",
    type: "pdf",
    status: "uploaded",
    sizeBytes: 388_120,
    uploadedAt: "2026-06-08T14:02:00.000Z",
    analyzedAt: null,
    pageCount: 18,
    summary: null,
    projectId: null,
    error: null,
  },
  {
    id: "doc_budget",
    fileName: "Programme Budget 2026.xlsx",
    displayName: "Programme Budget 2026",
    type: "xlsx",
    status: "uploaded",
    sizeBytes: 74_900,
    uploadedAt: "2026-06-08T13:58:00.000Z",
    analyzedAt: null,
    pageCount: null,
    summary: null,
    projectId: null,
    error: null,
  },
  {
    id: "doc_wash_notes",
    fileName: "WASH Site Inspection Notes.docx",
    displayName: "WASH Site Inspection Notes",
    type: "docx",
    status: "uploaded",
    sizeBytes: 39_640,
    uploadedAt: "2026-06-07T09:22:00.000Z",
    analyzedAt: null,
    pageCount: 6,
    summary: null,
    projectId: "prj_wash",
    error: null,
  },
  {
    id: "doc_water_points",
    fileName: "Water Point GPS Survey.csv",
    displayName: "Water Point GPS Survey",
    type: "csv",
    status: "uploaded",
    sizeBytes: 18_310,
    uploadedAt: "2026-06-06T16:11:00.000Z",
    analyzedAt: null,
    pageCount: null,
    summary: null,
    projectId: "prj_wash",
    error: null,
  },
  {
    id: "doc_mentorship_notes",
    fileName: "Mentorship Session Notes.docx",
    displayName: "Mentorship Session Notes",
    type: "docx",
    status: "uploaded",
    sizeBytes: 27_480,
    uploadedAt: "2026-06-05T11:47:00.000Z",
    analyzedAt: null,
    pageCount: 5,
    summary: null,
    projectId: "prj_youth",
    error: null,
  },
  {
    id: "doc_enrolment_scan",
    fileName: "Youth Enrolment Forms (scan).pdf",
    displayName: "Youth Enrolment Forms (scan)",
    type: "pdf",
    status: "uploaded",
    sizeBytes: 4_812_600,
    uploadedAt: "2026-06-04T08:05:00.000Z",
    analyzedAt: null,
    pageCount: 96,
    summary: null,
    projectId: "prj_youth",
    error: null,
  },
  {
    id: "doc_monitoring_visit",
    fileName: "Field Monitoring Visit Report.docx",
    displayName: "Field Monitoring Visit Report",
    type: "docx",
    status: "uploaded",
    sizeBytes: 52_110,
    uploadedAt: "2026-06-03T15:33:00.000Z",
    analyzedAt: null,
    pageCount: 7,
    summary: null,
    projectId: null,
    error: null,
  },
  {
    id: "doc_partner_mou",
    fileName: "Partner MoU – County Government.pdf",
    displayName: "Partner MoU – County Government",
    type: "pdf",
    status: "failed",
    sizeBytes: 611_240,
    uploadedAt: "2026-06-02T10:19:00.000Z",
    analyzedAt: null,
    pageCount: null,
    summary: null,
    projectId: null,
    error: "Password-protected document could not be read. Remove the password and upload again.",
  },
  {
    id: "doc_impact_survey",
    fileName: "Impact Survey Raw Data.csv",
    displayName: "Impact Survey Raw Data",
    type: "csv",
    status: "uploaded",
    sizeBytes: 143_770,
    uploadedAt: "2026-06-01T09:41:00.000Z",
    analyzedAt: null,
    pageCount: null,
    summary: null,
    projectId: null,
    error: null,
  },
  {
    id: "doc_annual_narrative",
    fileName: "Annual Narrative 2025.pdf",
    displayName: "Annual Narrative 2025",
    type: "pdf",
    status: "uploaded",
    sizeBytes: 1_988_400,
    uploadedAt: "2026-05-29T13:07:00.000Z",
    analyzedAt: null,
    pageCount: 34,
    summary: null,
    projectId: null,
    error: null,
  },
];

/* ------------------------------------------------------------------ */
/* Extracted facts                                                     */
/* ------------------------------------------------------------------ */

const facts: ExtractedFact[] = [
  // Q2 Project Report
  {
    id: "fact_r1",
    documentId: "doc_q2_report",
    projectId: null,
    category: "beneficiary",
    field: "beneficiaries_reached",
    label: "Beneficiaries reached (Q2)",
    value: "120",
    numericValue: 120,
    unit: "beneficiaries",
    confidence: "high",
    quote:
      "During the second quarter the programme reached 120 beneficiaries across the three projects.",
    locator: "p.3 §Executive summary",
    extractedAt: "2026-06-15T09:13:10.000Z",
  },
  {
    id: "fact_r2",
    documentId: "doc_q2_report",
    projectId: "prj_youth",
    category: "outcome",
    field: "learners_completed",
    label: "Learners who completed a module",
    value: "47",
    numericValue: 47,
    unit: "learners",
    confidence: "high",
    quote: "47 learners completed at least one skills module during the quarter.",
    locator: "p.6 §Youth Skills Development",
    extractedAt: "2026-06-15T09:13:12.000Z",
  },
  {
    id: "fact_r3",
    documentId: "doc_q2_report",
    projectId: "prj_youth",
    category: "project",
    field: "completion_pct",
    label: "Youth Skills Development completion",
    value: "80",
    numericValue: 80,
    unit: "%",
    confidence: "high",
    quote: "Youth Skills Development is reported as 80% complete.",
    locator: "p.7 §Programme status",
    extractedAt: "2026-06-15T09:13:14.000Z",
  },
  {
    id: "fact_r4",
    documentId: "doc_q2_report",
    projectId: "prj_youth",
    category: "activity",
    field: "activities_postponed",
    label: "Activities postponed",
    value: "2",
    numericValue: 2,
    unit: "activities",
    confidence: "medium",
    quote:
      "Two activities (business literacy and the mentorship clinic) have been moved to Q3.",
    locator: "p.8 §Risks and adjustments",
    extractedAt: "2026-06-15T09:13:16.000Z",
  },
  {
    id: "fact_r5",
    documentId: "doc_q2_report",
    projectId: null,
    category: "financial",
    field: "q2_expenditure",
    label: "Q2 expenditure",
    value: "3,150,000",
    numericValue: 3_150_000,
    unit: "KES",
    confidence: "high",
    quote: "Total programme expenditure for Q2 2026 was KES 3,150,000.",
    locator: "p.10 §Financial summary",
    extractedAt: "2026-06-15T09:13:18.000Z",
  },

  // Beneficiary Register
  {
    id: "fact_b1",
    documentId: "doc_beneficiary_register",
    projectId: null,
    category: "beneficiary",
    field: "beneficiaries_registered",
    label: "Beneficiaries registered",
    value: "127",
    numericValue: 127,
    unit: "beneficiaries",
    confidence: "high",
    quote: "The register lists 127 enrolled beneficiaries as at 30 June 2026.",
    locator: "Sheet 'Register'!A2:G128",
    extractedAt: "2026-06-14T16:40:50.000Z",
  },
  {
    id: "fact_b2",
    documentId: "doc_beneficiary_register",
    projectId: "prj_youth",
    category: "beneficiary",
    field: "beneficiaries_registered",
    label: "Youth Skills beneficiaries",
    value: "47",
    numericValue: 47,
    unit: "beneficiaries",
    confidence: "high",
    quote: "Rows 2–48 of the register are tagged to Youth Skills Development.",
    locator: "Sheet 'Register'!A2:G48",
    extractedAt: "2026-06-14T16:40:52.000Z",
  },
  {
    id: "fact_b3",
    documentId: "doc_beneficiary_register",
    projectId: "prj_wash",
    category: "beneficiary",
    field: "beneficiaries_registered",
    label: "WASH beneficiaries",
    value: "52",
    numericValue: 52,
    unit: "beneficiaries",
    confidence: "high",
    quote: "Rows 49–100 of the register are tagged to Water & Sanitation Access.",
    locator: "Sheet 'Register'!A49:G100",
    extractedAt: "2026-06-14T16:40:54.000Z",
  },
  {
    id: "fact_b4",
    documentId: "doc_beneficiary_register",
    projectId: "prj_health",
    category: "beneficiary",
    field: "beneficiaries_registered",
    label: "Health beneficiaries",
    value: "28",
    numericValue: 28,
    unit: "beneficiaries",
    confidence: "high",
    quote: "Rows 101–128 of the register are tagged to Community Health Outreach.",
    locator: "Sheet 'Register'!A101:G128",
    extractedAt: "2026-06-14T16:40:56.000Z",
  },
  {
    id: "fact_b5",
    documentId: "doc_beneficiary_register",
    projectId: null,
    category: "project",
    field: "register_updated",
    label: "Register last updated",
    value: "2026-06-30",
    numericValue: null,
    unit: null,
    confidence: "high",
    quote: "Last updated 30 June 2026.",
    locator: "Sheet 'Register'!I1",
    extractedAt: "2026-06-14T16:40:58.000Z",
  },

  // Financial Report
  {
    id: "fact_f1",
    documentId: "doc_financial_report",
    projectId: "prj_youth",
    category: "financial",
    field: "unmapped_expenditure",
    label: "Unmapped activity expenditure",
    value: "25,000",
    numericValue: 25_000,
    unit: "KES",
    confidence: "medium",
    quote:
      "KES 25,000 spent under 'Community events' is not linked to an approved activity line.",
    locator: "p.5 §Exceptions",
    extractedAt: "2026-06-13T11:06:20.000Z",
  },
  {
    id: "fact_f2",
    documentId: "doc_financial_report",
    projectId: null,
    category: "financial",
    field: "q2_expenditure",
    label: "Total Q2 expenditure",
    value: "3,150,000",
    numericValue: 3_150_000,
    unit: "KES",
    confidence: "high",
    quote: "Total expenditure for the quarter was KES 3,150,000.",
    locator: "p.2 §Summary",
    extractedAt: "2026-06-13T11:06:22.000Z",
  },
  {
    id: "fact_f3",
    documentId: "doc_financial_report",
    projectId: null,
    category: "financial",
    field: "budget_utilisation",
    label: "Budget utilisation",
    value: "75",
    numericValue: 75,
    unit: "%",
    confidence: "high",
    quote: "75% of the 2026 budget had been utilised by 30 June.",
    locator: "p.2 §Summary",
    extractedAt: "2026-06-13T11:06:24.000Z",
  },

  // Staff Meeting Minutes
  {
    id: "fact_m1",
    documentId: "doc_meeting_minutes",
    projectId: "prj_youth",
    category: "activity",
    field: "activities_postponed",
    label: "Postponed activities",
    value: "2",
    numericValue: 2,
    unit: "activities",
    confidence: "high",
    quote:
      "The committee agreed to postpone the business literacy module and the mentorship clinic to Q3.",
    locator: "Item 4 — Programme adjustments",
    extractedAt: "2026-06-11T15:21:00.000Z",
  },
  {
    id: "fact_m2",
    documentId: "doc_meeting_minutes",
    projectId: "prj_youth",
    category: "project",
    field: "revised_completion",
    label: "Revised completion date",
    value: "Q3 2026",
    numericValue: null,
    unit: null,
    confidence: "medium",
    quote: "A revised completion date will be confirmed in Q3.",
    locator: "Item 4 — Programme adjustments",
    extractedAt: "2026-06-11T15:21:02.000Z",
  },

  // Youth Training Attendance
  {
    id: "fact_a1",
    documentId: "doc_attendance",
    projectId: "prj_youth",
    category: "outcome",
    field: "unique_learners",
    label: "Unique learners attended",
    value: "47",
    numericValue: 47,
    unit: "learners",
    confidence: "high",
    quote: "47 unique learners attended at least one session.",
    locator: "CSV total row",
    extractedAt: "2026-06-10T08:30:40.000Z",
  },
  {
    id: "fact_a2",
    documentId: "doc_attendance",
    projectId: "prj_youth",
    category: "outcome",
    field: "attendance_rate",
    label: "Average attendance rate",
    value: "88",
    numericValue: 88,
    unit: "%",
    confidence: "high",
    quote: "Average attendance rate was 88% across nine sessions.",
    locator: "CSV summary block",
    extractedAt: "2026-06-10T08:30:42.000Z",
  },
];

/* ------------------------------------------------------------------ */
/* Findings — the cross-document inconsistency is finding #1           */
/* ------------------------------------------------------------------ */

const findings: FindingRecord[] = [
  {
    id: "finding_beneficiary_mismatch",
    type: "inconsistency",
    severity: "critical",
    title: "Beneficiary numbers don't match",
    summary:
      "The reported reach and the master register disagree on how many people the programme served this quarter.",
    detail:
      "The Q2 Project Report states that 120 beneficiaries were reached, while the Beneficiary Register contains 127 enrolled records for the same period. The two figures come from two different documents produced by two different teams.",
    confidence: "high",
    confidenceReason: "Both figures appear explicitly in two independent source documents.",
    status: "open",
    createdAt: "2026-06-15T09:14:00.000Z",
    projectId: null,
    metrics: [
      { label: "Reported", value: "120" },
      { label: "Registered", value: "127" },
    ],
    difference: { label: "Difference", value: "7" },
    assessment:
      "Different reporting cut-off dates may explain the discrepancy. The project report was compiled on 12 June 2026, while the register was last updated on 30 June 2026 — seven beneficiaries were enrolled after the report was written.",
    recommendedAction:
      "Confirm which reporting cut-off applies, then reconcile the register before publishing the Q2 donor update.",
  },
  {
    id: "finding_missing_outcome",
    type: "missing_information",
    severity: "warning",
    title: "Activities reported without an outcome",
    summary:
      "Two youth training modules are reported as delivered, but no measurable outcome is attached to either.",
    detail:
      "The report lists the tailoring and digital literacy modules as completed in full, but does not state what learners achieved, how many completed the course, or whether anyone was certified.",
    confidence: "medium",
    confidenceReason:
      "Only the narrative report describes these activities; no outcome data appears in any other document.",
    status: "open",
    createdAt: "2026-06-15T09:15:10.000Z",
    projectId: "prj_youth",
    metrics: [
      { label: "Activities reported", value: "2" },
      { label: "With measurable outcome", value: "0" },
    ],
    difference: null,
    assessment:
      "ImpactOS couldn't find a completion rate, assessment score or certification record for either module.",
    recommendedAction:
      "Attach completion or assessment records to the modules, or mark the outcome as not yet measured.",
  },
  {
    id: "finding_unmapped_expenditure",
    type: "financial_mapping",
    severity: "warning",
    title: "Expenditure isn't linked to an activity",
    summary: "KES 25,000 of Q2 spending is not associated with any approved activity.",
    detail:
      "The financial report records KES 25,000 under 'Community events' with no matching activity, budget line or attendance record anywhere in the workspace.",
    confidence: "medium",
    confidenceReason:
      "The expense appears in the financial report, but no other document references it.",
    status: "open",
    createdAt: "2026-06-13T11:07:00.000Z",
    projectId: "prj_youth",
    metrics: [
      { label: "Expenditure", value: "KES 25,000" },
      { label: "Linked activities", value: "0" },
    ],
    difference: null,
    assessment:
      "The amount is small relative to the KES 3,150,000 quarter, but it should still be traceable for donor reporting.",
    recommendedAction:
      "Reclassify the expense under an approved activity line, or document the approval that authorised it.",
  },
  {
    id: "finding_students_supported",
    type: "verified",
    severity: "success",
    title: "47 students supported during Q2",
    summary: "The number of learners supported this quarter is confirmed by two sources.",
    detail:
      "The project report and the attendance export independently agree that 47 unique learners took part during Q2.",
    confidence: "high",
    confidenceReason: "Confirmed by two independent sources.",
    status: "reviewed",
    createdAt: "2026-06-15T09:16:20.000Z",
    projectId: "prj_youth",
    metrics: [
      { label: "Project report", value: "47" },
      { label: "Attendance export", value: "47" },
    ],
    difference: null,
    assessment:
      "Both sources were produced by different teams and agree on the figure, so it is safe to cite externally.",
    recommendedAction: "Safe to cite in external reporting.",
  },
];

/* ------------------------------------------------------------------ */
/* Evidence — what the drawer shows                                    */
/* ------------------------------------------------------------------ */

const evidence: EvidenceRecord[] = [
  {
    id: "ev_mismatch_reported",
    findingId: "finding_beneficiary_mismatch",
    side: "a",
    label: "Reported",
    value: "120",
    unit: "beneficiaries",
    documentId: "doc_q2_report",
    quote:
      "During the second quarter the programme reached 120 beneficiaries across the three projects.",
    locator: "p.3 §Executive summary",
  },
  {
    id: "ev_mismatch_registered",
    findingId: "finding_beneficiary_mismatch",
    side: "b",
    label: "Registered",
    value: "127",
    unit: "beneficiaries",
    documentId: "doc_beneficiary_register",
    quote: "The register lists 127 enrolled beneficiaries as at 30 June 2026.",
    locator: "Sheet 'Register'!A2:G128",
  },
  {
    id: "ev_outcome_reported",
    findingId: "finding_missing_outcome",
    side: "a",
    label: "Reported",
    value: "2 activities delivered",
    unit: null,
    documentId: "doc_q2_report",
    quote:
      "Both the tailoring and digital literacy modules were delivered in full during Q2.",
    locator: "p.6 §Youth Skills Development",
  },
  {
    id: "ev_outcome_missing",
    findingId: "finding_missing_outcome",
    side: "b",
    label: "Measurable outcome",
    value: "Not found",
    unit: null,
    documentId: "doc_attendance",
    quote:
      "The attendance export records who attended each session; no completion status or assessment result is recorded.",
    locator: "Columns A–E",
  },
  {
    id: "ev_finance_expense",
    findingId: "finding_unmapped_expenditure",
    side: "a",
    label: "Expenditure",
    value: "KES 25,000",
    unit: "KES",
    documentId: "doc_financial_report",
    quote:
      "KES 25,000 spent under 'Community events' is not linked to an approved activity line.",
    locator: "p.5 §Exceptions",
  },
  {
    id: "ev_finance_activity",
    findingId: "finding_unmapped_expenditure",
    side: "b",
    label: "Matching activity",
    value: "None found",
    unit: null,
    documentId: "doc_q2_report",
    quote: "All Q2 activities listed in this report are accounted for in the budget.",
    locator: "p.10 §Financial summary",
  },
  {
    id: "ev_verified_report",
    findingId: "finding_students_supported",
    side: "a",
    label: "Project report",
    value: "47",
    unit: "learners",
    documentId: "doc_q2_report",
    quote: "47 learners completed at least one skills module during the quarter.",
    locator: "p.6 §Youth Skills Development",
  },
  {
    id: "ev_verified_attendance",
    findingId: "finding_students_supported",
    side: "b",
    label: "Attendance export",
    value: "47",
    unit: "learners",
    documentId: "doc_attendance",
    quote: "47 unique learners attended at least one session.",
    locator: "CSV total row",
  },
];

/* ------------------------------------------------------------------ */
/* Reports — none yet; the Reports screen starts on its empty state    */
/* ------------------------------------------------------------------ */

const reports: Report[] = [];

/* ------------------------------------------------------------------ */
/* Beneficiaries — 127 generated deterministically                     */
/* ------------------------------------------------------------------ */

const FIRST_NAMES = [
  "Achieng", "Brian", "Cynthia", "David", "Esther", "Faith", "George", "Hawa",
  "Ibrahim", "Joy", "Kevin", "Lydia", "Mercy", "Nicholas", "Otieno", "Pauline",
  "Quinter", "Ruth", "Samuel", "Tabitha", "Ummi", "Victor", "Wanjiru", "Yusuf",
  "Zainab", "Ali", "Beatrice", "Collins", "Dennis", "Elizabeth",
];

const LAST_NAMES = [
  "Odhiambo", "Wanjala", "Kiptoo", "Mwangi", "Ochieng", "Njoroge", "Auma",
  "Barasa", "Chebet", "Kimani", "Adhiambo", "Mutua", "Nyongo", "Owino",
  "Wafula", "Kamau", "Onyango", "Wekesa", "Simiyu", "Atieno", "Mwenda",
  "Kariuki", "Omondi", "Nekesa", "Kilonzo", "Muthoni", "Ogutu", "Anyango",
  "Musyoka", "Cheruiyot",
];

const LOCATIONS = ["Kisumu", "Ahero", "Maseno", "Kombewa", "Muhoroni", "Seme", "Nyando", "Bondo"];

/** Small deterministic PRNG so the seed is identical on every machine. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isoDay(startUtc: number, offsetDays: number): string {
  return new Date(startUtc + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

function makeBeneficiaries(): Beneficiary[] {
  const rand = mulberry32(20260630);
  const start = Date.UTC(2026, 0, 8);
  const plan: Array<{
    projectId: string;
    cohort: string;
    count: number;
    minAge: number;
    maxAge: number;
  }> = [
    { projectId: "prj_youth", cohort: "YSD-2026-A", count: 24, minAge: 18, maxAge: 26 },
    { projectId: "prj_youth", cohort: "YSD-2026-B", count: 23, minAge: 17, maxAge: 25 },
    { projectId: "prj_wash", cohort: "WASH-2026", count: 52, minAge: 16, maxAge: 60 },
    { projectId: "prj_health", cohort: "CHW-2026", count: 28, minAge: 15, maxAge: 58 },
  ];

  const out: Beneficiary[] = [];
  let index = 0;

  for (const group of plan) {
    for (let i = 0; i < group.count; i += 1) {
      index += 1;
      const first = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)];
      const last = LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)];
      const age = group.minAge + Math.floor(rand() * (group.maxAge - group.minAge + 1));
      const genderRoll = rand();
      const gender = genderRoll < 0.54 ? "female" : genderRoll < 0.97 ? "male" : "other";
      const statusRoll = rand();
      const status = statusRoll < 0.86 ? "active" : statusRoll < 0.95 ? "graduated" : "exited";

      out.push({
        id: `ben_${String(index).padStart(3, "0")}`,
        projectId: group.projectId,
        name: `${first} ${last}`,
        cohort: group.cohort,
        age,
        gender,
        location: LOCATIONS[Math.floor(rand() * LOCATIONS.length)],
        registeredAt: isoDay(start, Math.floor(rand() * 174)),
        status,
      });
    }
  }

  return out;
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/** Beneficiaries counted at the end of Q1 2026 — used for the "+18%" delta. */
export const PREVIOUS_BENEFICIARIES = 108;

/** Build a fresh copy of the seed dataset. */
export function buildSeed(): SeedData {
  return {
    organization: { ...organization },
    previousBeneficiaries: PREVIOUS_BENEFICIARIES,
    documents: documents.map((d) => ({ ...d })),
    projects: projects.map((p) => ({ ...p })),
    activities: activities.map((a) => ({ ...a })),
    beneficiaries: makeBeneficiaries(),
    facts: facts.map((f) => ({ ...f })),
    findings: findings.map((f) => ({ ...f, metrics: f.metrics.map((m) => ({ ...m })) })),
    evidence: evidence.map((e) => ({ ...e })),
    reports: reports.map((r) => ({ ...r })),
  };
}

/** The id of the seeded cross-document inconsistency. */
export const SEEDED_INCONSISTENCY_ID = "finding_beneficiary_mismatch";
