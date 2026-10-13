import PartyListPage from "../../features/parties/PartyListPage";
import type { PartyConfig } from "../../features/parties/party.types";

const CUSTOMER_CONFIG: PartyConfig = {
  apiBasePath: "/customers",
  routeBasePath: "/customers",
  singularLabel: "عميل",
  pluralLabel: "العملاء",
  icon: "bi-people",
  balanceLabel: "الرصيد المستحق على العميل",
  debitLabel: "مدين",
  creditLabel: "دائن",
};

function CustomersPage() {
  return <PartyListPage config={CUSTOMER_CONFIG} />;
}

export default CustomersPage;
export { CUSTOMER_CONFIG };
