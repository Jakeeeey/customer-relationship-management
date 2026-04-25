import { useState } from "react";

import { SupplierItem } from "../types";

type UseSupplierModalsArgs = {
	onSupplierSelect: (supplierId: number) => void;
};

export function useSupplierModals({ onSupplierSelect }: UseSupplierModalsArgs) {
	const [isViewModalOpen, setIsViewModalOpen] = useState(false);
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [isAddImagesModalOpen, setIsAddImagesModalOpen] = useState(false);

	const openViewModal = (supplier: SupplierItem) => {
		onSupplierSelect(supplier.id);
		setIsViewModalOpen(true);
	};

	const openEditModal = (supplier: SupplierItem) => {
		onSupplierSelect(supplier.id);
		setIsEditModalOpen(true);
	};

	const openAddImagesModal = (supplier: SupplierItem) => {
		onSupplierSelect(supplier.id);
		setIsAddImagesModalOpen(true);
	};

	return {
		isViewModalOpen,
		setIsViewModalOpen,
		isEditModalOpen,
		setIsEditModalOpen,
		isAddImagesModalOpen,
		setIsAddImagesModalOpen,
		openViewModal,
		openEditModal,
		openAddImagesModal,
	};
}
