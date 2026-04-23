import { useMemo, useState } from "react";

import { SupplierItem } from "../types";

type UseSupplierFiltersArgs = {
	suppliers: SupplierItem[];
};

export function useSupplierFilters({ suppliers }: UseSupplierFiltersArgs) {
	const [search, setSearch] = useState("");
	const [nameFilter, setNameFilter] = useState("all");

	const supplierNames = useMemo(() => {
		return [...new Set(suppliers.map((supplier) => supplier.supplier_name))].sort();
	}, [suppliers]);

	const filteredSuppliers = useMemo(() => {
		let result = suppliers;
		const query = search.trim().toLowerCase();

		if (query) {
			result = result.filter((supplier) => {
				return (
					supplier.supplier_shortcut.toLowerCase().includes(query) ||
					supplier.supplier_name.toLowerCase().includes(query) ||
					(supplier.description ?? "").toLowerCase().includes(query)
				);
			});
		}

		if (nameFilter !== "all") {
			result = result.filter((supplier) => supplier.supplier_name === nameFilter);
		}

		return result;
	}, [nameFilter, search, suppliers]);

	return {
		search,
		setSearch,
		nameFilter,
		setNameFilter,
		supplierNames,
		filteredSuppliers,
	};
}
