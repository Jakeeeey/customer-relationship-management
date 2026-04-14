import type { ClassificationItem } from "../types";

export function normalizeClassificationName(value: string): string {
	return value.trim().replace(/\s+/g, " ");
}

export function canonicalClassificationName(value: string): string {
	return normalizeClassificationName(value).toLowerCase();
}

export function validateAndNormalizeClassificationName(value: string): string {
	const normalized = normalizeClassificationName(value);
	if (!normalized) {
		throw new Error("Type is required.");
	}

	if (normalized.length > 50) {
		throw new Error("Type must be 50 characters or less.");
	}

	return normalized;
}

export function hasDuplicateClassificationName(
	items: ClassificationItem[],
	classificationName: string,
	excludeId?: number
): boolean {
	const target = canonicalClassificationName(classificationName);

	return items.some((item) => {
		if (excludeId && item.id === excludeId) {
			return false;
		}
		return canonicalClassificationName(item.classification_name) === target;
	});
}
