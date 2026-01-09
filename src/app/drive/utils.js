export const formatCurrency = (value) => {
  if (!value) return "-";
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(value);
};

export const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("es-MX");
};
