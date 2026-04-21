export type ClassificationItem = {
	id: number;
	classification_name: string;
	created_by: number | null;
	created_by_name: string;
	created_at: string | null;
	updated_by: number | null;
	updated_at: string | null;
};

export type ClassificationUserOption = {
	value: string;
	label: string;
};

export type ClassificationListResponse = {
	ok: boolean;
	data: ClassificationItem[];
	users: ClassificationUserOption[];
	message?: string;
};

export type UpsertClassificationPayload = {
	classification_name: string;
};

export type UpdateClassificationPayload = UpsertClassificationPayload & {
	id: number;
};

export type ClassificationFilters = {
	q?: string;
	createdBy?: string;
};

export type ClassificationDialogMode = "create" | "edit" | "view";
