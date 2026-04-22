export type SupplierItem = {
	id: number;
	supplier_shortcut: string;
	supplier_name: string;
	description: string | null;
};

export type SupplierBackgroundImageItem = {
	id: number;
	supplier_id: number;
	image_path: string;
	uploaded_at?: string | null;
	is_active?: number | boolean;
};

export type SupplierListResponse = {
	ok: boolean;
	data: SupplierItem[];
	message?: string;
};

export type SupplierImagesResponse = {
	ok: boolean;
	data: SupplierBackgroundImageItem[];
	message?: string;
};

export type GenericApiResponse<T = unknown> = {
	ok: boolean;
	data?: T;
	message?: string;
};
