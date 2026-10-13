interface TopbarProps {
  onToggleSidebar: () => void;
}

const todayLabel = new Intl.DateTimeFormat("ar-EG", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
}).format(new Date());

function Topbar({ onToggleSidebar }: TopbarProps) {
  return (
    <header className="app-topbar">
      <button type="button" className="app-topbar-toggle" onClick={onToggleSidebar} aria-label="فتح القائمة">
        <i className="bi bi-list" />
      </button>
      <div className="app-topbar-title">نظام إدارة الأعمال</div>
      <div className="app-topbar-date">
        <i className="bi bi-calendar3 me-2" />
        {todayLabel}
      </div>
    </header>
  );
}

export default Topbar;
