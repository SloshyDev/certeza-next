// src/components/dashboard/DateFilter.jsx
export default function DateFilter({ start, end }) {
  return (
    <form
      method="get"
      className="mt-2 flex flex-col sm:flex-row flex-wrap sm:items-end items-center justify-center gap-3"
    >
      <div className="flex flex-col gap-1 w-full sm:w-auto">
        <label htmlFor="start" className="text-sm opacity-80">
          Desde
        </label>
        <input
          id="start"
          name="start"
          type="date"
          defaultValue={start}
          className="h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
        />
      </div>
      <div className="flex flex-col gap-1 w-full sm:w-auto">
        <label htmlFor="end" className="text-sm opacity-80">
          Hasta
        </label>
        <input
          id="end"
          name="end"
          type="date"
          defaultValue={end}
          className="h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
        />
      </div>
      <div className="flex flex-col gap-1 w-full sm:w-auto">
        <label className="text-sm opacity-0 select-none">Aplicar</label>
        <button type="submit" className="btn-secondary h-10">
          Aplicar
        </button>
      </div>
    </form>
  );
}