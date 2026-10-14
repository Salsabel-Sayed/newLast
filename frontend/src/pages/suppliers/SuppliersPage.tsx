import PartyListPage from "../../features/parties/PartyListPage";
import type { PartyConfig } from "../../features/parties/party.types";

const SUPPLIER_CONFIG: PartyConfig = {
  partyType: "supplier",
  apiBasePath: "/suppliers",
  routeBasePath: "/suppliers",
  singularLabel: "مورد",
  pluralLabel: "الموردون",
  icon: "bi-truck",
  balanceLabel: "الرصيد الحالي للمورد (الموجب: علينا له، السالب: لنا عنده)",
  positiveBalanceSummaryLabel: "إجمالي المستحق للموردين",
  negativeBalanceSummaryLabel: "إجمالي المستحق لنا لدى الموردين",
  netBalanceSummaryLabel: "صافي أرصدة الموردين (الموجب مستحق للموردين)",
  debitLabel: "مدين",
  creditLabel: "دائن",
};

function SuppliersPage() {
  return <PartyListPage config={SUPPLIER_CONFIG} />;
}

export default SuppliersPage;
export { SUPPLIER_CONFIG };
