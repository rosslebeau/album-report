import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock $env/dynamic/private before importing the client
vi.mock('$env/dynamic/private', () => ({
	env: { LASTFM_API_KEY: 'test-api-key' }
}));

// Mock the logger to avoid pino transport setup in tests
vi.mock('$lib/server/logger', () => ({
	createChildLogger: () => ({
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn()
	}),
	withPerformanceLog: <T>(_log: unknown, _op: string, fn: () => T) => fn()
}));

import { getRecentTracks, getAlbumInfo, LastfmApiError } from '$lib/server/lastfm/client';

describe('getRecentTracks', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('should filter out nowplaying tracks', async () => {
		const mockResponse = {
			recenttracks: {
				track: [
					{
						name: 'Now Playing Track',
						artist: { '#text': 'Artist', mbid: '' },
						album: { '#text': 'Album', mbid: '' },
						'@attr': { nowplaying: 'true' }
					},
					{
						name: 'Past Track',
						artist: { '#text': 'Artist', mbid: '' },
						album: { '#text': 'Album', mbid: '' },
						date: { uts: '1000', '#text': '01 Jan 2020, 00:00' }
					}
				],
				'@attr': { page: '1', total: '2', user: 'testuser', perPage: '200', totalPages: '1' }
			}
		};

		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(JSON.stringify(mockResponse), { status: 200 })
		);

		const scrobbles = await getRecentTracks('testuser', 10);

		expect(scrobbles).toHaveLength(1);
		expect(scrobbles[0].track).toBe('Past Track');
	});

	it('should extract album name from #text field', async () => {
		const mockResponse = {
			recenttracks: {
				track: [
					{
						name: 'Track 1',
						artist: { '#text': 'Radiohead', mbid: '' },
						album: { '#text': 'OK Computer', mbid: 'abc123' },
						date: { uts: '1000', '#text': '01 Jan 2020, 00:00' }
					}
				],
				'@attr': { page: '1', total: '1', user: 'testuser', perPage: '200', totalPages: '1' }
			}
		};

		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(JSON.stringify(mockResponse), { status: 200 })
		);

		const scrobbles = await getRecentTracks('testuser', 10);

		expect(scrobbles[0].album).toBe('OK Computer');
		expect(scrobbles[0].artist).toBe('Radiohead');
	});

	it('should paginate across multiple pages', async () => {
		// PER_PAGE is 200, so requesting 400 scrobbles requires 2 pages
		const makeTrack = (name: string, ts: number) => ({
			name,
			artist: { '#text': 'Artist', mbid: '' },
			album: { '#text': 'Album', mbid: '' },
			date: { uts: String(ts), '#text': '' }
		});

		const page1Tracks = Array.from({ length: 200 }, (_, i) =>
			makeTrack(`Page1-T${i}`, 1000 + i)
		);
		const page2Tracks = Array.from({ length: 200 }, (_, i) =>
			makeTrack(`Page2-T${i}`, 2000 + i)
		);

		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockResolvedValueOnce(
			new Response(JSON.stringify({
				recenttracks: {
					track: page1Tracks,
					'@attr': { page: '1', total: '400', user: 'testuser', perPage: '200', totalPages: '2' }
				}
			}), { status: 200 })
		);
		fetchSpy.mockResolvedValueOnce(
			new Response(JSON.stringify({
				recenttracks: {
					track: page2Tracks,
					'@attr': { page: '2', total: '400', user: 'testuser', perPage: '200', totalPages: '2' }
				}
			}), { status: 200 })
		);

		const scrobbles = await getRecentTracks('testuser', 400);

		expect(fetchSpy).toHaveBeenCalledTimes(2);
		expect(scrobbles).toHaveLength(400);
	});

	it('should handle error responses (HTTP 200 with error JSON)', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(JSON.stringify({ error: 6, message: 'User not found' }), { status: 200 })
		);

		await expect(getRecentTracks('baduser', 10)).rejects.toThrow(LastfmApiError);
	});
});

describe('getAlbumInfo', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('should normalize single-track album response from object to array', async () => {
		const mockResponse = {
			album: {
				name: 'Single',
				artist: 'Artist',
				tracks: {
					track: {
						name: 'Only Track',
						'@attr': { rank: '1' },
						duration: '200',
						artist: { name: 'Artist' }
					}
				}
			}
		};

		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(JSON.stringify(mockResponse), { status: 200 })
		);

		const info = await getAlbumInfo('Artist', 'Single');

		expect(info).not.toBeNull();
		expect(info!.tracks).toHaveLength(1);
		expect(info!.tracks[0].name).toBe('Only Track');
		expect(info!.tracks[0].position).toBe(1);
	});

	it('should return ordered track list with positions', async () => {
		const mockResponse = {
			album: {
				name: 'Album',
				artist: 'Artist',
				tracks: {
					track: [
						{ name: 'T1', '@attr': { rank: '1' }, duration: '200', artist: { name: 'Artist' } },
						{ name: 'T2', '@attr': { rank: '2' }, duration: '180', artist: { name: 'Artist' } },
						{ name: 'T3', '@attr': { rank: '3' }, duration: '220', artist: { name: 'Artist' } }
					]
				}
			}
		};

		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(JSON.stringify(mockResponse), { status: 200 })
		);

		const info = await getAlbumInfo('Artist', 'Album');

		expect(info!.trackCount).toBe(3);
		expect(info!.tracks[0]).toEqual({ name: 'T1', position: 1 });
		expect(info!.tracks[2]).toEqual({ name: 'T3', position: 3 });
	});

	it('should return null for album not found (error 6)', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(JSON.stringify({ error: 6, message: 'Album not found' }), { status: 200 })
		);

		const info = await getAlbumInfo('Artist', 'NonexistentAlbum');

		expect(info).toBeNull();
	});
});
