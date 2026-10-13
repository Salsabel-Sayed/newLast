import EmptyState from "./EmptyState";

interface ComingSoonProps {
  title: string;
}

function ComingSoon({ title }: ComingSoonProps) {
  return (
    <div className="card p-4">
      <EmptyState icon="bi-hourglass-split" title={title} description="هذه الشاشة قيد الإنشاء حاليًا" />
    </div>
  );
}

export default ComingSoon;
