import type { ClassificationItem } from "../types";

export function normalizeClassificationName(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "")
		.replace(/s$/, "");
}

export function validateAndNormalizeClassificationName(value: string): string {
	const trimmed = value.trim().replace(/\s+/g, " ");
	if (!trimmed) {
		throw new Error("Type is required.");
	}

	if (trimmed.length > 50) {
		throw new Error("Type must be 50 characters or less.");
	}

	return trimmed;
}

export function findDuplicateClassification(
	items: Array<Pick<ClassificationItem, "id" | "classification_name">>,
	candidate: string,
	excludeId?: number
): Pick<ClassificationItem, "id" | "classification_name"> | null {
	const trimmed = candidate.trim().toLowerCase();
	if (!trimmed) return null;
	const normalized = normalizeClassificationName(candidate);

	for (const item of items) {
		if (excludeId && item.id === excludeId) continue;
		const raw = (item.classification_name ?? "").trim();
		if (!raw) continue;

		if (raw.toLowerCase() === trimmed) {
			return item;
		}

		const itemNorm = normalizeClassificationName(raw);
		if (itemNorm && normalized && itemNorm === normalized) {
			return item;
		}
	}

	return null;
}

export function hasDuplicateClassificationName(
	items: Array<Pick<ClassificationItem, "id" | "classification_name">>,
	classificationName: string,
	excludeId?: number
): boolean {
	return findDuplicateClassification(items, classificationName, excludeId) !== null;
}
