import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { findByShareId } from '$lib/server/db/queries';
import { createChildLogger, withPerformanceLog } from '$lib/server/logger';

const log = createChildLogger('report/load');

export const load: PageServerLoad = async ({ params }) => {
	const { shareId } = params;

	const result = await withPerformanceLog(
		log,
		`load report ${shareId}`,
		() => findByShareId(shareId)
	);

	if (!result) {
		log.warn({ shareId }, 'Report not found');
		error(404, 'Report not found. It may have been removed or the link is incorrect.');
	}

	return { result };
};
