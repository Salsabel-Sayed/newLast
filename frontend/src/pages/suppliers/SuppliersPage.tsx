import PartyListPage from "../../features/parties/PartyListPage";
import type { PartyConfig } from "../../features/parties/party.types";

const SUPPLIER_CONFIG: PartyConfig = {
  apiBasePath: "/suppliers",
  routeBasePath: "/suppliers",
  singularLabel: "مورد",
  pluralLabel: "الموردون",
  icon: "bi-truck",
  balanceLabel: "المستحق للمورد",
  debitLabel: "مدين",
  creditLabel: "دائن",
};

function SuppliersPage() {
  return <PartyListPage config={SUPPLIER_CONFIG} />;
}

export default SuppliersPage;
export { SUPPLIER_CONFIG };
