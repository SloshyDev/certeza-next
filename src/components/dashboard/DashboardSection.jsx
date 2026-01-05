// src/components/dashboard/DashboardSection.jsx
export default function DashboardSection({ title, children }) {
  return (
    <div className="mt-10">
      <h2 className="text-xl font-semibold mb-6">{title}</h2>
      {children}
    </div>
  );
}