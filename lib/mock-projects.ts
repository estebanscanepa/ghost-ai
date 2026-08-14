import type { Project } from "@/types/project";

/**
 * Placeholder project data for the editor sidebar. There is no persistence
 * layer yet — this is replaced by a query against the database once projects
 * are real.
 */
export const MOCK_PROJECTS: Project[] = [
  {
    id: "prj_checkout",
    name: "Checkout Platform",
    slug: "checkout-platform",
    ownership: "owned",
  },
  {
    id: "prj_ingestion",
    name: "Event Ingestion Pipeline",
    slug: "event-ingestion-pipeline",
    ownership: "owned",
  },
  {
    id: "prj_identity",
    name: "Identity Service",
    slug: "identity-service",
    ownership: "owned",
  },
  {
    id: "prj_billing",
    name: "Billing Rearchitecture",
    slug: "billing-rearchitecture",
    ownership: "shared",
  },
  {
    id: "prj_search",
    name: "Search Infrastructure",
    slug: "search-infrastructure",
    ownership: "shared",
  },
];
