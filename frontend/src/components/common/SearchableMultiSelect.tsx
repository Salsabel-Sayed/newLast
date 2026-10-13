import { useEffect, useRef, useState } from "react";
import { Badge } from "react-bootstrap";

export interface SearchableMultiSelectOption {
  value: string;
  label: string;
}

interface SearchableMultiSelectProps {
  options: SearchableMultiSelectOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
}

function SearchableMultiSelect({
  options,
  selectedValues,
  onChange,
  placeholder = "بحث واختيار...",
  emptyMessage = "لا توجد نتائج",
  disabled = false,
}: SearchableMultiSelectProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOptions = options.filter((option) => selectedValues.includes(option.value));
  const normalizedSearch = search.trim().toLowerCase();
  const filteredOptions = options.filter(
    (option) => !selectedValues.includes(option.value) && option.label.toLowerCase().includes(normalizedSearch)
  );

  const addValue = (value: string) => {
    onChange([...selectedValues, value]);
    setSearch("");
    inputRef.current?.focus();
  };

  const removeValue = (value: string) => {
    onChange(selectedValues.filter((v) => v !== value));
  };

  return (
    <div ref={containerRef} className="position-relative">
      <div
        className={`form-control d-flex flex-wrap gap-1 align-items-center ${disabled ? "bg-body-secondary" : ""}`}
        style={{ minHeight: 42, cursor: disabled ? "not-allowed" : "text" }}
        onClick={() => !disabled && inputRef.current?.focus()}
      >
        {selectedOptions.map((option) => (
          <Badge key={option.value} bg="light" text="dark" className="d-flex align-items-center gap-1 fw-normal border">
            {option.label}
            {!disabled && (
              <button
                type="button"
                className="btn-close btn-close-sm"
                style={{ fontSize: "0.55rem" }}
                aria-label="إزالة"
                onClick={(e) => {
                  e.stopPropagation();
                  removeValue(option.value);
                }}
              />
            )}
          </Badge>
        ))}
        <input
          ref={inputRef}
          type="text"
          className="border-0 flex-grow-1 p-0"
          style={{ minWidth: 90, outline: "none", background: "transparent" }}
          placeholder={selectedOptions.length === 0 ? placeholder : ""}
          value={search}
          disabled={disabled}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        />
      </div>

      {open && !disabled && (
        <div
          className="position-absolute w-100 bg-white border rounded-2 shadow-sm mt-1"
          style={{ zIndex: 3000, maxHeight: 220, overflowY: "auto" }}
        >
          {filteredOptions.length === 0 ? (
            <div className="text-muted small p-2">{emptyMessage}</div>
          ) : (
            filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className="dropdown-item small"
                onClick={() => addValue(option.value)}
              >
                {option.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default SearchableMultiSelect;
