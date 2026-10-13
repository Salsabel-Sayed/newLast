import { useEffect, useState } from "react";
import { Button, Card, Form } from "react-bootstrap";
import { apiClient, ApiError } from "../../api/client";
import PageHeader from "../../components/common/PageHeader";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import { useConfirm } from "../../components/common/ConfirmProvider";
import { useToast } from "../../components/common/ToastProvider";
import { useApiResource } from "../../hooks/useApiResource";
import type { Settings } from "./settings.types";
import TypeToConfirmModal from "./TypeToConfirmModal";

const UNEXPECTED_ERROR_MESSAGE = "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى";

type DestructiveAction = "reset-database" | "reset-transactions" | "reset-number-sequences";

const DESTRUCTIVE_ACTION_META: Record<
  DestructiveAction,
  { title: string; description: string; phrase: string; successMessage: string }
> = {
  "reset-database": {
    title: "إعادة تهيئة كاملة لقاعدة البيانات",
    description: "سيتم حذف جميع البيانات في النظام بالكامل: العملاء، الموردون، المواد الخام، الدفعات، الفواتير، وكل شيء آخر.",
    phrase: "حذف كامل",
    successMessage: "تمت إعادة تهيئة قاعدة البيانات بالكامل",
  },
  "reset-transactions": {
    title: "إعادة تهيئة الحركات فقط",
    description:
      "سيتم حذف جميع الحركات (الدفعات، الفواتير، أوامر الشراء والبيع، المرتجعات، المدفوعات...) مع الإبقاء على الكتالوج (العملاء، الموردون، المواد الخام، الوصفات) وإعادة أرصدتهم إلى صفر.",
    phrase: "حذف الحركات",
    successMessage: "تمت إعادة تهيئة الحركات بنجاح",
  },
  "reset-number-sequences": {
    title: "إعادة تهيئة تسلسل الأرقام",
    description: "سيتم حذف عدادات ترقيم المستندات، بحيث تبدأ الأرقام التالية من جديد.",
    phrase: "إعادة الترقيم",
    successMessage: "تمت إعادة تهيئة تسلسل الأرقام بنجاح",
  },
};

