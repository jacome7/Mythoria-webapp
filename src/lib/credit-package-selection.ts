/** Resolve URL selections against the current catalogue; never partially parse a package ID. */
export function getSelectedCreditPackageId(
  value: string | null,
  packages: ReadonlyArray<{ id: number }>,
): number | null {
  if (!value || !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && packages.some((pkg) => pkg.id === id) ? id : null;
}
