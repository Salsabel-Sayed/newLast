import { useState } from "react";
import { Badge, Card, Form, Table } from "react-bootstrap";
import { apiClient } from "../../api/client";
import type { PaginatedResult } from "../../api/types";
import PageHeader from "../../components/common/PageHeader";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import Pager from "../../components/common/Pager";
import { useApiResource } from "../../hooks/useApiResource";
import { useLookupList } from "../../hooks/useLookupList";
import { formatCurrency, formatDate } from "../../utils/format";
import type { Party } from "../../features/parties/party.types";
import { ledgerSourceTypeLabel } from "../../features/ledger/ledgerLabels";
import type { LedgerEntry } from "./ledgerEntry.types";

function LedgerPage() {
  const [partyType, setPartyType] = useState<"" | "customer" | "supplier">("");
  const [partyId, setPartyId] = useState("");
  const [page, setPage] = useState(1);

  const { items: customers } = useLookupList<Party>("/customers", true);
  const { items: suppliers } = useLookupList<Party>("/suppliers", true);
  const partyNameById = new Map([...customers, ...suppliers].map((p) => [p._id, p.name]));

  const partyOptions = partyType === "supplier" ? suppliers : partyType === "customer" ? customers : [];

  const { data, loading, error, reload } = useApiResource(
    () =>
      apiClient.get<PaginatedResult<LedgerEntry>>("/ledger", {
        partyType: partyType || undefined,
        partyId: partyId || undefined,
        page,
        limit: 25,
      }),
    [partyType, partyId, page]
  );

  return (
    <div>
      <PageHeader title="دفتر الأستاذ" description="سجل قراءة فقط لجميع حركات أرصدة العملاء والموردين" />

      <Card>
        <Card.Header className="bg-white">
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <Form.Select
              style={{ maxWidth: 180 }}
              value={partyType}
              onChange={(e) => {
                setPartyType(e.target.value as "" | "customer" | "supplier");
                setPartyId("");
                setPage(1);
              }}
            >
              <option value="">كل الأطراف</option>
              <option value="customer">العملاء</option>
              <option value="supplier">الموردون</option>
            </Form.Select>
            <Form.Select
              style={{ maxWidth: 220 }}
              value={partyId}
              disabled={!partyType}
              onChange={(e) => {
                setPartyId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">الكل</option>
              {partyOptions.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </Form.Select>
          </div>
        </Card.Header>

        <Card.Body className="p-0">
          {loading && <LoadingState />}
          {!loading && error && <ErrorState message={error} onRetry={reload} />}
          {!loading && !error && data && data.items.length === 0 && (
            <div className="p-4">
              <EmptyState icon="bi-journal-bookmark" title="لا توجد حركات" />
            </div>
          )}
          {!loading && !error && data && data.items.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>الطرف</th>
                  <th>نوع الحركة</th>
                  <th>البيان</th>
                  <th className="text-end">مدين</th>
                  <th className="text-end">دائن</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((entry) => (
                  <tr key={entry._id}>
                    <td className="text-muted">{formatDate(entry.date)}</td>
                    <td>
                      {partyNameById.get(entry.partyId) ?? "—"}{" "}
                      <Badge bg="light" text="dark" className="fw-normal">
                        {entry.partyType === "customer" ? "عميل" : "مورد"}
                      </Badge>
                    </td>
                    <td>{ledgerSourceTypeLabel(entry.sourceType)}</td>
                    <td className="text-muted small">{entry.description}</td>
                    <td className="text-end">{entry.debit > 0 ? formatCurrency(entry.debit) : "—"}</td>
                    <td className="text-end">{entry.credit > 0 ? formatCurrency(entry.credit) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>

        {data && data.totalPages > 1 && (
          <Card.Footer className="bg-white">
            <Pager page={data.page} totalPages={data.totalPages} onChange={setPage} />
          </Card.Footer>
        )}
      </Card>
    </div>
  );
}

export default LedgerPage;