function SettingsPage() {
  const { notify } = useToast();
  const confirmDialog = useConfirm();

  const { data, loading, error, reload } = useApiResource(() => apiClient.get<Settings>("/settings"), []);

  const [companyName, setCompanyName] = useState("");
  const [currency, setCurrency] = useState("");
  const [defaultTaxPercent, setDefaultTaxPercent] = useState("0");
  const [savingInfo, setSavingInfo] = useState(false);

  const [savingStatus, setSavingStatus] = useState(false);
  const [destructiveTarget, setDestructiveTarget] = useState<DestructiveAction | null>(null);
  const [destructiveSubmitting, setDestructiveSubmitting] = useState(false);

  useEffect(() => {
    if (data) {
      setCompanyName(data.companyName ?? "");
      setCurrency(data.currency ?? "");
      setDefaultTaxPercent(String(data.defaultTaxPercent));
    }
  }, [data]);

  const handleSaveInfo = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingInfo(true);
    try {
      await apiClient.put("/settings", {
        companyName: companyName.trim(),
        currency: currency.trim(),
        defaultTaxPercent: Number(defaultTaxPercent) || 0,
      });
      notify("تم حفظ بيانات الشركة بنجاح", "success");
      reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : UNEXPECTED_ERROR_MESSAGE, "danger");
    } finally {
      setSavingInfo(false);
    }
  };

  const handleToggleAllowPermanentDelete = async (checked: boolean) => {
    setSavingStatus(true);
    try {
      await apiClient.put("/settings", { allowPermanentDelete: checked });
      notify("تم تحديث الإعداد بنجاح", "success");
      reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : UNEXPECTED_ERROR_MESSAGE, "danger");
    } finally {
      setSavingStatus(false);
    }
  };

  const handleActivateSystem = async () => {
    if (!data || data.systemInitialized) return;
    const confirmed = await confirmDialog({
      title: "بدء الاستخدام الفعلي للنظام",
      message: "بعد التفعيل لن يمكن التراجع، وستُقفل أدوات الحذف الدائم تلقائيًا. هل أنت متأكد؟",
      confirmLabel: "تفعيل",
      variant: "danger",
    });
    if (!confirmed) return;

    setSavingStatus(true);
    try {
      await apiClient.put("/settings", { systemInitialized: true });
      notify("تم تفعيل الاستخدام الفعلي للنظام", "success");
      reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : UNEXPECTED_ERROR_MESSAGE, "danger");
    } finally {
      setSavingStatus(false);
    }
  };

  const handleDestructiveConfirm = async () => {
    if (!destructiveTarget) return;
    setDestructiveSubmitting(true);
    try {
      await apiClient.post(`/settings/${destructiveTarget}`, { confirm: true });
      notify(DESTRUCTIVE_ACTION_META[destructiveTarget].successMessage, "success");
      setDestructiveTarget(null);
      reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : UNEXPECTED_ERROR_MESSAGE, "danger");
    } finally {
      setDestructiveSubmitting(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <div>
      <PageHeader title="الإعدادات" description="إعدادات الشركة وإدارة قاعدة البيانات" />

      <Card className="mb-3">
        <Card.Header className="bg-white fw-semibold">بيانات الشركة</Card.Header>
        <Card.Body>
          <Form onSubmit={handleSaveInfo}>
            <div className="row g-3">
              <div className="col-md-4">
                <Form.Group>
                  <Form.Label>اسم الشركة</Form.Label>
                  <Form.Control value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group>
                  <Form.Label>العملة *</Form.Label>
                  <Form.Control value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="مثال: ج.م" />
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group>
                  <Form.Label>نسبة الضريبة الافتراضية (%)</Form.Label>
                  <Form.Control
                    type="number"
                    min={0}
                    max={100}
                    step="any"
                    value={defaultTaxPercent}
                    onChange={(e) => setDefaultTaxPercent(e.target.value)}
                  />
                </Form.Group>
              </div>
            </div>
            <div className="mt-3">
              <Button variant="primary" type="submit" disabled={savingInfo}>
                {savingInfo ? "جارٍ الحفظ..." : "حفظ"}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>

      <Card className="mb-3">
        <Card.Header className="bg-white fw-semibold">حالة النظام</Card.Header>
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <div className="fw-semibold">الاستخدام الفعلي للنظام</div>
              <div className="text-muted small">
                {data.systemInitialized
                  ? "النظام في مرحلة الاستخدام الفعلي — تم قفل أدوات الحذف الدائم."
                  : "النظام لا يزال في مرحلة التجربة."}
              </div>
            </div>
            {data.systemInitialized ? (
              <span className="badge text-bg-success">مفعّل</span>
            ) : (
              <Button variant="outline-danger" size="sm" onClick={handleActivateSystem} disabled={savingStatus}>
                تفعيل الاستخدام الفعلي
              </Button>
            )}
          </div>

          <div className="d-flex justify-content-between align-items-center">
            <div>
              <div className="fw-semibold">السماح بالحذف الدائم (مرحلة التجربة فقط)</div>
              <div className="text-muted small">يلزم تفعيله لاستخدام أدوات إدارة قاعدة البيانات أدناه.</div>
            </div>
            <Form.Check
              type="switch"
              id="allow-permanent-delete-switch"
              checked={data.allowPermanentDelete}
              disabled={data.systemInitialized || savingStatus}
              onChange={(e) => handleToggleAllowPermanentDelete(e.target.checked)}
            />
          </div>
        </Card.Body>
      </Card>

      <Card className="border-danger">
        <Card.Header className="bg-white fw-semibold text-danger">
          <i className="bi bi-exclamation-octagon me-2" />
          إدارة قاعدة البيانات
        </Card.Header>
        <Card.Body>
          {!data.allowPermanentDelete && (
            <div className="alert alert-warning small mb-3">
              أدوات الحذف الدائم غير متاحة حاليًا. فعّل "السماح بالحذف الدائم" أعلاه لاستخدامها (متاح فقط أثناء مرحلة التجربة).
            </div>
          )}

          {(Object.keys(DESTRUCTIVE_ACTION_META) as DestructiveAction[]).map((action) => (
            <div key={action} className="d-flex justify-content-between align-items-center py-2 border-bottom">
              <div>
                <div className="fw-semibold">{DESTRUCTIVE_ACTION_META[action].title}</div>
                <div className="text-muted small">{DESTRUCTIVE_ACTION_META[action].description}</div>
              </div>
              <Button
                variant="outline-danger"
                size="sm"
                disabled={!data.allowPermanentDelete}
                onClick={() => setDestructiveTarget(action)}
              >
                تنفيذ
              </Button>
            </div>
          ))}
        </Card.Body>
      </Card>

      <TypeToConfirmModal
        show={destructiveTarget !== null}
        title={destructiveTarget ? DESTRUCTIVE_ACTION_META[destructiveTarget].title : ""}
        description={destructiveTarget ? DESTRUCTIVE_ACTION_META[destructiveTarget].description : ""}
        confirmPhrase={destructiveTarget ? DESTRUCTIVE_ACTION_META[destructiveTarget].phrase : ""}
        submitting={destructiveSubmitting}
        onClose={() => setDestructiveTarget(null)}
        onConfirm={handleDestructiveConfirm}
      />
    </div>
  );
}

export default SettingsPage;
