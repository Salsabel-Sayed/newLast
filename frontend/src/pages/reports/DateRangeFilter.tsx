import { Form } from "react-bootstrap";

interface DateRangeFilterProps {
  dateFrom: string;
  dateTo: string;
  onChangeFrom: (value: string) => void;
  onChangeTo: (value: string) => void;
}

function DateRangeFilter({ dateFrom, dateTo, onChangeFrom, onChangeTo }: DateRangeFilterProps) {
  return (
    <>
      <Form.Group style={{ maxWidth: 170 }}>
        <Form.Label className="small text-muted mb-1">من تاريخ</Form.Label>
        <Form.Control type="date" size="sm" value={dateFrom} onChange={(e) => onChangeFrom(e.target.value)} />
      </Form.Group>
      <Form.Group style={{ maxWidth: 170 }}>
        <Form.Label className="small text-muted mb-1">إلى تاريخ</Form.Label>
        <Form.Control type="date" size="sm" value={dateTo} onChange={(e) => onChangeTo(e.target.value)} />
      </Form.Group>
    </>
  );
}

export default DateRangeFilter;
