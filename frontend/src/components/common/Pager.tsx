import { Pagination } from "react-bootstrap";

interface PagerProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

function Pager({ page, totalPages, onChange }: PagerProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1
  );

  let previousPage = 0;
  const items = pages.map((p) => {
    const showEllipsisBefore = p - previousPage > 1;
    previousPage = p;
    return (
      <span key={p} className="d-inline-flex align-items-center">
        {showEllipsisBefore && <Pagination.Ellipsis disabled />}
        <Pagination.Item active={p === page} onClick={() => onChange(p)}>
          {p}
        </Pagination.Item>
      </span>
    );
  });

  return (
    <Pagination className="mb-0 justify-content-center">
      <Pagination.Prev disabled={page <= 1} onClick={() => onChange(page - 1)} />
      {items}
      <Pagination.Next disabled={page >= totalPages} onClick={() => onChange(page + 1)} />
    </Pagination>
  );
}

export default Pager;
