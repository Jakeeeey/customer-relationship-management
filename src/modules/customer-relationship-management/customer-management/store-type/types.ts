export type StoreTypeItem = {
	id: number;
	store_type: string;
	created_by: number | null;
	created_by_name: string;
	created_at: string | null;
	updated_by: number | null;
	updated_at: string | null;
};

export type StoreTypeUserOption = {
	value: string;
	label: string;
};

export type StoreTypeListResponse = {
	ok: boolean;
	data: StoreTypeItem[];
	allTypes?: Array<Pick<StoreTypeItem, "id" | "store_type">>;
	users: StoreTypeUserOption[];
	message?: string;
};

export type UpsertStoreTypePayload = {
	store_type: string;
};

export type UpdateStoreTypePayload = UpsertStoreTypePayload & {
	id: number;
};
